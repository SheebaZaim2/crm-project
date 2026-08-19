require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { validateCampaign } = require("./validation");
const store = require("./campaigns-store");
const contentStore = require("./content-store");
const users = require("./users");
const { signToken, authenticateToken, requireRole } = require("./auth");
const ai = require("./services/ai_provider");
const { buildDraftPrompt, buildReportPrompt } = require("./services/prompt_builder");
const analytics = require("./services/analytics");
const leadStore = require("./leads-store");
const automation = require("./services/automation");
const social = require("./services/social_connectors");

const app = express();
const PORT = process.env.PORT || 3000;

const WRITE_ROLES = ["Admin", "CampaignManager"];
const CREATOR_ROLES = ["Admin", "CampaignManager", "MarketingStaff"];
const APPROVER_ROLES = ["Admin", "ClientApprover"];

app.use(cors());
app.use(express.json());

app.get("/", (request, response) => {
  response.status(200).json({
    success: true,
    service: "Divinenet CRM Phase 2 - Campaign Management API",
    auth: "POST /api/auth/login",
    endpoints: {
      health: "/api/health",
      campaigns: ["/api/campaigns", "/api/campaigns/:id", "POST /api/campaigns", "PUT /api/campaigns/:id", "DELETE /api/campaigns/:id"],
      content: ["/api/content", "/api/content/:id", "POST /api/content", "PUT /api/content/:id", "DELETE /api/content/:id", "POST /api/content/:id/submit", "POST /api/content/:id/decide"],
      ai: "POST /api/ai/draft",
      analytics: ["GET /api/analytics/kpis", "POST /api/analytics/report", "GET /api/analytics/metrics"],
      leads: ["GET /api/leads", "POST /api/leads", "GET /api/leads/:id", "PUT /api/leads/:id", "DELETE /api/leads/:id"],
      automation: ["POST /api/campaigns/:id/activate", "POST /api/content/:id/schedule", "POST /api/posts/:id/publish", "GET /api/automation/posts", "GET /api/automation/activities"],
      social: ["GET /api/social/connectors", "GET /api/social/connectors/:platform/status", "POST /api/social/publish"]
    }
  });
});

app.get("/api/health", (request, response) => {
  response.status(200).json({
    success: true,
    message: "Divinenet CRM API is running"
  });
});

