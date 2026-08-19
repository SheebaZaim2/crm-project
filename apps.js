const STORAGE_KEY = "divinenetSprint1CampaignsV3";

const sampleCampaigns = [
    {
        id: 1,
        campaignName: "Winter Menu Promotion",
        client: "ABC Restaurant",
        brand: "ABC Restaurant",
        objective: "Promote the winter menu",
        targetAudience: "Melbourne customers aged 18-35",
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        budget: 5000,
        channel: "Instagram",
        status: "Draft"
    },
    {
        id: 2,
        campaignName: "Spring Awareness Campaign",
        client: "XYZ Clothing",
        brand: "XYZ",
        objective: "Increase brand awareness",
        targetAudience: "Australian customers aged 18-30",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        budget: 7500,
        channel: "Facebook",
        status: "Active"
    }
];

let campaigns = [];
let apiMode = false;

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
}

function loadFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);

    try {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
        }
    } catch (error) {
        // fall through to sample data
    }

    return [...sampleCampaigns];
}

function setApiStatus(text) {
    const element = document.getElementById("apiStatus");

    if (element) {
        element.textContent = text;
    }
}

async function refreshCampaigns() {
    try {
        const result = await apiGet("/api/campaigns");

        if (result.success) {
            campaigns = result.data;
            apiMode = true;
            setApiStatus("Connected to API");
            return;
        }
    } catch (error) {
        if (error.message === "Authentication required" || error.message.includes("token")) {
            showLogin();
            return;
        }
    }

    apiMode = false;
    campaigns = loadFromStorage();
    setApiStatus("API offline - using LocalStorage");
}

async function initData() {
    const user = getSessionUser();

    if (!getToken()) {
        showLogin();
        return;
    }

    await refreshCampaigns();
    updateDashboard();
    showApp(user);
}

function showLogin() {
    setApiStatus("Please sign in to continue");
    document.getElementById("loginSection").classList.remove("hidden");
    document.getElementById("appNav").classList.add("hidden");
    document.getElementById("dashboardSection").classList.add("hidden");
    document.getElementById("campaignSection").classList.add("hidden");
    document.getElementById("formSection").classList.add("hidden");
    document.getElementById("detailsSection").classList.add("hidden");
    document.getElementById("userBar").classList.add("hidden");
}

function showApp(user) {
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("appNav").classList.remove("hidden");
    document.getElementById("userBar").classList.remove("hidden");
    document.getElementById("userInfo").textContent =
        user ? `${user.fullName} (${user.role})` : "Signed in";
    showDashboard();
}

function canWrite() {
    const user = getSessionUser();
    return user && (user.role === "Admin" || user.role === "CampaignManager");
}

async function handleLogin(event) {
    event.preventDefault();

    const message = document.getElementById("loginMessage");
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    message.textContent = "Signing in...";

    try {
        const result = await apiLogin(email, password);
        setSession(result.token, result.user);
        message.textContent = "";

        await refreshCampaigns();
        updateDashboard();
        showApp(result.user);
    } catch (error) {
        message.textContent = "Login failed: " + error.message;
    }
}

function handleLogout() {
    clearSession();
    document.getElementById("loginEmail").value = "";
    document.getElementById("loginPassword").value = "";
    document.getElementById("loginMessage").textContent = "";
    showLogin();
}

function hideAll() {
    document.getElementById("dashboardSection").classList.add("hidden");
    document.getElementById("campaignSection").classList.add("hidden");
    document.getElementById("formSection").classList.add("hidden");
    document.getElementById("detailsSection").classList.add("hidden");
}

function updateDashboard() {
    document.getElementById("totalCampaigns").textContent = campaigns.length;

    document.getElementById("activeCampaigns").textContent =
        campaigns.filter(campaign => campaign.status === "Active").length;

    document.getElementById("draftCampaigns").textContent =
        campaigns.filter(campaign => campaign.status === "Draft").length;
}

function showDashboard() {
    hideAll();
    updateDashboard();
    document.getElementById("dashboardSection").classList.remove("hidden");
}

function showCampaigns() {
    hideAll();
    renderCampaigns();
    document.getElementById("campaignSection").classList.remove("hidden");
}

function showCreateForm() {
    hideAll();

    document.getElementById("campaignForm").reset();
    document.getElementById("campaignId").value = "";
    document.getElementById("formTitle").textContent = "Create Campaign";
    document.getElementById("message").textContent = "";

    document.getElementById("formSection").classList.remove("hidden");
}

function renderCampaigns() {
    const list = document.getElementById("campaignList");
    const filter = document.getElementById("statusFilter").value;

    list.innerHTML = "";

    const results =
        filter === "All"
            ? campaigns
            : campaigns.filter(campaign => campaign.status === filter);

    if (results.length === 0) {
        list.innerHTML = "<p>No campaigns found.</p>";
        return;
    }

    results.forEach(campaign => {
        const card = document.createElement("div");
        card.className = "campaign-card";

        const actionButtons = canWrite()
            ? `
                <button onclick="viewCampaign('${campaign.id}')">View</button>
                <button onclick="editCampaign('${campaign.id}')">Edit</button>
                <button onclick="deleteCampaign('${campaign.id}')">Delete</button>
            `
            : `<button onclick="viewCampaign('${campaign.id}')">View</button>`;

        card.innerHTML = `
            <h3>${campaign.campaignName}</h3>
            <p><strong>Client:</strong> ${campaign.client}</p>
            <p><strong>Channel:</strong> ${campaign.channel}</p>
            <p><strong>Status:</strong> ${campaign.status}</p>
            ${actionButtons}
        `;

        list.appendChild(card);
    });
}

