const request = require("supertest");
const app = require("../server");
const store = require("../campaigns-store");
const contentStore = require("../content-store");
const analytics = require("../services/analytics");
const leadStore = require("../leads-store");
const automation = require("../services/automation");

const validCampaign = {
  campaignName: "Summer Launch Demo",
  client: "Fictional Client",
  brand: "Divinenet Demo",
  objective: "Boost awareness",
  targetAudience: "Fictional small-business owners",
  startDate: "2026-08-20",
  endDate: "2026-09-10",
  budget: 2000,
  channel: "Facebook",
  status: "Draft"
};

beforeEach(() => {
  store.reset();
  contentStore.reset();
  analytics.reset();
  leadStore.reset();
  automation.reset();
});

let adminToken;

async function loginAs(email, password) {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  return response.body.token;
}

beforeAll(async () => {
  process.env.AI_MOCK = "1";
  adminToken = await loginAs("admin@divinenet.test", "admin123");
});

const validContent = {
  campaignId: "CAM-001",
  title: "Sprint Post Draft",
  body: "Fictional post body for the sprint campaign.",
  channel: "Facebook",
  scheduledDate: "2026-08-22"
};

const validLead = {
  campaignId: "CAM-001",
  firstName: "Jamie",
  lastName: "Lee",
  email: "jamie.lee@example.com",
  phone: "0400 111 222",
  company: "Fictional Studio",
  jobTitle: "Owner",
  sourcePlatform: "Instagram",
  consentStatus: "Granted",
  leadStatus: "New",
  leadScore: 7,
  budgetRange: "$5k-$10k",
  stage: "Awareness",
  assignedOwner: "staff@divinenet.test",
  notes: "Found us via the fictional campaign."
};

describe("GET /api/health", () => {
  it("returns success and running message", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Divinenet CRM API is running");
  });
});

describe("GET /api/campaigns", () => {
  it("returns the sample campaigns", async () => {
    const response = await request(app)
      .get("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe("CAM-001");
  });
});

describe("GET /api/campaigns/:id", () => {
  it("returns a campaign by id", async () => {
    const response = await request(app)
      .get("/api/campaigns/CAM-001")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.campaignName).toBe("Spring Awareness Demo");
  });

  it("returns 404 for an unknown id", async () => {
    const response = await request(app)
      .get("/api/campaigns/NOPE")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Campaign not found");
  });
});

describe("POST /api/campaigns", () => {
  it("creates a campaign with a generated id", async () => {
    const response = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validCampaign);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe("CAM-002");
    expect(response.body.data.budget).toBe(2000);
  });

  it("rejects a missing required field", async () => {
    const response = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validCampaign, campaignName: "" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("campaignName is required");
  });

  it("rejects an end date before the start date", async () => {
    const response = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validCampaign, endDate: "2026-08-01" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("End date cannot be before start date");
  });

  it("rejects a negative budget", async () => {
    const response = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validCampaign, budget: -100 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Budget must be zero or greater");
  });

  it("accepts YouTube and TikTok channels", async () => {
    const response = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validCampaign, channel: "YouTube", campaignName: "YT Demo" });

    expect(response.status).toBe(201);

    const tiktok = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validCampaign, channel: "TikTok", campaignName: "TT Demo" });

    expect(tiktok.status).toBe(201);
    expect(tiktok.body.data.channel).toBe("TikTok");
  });

  it("rejects an unsupported channel", async () => {
    const response = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validCampaign, channel: "Snapchat" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Channel must be Facebook, Instagram, YouTube or TikTok");
  });

  it("rejects an unsupported status", async () => {
    const response = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validCampaign, status: "Archived" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Status must be Draft, Active, Paused or Completed"
    );
  });
});

describe("PUT /api/campaigns/:id", () => {
  it("updates an existing campaign", async () => {
    const response = await request(app)
      .put("/api/campaigns/CAM-001")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validCampaign, campaignName: "Updated Name" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe("CAM-001");
    expect(response.body.data.campaignName).toBe("Updated Name");
  });

  it("returns 404 when updating an unknown id", async () => {
    const response = await request(app)
      .put("/api/campaigns/NOPE")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validCampaign);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Campaign not found");
  });

  it("returns 400 when updating with invalid data", async () => {
    const response = await request(app)
      .put("/api/campaigns/CAM-001")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validCampaign, budget: -5 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Budget must be zero or greater");
  });
});

