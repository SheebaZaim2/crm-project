const { initDatabase, getDb, sampleContentItems, sampleApprovals } = require("./db");

const CONTENT_TABLE = "content_items";
const APPROVAL_TABLE = "approvals";
const CONTENT_STATUSES = ["Draft", "Submitted", "Approved", "Rejected", "Scheduled", "Posted"];
const DECISIONS = ["Approve", "Reject", "Comment"];

let contentItems = [...sampleContentItems];
let approvals = [...sampleApprovals];
let dbReady = initDatabase();

function nextId(prefix, rows) {
  const maxNumeric = rows.reduce((max, row) => {
    const match = new RegExp(`^${prefix}-(\\d+)$`).exec(row.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `${prefix}-${String(maxNumeric + 1).padStart(3, "0")}`;
}

function mapContentRow(row) {
  return row ? { ...row } : null;
}

function withApprovals(items) {
  return items.map((item) => {
    const itemApprovals = dbReady
      ? getDb()
          .prepare(`SELECT * FROM ${APPROVAL_TABLE} WHERE contentId = ?`)
          .all(item.id)
      : approvals.filter((approval) => approval.contentId === item.id);

    return { ...item, approvals: itemApprovals };
  });
}

function validateContent(body) {
  if (!body || typeof body !== "object") {
    return "Request body must be a JSON object";
  }

  const required = ["campaignId", "title", "body", "channel", "scheduledDate"];

  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return `${field} is required`;
    }
  }

  const allowedChannels = ["Facebook", "Instagram", "YouTube", "TikTok"];

  if (!allowedChannels.includes(body.channel)) {
    return "Channel must be Facebook, Instagram, YouTube or TikTok";
  }

  return null;
}

function list() {
  const items = dbReady
    ? getDb().prepare(`SELECT * FROM ${CONTENT_TABLE}`).all().map(mapContentRow)
    : contentItems;

  return withApprovals(items);
}

function findById(id) {
  const item = dbReady
    ? mapContentRow(getDb().prepare(`SELECT * FROM ${CONTENT_TABLE} WHERE id = ?`).get(id))
    : contentItems.find((item) => item.id === id);

  if (!item) {
    return null;
  }

  const itemApprovals = dbReady
    ? getDb().prepare(`SELECT * FROM ${APPROVAL_TABLE} WHERE contentId = ?`).all(id)
    : approvals.filter((approval) => approval.contentId === id);

  return { ...item, approvals: itemApprovals };
}

function create(body) {
  const item = {
    id: nextId(
      "CONTENT",
      dbReady ? getDb().prepare(`SELECT * FROM ${CONTENT_TABLE}`).all() : contentItems
    ),
    campaignId: body.campaignId,
    title: body.title,
    body: body.body,
    channel: body.channel,
    scheduledDate: body.scheduledDate,
    status: "Draft",
    createdBy: body.createdBy || "unknown",
    submittedAt: null,
    decidedAt: null
  };

  if (dbReady) {
    getDb()
      .prepare(
        `INSERT INTO ${CONTENT_TABLE} (id, campaignId, title, body, channel, scheduledDate, status, createdBy, submittedAt, decidedAt)
         VALUES (@id, @campaignId, @title, @body, @channel, @scheduledDate, @status, @createdBy, @submittedAt, @decidedAt)`
      )
      .run(item);
  }

  contentItems.push(item);
  return { ...item, approvals: [] };
}

function update(id, body) {
  const existing = findById(id);

  if (!existing) {
    return null;
  }

  if (existing.status !== "Draft" && existing.status !== "Rejected") {
    return { error: "Only Draft or Rejected content can be edited" };
  }

  const updated = {
    ...existing,
    campaignId: body.campaignId,
    title: body.title,
    body: body.body,
    channel: body.channel,
    scheduledDate: body.scheduledDate
  };

  if (dbReady) {
    getDb()
      .prepare(
        `UPDATE ${CONTENT_TABLE} SET campaignId = @campaignId, title = @title, body = @body, channel = @channel, scheduledDate = @scheduledDate WHERE id = @id`
      )
      .run(updated);
  }

  const index = contentItems.findIndex((item) => item.id === id);
  if (index !== -1) {
    contentItems[index] = { ...updated, approvals: existing.approvals };
  }

  return { ...updated, approvals: existing.approvals };
}

function remove(id) {
  const existing = findById(id);

  if (!existing) {
    return null;
  }

  if (existing.status === "Approved" || existing.status === "Scheduled" || existing.status === "Posted") {
    return { error: "Approved or posted content cannot be deleted" };
  }

  if (dbReady) {
    getDb().prepare(`DELETE FROM ${CONTENT_TABLE} WHERE id = ?`).run(id);
    getDb().prepare(`DELETE FROM ${APPROVAL_TABLE} WHERE contentId = ?`).run(id);
  }

  contentItems = contentItems.filter((item) => item.id !== id);
  approvals = approvals.filter((approval) => approval.contentId !== id);
  return existing;
}

function submit(id) {
  const existing = findById(id);

  if (!existing) {
    return null;
  }

  if (existing.status !== "Draft" && existing.status !== "Rejected") {
    return { error: "Only Draft or Rejected content can be submitted" };
  }

  const updated = { ...existing, status: "Submitted", submittedAt: new Date().toISOString() };

  if (dbReady) {
    getDb()
      .prepare(`UPDATE ${CONTENT_TABLE} SET status = @status, submittedAt = @submittedAt WHERE id = @id`)
      .run(updated);
  }

  const index = contentItems.findIndex((item) => item.id === id);
  if (index !== -1) {
    contentItems[index] = updated;
  }

  return { ...updated, approvals: existing.approvals };
}

function decide(id, decision, comment, decidedBy) {
  const existing = findById(id);

  if (!existing) {
    return null;
  }

  if (existing.status !== "Submitted") {
    return { error: "Only Submitted content can be approved or rejected" };
  }

  const approval = {
    id: nextId(
      "APR",
      dbReady ? getDb().prepare(`SELECT * FROM ${APPROVAL_TABLE}`).all() : approvals
    ),
    contentId: id,
    decision,
    comment: comment || "",
    decidedBy,
    decidedAt: new Date().toISOString()
  };

  const status = decision === "Approve" ? "Approved" : "Rejected";

  const updated = { ...existing, status, decidedAt: approval.decidedAt };

  if (dbReady) {
    const db = getDb();
    db.prepare(
      `INSERT INTO ${APPROVAL_TABLE} (id, contentId, decision, comment, decidedBy, decidedAt)
       VALUES (@id, @contentId, @decision, @comment, @decidedBy, @decidedAt)`
    ).run(approval);
    db.prepare(`UPDATE ${CONTENT_TABLE} SET status = @status, decidedAt = @decidedAt WHERE id = @id`).run({
      status,
      decidedAt: approval.decidedAt,
      id
    });
  }

  approvals.push(approval);
  const index = contentItems.findIndex((item) => item.id === id);
  if (index !== -1) {
    contentItems[index] = updated;
  }

  return { ...updated, approvals: [...existing.approvals, approval] };
}

function reset() {
  if (dbReady) {
    const db = getDb();
    db.exec(`DELETE FROM ${APPROVAL_TABLE}; DELETE FROM ${CONTENT_TABLE};`);

    const insert = db.prepare(
      `INSERT INTO ${CONTENT_TABLE} (id, campaignId, title, body, channel, scheduledDate, status, createdBy, submittedAt, decidedAt)
       VALUES (@id, @campaignId, @title, @body, @channel, @scheduledDate, @status, @createdBy, @submittedAt, @decidedAt)`
    );

    for (const item of sampleContentItems) {
      insert.run(item);
    }
  }

  contentItems = [...sampleContentItems];
  approvals = [...sampleApprovals];
}

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
  submit,
  decide,
  reset,
  validateContent,
  CONTENT_STATUSES,
  DECISIONS
};