app.post("/api/auth/login", (request, response) => {
  const { email, password } = request.body || {};

  if (!email || !password) {
    return response.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  const user = users.findByEmail(email);

  if (!user || !users.verifyPassword(user, password)) {
    return response.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  response.status(200).json({
    success: true,
    token: signToken(user),
    user: users.toPublicUser(user)
  });
});

app.get("/api/campaigns", authenticateToken, (request, response) => {
  response.status(200).json({
    success: true,
    data: store.list()
  });
});

app.get("/api/campaigns/:id", authenticateToken, (request, response) => {
  const campaign = store.findById(request.params.id);

  if (!campaign) {
    return response.status(404).json({
      success: false,
      message: "Campaign not found"
    });
  }

  response.status(200).json({
    success: true,
    data: campaign
  });
});

app.post(
  "/api/campaigns",
  authenticateToken,
  requireRole(...WRITE_ROLES),
  (request, response) => {
    const validationError = validateCampaign(request.body);

    if (validationError) {
      return response.status(400).json({
        success: false,
        message: validationError
      });
    }

    const newCampaign = store.create(request.body);

    response.status(201).json({
      success: true,
      data: newCampaign
    });
  }
);

app.put(
  "/api/campaigns/:id",
  authenticateToken,
  requireRole(...WRITE_ROLES),
  (request, response) => {
    const validationError = validateCampaign(request.body);

    if (validationError) {
      return response.status(400).json({
        success: false,
        message: validationError
      });
    }

    const updated = store.update(request.params.id, request.body);

    if (!updated) {
      return response.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    response.status(200).json({
      success: true,
      data: updated
    });
  }
);

app.delete(
  "/api/campaigns/:id",
  authenticateToken,
  requireRole(...WRITE_ROLES),
  (request, response) => {
    const removed = store.remove(request.params.id);

    if (!removed) {
      return response.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    response.status(200).json({
      success: true,
      data: removed
    });
  }
);

app.get("/api/content", authenticateToken, (request, response) => {
  response.status(200).json({
    success: true,
    data: contentStore.list()
  });
});

app.get("/api/content/:id", authenticateToken, (request, response) => {
  const item = contentStore.findById(request.params.id);

  if (!item) {
    return response.status(404).json({
      success: false,
      message: "Content not found"
    });
  }

  response.status(200).json({
    success: true,
    data: item
  });
});

app.post(
  "/api/content",
  authenticateToken,
  requireRole(...CREATOR_ROLES),
  (request, response) => {
    const validationError = contentStore.validateContent(request.body);

    if (validationError) {
      return response.status(400).json({
        success: false,
        message: validationError
      });
    }

    const created = contentStore.create({
      ...request.body,
      createdBy: request.user.email
    });

    response.status(201).json({
      success: true,
      data: created
    });
  }
);

app.put(
  "/api/content/:id",
  authenticateToken,
  requireRole(...CREATOR_ROLES),
  (request, response) => {
    const validationError = contentStore.validateContent(request.body);

    if (validationError) {
      return response.status(400).json({
        success: false,
        message: validationError
      });
    }

    const updated = contentStore.update(request.params.id, request.body);

    if (!updated) {
      return response.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    if (updated.error) {
      return response.status(409).json({
        success: false,
        message: updated.error
      });
    }

    response.status(200).json({
      success: true,
      data: updated
    });
  }
);

app.delete(
  "/api/content/:id",
  authenticateToken,
  requireRole(...CREATOR_ROLES),
  (request, response) => {
    const removed = contentStore.remove(request.params.id);

    if (!removed) {
      return response.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    if (removed.error) {
      return response.status(409).json({
        success: false,
        message: removed.error
      });
    }

    response.status(200).json({
      success: true,
      data: removed
    });
  }
);

app.post(
  "/api/content/:id/submit",
  authenticateToken,
  requireRole(...CREATOR_ROLES),
  (request, response) => {
    const submitted = contentStore.submit(request.params.id);

    if (!submitted) {
      return response.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    if (submitted.error) {
      return response.status(409).json({
        success: false,
        message: submitted.error
      });
    }

    response.status(200).json({
      success: true,
      data: submitted
    });
  }
);

app.post(
  "/api/content/:id/decide",
  authenticateToken,
  requireRole(...APPROVER_ROLES),
  (request, response) => {
    const { decision, comment } = request.body || {};

    if (!decision || !contentStore.DECISIONS.includes(decision)) {
      return response.status(400).json({
        success: false,
        message: "Decision must be Approve, Reject or Comment"
      });
    }

    const decided = contentStore.decide(
      request.params.id,
      decision,
      comment,
      request.user.email
    );

    if (!decided) {
      return response.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    if (decided.error) {
      return response.status(409).json({
        success: false,
        message: decided.error
      });
    }

    response.status(200).json({
      success: true,
      data: decided
    });
  }
);

app.post(
  "/api/ai/draft",
  authenticateToken,
  requireRole(...CREATOR_ROLES),
  async (request, response) => {
    const { campaignId, channel, extraInstructions } = request.body || {};

    if (!campaignId || !channel) {
      return response.status(400).json({
        success: false,
        message: "campaignId and channel are required"
      });
    }

    const allowedChannels = ["Facebook", "Instagram", "YouTube", "TikTok"];

    if (!allowedChannels.includes(channel)) {
      return response.status(400).json({
        success: false,
        message: "Channel must be Facebook, Instagram, YouTube or TikTok"
      });
    }

    const campaign = store.findById(campaignId);

    if (!campaign) {
      return response.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    const prompt = buildDraftPrompt(campaign, channel, extraInstructions);

    try {
      const result = await ai.generateDraft(prompt);

      response.status(200).json({
        success: true,
        data: {
          draft: result.draft,
          provider: result.provider,
          model: result.model,
          campaignId,
          channel,
          warning: result.warning || null
        },
        note: "AI draft is editable and is never auto-published."
      });
    } catch (error) {
      response.status(500).json({
        success: false,
        message: "AI draft generation failed"
      });
    }
  }
);

app.get("/api/leads", authenticateToken, (request, response) => {
  response.status(200).json({
    success: true,
    data: leadStore.list()
  });
});

app.get("/api/leads/:id", authenticateToken, (request, response) => {
  const lead = leadStore.findById(request.params.id);

  if (!lead) {
    return response.status(404).json({
      success: false,
      message: "Lead not found"
    });
  }

  response.status(200).json({
    success: true,
    data: lead
  });
});

app.post(
  "/api/leads",
  authenticateToken,
  requireRole(...CREATOR_ROLES),
  (request, response) => {
    const validationError = leadStore.validateLead(request.body);

    if (validationError) {
      return response.status(400).json({
        success: false,
        message: validationError
      });
    }

    const created = leadStore.create({
      ...request.body,
      createdDate: new Date().toISOString().slice(0, 10)
    });

    response.status(201).json({
      success: true,
      data: created
    });
  }
);

app.put(
  "/api/leads/:id",
  authenticateToken,
  requireRole(...CREATOR_ROLES),
  (request, response) => {
    const validationError = leadStore.validateLead(request.body);

    if (validationError) {
      return response.status(400).json({
        success: false,
        message: validationError
      });
    }

    const updated = leadStore.update(request.params.id, request.body);

    if (!updated) {
      return response.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    response.status(200).json({
      success: true,
      data: updated
    });
  }
);

app.delete(
  "/api/leads/:id",
  authenticateToken,
  requireRole(...WRITE_ROLES),
  (request, response) => {
    const removed = leadStore.remove(request.params.id);

    if (!removed) {
      return response.status(404).json({
        success: false,
        message: "Lead not found"
      });
    }

    response.status(200).json({
      success: true,
      data: removed
    });
  }
);

app.post(
  "/api/campaigns/:id/activate",
  authenticateToken,
  requireRole(...WRITE_ROLES),
  (request, response) => {
    const activated = store.activate(request.params.id);

    if (!activated) {
      return response.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    if (activated.error) {
      return response.status(409).json({
        success: false,
        message: activated.error
      });
    }

    automation.logActivity(
      activated.id,
      "ActivateCampaign",
      `Campaign ${activated.campaignName} activated`,
      "Activated",
      request.user.email
    );

    response.status(200).json({
      success: true,
      data: activated
    });
  }
);

app.post(
  "/api/content/:id/schedule",
  authenticateToken,
  requireRole(...CREATOR_ROLES),
  (request, response) => {
    const { scheduledAt } = request.body || {};

    const result = automation.schedule(request.params.id, scheduledAt, request.user.email);

    if (!result) {
      return response.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    if (result.error) {
      return response.status(409).json({
        success: false,
        message: result.error
      });
    }

    response.status(200).json({
      success: true,
      data: result
    });
  }
);

app.post(
  "/api/posts/:id/publish",
  authenticateToken,
  requireRole(...CREATOR_ROLES),
  (request, response) => {
    const result = automation.publish(request.params.id, request.user.email);

    if (!result) {
      return response.status(404).json({
        success: false,
        message: "Scheduled post not found"
      });
    }

    if (result.error) {
      return response.status(409).json({
        success: false,
        message: result.error
      });
    }

    response.status(200).json({
      success: true,
      data: result
    });
  }
);

app.get("/api/automation/posts", authenticateToken, (request, response) => {
  response.status(200).json({
    success: true,
    data: automation.listPosts()
  });
});

app.get("/api/automation/activities", authenticateToken, (request, response) => {
  response.status(200).json({
    success: true,
    data: automation.listActivities()
  });
});

app.get("/api/social/connectors", authenticateToken, (request, response) => {
  response.status(200).json({
    success: true,
    data: social.listConnectors()
  });
});

app.get("/api/social/connectors/:platform/status", authenticateToken, async (request, response) => {
  const connector = social.getConnector(request.params.platform);

  if (!connector) {
    return response.status(404).json({
      success: false,
      message: "No connector configured for that platform"
    });
  }

  response.status(200).json({
    success: true,
    data: await connector.checkStatus()
  });
});

app.post(
  "/api/social/publish",
  authenticateToken,
  requireRole(...CREATOR_ROLES),
  async (request, response) => {
    const { platform, content } = request.body || {};

    if (!platform || !content || !content.title || !content.body) {
      return response.status(400).json({
        success: false,
        message: "platform, content.title and content.body are required"
      });
    }

    const result = await social.publishToPlatform(platform, content);

    if (result.error) {
      return response.status(400).json({
        success: false,
        message: result.error
      });
    }

    if (result instanceof Error || result.error) {
      return response.status(502).json({
        success: false,
        message: result.message || result.error
      });
    }

    response.status(200).json({
      success: true,
      data: result,
      note: "All social publishing currently runs in mock/sandbox mode."
    });
  }
);

app.get("/api/analytics/metrics", authenticateToken, (request, response) => {
  response.status(200).json({
    success: true,
    data: analytics.getMetricsList()
  });
});

app.get("/api/analytics/kpis", authenticateToken, (request, response) => {
  const { campaignId } = request.query || {};

  if (campaignId) {
    const campaign = store.findById(campaignId);

    if (!campaign) {
      return response.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }
  }

  response.status(200).json({
    success: true,
    data: analytics.getAnalytics(campaignId || null),
    note: "Analytics are computed from approved fictional KPI records."
  });
});

app.post(
  "/api/analytics/report",
  authenticateToken,
  async (request, response) => {
    const { campaignId, extraInstructions } = request.body || {};

    if (campaignId) {
      const campaign = store.findById(campaignId);

      if (!campaign) {
        return response.status(404).json({
          success: false,
          message: "Campaign not found"
        });
      }
    }

    const data = analytics.getAnalytics(campaignId || null);

    if (!data.campaigns.some((row) => row.hasData)) {
      return response.status(400).json({
        success: false,
        message: "No analytics data available for the selected campaign"
      });
    }

    const prompt = buildReportPrompt(data, extraInstructions);

    try {
      const result = await ai.generateDraft(prompt);

      response.status(200).json({
        success: true,
        data: {
          narrative: result.draft,
          provider: result.provider,
          model: result.model,
          campaignId: campaignId || null,
          warning: result.warning || null
        },
        note: "AI report is editable and is never auto-published."
      });
    } catch (error) {
      response.status(500).json({
        success: false,
        message: "AI report generation failed"
      });
    }
  }
);

app.use((request, response) => {
  response.status(404).json({
    success: false,
    message: "Route not found"
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Divinenet CRM API running at http://localhost:${PORT}`);
  });
}

module.exports = app;