describe("DELETE /api/campaigns/:id", () => {
  it("removes an existing campaign", async () => {
    const response = await request(app)
      .delete("/api/campaigns/CAM-001")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe("CAM-001");

    const list = await request(app)
      .get("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(list.body.data).toHaveLength(0);
  });

  it("returns 404 when deleting an unknown id", async () => {
    const response = await request(app)
      .delete("/api/campaigns/NOPE")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Campaign not found");
  });
});

describe("unknown routes", () => {
  it("returns a JSON 404", async () => {
    const response = await request(app).get("/api/not-found");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Route not found");
  });
});

describe("POST /api/auth/login", () => {
  it("returns a token and user for valid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@divinenet.test", password: "admin123" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.role).toBe("Admin");
  });

  it("rejects missing fields", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email and password are required");
  });

  it("rejects wrong credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@divinenet.test", password: "wrong" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });
});

describe("protected campaign routes", () => {
  it("returns 401 without a token", async () => {
    const response = await request(app).get("/api/campaigns");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required");
  });

  it("returns 401 with an invalid token", async () => {
    const response = await request(app)
      .get("/api/campaigns")
      .set("Authorization", "Bearer not-a-real-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or expired token");
  });

  it("allows an authenticated user to list campaigns", async () => {
    const token = await loginAs("staff@divinenet.test", "staff123");

    const response = await request(app)
      .get("/api/campaigns")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("allows Admin to create a campaign", async () => {
    const token = await loginAs("admin@divinenet.test", "admin123");

    const response = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send(validCampaign);

    expect(response.status).toBe(201);
  });

  it("forbids MarketingStaff from creating a campaign", async () => {
    const token = await loginAs("staff@divinenet.test", "staff123");

    const response = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send(validCampaign);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Access denied");
  });

  it("forbids ClientApprover from deleting a campaign", async () => {
    const token = await loginAs("approver@divinenet.test", "approver123");

    const response = await request(app)
      .delete("/api/campaigns/CAM-001")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });
});

describe("content calendar and approval workflow", () => {
  it("returns 401 on content routes without a token", async () => {
    const response = await request(app).get("/api/content");

    expect(response.status).toBe(401);
  });

  it("allows MarketingStaff to create a content draft", async () => {
    const token = await loginAs("staff@divinenet.test", "staff123");

    const response = await request(app)
      .post("/api/content")
      .set("Authorization", `Bearer ${token}`)
      .send(validContent);

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("Draft");
    expect(response.body.data.createdBy).toBe("staff@divinenet.test");
  });

  it("rejects invalid content", async () => {
    const response = await request(app)
      .post("/api/content")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validContent, title: "" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("title is required");
  });

  it("submits a draft for approval", async () => {
    const token = await loginAs("staff@divinenet.test", "staff123");

    const created = await request(app)
      .post("/api/content")
      .set("Authorization", `Bearer ${token}`)
      .send(validContent);

    const response = await request(app)
      .post(`/api/content/${created.body.data.id}/submit`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("Submitted");
    expect(response.body.data.submittedAt).toBeTruthy();
  });

  it("forbids ClientApprover from creating content", async () => {
    const token = await loginAs("approver@divinenet.test", "approver123");

    const response = await request(app)
      .post("/api/content")
      .set("Authorization", `Bearer ${token}`)
      .send(validContent);

    expect(response.status).toBe(403);
  });

  it("lets ClientApprover approve submitted content", async () => {
    const staffToken = await loginAs("staff@divinenet.test", "staff123");
    const approverToken = await loginAs("approver@divinenet.test", "approver123");

    const created = await request(app)
      .post("/api/content")
      .set("Authorization", `Bearer ${staffToken}`)
      .send(validContent);

    await request(app)
      .post(`/api/content/${created.body.data.id}/submit`)
      .set("Authorization", `Bearer ${staffToken}`);

    const response = await request(app)
      .post(`/api/content/${created.body.data.id}/decide`)
      .set("Authorization", `Bearer ${approverToken}`)
      .send({ decision: "Approve", comment: "Looks good" });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("Approved");
    expect(response.body.data.approvals).toHaveLength(1);
    expect(response.body.data.approvals[0].decision).toBe("Approve");
    expect(response.body.data.approvals[0].decidedBy).toBe("approver@divinenet.test");
  });

  it("rejects content with a comment", async () => {
    const staffToken = await loginAs("staff@divinenet.test", "staff123");
    const approverToken = await loginAs("approver@divinenet.test", "approver123");

    const created = await request(app)
      .post("/api/content")
      .set("Authorization", `Bearer ${staffToken}`)
      .send(validContent);

    await request(app)
      .post(`/api/content/${created.body.data.id}/submit`)
      .set("Authorization", `Bearer ${staffToken}`);

    const response = await request(app)
      .post(`/api/content/${created.body.data.id}/decide`)
      .set("Authorization", `Bearer ${approverToken}`)
      .send({ decision: "Reject", comment: "Please rephrase" });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("Rejected");
    expect(response.body.data.approvals[0].comment).toBe("Please rephrase");
  });

  it("forbids MarketingStaff from deciding on content", async () => {
    const token = await loginAs("staff@divinenet.test", "staff123");

    const response = await request(app)
      .post("/api/content/CONTENT-001/decide")
      .set("Authorization", `Bearer ${token}`)
      .send({ decision: "Approve" });

    expect(response.status).toBe(403);
  });

  it("cannot approve a draft that was never submitted", async () => {
    const approverToken = await loginAs("approver@divinenet.test", "approver123");

    const response = await request(app)
      .post("/api/content/CONTENT-001/decide")
      .set("Authorization", `Bearer ${approverToken}`)
      .send({ decision: "Approve" });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Only Submitted content can be approved or rejected");
  });
});
describe("AI draft generation", () => {
  it("returns 401 without a token", async () => {
    const response = await request(app).post("/api/ai/draft").send({});

    expect(response.status).toBe(401);
  });

  it("returns 400 when campaignId or channel missing", async () => {
    const response = await request(app)
      .post("/api/ai/draft")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ campaignId: "CAM-001" });

    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown campaign", async () => {
    const response = await request(app)
      .post("/api/ai/draft")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ campaignId: "CAM-999", channel: "Facebook" });

    expect(response.status).toBe(404);
  });

  it("generates an editable draft from campaign context", async () => {
    const response = await request(app)
      .post("/api/ai/draft")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ campaignId: "CAM-001", channel: "Instagram", extraInstructions: "Keep it short" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.draft).toBeTruthy();
    expect(response.body.data.provider).toBe("mock");
    expect(response.body.data.channel).toBe("Instagram");
    expect(response.body.note).toContain("never auto-published");
  });

