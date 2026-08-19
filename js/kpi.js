let cachedAnalytics = null;

function showAnalytics() {
    hideAll();
    document.getElementById("analyticsSection").classList.remove("hidden");
    populateCampaignFilter();
    loadAnalytics();
}

async function populateCampaignFilter() {
    const select = document.getElementById("analyticsCampaign");
    const current = select.value;
    select.innerHTML = '<option value="">All Campaigns</option>';

    try {
        const result = await apiGet("/api/campaigns");

        if (result.success && Array.isArray(result.data)) {
            for (const campaign of result.data) {
                const option = document.createElement("option");
                option.value = campaign.id;
                option.textContent = campaign.campaignName;
                select.appendChild(option);
            }
        }
    } catch (error) {
        setAnalyticsStatus("Could not load campaigns: " + error.message);
    }

    select.value = current;
}

function setAnalyticsStatus(text) {
    const element = document.getElementById("analyticsStatus");

    if (element) {
        element.textContent = text;
    }
}

async function loadAnalytics() {
    const status = document.getElementById("analyticsStatus");
    status.textContent = "Loading analytics...";

    const campaignId = document.getElementById("analyticsCampaign").value;
    const query = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : "";

    try {
        const result = await apiGet(`/api/analytics/kpis${query}`);

        if (!result.success) {
            status.textContent = result.message || "Failed to load analytics";
            return;
        }

        cachedAnalytics = result.data;
        status.textContent =
            (result.note || "Analytics loaded") + ` — ${result.data.generatedAt}`;

        renderKpiCards(result.data.totals);
        renderCampaignTable(result.data.campaigns);
        renderPlatformTable(result.data.platforms);
    } catch (error) {
        status.textContent = "Failed to load analytics: " + error.message;
    }
}

function renderKpiCards(totals) {
    const container = document.getElementById("kpiCards");
    const keys = ["Reach", "Impressions", "Clicks", "CTR", "Engagement rate", "CPC", "Leads captured", "Conversion rate", "CPL", "CPA", "ROI"];

    container.innerHTML = "";

    for (const key of keys) {
        if (totals[key] === undefined || totals[key] === null) {
            continue;
        }

        const card = document.createElement("div");
        card.className = "card";

        const value =
            key === "CPC" || key === "CPL" || key === "CPA"
                ? "$" + Number(totals[key]).toFixed(2)
                : key === "ROI" || key === "CTR" || key === "Engagement rate" || key === "Conversion rate"
                    ? totals[key] + "%"
                    : totals[key];

        card.innerHTML = `<h3>${key}</h3><p>${value}</p>`;
        container.appendChild(card);
    }

    if (container.innerHTML === "") {
        container.innerHTML = "<p>No KPI data available.</p>";
    }
}

function renderCampaignTable(campaigns) {
    const container = document.getElementById("campaignKpiTable");

    if (!campaigns || campaigns.length === 0) {
        container.innerHTML = "<p>No campaigns found.</p>";
        return;
    }

    const metrics = ["Reach", "Impressions", "Clicks", "CTR", "Engagement rate", "CPC", "Leads captured", "Conversion rate", "CPL", "CPA", "ROI"];

    const head = metrics.map((metric) => `<th>${metric}</th>`).join("");

    const rows = campaigns
        .map((row) => {
            const cells = metrics
                .map((metric) => {
                    const value = row.metrics[metric];
                    return `<td>${value === undefined ? "-" : value}</td>`;
                })
                .join("");
            return `<tr><td><strong>${row.campaignName}</strong><br>${row.channel} · ${row.status}</td>${cells}</tr>`;
        })
        .join("");

    container.innerHTML = `
        <div class="table-wrap">
            <table class="kpi-table">
                <thead><tr><th>Campaign</th>${head}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function renderPlatformTable(platforms) {
    const container = document.getElementById("platformKpiTable");

    if (!platforms || platforms.length === 0) {
        container.innerHTML = "<p>No platform data available.</p>";
        return;
    }

    const metrics = ["Reach", "Impressions", "Clicks", "CTR", "Engagement rate", "CPC", "Leads captured", "Conversion rate", "CPL", "CPA", "ROI"];

    const head = metrics.map((metric) => `<th>${metric}</th>`).join("");

    const rows = platforms
        .map((row) => {
            const cells = metrics
                .map((metric) => {
                    const value = row.metrics[metric];
                    return `<td>${value === undefined ? "-" : value}</td>`;
                })
                .join("");
            return `<tr><td><strong>${row.channel}</strong><br>${row.campaignCount} campaign(s)</td>${cells}</tr>`;
        })
        .join("");

    container.innerHTML = `
        <div class="table-wrap">
            <table class="kpi-table">
                <thead><tr><th>Platform</th>${head}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

async function generateReport() {
    const message = document.getElementById("reportMessage");
    const narrative = document.getElementById("reportNarrative");
    const note = document.getElementById("reportNote");
    const campaignId = document.getElementById("analyticsCampaign").value;

    message.textContent = "Generating report...";
    note.classList.add("hidden");

    try {
        const result = await apiPost("/api/analytics/report", {
            campaignId: campaignId || undefined,
            extraInstructions: ""
        });

        if (!result.success) {
            message.textContent = result.message || "Report generation failed";
            return;
        }

        narrative.value = result.data.narrative;
        message.textContent =
            `Report generated (${result.data.provider}${result.data.warning ? " — fallback" : ""}).`;
        note.textContent =
            result.note || "AI report is editable and is never auto-published.";
        note.classList.remove("hidden");
    } catch (error) {
        message.textContent = "Report generation failed: " + error.message;
    }
}