function readFormData() {
    return {
        campaignName: document.getElementById("campaignName").value.trim(),
        client: document.getElementById("client").value.trim(),
        brand: document.getElementById("brand").value.trim(),
        objective: document.getElementById("objective").value.trim(),
        targetAudience: document.getElementById("targetAudience").value.trim(),
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        budget: document.getElementById("budget").value,
        channel: document.getElementById("channel").value,
        status: document.getElementById("status").value
    };
}

async function saveCampaign(event) {
    event.preventDefault();

    const data = readFormData();
    const message = document.getElementById("message");

    if (
        !data.campaignName ||
        !data.client ||
        !data.brand ||
        !data.objective ||
        !data.targetAudience ||
        !data.startDate ||
        !data.endDate ||
        !data.budget ||
        !data.channel
    ) {
        message.textContent = "Please complete all required fields.";
        return;
    }

    if (data.endDate < data.startDate) {
        message.textContent =
            "End date cannot be before the start date.";
        return;
    }

    if (Number(data.budget) < 0) {
        message.textContent =
            "Budget must be zero or greater.";
        return;
    }

    const existingId = document.getElementById("campaignId").value;

    if (apiMode) {
        try {
            if (existingId) {
                await apiPut(`/api/campaigns/${existingId}`, data);
            } else {
                await apiPost("/api/campaigns", data);
            }

            await refreshCampaigns();
            updateDashboard();
            showCampaigns();
        } catch (error) {
            message.textContent = "Save failed: " + error.message;
        }
        return;
    }

    const campaign = {
        id: existingId ? Number(existingId) : Date.now(),
        campaignName: data.campaignName,
        client: data.client,
        brand: data.brand,
        objective: data.objective,
        targetAudience: data.targetAudience,
        startDate: data.startDate,
        endDate: data.endDate,
        budget: Number(data.budget),
        channel: data.channel,
        status: data.status
    };

    if (existingId) {
        const index = campaigns.findIndex(
            item => item.id === Number(existingId)
        );

        if (index !== -1) {
            campaigns[index] = campaign;
        }
    } else {
        campaigns.push(campaign);
    }

    saveToStorage();
    updateDashboard();
    showCampaigns();
}

function viewCampaign(id) {
    const campaign = campaigns.find(item => item.id === id);

    if (!campaign) {
        return;
    }

    hideAll();

    document.getElementById("campaignDetails").innerHTML = `
        <h3>${campaign.campaignName}</h3>
        <p><strong>Client:</strong> ${campaign.client}</p>
        <p><strong>Brand:</strong> ${campaign.brand}</p>
        <p><strong>Objective:</strong> ${campaign.objective}</p>
        <p><strong>Target Audience:</strong> ${campaign.targetAudience}</p>
        <p><strong>Start Date:</strong> ${campaign.startDate}</p>
        <p><strong>End Date:</strong> ${campaign.endDate}</p>
        <p><strong>Budget:</strong> $${campaign.budget}</p>
        <p><strong>Channel:</strong> ${campaign.channel}</p>
        <p><strong>Status:</strong> ${campaign.status}</p>
    `;

    document.getElementById("detailsSection").classList.remove("hidden");
}

function editCampaign(id) {
    const campaign = campaigns.find(item => item.id === id);

    if (!campaign) {
        return;
    }

    hideAll();

    document.getElementById("campaignId").value = campaign.id;
    document.getElementById("campaignName").value =
        campaign.campaignName;
    document.getElementById("client").value = campaign.client;
    document.getElementById("brand").value = campaign.brand;
    document.getElementById("objective").value =
        campaign.objective;
    document.getElementById("targetAudience").value =
        campaign.targetAudience;
    document.getElementById("startDate").value =
        campaign.startDate;
    document.getElementById("endDate").value =
        campaign.endDate;
    document.getElementById("budget").value =
        campaign.budget;
    document.getElementById("channel").value =
        campaign.channel;
    document.getElementById("status").value =
        campaign.status;

    document.getElementById("formTitle").textContent =
        "Edit Campaign";
    document.getElementById("message").textContent = "";

    document.getElementById("formSection").classList.remove("hidden");
}

async function deleteCampaign(id) {
    const campaign = campaigns.find(item => item.id === id);

    if (!campaign) {
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to delete "${campaign.campaignName}"?`
    );

    if (!confirmed) {
        return;
    }

    if (apiMode) {
        try {
            await apiDelete(`/api/campaigns/${id}`);
            await refreshCampaigns();
            updateDashboard();
            renderCampaigns();
        } catch (error) {
            alert("Delete failed: " + error.message);
        }
        return;
    }

    campaigns = campaigns.filter(item => item.id !== id);

    saveToStorage();
    updateDashboard();
    renderCampaigns();
}

initData();