it("forbids ClientApprover from generating drafts", async () => {
    const token = await loginAs("approver@divinenet.test", "approver123");

    const response = await request(app)
      .post("/api/ai/draft")
      .set("Authorization", `Bearer ${token}`)
      .send({ campaignId: "CAM-001", channel: "Facebook" });

    expect(response.status).toBe(403);
  });
});

describe("analytics KPI dashboard (FR-08)", () => {
  it("returns 401 without a token", async () => {
    const response = await request(app).get("/api/analytics/kpis");

    expect(response.status).toBe(401);
  });

  it("returns aggregated KPI data for the sample campaign", async () => {
    const response = await request(app)
      .get("/api/analytics/kpis")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalCampaigns).toBe(1);
    expect(response.body.data.campaigns).toHaveLength(1);
    expect(response.body.data.campaigns[0].id).toBe("CAM-001");
    expect(response.body.data.campaigns[0].metrics.Reach).toBe(12500);
    expect(response.body.data.campaigns[0].metrics.Impressions).toBe(18400);
    expect(response.body.data.totals.Reach).toBe(12500);
  });

  it("filters KPI data by campaign", async () => {
    const created = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validCampaign, campaignName: "KPI Filter Demo" });

    expect(created.status).toBe(201);

    const response = await request(app)
      .get("/api/analytics/kpis?campaignId=CAM-002")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.totalCampaigns).toBe(1);
    expect(response.body.data.campaigns[0].id).toBe("CAM-002");
    expect(response.body.data.campaigns[0].metrics.Reach).toBe(0);
  });

  it("returns 404 for an unknown campaign", async () => {
    const response = await request(app)
      .get("/api/analytics/kpis?campaignId=CAM-999")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Campaign not found");
  });

  it("aggregates metrics by platform", async () => {
    const response = await request(app)
      .get("/api/analytics/kpis")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.platforms).toHaveLength(1);
    expect(response.body.data.platforms[0].channel).toBe("Facebook");
    expect(response.body.data.platforms[0].campaignCount).toBe(1);
    expect(response.body.data.platforms[0].metrics.Likes).toBe(620);
  });

  it("exposes the approved KPI metric list", async () => {
    const response = await request(app)
      .get("/api/analytics/metrics")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.core).toContain("Reach");
    expect(response.body.data.core).toContain("ROI");
    expect(response.body.data.platforms.TikTok).toContain("Plays");
  });

  it("allows MarketingStaff to view analytics", async () => {
    const token = await loginAs("staff@divinenet.test", "staff123");

    const response = await request(app)
      .get("/api/analytics/kpis")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("allows ClientApprover to view analytics", async () => {
    const token = await loginAs("approver@divinenet.test", "approver123");

    const response = await request(app)
      .get("/api/analytics/kpis")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe("AI performance report (FR-09)", () => {
  it("returns 401 without a token", async () => {
    const response = await request(app).post("/api/analytics/report").send({});

    expect(response.status).toBe(401);
  });

  it("generates an editable report narrative from analytics", async () => {
    const response = await request(app)
      .post("/api/analytics/report")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ extraInstructions: "Keep it concise" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.narrative).toBeTruthy();
    expect(response.body.data.provider).toBe("mock");
    expect(response.body.data.campaignId).toBeNull();
    expect(response.body.note).toContain("never auto-published");
  });

  it("generates a report for a single campaign", async () => {
    const response = await request(app)
      .post("/api/analytics/report")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ campaignId: "CAM-001" });

    expect(response.status).toBe(200);
    expect(response.body.data.campaignId).toBe("CAM-001");
  });

  it("returns 404 for an unknown campaign", async () => {
    const response = await request(app)
      .post("/api/analytics/report")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ campaignId: "CAM-999" });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Campaign not found");
  });

  it("returns 400 when there is no KPI data for the campaign", async () => {
    await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validCampaign, campaignName: "No KPI Campaign" });

    const response = await request(app)
      .post("/api/analytics/report")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ campaignId: "CAM-002" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "No analytics data available for the selected campaign"
    );
  });
});

