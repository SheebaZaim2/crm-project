const { initDatabase, getDb, sampleScheduledPosts, sampleCampaignActivities } = require("../db");
const contentStore = require("../content-store");

const POSTS_TABLE = "scheduled_posts";
const ACTIVITY_TABLE = "campaign_activities";

let scheduledPosts = [...sampleScheduledPosts];
let campaignActivities = [...sampleCampaignActivities];
let dbReady = initDatabase();

function nextId(prefix, rows) {
  const maxNumeric = rows.reduce((max, row) => {
    const match = new RegExp(`^${prefix}-(\\d+)$`).exec(row.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `${prefix}-${String(maxNumeric + 1).padStart(3, "0")}`;
}

function listPosts() {
  if (dbReady) {
    return getDb().prepare(`SELECT * FROM ${POSTS_TABLE}`).all();
  }
  return scheduledPosts;
}

function listActivities() {
  if (dbReady) {
    return getDb().prepare(`SELECT * FROM ${ACTIVITY_TABLE} ORDER BY createdAt DESC`).all();
  }
  return [...campaignActivities].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function findPostById(id) {
  if (dbReady) {
    return getDb().prepare(`SELECT * FROM ${POSTS_TABLE} WHERE id = ?`).get(id);
  }
  return scheduledPosts.find((item) => item.id === id);
}

function logActivity(campaignId, action, details, outcome, performedBy) {
  const activity = {
    id: nextId(
      "ACT",
      dbReady ? getDb().prepare(`SELECT * FROM ${ACTIVITY_TABLE}`).all() : campaignActivities
    ),
    campaignId,
    action,
    details: details || "",
    outcome,
    performedBy,
    createdAt: new Date().toISOString()
  };

  if (dbReady) {
    getDb()
      .prepare(
        `INSERT INTO ${ACTIVITY_TABLE} (id, campaignId, action, details, outcome, performedBy, createdAt)
         VALUES (@id, @campaignId, @action, @details, @outcome, @performedBy, @createdAt)`
      )
      .run(activity);
  }

  campaignActivities.push(activity);
  return activity;
}

function schedule(id, scheduledAt, performedBy) {
  const content = contentStore.findById(id);

  if (!content) {
    return null;
  }

  if (content.status !== "Approved") {
    return { error: "Only Approved content can be scheduled" };
  }

  const post = {
    id: nextId(
      "POST",
      dbReady ? getDb().prepare(`SELECT * FROM ${POSTS_TABLE}`).all() : scheduledPosts
    ),
    contentId: id,
    campaignId: content.campaignId,
    platform: content.channel,
    scheduledAt: scheduledAt || content.scheduledDate || new Date().toISOString().slice(0, 10),
    publishedAt: null,
    outcome: "Scheduled"
  };

  if (dbReady) {
    getDb()
      .prepare(
        `INSERT INTO ${POSTS_TABLE} (id, contentId, campaignId, platform, scheduledAt, publishedAt, outcome)
         VALUES (@id, @contentId, @campaignId, @platform, @scheduledAt, @publishedAt, @outcome)`
      )
      .run(post);
  }

  scheduledPosts.push(post);

  const updated = contentStore.updateStatus(id, "Scheduled");
  logActivity(content.campaignId, "SchedulePost", `Content ${id} scheduled on ${post.platform}`, "Scheduled", performedBy);

  return { post, content: updated };
}

function publish(id, performedBy) {
  const post = findPostById(id);

  if (!post) {
    return null;
  }

  if (post.outcome !== "Scheduled") {
    return { error: "Only Scheduled posts can be published" };
  }

  const published = {
    ...post,
    publishedAt: new Date().toISOString(),
    outcome: "Published"
  };

  if (dbReady) {
    getDb()
      .prepare(`UPDATE ${POSTS_TABLE} SET publishedAt = @publishedAt, outcome = @outcome WHERE id = @id`)
      .run(published);
  }

  const index = scheduledPosts.findIndex((item) => item.id === id);
  if (index !== -1) {
    scheduledPosts[index] = published;
  }

  const content = contentStore.updateStatus(post.contentId, "Posted");
  logActivity(post.campaignId, "PublishPost", `Content ${post.contentId} published to ${post.platform}`, "Published", performedBy);

  return { post: published, content };
}

function reset() {
  if (dbReady) {
    const db = getDb();
    db.exec(`DELETE FROM ${POSTS_TABLE}; DELETE FROM ${ACTIVITY_TABLE};`);
  }

  scheduledPosts = [...sampleScheduledPosts];
  campaignActivities = [...sampleCampaignActivities];
}

module.exports = {
  listPosts,
  listActivities,
  findPostById,
  schedule,
  publish,
  logActivity,
  reset
};