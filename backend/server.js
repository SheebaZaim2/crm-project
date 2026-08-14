const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const campaigns = [
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

app.get("/api/health", (request, response) => {
  response.status(200).json({
    success: true,
    message: "Divinenet CRM API is running"
  });
});

app.get("/api/campaigns", (request, response) => {
  response.status(200).json({
    success: true,
    data: campaigns
  });
});

app.listen(PORT, () => {
  console.log(`Divinenet CRM API running at http://localhost:${PORT}`);
});