describe("lead management (DCRM2-14)", () => {
  it("returns 401 without a token", async () => {
    const response = await request(app).get("/api/leads");

    expect(response.status).toBe(401);
  });

  it("returns the sample leads", async () => {
    const response = await request(app)
      .get("/api/leads")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe("LEAD-001");
  });

  it("creates a lead with a generated id", async () => {
    const token = await loginAs("staff@divinenet.test", "staff123");

    const response = await request(app)
      .post("/api/leads")
      .set("Authorization", `Bearer ${token}`)
      .send(validLead);

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe("LEAD-002");
    expect(response.body.data.sourcePlatform).toBe("Instagram");
  });

  it("rejects a missing required field", async () => {
    const response = await request(app)
      .post("/api/leads")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validLead, firstName: "" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("firstName is required");
  });

  it("rejects an invalid email", async () => {
    const response = await request(app)
      .post("/api/leads")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validLead, email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("email must be a valid email address");
  });

  it("rejects an invalid consent status", async () => {
    const response = await request(app)
      .post("/api/leads")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validLead, consentStatus: "Maybe" });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("consentStatus must be");
  });

  it("updates an existing lead", async () => {
    const response = await request(app)
      .put("/api/leads/LEAD-001")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validLead, leadStatus: "Qualified" });

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe("LEAD-001");
    expect(response.body.data.leadStatus).toBe("Qualified");
  });

  it("returns 404 when updating an unknown lead", async () => {
    const response = await request(app)
      .put("/api/leads/LEAD-999")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validLead);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Lead not found");
  });

  it("removes an existing lead", async () => {
    const response = await request(app)
      .delete("/api/leads/LEAD-001")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe("LEAD-001");

    const list = await request(app)
      .get("/api/leads")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(list.body.data).toHaveLength(0);
  });

  it("forbids ClientApprover from creating a lead", async () => {
    const token = await loginAs("approver@divinenet.test", "approver123");

    const response = await request(app)
      .post("/api/leads")
      .set("Authorization", `Bearer ${token}`)
      .send(validLead);

    expect(response.status).toBe(403);
  });
});

