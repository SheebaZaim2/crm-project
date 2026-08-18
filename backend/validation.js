const requiredFields = [
  "campaignName",
  "client",
  "brand",
  "objective",
  "targetAudience",
  "startDate",
  "endDate",
  "budget",
  "channel",
  "status"
];

const allowedChannels = ["Facebook", "Instagram"];
const allowedStatuses = ["Draft", "Active", "Paused", "Completed"];

function validateCampaign(campaign) {
  if (!campaign || typeof campaign !== "object") {
    return "Request body must be a JSON object";
  }

  for (const field of requiredFields) {
    if (
      campaign[field] === undefined ||
      campaign[field] === null ||
      campaign[field] === ""
    ) {
      return `${field} is required`;
    }
  }

  if (new Date(campaign.endDate) < new Date(campaign.startDate)) {
    return "End date cannot be before start date";
  }

  if (Number(campaign.budget) < 0) {
    return "Budget must be zero or greater";
  }

  if (!allowedChannels.includes(campaign.channel)) {
    return "Channel must be Facebook or Instagram";
  }

  if (!allowedStatuses.includes(campaign.status)) {
    return "Status must be Draft, Active, Paused or Completed";
  }

  return null;
}

module.exports = {
  validateCampaign,
  requiredFields,
  allowedChannels,
  allowedStatuses
};