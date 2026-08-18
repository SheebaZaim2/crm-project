const request = require("supertest");
const app = require("../server");
const store = require("../campaigns-store");
const contentStore = require("../content-store");

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
});

let adminToken;

async function loginAs(email, password) {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  return response.body.token;
}

beforeAll(async () => {
  adminToken = await loginAs("admin@divinenet.test", "admin123");
});

const validContent = {
  campaignId: "CAM-001",
  title: "Sprint Post Draft",
  body: "Fictional post body for the sprint campaign.",
  channel: "Facebook",
  scheduledDate: "2026-08-22"
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