const { initDatabase, getDb, sampleKpiRecords, KPI_CORE_METRICS, KPI_PLATFORM_METRICS } = require("../db");
const store = require("../campaigns-store");

const TABLE = "kpi_records";
let kpiRecords = [...sampleKpiRecords];
let dbReady = initDatabase();

const RATE_METRICS = ["CTR", "Engagement rate", "Conversion rate", "ROI"];
const METRIC_KEYS = [...KPI_CORE_METRICS, ...Object.values(KPI_PLATFORM_METRICS).flat()];

function listRecords() {
  if (dbReady) {
    return getDb().prepare(`SELECT * FROM ${TABLE}`).all();
  }
  return kpiRecords;
}

function recordsForCampaign(records, campaignId) {
  return records.filter((record) => record.campaignId === campaignId);
}

function metricsFromRecords(records) {
  const metrics = {};

  for (const metric of METRIC_KEYS) {
    const match = records.find((record) => record.metric === metric);
    metrics[metric] = match ? Number(match.value) : 0;
  }

  return metrics;
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function combineMetrics(metricSets) {
  const combined = {};

  for (const metric of METRIC_KEYS) {
    const values = metricSets
      .map((set) => set[metric])
      .filter((value) => value !== undefined && value !== null);

    combined[metric] = RATE_METRICS.includes(metric)
      ? average(values)
      : Math.round(values.reduce((sum, value) => sum + value, 0) * 100) / 100;
  }

  return combined;
}

function getAnalytics(campaignId) {
  const campaigns = store.list();
  const records = listRecords();

  let selected = campaigns;

  if (campaignId) {
    selected = campaigns.filter((campaign) => campaign.id === campaignId);
  }

  const campaignRows = selected.map((campaign) => {
    const campaignRecords = recordsForCampaign(records, campaign.id);

    return {
      id: campaign.id,
      campaignName: campaign.campaignName,
      channel: campaign.channel,
      status: campaign.status,
      hasData: campaignRecords.length > 0,
      metrics: metricsFromRecords(campaignRecords)
    };
  });

  const platformNames = [...new Set(campaignRows.map((row) => row.channel))];

  const platforms = platformNames.map((channel) => ({
    channel,
    campaignCount: campaignRows.filter((row) => row.channel === channel).length,
    metrics: combineMetrics(campaignRows.filter((row) => row.channel === channel).map((row) => row.metrics))
  }));

  return {
    generatedAt: new Date().toISOString(),
    totalCampaigns: campaignRows.length,
    totals: combineMetrics(campaignRows.map((row) => row.metrics)),
    platforms,
    campaigns: campaignRows
  };
}

function getMetricsList() {
  return {
    core: KPI_CORE_METRICS,
    platforms: KPI_PLATFORM_METRICS
  };
}

function reset() {
  if (dbReady) {
    const db = getDb();
    db.exec(`DELETE FROM ${TABLE}`);

    const insert = db.prepare(
      `INSERT INTO ${TABLE} (id, campaignId, metric, value, recordedDate)
       VALUES (@id, @campaignId, @metric, @value, @recordedDate)`
    );

    for (const record of sampleKpiRecords) {
      insert.run(record);
    }
  }

  kpiRecords = [...sampleKpiRecords];
}

module.exports = {
  getAnalytics,
  getMetricsList,
  reset
};
