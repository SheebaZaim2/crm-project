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

const sampleContentItems = [
  {
    id: "CONTENT-001",
    campaignId: "CAM-001",
    title: "Spring Launch Post",
    body: "Introducing our fictional spring collection. Fictional content for demonstration.",
    channel: "Facebook",
    scheduledDate: "2026-08-22",
    status: "Draft",
    createdBy: "staff@divinenet.test",
    submittedAt: null,
    decidedAt: null
  }
];

const sampleApprovals = [];

const KPI_CORE_METRICS = [
  "Reach",
  "Impressions",
  "Clicks",
  "CTR",
  "Engagement rate",
  "CPC",
  "Leads captured",
  "Conversion rate",
  "CPL",
  "CPA",
  "ROI"
];

const KPI_PLATFORM_METRICS = {
  Facebook: ["Likes", "Comments", "Shares", "Saves"],
  Instagram: ["Likes", "Comments", "Shares", "Saves"],
  YouTube: ["Views", "Watch time"],
  TikTok: ["Plays", "Followers gained"]
};

const sampleKpiRecords = [
  { id: "KPI-001", campaignId: "CAM-001", metric: "Reach", value: 12500, recordedDate: "2026-08-20" },
  { id: "KPI-002", campaignId: "CAM-001", metric: "Impressions", value: 18400, recordedDate: "2026-08-20" },
  { id: "KPI-003", campaignId: "CAM-001", metric: "Clicks", value: 940, recordedDate: "2026-08-20" },
  { id: "KPI-004", campaignId: "CAM-001", metric: "CTR", value: 5.1, recordedDate: "2026-08-20" },
  { id: "KPI-005", campaignId: "CAM-001", metric: "Engagement rate", value: 4.6, recordedDate: "2026-08-20" },
  { id: "KPI-006", campaignId: "CAM-001", metric: "CPC", value: 0.42, recordedDate: "2026-08-20" },
  { id: "KPI-007", campaignId: "CAM-001", metric: "Leads captured", value: 87, recordedDate: "2026-08-20" },
  { id: "KPI-008", campaignId: "CAM-001", metric: "Conversion rate", value: 9.3, recordedDate: "2026-08-20" },
  { id: "KPI-009", campaignId: "CAM-001", metric: "CPL", value: 4.55, recordedDate: "2026-08-20" },
  { id: "KPI-010", campaignId: "CAM-001", metric: "CPA", value: 48.9, recordedDate: "2026-08-20" },
  { id: "KPI-011", campaignId: "CAM-001", metric: "ROI", value: 212, recordedDate: "2026-08-20" },
  { id: "KPI-012", campaignId: "CAM-001", metric: "Likes", value: 620, recordedDate: "2026-08-20" },
  { id: "KPI-013", campaignId: "CAM-001", metric: "Comments", value: 95, recordedDate: "2026-08-20" },
  { id: "KPI-014", campaignId: "CAM-001", metric: "Shares", value: 48, recordedDate: "2026-08-20" },
  { id: "KPI-015", campaignId: "CAM-001", metric: "Saves", value: 33, recordedDate: "2026-08-20" }
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

      CREATE TABLE IF NOT EXISTS content_items (
        id            TEXT PRIMARY KEY,
        campaignId    TEXT NOT NULL,
        title         TEXT NOT NULL,
        body          TEXT NOT NULL,
        channel       TEXT NOT NULL,
        scheduledDate TEXT NOT NULL,
        status        TEXT NOT NULL,
        createdBy     TEXT NOT NULL,
        submittedAt   TEXT,
        decidedAt     TEXT
      );

      CREATE TABLE IF NOT EXISTS approvals (
        id          TEXT PRIMARY KEY,
        contentId   TEXT NOT NULL,
        decision    TEXT NOT NULL,
        comment     TEXT,
        decidedBy   TEXT NOT NULL,
        decidedAt   TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS kpi_records (
        id           TEXT PRIMARY KEY,
        campaignId   TEXT NOT NULL,
        metric       TEXT NOT NULL,
        value        REAL NOT NULL,
        recordedDate TEXT NOT NULL
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

    const contentCount = db
      .prepare("SELECT COUNT(*) AS n FROM content_items")
      .get().n;

    if (contentCount === 0) {
      const insert = db.prepare(
        `INSERT INTO content_items (id, campaignId, title, body, channel, scheduledDate, status, createdBy, submittedAt, decidedAt)
         VALUES (@id, @campaignId, @title, @body, @channel, @scheduledDate, @status, @createdBy, @submittedAt, @decidedAt)`
      );

      for (const item of sampleContentItems) {
        insert.run(item);
      }
    }

    const kpiCount = db.prepare("SELECT COUNT(*) AS n FROM kpi_records").get().n;

    if (kpiCount === 0) {
      const insert = db.prepare(
        `INSERT INTO kpi_records (id, campaignId, metric, value, recordedDate)
         VALUES (@id, @campaignId, @metric, @value, @recordedDate)`
      );

      for (const record of sampleKpiRecords) {
        insert.run(record);
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
  sampleContentItems,
  sampleApprovals,
  sampleKpiRecords,
  KPI_CORE_METRICS,
  KPI_PLATFORM_METRICS,
  COLUMNS
};