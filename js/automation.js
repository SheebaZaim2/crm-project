function showAutomation() {
    hideAll();
    document.getElementById("automationSection").classList.remove("hidden");
    loadAutomation();
}

function setAutomationStatus(text) {
    const element = document.getElementById("automationStatus");

    if (element) {
        element.textContent = text;
    }
}

async function loadAutomation() {
    setAutomationStatus("Loading...");

    try {
        await populateApprovedContent();
        const [postsResult, activitiesResult] = await Promise.all([
            apiGet("/api/automation/posts"),
            apiGet("/api/automation/activities")
        ]);

        setAutomationStatus("Loaded");
        renderScheduledPosts(postsResult.data || []);
        renderActivityLog(activitiesResult.data || []);
    } catch (error) {
        setAutomationStatus("Failed to load: " + error.message);
    }
}

async function populateApprovedContent() {
    const select = document.getElementById("autoContent");

    try {
        const result = await apiGet("/api/content");
        const approved = (result.data || []).filter(item => item.status === "Approved");
        window._autoContentCache = result.data || [];

        select.innerHTML = '<option value="">Select Approved Content</option>';

        for (const item of approved) {
            const option = document.createElement("option");
            option.value = item.id;
            option.textContent = `${item.title} (${item.channel})`;
            select.appendChild(option);
        }

        populateScheduleDate();
    } catch (error) {
        select.innerHTML = '<option value="">Select Approved Content</option>';
    }
}

function populateScheduleDate() {
    const select = document.getElementById("autoContent");
    const dateInput = document.getElementById("autoDate");
    const selected = select.options[select.selectedIndex];

    if (selected && selected.value) {
        const result = window._autoContentCache || [];
        const item = result.find(entry => entry.id === selected.value);

        if (item && item.scheduledDate) {
            dateInput.value = item.scheduledDate;
        }
    }
}

async function scheduleContent() {
    const message = document.getElementById("autoMessage");
    const contentId = document.getElementById("autoContent").value;
    const scheduledAt = document.getElementById("autoDate").value;

    if (!contentId) {
        message.textContent = "Please select approved content.";
        return;
    }

    if (!scheduledAt) {
        message.textContent = "Please choose a scheduled date.";
        return;
    }

    message.textContent = "Scheduling...";

    try {
        const result = await apiPost(`/api/content/${contentId}/schedule`, { scheduledAt });

        if (!result.success) {
            message.textContent = result.message || "Scheduling failed";
            return;
        }

        message.textContent = "Scheduled successfully.";
        await loadAutomation();
    } catch (error) {
        message.textContent = "Scheduling failed: " + error.message;
    }
}

async function publishPost(id) {
    try {
        await apiPost(`/api/posts/${id}/publish`);
        await loadAutomation();
    } catch (error) {
        setAutomationStatus("Publish failed: " + error.message);
    }
}

function renderScheduledPosts(posts) {
    const container = document.getElementById("scheduledPosts");

    if (posts.length === 0) {
        container.innerHTML = "<p>No scheduled posts.</p>";
        return;
    }

    container.innerHTML = "";

    posts.forEach(post => {
        const card = document.createElement("div");
        card.className = "campaign-card";

        const publishButton =
            post.outcome === "Scheduled"
                ? `<button onclick="publishPost('${post.id}')">Publish</button>`
                : "";

        card.innerHTML = `
            <h3>${post.id} — ${post.platform}</h3>
            <p><strong>Content:</strong> ${post.contentId}</p>
            <p><strong>Campaign:</strong> ${post.campaignId}</p>
            <p><strong>Scheduled:</strong> ${post.scheduledAt}</p>
            <p><strong>Outcome:</strong> ${post.outcome}</p>
            ${
                post.publishedAt
                    ? `<p><strong>Published:</strong> ${post.publishedAt}</p>`
                    : ""
            }
            ${publishButton}
        `;

        container.appendChild(card);
    });
}

function renderActivityLog(activities) {
    const container = document.getElementById("activityLog");

    if (activities.length === 0) {
        container.innerHTML = "<p>No activity recorded.</p>";
        return;
    }

    container.innerHTML = "";

    activities.forEach(activity => {
        const card = document.createElement("div");
        card.className = "campaign-card";
        card.innerHTML = `
            <h3>${activity.action}</h3>
            <p><strong>Campaign:</strong> ${activity.campaignId}</p>
            <p><strong>Details:</strong> ${activity.details || "-"}</p>
            <p><strong>Outcome:</strong> ${activity.outcome}</p>
            <p><strong>By:</strong> ${activity.performedBy}</p>
            <p><strong>At:</strong> ${activity.createdAt}</p>
        `;
        container.appendChild(card);
    });
}