async function createApprovedContent(title) {
  const staffToken = await loginAs("staff@divinenet.test", "staff123");
  const approverToken = await loginAs("approver@divinenet.test", "approver123");

  const created = await request(app)
    .post("/api/content")
    .set("Authorization", `Bearer ${staffToken}`)
    .send({ ...validContent, title: title || "Automation Post" });

  const contentId = created.body.data.id;

  await request(app)
    .post(`/api/content/${contentId}/submit`)
    .set("Authorization", `Bearer ${staffToken}`);

  await request(app)
    .post(`/api/content/${contentId}/decide`)
    .set("Authorization", `Bearer ${approverToken}`)
    .send({ decision: "Approve", comment: "Approved for automation test" });

  return { contentId, staffToken };
}

describe("automation (FR-06)", () => {
  it("activates a Draft campaign", async () => {
    const response = await request(app)
      .post("/api/campaigns/CAM-001/activate")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("Active");
  });

  it("cannot activate a non-Draft campaign", async () => {
    await request(app)
      .post("/api/campaigns/CAM-001/activate")
      .set("Authorization", `Bearer ${adminToken}`);

    const response = await request(app)
      .post("/api/campaigns/CAM-001/activate")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Only Draft campaigns can be activated");
  });

  it("returns 404 when activating an unknown campaign", async () => {
    const response = await request(app)
      .post("/api/campaigns/CAM-999/activate")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
  });

  it("forbids MarketingStaff from activating a campaign", async () => {
    const token = await loginAs("staff@divinenet.test", "staff123");

    const response = await request(app)
      .post("/api/campaigns/CAM-001/activate")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it("schedules approved content and then publishes it", async () => {
    const { contentId, staffToken } = await createApprovedContent();

    const scheduled = await request(app)
      .post(`/api/content/${contentId}/schedule`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ scheduledAt: "2026-08-25" });

    expect(scheduled.status).toBe(200);
    expect(scheduled.body.data.post.outcome).toBe("Scheduled");
    expect(scheduled.body.data.content.status).toBe("Scheduled");

    const postId = scheduled.body.data.post.id;

    const published = await request(app)
      .post(`/api/posts/${postId}/publish`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(published.status).toBe(200);
    expect(published.body.data.post.outcome).toBe("Published");
    expect(published.body.data.post.publishedAt).toBeTruthy();
    expect(published.body.data.content.status).toBe("Posted");
  });

  it("cannot schedule content that is not approved", async () => {
    const staffToken = await loginAs("staff@divinenet.test", "staff123");

    const created = await request(app)
      .post("/api/content")
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ ...validContent, title: "Unapproved Post" });

    const response = await request(app)
      .post(`/api/content/${created.body.data.id}/schedule`)
      .set("Authorization", `Bearer ${staffToken}`);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Only Approved content can be scheduled");
  });

  it("cannot publish a post that is not scheduled", async () => {
    const staffToken = await loginAs("staff@divinenet.test", "staff123");

    const response = await request(app)
      .post("/api/posts/POST-001/publish")
      .set("Authorization", `Bearer ${staffToken}`);

    expect(response.status).toBe(404);
  });

  it("lists scheduled posts and campaign activities", async () => {
    const { contentId, staffToken } = await createApprovedContent();

    await request(app)
      .post(`/api/content/${contentId}/schedule`)
      .set("Authorization", `Bearer ${staffToken}`);

    const posts = await request(app)
      .get("/api/automation/posts")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(posts.status).toBe(200);
    expect(posts.body.data).toHaveLength(1);

    const activities = await request(app)
      .get("/api/automation/activities")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(activities.status).toBe(200);
    expect(activities.body.data.some((item) => item.action === "SchedulePost")).toBe(true);
  });
});
