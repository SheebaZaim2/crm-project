function showSocial() {
    hideAll();
    document.getElementById("socialSection").classList.remove("hidden");
    loadConnectors();
}

function setSocialStatus(text) {
    const element = document.getElementById("socialStatus");

    if (element) {
        element.textContent = text;
    }
}

async function loadConnectors() {
    setSocialStatus("Loading connectors...");

    try {
        const result = await apiGet("/api/social/connectors");

        if (!result.success) {
            setSocialStatus(result.message || "Failed to load connectors");
            return;
        }

        setSocialStatus("Connectors loaded");
        renderConnectors(result.data);
    } catch (error) {
        setSocialStatus("Failed to load connectors: " + error.message);
    }
}

function renderConnectors(connectors) {
    const container = document.getElementById("connectorList");

    if (connectors.length === 0) {
        container.innerHTML = "<p>No connectors configured.</p>";
        return;
    }

    container.innerHTML = "";

    connectors.forEach(connector => {
        const card = document.createElement("div");
        card.className = "campaign-card";
        card.innerHTML = `
            <h3>${connector.name}</h3>
            <p><strong>Platform:</strong> ${connector.platform}</p>
            <p><strong>Mode:</strong> ${connector.mode}</p>
            <p><strong>Status:</strong> ${connector.status}</p>
            <p><strong>Priority:</strong> ${connector.priority}</p>
        `;
        container.appendChild(card);
    });
}