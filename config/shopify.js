const SHOPIFY_ENV_BY_COUNTRY = Object.freeze({
  US: {
    store: "SHOPIFY_US_STORE",
    accessToken: "SHOPIFY_US_ACCESS_TOKEN",
    publicUrl: "SHOPIFY_US_PUBLIC_URL",
  },
  UK: {
    store: "SHOPIFY_STORE",
    accessToken: "SHOPIFY_ACCESS_TOKEN",
    publicUrl: "SHOPIFY_PUBLIC_URL",
  },
  DE: {
    store: "SHOPIFY_DE_STORE",
    accessToken: "SHOPIFY_DE_ACCESS_TOKEN",
    publicUrl: "SHOPIFY_DE_PUBLIC_URL",
  },
  PL: {
    store: "SHOPIFY_PL_STORE",
    accessToken: "SHOPIFY_PL_ACCESS_TOKEN",
    publicUrl: "SHOPIFY_PL_PUBLIC_URL",
  },
  FR: {
    store: "SHOPIFY_FR_STORE",
    accessToken: "SHOPIFY_FR_ACCESS_TOKEN",
    publicUrl: "SHOPIFY_FR_PUBLIC_URL",
  },
  IT: {
    store: "SHOPIFY_IT_STORE",
    accessToken: "SHOPIFY_IT_ACCESS_TOKEN",
    publicUrl: "SHOPIFY_IT_PUBLIC_URL",
  },
  ES: {
    store: "SHOPIFY_ES_STORE",
    accessToken: "SHOPIFY_ES_ACCESS_TOKEN",
    publicUrl: "SHOPIFY_ES_PUBLIC_URL",
  },
  TR: {
    store: "SHOPIFY_TR_STORE",
    accessToken: "SHOPIFY_TR_ACCESS_TOKEN",
    clientId: "SHOPIFY_TR_CLIENT_ID",
    clientSecret: "SHOPIFY_TR_CLIENT_SECRET",
    publicUrl: "SHOPIFY_TR_PUBLIC_URL",
  },
});

function getShopifyConfig(country) {
  const normalizedCountry = String(country || "").trim().toUpperCase();
  const envNames = SHOPIFY_ENV_BY_COUNTRY[normalizedCountry];

  if (!envNames) {
    return null;
  }

  const shopifyStore = process.env[envNames.store];
  const publicUrl = process.env[envNames.publicUrl] ||
    (shopifyStore ? `https://${shopifyStore}` : null);

  const config = {
    country: normalizedCountry,
    shopifyStore,
    shopifyAccessToken: process.env[envNames.accessToken],
    shopifyApiVersion: process.env.SHOPIFY_API_VERSION || "2025-10",
    shopifyPublicUrl: publicUrl ? publicUrl.replace(/\/+$/, "") : null,
  };

  if (envNames.clientId) {
    config.shopifyClientId = process.env[envNames.clientId];
    config.shopifyClientSecret = process.env[envNames.clientSecret];
  }

  return config;
}

module.exports = {
  getShopifyConfig,
  supportedCountries: Object.freeze(Object.keys(SHOPIFY_ENV_BY_COUNTRY)),
};
