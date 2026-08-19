const PRIORITY_ORDER = ["Facebook", "Instagram", "YouTube", "TikTok"];

function isMockForced() {
  return process.env.SOCIAL_MOCK === "1" || !process.env.META_ACCESS_TOKEN;
}

function buildMockConnector(name, platform) {
  return {
    name,
    platform,
    mode: "mock",
    status: "ready",
    priority: PRIORITY_ORDER.indexOf(platform) + 1,
    async publish(content) {
      return {
        success: true,
        platform,
        postId: `${platform.toUpperCase()}-${Date.now()}`,
        publishedAt: new Date().toISOString(),
        message: `Mock post published to ${platform} (sandbox mode).`
      };
    },
    async checkStatus() {
      return { platform, status: "ready", mode: "mock" };
    }
  };
}

function buildLiveConnector(name, platform) {
  return {
    name,
    platform,
    mode: "live",
    status: "configured",
    priority: PRIORITY_ORDER.indexOf(platform) + 1,
    async publish(content) {
      throw new Error(`${platform} live publishing requires sandbox credentials`);
    },
    async checkStatus() {
      return { platform, status: "configured", mode: "live" };
    }
  };
}

function createConnectors() {
  const mock = isMockForced();

  return PRIORITY_ORDER.map((platform) => {
    if (mock) {
      return buildMockConnector(`${platform} Connector`, platform);
    }
    return buildLiveConnector(`${platform} Connector`, platform);
  });
}

const connectors = createConnectors();

function listConnectors() {
  return connectors.map((connector) => ({
    name: connector.name,
    platform: connector.platform,
    mode: connector.mode,
    status: connector.status,
    priority: connector.priority
  }));
}

function getConnector(platform) {
  return connectors.find(
    (connector) => connector.platform.toLowerCase() === String(platform).toLowerCase()
  );
}

async function publishToPlatform(platform, content) {
  const connector = getConnector(platform);

  if (!connector) {
    return { error: `No connector configured for ${platform}` };
  }

  return connector.publish(content);
}

async function checkAllStatus() {
  const results = [];

  for (const connector of connectors) {
    results.push(await connector.checkStatus());
  }

  return results;
}

function reset() {
  return null;
}

module.exports = {
  listConnectors,
  getConnector,
  publishToPlatform,
  checkAllStatus,
  reset
};