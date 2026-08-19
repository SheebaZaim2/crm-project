function showContent() {
    hideAll();
    document.getElementById("contentSection").classList.remove("hidden");
    loadContent();
}

function showAIDraft() {
    hideAll();
    document.getElementById("aiDraftSection").classList.remove("hidden");
    loadAIDraftCampaigns();
}

function setContentStatus(text) {
    const element = document.getElementById("contentStatus");

    if (element) {
        element.textContent = text;
    }
}

function setAIStatus(text) {
    const element = document.getElementById("aiStatus");

    if (element) {
        element.textContent = text;
    }
}

async function loadContent() {
    setContentStatus("Loading content...");

    try {
        const result = await apiGet("/api/content");

        if (!result.success) {
            setContentStatus(result.message || "Failed to load content");
            return;
        }

        setContentStatus("Content loaded");
        populateContentCampaigns(result.data);
        renderContent(result.data);
    } catch (error) {
        setContentStatus("Failed to load content: " + error.message);
    }
}

async function populateContentCampaigns() {
    const select = document.getElementById("contentCampaignId");

    try {
        const result = await apiGet("/api/campaigns");

        if (result.success) {
            select.innerHTML = result.data
                .map(c => `<option value="${c.id}">${c.campaignName}</option>`)
                .join("");
        }
    } catch (error) {
        select.innerHTML = "";
    }
}

function renderContent(items) {
    const container = document.getElementById("contentList");

    if (items.length === 0) {
        container.innerHTML = "<p>No content items yet. Create one to start planning.</p>";
        return;
    }

    const rows = items.map(item => {
        const approvals = (item.approvals || [])
            .map(a => `<span class="badge">${a.decision} by ${a.approvedBy}</span>`)
            .join(" ");

        return `
            <div class="campaign-card">
                <h3>${item.title}</h3>
                <p><strong>Campaign:</strong> ${item.campaignId}</p>
                <p><strong>Channel:</strong> ${item.channel}</p>
                <p><strong>Scheduled:</strong> ${item.scheduledDate}</p>
                <p><strong>Status:</strong> ${item.status}</p>
                <p>${item.body}</p>
                ${approvals ? `<p>${approvals}</p>` : ""}
                ${contentActions(item)}
            </div>
        `;
    });

    container.innerHTML = rows.join("");
}

function contentActions(item) {
    const user = getSessionUser();
    const buttons = [];

    if (item.status === "Draft" && canWrite()) {
        buttons.push(`<button onclick="submitContent('${item.id}')">Submit for Approval</button>`);
    }

    if (item.status === "Submitted" && user && (user.role === "Admin" || user.role === "ClientApprover")) {
        buttons.push(`
            <button onclick="decideContent('${item.id}', 'Approve')">Approve</button>
            <button onclick="decideContent('${item.id}', 'Reject')">Reject</button>
            <button onclick="decideContent('${item.id}', 'Comment')">Comment</button>
        `);
    }

    if (item.status === "Draft" && canWrite()) {
        buttons.push(`<button onclick="deleteContent('${item.id}')">Delete</button>`);
    }

    return buttons.join("");
}

function showContentForm() {
    document.getElementById("contentFormWrap").classList.remove("hidden");
    document.getElementById("contentFormTitle").textContent = "New Content";
    document.getElementById("contentForm").reset();
    document.getElementById("contentId").value = "";
    document.getElementById("contentMessage").textContent = "";
}

async function saveContent(event) {
    event.preventDefault();

    const data = {
        campaignId: document.getElementById("contentCampaignId").value,
        title: document.getElementById("contentTitle").value.trim(),
        body: document.getElementById("contentBody").value.trim(),
        channel: document.getElementById("contentChannel").value,
        scheduledDate: document.getElementById("contentDate").value
    };

    const message = document.getElementById("contentMessage");

    if (!data.campaignId || !data.title || !data.body || !data.channel || !data.scheduledDate) {
        message.textContent = "Please complete all required fields.";
        return;
    }

    try {
        await apiPost("/api/content", data);
        document.getElementById("contentFormWrap").classList.add("hidden");
        await loadContent();
    } catch (error) {
        message.textContent = "Save failed: " + error.message;
    }
}

async function submitContent(id) {
    try {
        await apiPost(`/api/content/${id}/submit`);
        await loadContent();
    } catch (error) {
        setContentStatus("Submit failed: " + error.message);
    }
}

async function decideContent(id, decision) {
    const comment = decision === "Comment"
        ? prompt("Comment:") || ""
        : "";

    if (decision === "Comment" && !comment) {
        return;
    }

    try {
        await apiPost(`/api/content/${id}/decide`, { decision, comment });
        await loadContent();
    } catch (error) {
        setContentStatus("Decision failed: " + error.message);
    }
}

async function deleteContent(id) {
    const confirmed = confirm("Delete this content item?");

    if (!confirmed) {
        return;
    }

    try {
        await apiDelete(`/api/content/${id}`);
        await loadContent();
    } catch (error) {
        setContentStatus("Delete failed: " + error.message);
    }
}

async function loadAIDraftCampaigns() {
    const select = document.getElementById("aiCampaign");

    try {
        const result = await apiGet("/api/campaigns");

        if (result.success) {
            select.innerHTML = result.data
                .map(c => `<option value="${c.id}">${c.campaignName}</option>`)
                .join("");
            setAIStatus("Ready");
        }
    } catch (error) {
        setAIStatus("Failed to load campaigns: " + error.message);
    }
}

async function generateDraft() {
    const campaignId = document.getElementById("aiCampaign").value;
    const channel = document.getElementById("aiChannel").value;
    const extraInstructions = document.getElementById("aiInstructions").value.trim();

    const message = document.getElementById("aiMessage");

    if (!campaignId) {
        message.textContent = "Please select a campaign.";
        return;
    }

    setAIStatus("Generating draft...");
    message.textContent = "";

    try {
        const result = await apiPost("/api/ai/draft", { campaignId, channel, extraInstructions });
        document.getElementById("aiDraftBody").value = result.data.draft;
        setAIStatus(`Draft generated (${result.data.provider}/${result.data.model}). Editable and never auto-published.`);
        message.textContent = result.note || "";
    } catch (error) {
        setAIStatus("Draft generation failed.");
        message.textContent = error.message;
    }
}

async function saveDraftAsContent() {
    const body = document.getElementById("aiDraftBody").value.trim();
    const message = document.getElementById("aiMessage");

    if (!body) {
        message.textContent = "Generate a draft (or paste text) first.";
        return;
    }

    const title = prompt("Title for this content:", body.slice(0, 40));
    const scheduledDate = prompt("Scheduled date (YYYY-MM-DD):", "");

    if (!title || !scheduledDate) {
        return;
    }

    try {
        await apiPost("/api/content", {
            campaignId: document.getElementById("aiCampaign").value,
            title,
            body,
            channel: document.getElementById("aiChannel").value,
            scheduledDate
        });
        message.textContent = "Saved to the content calendar.";
    } catch (error) {
        message.textContent = "Save failed: " + error.message;
    }
}