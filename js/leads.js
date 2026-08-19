let cachedLeads = [];

function showLeads() {
    hideAll();
    document.getElementById("leadsSection").classList.remove("hidden");
    loadLeads();
}

function setLeadsStatus(text) {
    const element = document.getElementById("leadsStatus");

    if (element) {
        element.textContent = text;
    }
}

async function loadLeads() {
    setLeadsStatus("Loading leads...");
    document.getElementById("leadFormWrap").classList.add("hidden");
    await populateCampaignSelect();

    try {
        const result = await apiGet("/api/leads");

        if (!result.success) {
            setLeadsStatus(result.message || "Failed to load leads");
            return;
        }

        cachedLeads = result.data;
        setLeadsStatus(`${cachedLeads.length} lead(s) loaded`);
        renderLeads();
    } catch (error) {
        setLeadsStatus("Failed to load leads: " + error.message);
    }
}

async function populateCampaignSelect() {
    const select = document.getElementById("leadCampaignId");

    try {
        const result = await apiGet("/api/campaigns");

        if (result.success && Array.isArray(result.data)) {
            select.innerHTML = '<option value="">Select Campaign</option>';

            for (const campaign of result.data) {
                const option = document.createElement("option");
                option.value = campaign.id;
                option.textContent = campaign.campaignName;
                select.appendChild(option);
            }
        }
    } catch (error) {
        select.innerHTML = '<option value="">Select Campaign</option>';
    }
}

function renderLeads() {
    const list = document.getElementById("leadList");

    if (cachedLeads.length === 0) {
        list.innerHTML = "<p>No leads found.</p>";
        return;
    }

    list.innerHTML = "";

    cachedLeads.forEach(lead => {
        const card = document.createElement("div");
        card.className = "campaign-card";

        const canEdit = canWrite() || canCreate();

        card.innerHTML = `
            <h3>${lead.firstName} ${lead.lastName} (${lead.id})</h3>
            <p><strong>Campaign:</strong> ${lead.campaignId}</p>
            <p><strong>Email:</strong> ${lead.email}</p>
            <p><strong>Source:</strong> ${lead.sourcePlatform}</p>
            <p><strong>Consent:</strong> ${lead.consentStatus}</p>
            <p><strong>Status:</strong> ${lead.leadStatus} (score ${lead.leadScore})</p>
            ${
                canEdit
                    ? `<button onclick="editLead('${lead.id}')">Edit</button>
                       <button onclick="deleteLead('${lead.id}')">Delete</button>`
                    : ""
            }
        `;

        list.appendChild(card);
    });
}

function canCreate() {
    const user = getSessionUser();
    return user && (user.role === "Admin" || user.role === "CampaignManager" || user.role === "MarketingStaff");
}

function showLeadForm() {
    document.getElementById("leadFormWrap").classList.remove("hidden");
    document.getElementById("leadFormTitle").textContent = "New Lead";
    document.getElementById("leadId").value = "";
    document.getElementById("leadForm").reset();
    document.getElementById("leadMessage").textContent = "";
}

function fillLeadForm(lead) {
    document.getElementById("leadId").value = lead.id;
    document.getElementById("leadCampaignId").value = lead.campaignId;
    document.getElementById("leadFirstName").value = lead.firstName;
    document.getElementById("leadLastName").value = lead.lastName;
    document.getElementById("leadEmail").value = lead.email;
    document.getElementById("leadPhone").value = lead.phone || "";
    document.getElementById("leadCompany").value = lead.company || "";
    document.getElementById("leadJobTitle").value = lead.jobTitle || "";
    document.getElementById("leadSourcePlatform").value = lead.sourcePlatform;
    document.getElementById("leadConsentStatus").value = lead.consentStatus;
    document.getElementById("leadStatus").value = lead.leadStatus;
    document.getElementById("leadScore").value = lead.leadScore || 0;
    document.getElementById("leadBudgetRange").value = lead.budgetRange || "";
    document.getElementById("leadStage").value = lead.stage || "";
    document.getElementById("leadAssignedOwner").value = lead.assignedOwner || "";
    document.getElementById("leadNotes").value = lead.notes || "";
}

function editLead(id) {
    const lead = cachedLeads.find(item => item.id === id);

    if (!lead) {
        return;
    }

    document.getElementById("leadFormWrap").classList.remove("hidden");
    document.getElementById("leadFormTitle").textContent = "Edit Lead";
    document.getElementById("leadMessage").textContent = "";
    fillLeadForm(lead);
}

function readLeadForm() {
    return {
        campaignId: document.getElementById("leadCampaignId").value,
        firstName: document.getElementById("leadFirstName").value.trim(),
        lastName: document.getElementById("leadLastName").value.trim(),
        email: document.getElementById("leadEmail").value.trim(),
        phone: document.getElementById("leadPhone").value.trim(),
        company: document.getElementById("leadCompany").value.trim(),
        jobTitle: document.getElementById("leadJobTitle").value.trim(),
        sourcePlatform: document.getElementById("leadSourcePlatform").value,
        consentStatus: document.getElementById("leadConsentStatus").value,
        leadStatus: document.getElementById("leadStatus").value,
        leadScore: Number(document.getElementById("leadScore").value) || 0,
        budgetRange: document.getElementById("leadBudgetRange").value.trim(),
        stage: document.getElementById("leadStage").value.trim(),
        assignedOwner: document.getElementById("leadAssignedOwner").value.trim(),
        notes: document.getElementById("leadNotes").value.trim()
    };
}

async function saveLead(event) {
    event.preventDefault();

    const message = document.getElementById("leadMessage");
    const data = readLeadForm();
    const existingId = document.getElementById("leadId").value;

    if (
        !data.campaignId ||
        !data.firstName ||
        !data.lastName ||
        !data.email ||
        !data.sourcePlatform
    ) {
        message.textContent = "Please complete all required fields.";
        return;
    }

    try {
        if (existingId) {
            await apiPut(`/api/leads/${existingId}`, data);
        } else {
            await apiPost("/api/leads", data);
        }

        message.textContent = "Lead saved.";
        await loadLeads();
    } catch (error) {
        message.textContent = "Save failed: " + error.message;
    }
}

async function deleteLead(id) {
    const lead = cachedLeads.find(item => item.id === id);

    if (!lead) {
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to delete lead "${lead.firstName} ${lead.lastName}"?`
    );

    if (!confirmed) {
        return;
    }

    try {
        await apiDelete(`/api/leads/${id}`);
        await loadLeads();
    } catch (error) {
        setLeadsStatus("Delete failed: " + error.message);
    }
}