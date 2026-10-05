const { getShopifyConfig, supportedCountries } = require("./shopify");

test("uses the existing unprefixed Shopify variables for the UK", () => {
  const originalStore = process.env.SHOPIFY_STORE;
  const originalToken = process.env.SHOPIFY_ACCESS_TOKEN;
  process.env.SHOPIFY_STORE = "uk-store.myshopify.com";
  process.env.SHOPIFY_ACCESS_TOKEN = "uk-token";
  const originalApiVersion = process.env.SHOPIFY_API_VERSION;
  const originalPublicUrl = process.env.SHOPIFY_PUBLIC_URL;
  process.env.SHOPIFY_API_VERSION = "2025-10";
  process.env.SHOPIFY_PUBLIC_URL = "https://onkron.co.uk/";

  expect(getShopifyConfig("uk")).toEqual({
    country: "UK",
    shopifyStore: "uk-store.myshopify.com",
    shopifyAccessToken: "uk-token",
    shopifyApiVersion: "2025-10",
    shopifyPublicUrl: "https://onkron.co.uk",
  });

  if (originalStore === undefined) delete process.env.SHOPIFY_STORE;
  else process.env.SHOPIFY_STORE = originalStore;
  if (originalToken === undefined) delete process.env.SHOPIFY_ACCESS_TOKEN;
  else process.env.SHOPIFY_ACCESS_TOKEN = originalToken;
  if (originalApiVersion === undefined) delete process.env.SHOPIFY_API_VERSION;
  else process.env.SHOPIFY_API_VERSION = originalApiVersion;
  if (originalPublicUrl === undefined) delete process.env.SHOPIFY_PUBLIC_URL;
  else process.env.SHOPIFY_PUBLIC_URL = originalPublicUrl;
});

test("returns null for an unsupported country", () => {
  expect(getShopifyConfig("CA")).toBeNull();
  expect(supportedCountries).toEqual(["US", "UK", "DE", "PL", "FR", "IT", "ES", "TR"]);
});

test("uses the Turkey-specific Shopify variables", () => {
  const envNames = [
    "SHOPIFY_TR_STORE",
    "SHOPIFY_TR_ACCESS_TOKEN",
    "SHOPIFY_TR_CLIENT_ID",
    "SHOPIFY_TR_CLIENT_SECRET",
    "SHOPIFY_TR_PUBLIC_URL",
  ];
  const originalEnv = Object.fromEntries(
    envNames.map((name) => [name, process.env[name]]),
  );
  process.env.SHOPIFY_TR_STORE = "tr-store.myshopify.com";
  process.env.SHOPIFY_TR_ACCESS_TOKEN = "tr-token";
  process.env.SHOPIFY_TR_CLIENT_ID = "tr-client-id";
  process.env.SHOPIFY_TR_CLIENT_SECRET = "tr-client-secret";
  process.env.SHOPIFY_TR_PUBLIC_URL = "https://onkron.com.tr/";

  expect(getShopifyConfig("tr")).toEqual({
    country: "TR",
    shopifyStore: "tr-store.myshopify.com",
    shopifyAccessToken: "tr-token",
    shopifyClientId: "tr-client-id",
    shopifyClientSecret: "tr-client-secret",
    shopifyApiVersion: "2025-10",
    shopifyPublicUrl: "https://onkron.com.tr",
  });

  for (const name of envNames) {
    if (originalEnv[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
});
