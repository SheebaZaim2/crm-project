const sampleCustomers = [
  {
    id: "CUST-001",
    clientName: "Fictional Client",
    contactEmail: "client@divinenet.test",
    contactPhone: "0400 000 001"
  },
  {
    id: "CUST-002",
    clientName: "Demo Retail",
    contactEmail: "retail@divinenet.test",
    contactPhone: "0400 000 002"
  }
];

const sampleUsers = [
  {
    id: "P1U-001",
    fullName: "Fictional Phase 1 User",
    email: "phase1.user@divinenet.test",
    role: "Staff"
  },
  {
    id: "P1U-002",
    fullName: "Demo Approver",
    email: "phase1.approver@divinenet.test",
    role: "Approver"
  }
];

function getApiBase() {
  return (process.env.PHASE1_API_BASE || "").replace(/\/$/, "");
}

function isMockForced() {
  return process.env.PHASE1_MOCK === "1" || !getApiBase();
}

async function fetchFromPhase1(path) {
  const response = await fetch(`${getApiBase()}${path}`);

  if (!response.ok) {
    throw new Error(`Phase 1 API error: HTTP ${response.status}`);
  }

  const body = await response.json();

  if (!body.success) {
    throw new Error(body.message || "Phase 1 API returned an error");
  }

  return body.data;
}

async function listCustomers() {
  if (isMockForced()) {
    return { data: sampleCustomers, source: "mock" };
  }

  try {
    const data = await fetchFromPhase1("/customers");
    return { data, source: "live" };
  } catch (error) {
    return { data: sampleCustomers, source: "mock", warning: error.message };
  }
}

async function listUsers() {
  if (isMockForced()) {
    return { data: sampleUsers, source: "mock" };
  }

  try {
    const data = await fetchFromPhase1("/users");
    return { data, source: "live" };
  } catch (error) {
    return { data: sampleUsers, source: "mock", warning: error.message };
  }
}

module.exports = {
  listCustomers,
  listUsers
};