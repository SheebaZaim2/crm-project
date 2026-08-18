const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DEFAULT_DB_PATH = path.join(__dirname, "data", "crm.db");

const sampleCampaigns = [
  {
    id: "CAM-001",
    campaignName: "Spring Awareness Demo",
    client: "Fictional Client",
    brand: "Divinenet Demo",
    objective: "Increase fictional brand awareness",
    targetAudience: "Fictional small-business owners",
    startDate: "2026-08-15",
    endDate: "2026-08-31",
    budget: 1000,
    channel: "Facebook",
    status: "Draft"
  }
];

const COLUMNS =
  "id, campaignName, client, brand, objective, targetAudience, startDate, endDate, budget, channel, status";

let db = null;

function initDatabase() {
  const dbPath = process.env.DB_PATH || DEFAULT_DB_PATH;

  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id              TEXT PRIMARY KEY,
        campaignName    TEXT NOT NULL,
        client          TEXT NOT NULL,
        brand           TEXT NOT NULL,
        objective       TEXT NOT NULL,
        targetAudience  TEXT NOT NULL,
        startDate       TEXT NOT NULL,
        endDate         TEXT NOT NULL,
        budget          REAL NOT NULL,
        channel         TEXT NOT NULL,
        status          TEXT NOT NULL
      );
    `);

    const count = db.prepare("SELECT COUNT(*) AS n FROM campaigns").get().n;

    if (count === 0) {
      const insert = db.prepare(
        `INSERT INTO campaigns (${COLUMNS}) VALUES (@id, @campaignName, @client, @brand, @objective, @targetAudience, @startDate, @endDate, @budget, @channel, @status)`
      );

      for (const campaign of sampleCampaigns) {
        insert.run(campaign);
      }
    }

    return true;
  } catch (error) {
    db = null;
    return false;
  }
}

function getDb() {
  return db;
}

module.exports = {
  initDatabase,
  getDb,
  sampleCampaigns,
  COLUMNS
};