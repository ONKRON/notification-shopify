const SHOPIFY_ENV_BY_COUNTRY = Object.freeze({
  US: {
    store: "SHOPIFY_US_STORE",
    accessToken: "SHOPIFY_US_ACCESS_TOKEN",
  },
  UK: {
    store: "SHOPIFY_STORE",
    accessToken: "SHOPIFY_ACCESS_TOKEN",
  },
  DE: {
    store: "SHOPIFY_DE_STORE",
    accessToken: "SHOPIFY_DE_ACCESS_TOKEN",
  },
  PL: {
    store: "SHOPIFY_PL_STORE",
    accessToken: "SHOPIFY_PL_ACCESS_TOKEN",
  },
  FR: {
    store: "SHOPIFY_FR_STORE",
    accessToken: "SHOPIFY_FR_ACCESS_TOKEN",
  },
  IT: {
    store: "SHOPIFY_IT_STORE",
    accessToken: "SHOPIFY_IT_ACCESS_TOKEN",
  },
  ES: {
    store: "SHOPIFY_ES_STORE",
    accessToken: "SHOPIFY_ES_ACCESS_TOKEN",
  },
});

function getShopifyConfig(country) {
  const normalizedCountry = String(country || "").trim().toUpperCase();
  const envNames = SHOPIFY_ENV_BY_COUNTRY[normalizedCountry];

  if (!envNames) {
    return null;
  }

  return {
    country: normalizedCountry,
    shopifyStore: process.env[envNames.store],
    shopifyAccessToken: process.env[envNames.accessToken],
    shopifyApiVersion: process.env.SHOPIFY_API_VERSION || "2025-10",
  };
}

module.exports = {
  getShopifyConfig,
  supportedCountries: Object.freeze(Object.keys(SHOPIFY_ENV_BY_COUNTRY)),
};
