function buildDraftPrompt(campaign, channel, extraInstructions) {
  const instructions = extraInstructions ? extraInstructions.trim() : "";

  return [
    "You are the Divinenet AI marketing assistant. Write a social media post draft for the following campaign.",
    "",
    `Campaign: ${campaign.campaignName}`,
    `Client: ${campaign.client}`,
    `Brand: ${campaign.brand}`,
    `Objective: ${campaign.objective}`,
    `Target audience: ${campaign.targetAudience}`,
    `Platform: ${channel}`,
    `Campaign period: ${campaign.startDate} to ${campaign.endDate}`,
    "",
    "Guidelines:",
    "- Write 2-4 short sentences that suit the platform.",
    "- Use a friendly, professional tone with a clear call to action.",
    "- Do NOT publish anything automatically; this is an editable draft only.",
    "- Keep all content fictional for demonstration purposes.",
    instructions ? `Additional instructions: ${instructions}` : "No additional instructions."
  ].join("\n");
}

function formatMetrics(metrics) {
  return Object.entries(metrics || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

function buildReportPrompt(analytics, extraInstructions) {
  const instructions = extraInstructions ? extraInstructions.trim() : "";

  const campaignLines = (analytics.campaigns || []).map(
    (row) =>
      `- ${row.campaignName} (${row.channel}, ${row.status}): ${formatMetrics(row.metrics)}`
  );

  const platformLines = (analytics.platforms || []).map(
    (row) => `- ${row.channel} (${row.campaignCount} campaign/s): ${formatMetrics(row.metrics)}`
  );

  return [
    "You are the Divinenet AI marketing reporting assistant. Write a short client-ready performance summary from the following fictional analytics data.",
    "",
    `Period total campaigns: ${analytics.totalCampaigns}`,
    `Overall metrics: ${formatMetrics(analytics.totals)}`,
    "",
    "By platform:",
    ...platformLines,
    "",
    "By campaign:",
    ...campaignLines,
    "",
    "Guidelines:",
    "- Write 3-5 short paragraphs in plain professional language.",
    "- Highlight the strongest metric and one area that could improve.",
    "- Keep all content fictional for demonstration purposes.",
    "- This is an editable report draft; it is never published automatically.",
    instructions ? `Additional instructions: ${instructions}` : "No additional instructions."
  ].join("\n");
}

module.exports = {
  buildDraftPrompt,
  buildReportPrompt
};