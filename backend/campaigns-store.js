const { initDatabase, getDb, sampleCampaigns, COLUMNS } = require("./db");

const table = "campaigns";
let campaigns = [...sampleCampaigns];
let dbReady = initDatabase();

function mapRow(row) {
  return row ? { ...row, budget: Number(row.budget) } : null;
}

function toCampaignPayload(body, id) {
  return {
    id,
    campaignName: body.campaignName,
    client: body.client,
    brand: body.brand,
    objective: body.objective,
    targetAudience: body.targetAudience,
    startDate: body.startDate,
    endDate: body.endDate,
    budget: Number(body.budget),
    channel: body.channel,
    status: body.status
  };
}

function nextCampaignId() {
  const current = dbReady ? getDb().prepare(`SELECT * FROM ${table}`).all() : campaigns;
  const maxNumeric = current.reduce((max, item) => {
    const match = /^CAM-(\d+)$/.exec(item.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `CAM-${String(maxNumeric + 1).padStart(3, "0")}`;
}

function list() {
  if (dbReady) {
    return getDb().prepare(`SELECT * FROM ${table}`).all().map(mapRow);
  }
  return campaigns;
}

function findById(id) {
  if (dbReady) {
    return mapRow(getDb().prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id));
  }
  return campaigns.find((item) => item.id === id);
}

function create(body) {
  const campaign = toCampaignPayload(body, nextCampaignId());

  if (dbReady) {
    getDb()
      .prepare(
        `INSERT INTO ${table} (${COLUMNS}) VALUES (@id, @campaignName, @client, @brand, @objective, @targetAudience, @startDate, @endDate, @budget, @channel, @status)`
      )
      .run(campaign);
  }

  campaigns.push(campaign);
  return campaign;
}

function update(id, body) {
  const existing = findById(id);

  if (!existing) {
    return null;
  }

  const updated = toCampaignPayload(body, id);

  if (dbReady) {
    getDb()
      .prepare(
        `UPDATE ${table} SET campaignName = @campaignName, client = @client, brand = @brand, objective = @objective, targetAudience = @targetAudience, startDate = @startDate, endDate = @endDate, budget = @budget, channel = @channel, status = @status WHERE id = @id`
      )
      .run(updated);
  }

  const index = campaigns.findIndex((item) => item.id === id);
  if (index !== -1) {
    campaigns[index] = updated;
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

  campaigns = campaigns.filter((item) => item.id !== id);
  return existing;
}

function reset() {
  if (dbReady) {
    const db = getDb();
    db.exec(`DELETE FROM ${table}`);

    const insert = db.prepare(
      `INSERT INTO ${table} (${COLUMNS}) VALUES (@id, @campaignName, @client, @brand, @objective, @targetAudience, @startDate, @endDate, @budget, @channel, @status)`
    );

    for (const campaign of sampleCampaigns) {
      insert.run(campaign);
    }
  }

  campaigns = [...sampleCampaigns];
}

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
  reset
};