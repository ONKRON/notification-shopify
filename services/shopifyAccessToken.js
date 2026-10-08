const axios = require("axios");

const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;
const tokenCache = new Map();

function hasShopifyCredentials(config) {
  return Boolean(
    config?.shopifyAccessToken ||
    (config?.shopifyClientId && config?.shopifyClientSecret),
  );
}

async function resolveShopifyAccessToken(config) {
  if (!config?.shopifyStore) {
    throw new Error("Shopify store is not configured");
  }

  const { shopifyClientId, shopifyClientSecret, shopifyStore } = config;
  if (!shopifyClientId || !shopifyClientSecret) {
    if (config.shopifyAccessToken) return config.shopifyAccessToken;
    throw new Error("Shopify access credentials are not configured");
  }

  const cacheKey = `${shopifyStore}:${shopifyClientId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached?.clientSecret === shopifyClientSecret) {
    if (cached.token && cached.expiresAt > Date.now()) return cached.token;
    if (cached.pending) return cached.pending;
  }

  const pending = (async () => {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: shopifyClientId,
      client_secret: shopifyClientSecret,
    });
    const response = await axios.post(
      `https://${shopifyStore}/admin/oauth/access_token`,
      body.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000,
      },
    );
    const token = response.data?.access_token;
    const expiresIn = Number(response.data?.expires_in);
    if (!token || !Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw new Error("Shopify returned an invalid access token response");
    }

    if (tokenCache.get(cacheKey)?.pending === pending) {
      tokenCache.set(cacheKey, {
        clientSecret: shopifyClientSecret,
        token,
        expiresAt: Date.now() + Math.max(0, expiresIn * 1000 - TOKEN_EXPIRY_BUFFER_MS),
      });
    }
    return token;
  })();

  tokenCache.set(cacheKey, { clientSecret: shopifyClientSecret, pending });
  try {
    return await pending;
  } catch (error) {
    if (tokenCache.get(cacheKey)?.pending === pending) tokenCache.delete(cacheKey);
    throw error;
  }
}

async function withShopifyAccessToken(config, request) {
  const token = await resolveShopifyAccessToken(config);
  try {
    return await request(token);
  } catch (error) {
    if (
      error.response?.status !== 401 ||
      !config.shopifyClientId ||
      !config.shopifyClientSecret
    ) {
      throw error;
    }

    const cacheKey = `${config.shopifyStore}:${config.shopifyClientId}`;
    if (tokenCache.get(cacheKey)?.token === token) {
      tokenCache.delete(cacheKey);
    }
    return request(await resolveShopifyAccessToken(config));
  }
}

module.exports = {
  hasShopifyCredentials,
  resolveShopifyAccessToken,
  withShopifyAccessToken,
};
