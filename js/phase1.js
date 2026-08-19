function showPhase1() {
    hideAll();
    document.getElementById("phase1Section").classList.remove("hidden");
    loadPhase1();
}

function setPhase1Status(text) {
    const element = document.getElementById("phase1Status");

    if (element) {
        element.textContent = text;
    }
}

async function loadPhase1() {
    setPhase1Status("Loading Phase 1 data...");

    try {
        const [customers, users] = await Promise.all([
            apiGet("/api/phase1/customers"),
            apiGet("/api/phase1/users")
        ]);

        const sources = [];

        if (customers.source) {
            sources.push(customers.source);
        }

        if (users.source) {
            sources.push(users.source);
        }

        const warning = customers.warning || users.warning;

        setPhase1Status(
            `Loaded from ${[...new Set(sources)].join(", ")}${warning ? " (fallback used)" : ""}`
        );
        renderPhase1Customers(customers.data || []);
        renderPhase1Users(users.data || []);
    } catch (error) {
        setPhase1Status("Failed to load Phase 1 data: " + error.message);
    }
}

function renderPhase1Customers(customers) {
    const container = document.getElementById("phase1Customers");

    if (customers.length === 0) {
        container.innerHTML = "<p>No customers available.</p>";
        return;
    }

    container.innerHTML = "";

    customers.forEach(customer => {
        const card = document.createElement("div");
        card.className = "campaign-card";
        card.innerHTML = `
            <h3>${customer.clientName}</h3>
            <p><strong>ID:</strong> ${customer.id}</p>
            <p><strong>Contact:</strong> ${customer.contactEmail}</p>
            <p><strong>Phone:</strong> ${customer.contactPhone}</p>
        `;
        container.appendChild(card);
    });
}

function renderPhase1Users(users) {
    const container = document.getElementById("phase1Users");

    if (users.length === 0) {
        container.innerHTML = "<p>No users available.</p>";
        return;
    }

    container.innerHTML = "";

    users.forEach(user => {
        const card = document.createElement("div");
        card.className = "campaign-card";
        card.innerHTML = `
            <h3>${user.fullName}</h3>
            <p><strong>ID:</strong> ${user.id}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Role:</strong> ${user.role}</p>
        `;
        container.appendChild(card);
    });
}