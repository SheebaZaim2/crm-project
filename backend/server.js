const express = require("express");
const cors = require("cors");

const { validateCampaign } = require("./validation");
const store = require("./campaigns-store");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (request, response) => {
  response.status(200).json({
    success: true,
    message: "Divinenet CRM API is running"
  });
});app.get("/api/campaigns", (request, response) => {
  response.status(200).json({
    success: true,
    data: store.list()
  });
});

app.get("/api/campaigns/:id", (request, response) => {
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

app.post("/api/campaigns", (request, response) => {
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
});

app.put("/api/campaigns/:id", (request, response) => {
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
});

app.delete("/api/campaigns/:id", (request, response) => {
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
});

app.get("/", (request, response) => {
  response.status(200).json({
    success: true,
    service: "Divinenet CRM Phase 2 - Campaign Management API",
    endpoints: {
      health: "/api/health",
      campaigns: ["/api/campaigns", "/api/campaigns/:id", "POST /api/campaigns", "PUT /api/campaigns/:id", "DELETE /api/campaigns/:id"]
    }
  });
});

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