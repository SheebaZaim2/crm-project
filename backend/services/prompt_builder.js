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

module.exports = {
  buildDraftPrompt
};