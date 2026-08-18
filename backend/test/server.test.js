const request = require("supertest");
const app = require("../server");
const store = require("../campaigns-store");

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
});

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
    const response = await request(app).get("/api/campaigns");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe("CAM-001");
  });
});

describe("GET /api/campaigns/:id", () => {
  it("returns a campaign by id", async () => {
    const response = await request(app).get("/api/campaigns/CAM-001");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.campaignName).toBe("Spring Awareness Demo");
  });

  it("returns 404 for an unknown id", async () => {
    const response = await request(app).get("/api/campaigns/NOPE");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Campaign not found");
  });
});

describe("POST /api/campaigns", () => {
  it("creates a campaign with a generated id", async () => {
    const response = await request(app)
      .post("/api/campaigns")
      .send(validCampaign);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe("CAM-002");
    expect(response.body.data.budget).toBe(2000);
  });

  it("rejects a missing required field", async () => {
    const response = await request(app)
      .post("/api/campaigns")
      .send({ ...validCampaign, campaignName: "" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("campaignName is required");
  });

  it("rejects an end date before the start date", async () => {
    const response = await request(app)
      .post("/api/campaigns")
      .send({ ...validCampaign, endDate: "2026-08-01" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("End date cannot be before start date");
  });

  it("rejects a negative budget", async () => {
    const response = await request(app)
      .post("/api/campaigns")
      .send({ ...validCampaign, budget: -100 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Budget must be zero or greater");
  });

  it("rejects an unsupported channel", async () => {
    const response = await request(app)
      .post("/api/campaigns")
      .send({ ...validCampaign, channel: "YouTube" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Channel must be Facebook or Instagram");
  });

  it("rejects an unsupported status", async () => {
    const response = await request(app)
      .post("/api/campaigns")
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
      .send({ ...validCampaign, campaignName: "Updated Name" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe("CAM-001");
    expect(response.body.data.campaignName).toBe("Updated Name");
  });

  it("returns 404 when updating an unknown id", async () => {
    const response = await request(app)
      .put("/api/campaigns/NOPE")
      .send(validCampaign);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Campaign not found");
  });

  it("returns 400 when updating with invalid data", async () => {
    const response = await request(app)
      .put("/api/campaigns/CAM-001")
      .send({ ...validCampaign, budget: -5 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Budget must be zero or greater");
  });
});

describe("DELETE /api/campaigns/:id", () => {
  it("removes an existing campaign", async () => {
    const response = await request(app).delete("/api/campaigns/CAM-001");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe("CAM-001");

    const list = await request(app).get("/api/campaigns");
    expect(list.body.data).toHaveLength(0);
  });

  it("returns 404 when deleting an unknown id", async () => {
    const response = await request(app).delete("/api/campaigns/NOPE");

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