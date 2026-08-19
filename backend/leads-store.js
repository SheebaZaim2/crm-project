const { initDatabase, getDb, sampleLeads, LEAD_STATUSES, CONSENT_STATUSES } = require("./db");

const table = "leads";
let leads = [...sampleLeads];
let dbReady = initDatabase();

const LEAD_COLUMNS =
  "id, campaignId, firstName, lastName, email, phone, company, jobTitle, sourcePlatform, consentStatus, leadStatus, leadScore, budgetRange, stage, assignedOwner, lastContacted, notes, createdDate";

function mapRow(row) {
  return row ? { ...row, leadScore: Number(row.leadScore || 0) } : null;
}

function nextLeadId() {
  const current = dbReady ? getDb().prepare(`SELECT * FROM ${table}`).all() : leads;
  const maxNumeric = current.reduce((max, item) => {
    const match = /^LEAD-(\d+)$/.exec(item.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `LEAD-${String(maxNumeric + 1).padStart(3, "0")}`;
}

function validateLead(body) {
  if (!body || typeof body !== "object") {
    return "Request body must be a JSON object";
  }

  const required = ["campaignId", "firstName", "lastName", "email", "sourcePlatform", "consentStatus", "leadStatus"];

  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return `${field} is required`;
    }
  }

  const allowedChannels = ["Facebook", "Instagram", "YouTube", "TikTok"];

  if (!allowedChannels.includes(body.sourcePlatform)) {
    return "sourcePlatform must be Facebook, Instagram, YouTube or TikTok";
  }

  if (!CONSENT_STATUSES.includes(body.consentStatus)) {
    return `consentStatus must be ${CONSENT_STATUSES.join(", ")}`;
  }

  if (!LEAD_STATUSES.includes(body.leadStatus)) {
    return `leadStatus must be ${LEAD_STATUSES.join(", ")}`;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(body.email)) {
    return "email must be a valid email address";
  }

  return null;
}

function toLeadPayload(body, id) {
  const score = body.leadScore === undefined || body.leadScore === null || body.leadScore === ""
    ? 0
    : Number(body.leadScore);

  return {
    id,
    campaignId: body.campaignId,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phone: body.phone || "",
    company: body.company || "",
    jobTitle: body.jobTitle || "",
    sourcePlatform: body.sourcePlatform,
    consentStatus: body.consentStatus,
    leadStatus: body.leadStatus,
    leadScore: Number.isFinite(score) ? score : 0,
    budgetRange: body.budgetRange || "",
    stage: body.stage || "",
    assignedOwner: body.assignedOwner || "",
    lastContacted: body.lastContacted || null,
    notes: body.notes || "",
    createdDate: body.createdDate || new Date().toISOString().slice(0, 10)
  };
}

function list() {
  if (dbReady) {
    return getDb().prepare(`SELECT * FROM ${table}`).all().map(mapRow);
  }
  return leads;
}

function findById(id) {
  if (dbReady) {
    return mapRow(getDb().prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id));
  }
  return leads.find((item) => item.id === id);
}

function create(body) {
  const lead = toLeadPayload(body, nextLeadId());

  if (dbReady) {
    getDb()
      .prepare(`INSERT INTO ${table} (${LEAD_COLUMNS}) VALUES (@id, @campaignId, @firstName, @lastName, @email, @phone, @company, @jobTitle, @sourcePlatform, @consentStatus, @leadStatus, @leadScore, @budgetRange, @stage, @assignedOwner, @lastContacted, @notes, @createdDate)`)
      .run(lead);
  }

  leads.push(lead);
  return lead;
}

function update(id, body) {
  const existing = findById(id);

  if (!existing) {
    return null;
  }

  const updated = toLeadPayload({ ...existing, ...body }, id);

  if (dbReady) {
    getDb()
      .prepare(`UPDATE ${table} SET campaignId = @campaignId, firstName = @firstName, lastName = @lastName, email = @email, phone = @phone, company = @company, jobTitle = @jobTitle, sourcePlatform = @sourcePlatform, consentStatus = @consentStatus, leadStatus = @leadStatus, leadScore = @leadScore, budgetRange = @budgetRange, stage = @stage, assignedOwner = @assignedOwner, lastContacted = @lastContacted, notes = @notes, createdDate = @createdDate WHERE id = @id`)
      .run(updated);
  }

  const index = leads.findIndex((item) => item.id === id);
  if (index !== -1) {
    leads[index] = updated;
  }

  return updated;
}

function remove(id) {
  const existing = findById(id);

  if (!existing) {
    return null;
  }

  if (dbReady) {
    getDb().prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  }

  leads = leads.filter((item) => item.id !== id);
  return existing;
}

function reset() {
  if (dbReady) {
    const db = getDb();
    db.exec(`DELETE FROM ${table}`);

    const insert = db.prepare(
      `INSERT INTO ${table} (${LEAD_COLUMNS}) VALUES (@id, @campaignId, @firstName, @lastName, @email, @phone, @company, @jobTitle, @sourcePlatform, @consentStatus, @leadStatus, @leadScore, @budgetRange, @stage, @assignedOwner, @lastContacted, @notes, @createdDate)`
    );

    for (const lead of sampleLeads) {
      insert.run(lead);
    }
  }

  leads = [...sampleLeads];
}

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
  reset,
  validateLead,
  LEAD_STATUSES,
  CONSENT_STATUSES
};