const request = require("supertest");
const app = require("../server");
const store = require("../campaigns-store");
const contentStore = require("../content-store");
const leadStore = require("../leads-store");
const analytics = require("../services/analytics");
const automation = require("../services/automation");

beforeEach(() => {
  store.reset();
  contentStore.reset();
  leadStore.reset();
  analytics.reset();
  automation.reset();
});

let adminToken;

beforeAll(async () => {
  process.env.AI_MOCK = "1";
  process.env.SOCIAL_MOCK = "1";
  process.env.PHASE1_MOCK = "1";

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@divinenet.test", password: "admin123" });

  adminToken = login.body.token;
});

const PERFORMANCE_LIMIT_MS = 2000;

describe("NFR-03 performance (routine actions <= 2s)", () => {
  const endpoints = [
    ["GET", "/api/health"],
    ["GET", "/api/campaigns"],
    ["GET", "/api/leads"],
    ["GET", "/api/content"],
    ["GET", "/api/analytics/kpis"],
    ["GET", "/api/automation/posts"],
    ["GET", "/api/social/connectors"],
    ["GET", "/api/phase1/customers"]
  ];

  endpoints.forEach(([method, path]) => {
    it(`${method} ${path} responds within ${PERFORMANCE_LIMIT_MS}ms`, async () => {
      const start = Date.now();
      const response = await request(app)
        [method.toLowerCase()](path)
        .set("Authorization", `Bearer ${adminToken}`);
      const elapsed = Date.now() - start;

      expect(response.status).toBe(200);
      expect(elapsed).toBeLessThanOrEqual(PERFORMANCE_LIMIT_MS);
    });
  });

  it("health endpoint responds quickly even without auth", async () => {
    const start = Date.now();
    await request(app).get("/api/health");
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThanOrEqual(PERFORMANCE_LIMIT_MS);
  });
});

describe("NFR-02 security (JSON envelope + auth)", () => {
  it("returns JSON content-type on all routes", async () => {
    const response = await request(app)
      .get("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.headers["content-type"]).toContain("application/json");
  });

  it("uses a consistent success envelope", async () => {
    const response = await request(app)
      .get("/api/health");

    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty("message");
  });

  it("does not leak tokens or passwords in responses", async () => {
    const campaigns = await request(app)
      .get("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`);
    const leads = await request(app)
      .get("/api/leads")
      .set("Authorization", `Bearer ${adminToken}`);

    const raw = JSON.stringify([campaigns.body, leads.body]);

    expect(raw).not.toContain("password");
    expect(raw).not.toContain("passwordHash");
    expect(raw).not.toContain("jwt");
  });
});

describe("NFR-01 usability (graceful external failure)", () => {
  it("returns mock fallback data when Phase 1 API is unreachable", async () => {
    const originalBase = process.env.PHASE1_API_BASE;
    process.env.PHASE1_API_BASE = "http://localhost:59999";
    process.env.PHASE1_MOCK = "0";

    try {
      const response = await request(app)
        .get("/api/phase1/customers")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.source).toBe("mock");
      expect(response.body.warning).toBeTruthy();
    } finally {
      if (originalBase === undefined) {
        delete process.env.PHASE1_API_BASE;
      } else {
        process.env.PHASE1_API_BASE = originalBase;
      }
      process.env.PHASE1_MOCK = "1";
    }
  });
});
