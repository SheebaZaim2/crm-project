const express = require("express");
const cors = require("cors");

const { validateCampaign } = require("./validation");
const store = require("./campaigns-store");
const contentStore = require("./content-store");
const users = require("./users");
const { signToken, authenticateToken, requireRole } = require("./auth");

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
      content: ["/api/content", "/api/content/:id", "POST /api/content", "PUT /api/content/:id", "DELETE /api/content/:id", "POST /api/content/:id/submit", "POST /api/content/:id/decide"]
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