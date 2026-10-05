jest.mock("axios");

const mockFindAll = jest.fn();
jest.mock("../models/Subscription", () => ({ findAll: mockFindAll }));

const axios = require("axios");
const { Op } = require("sequelize");
const {
  buildCrossCountryProducts,
  clearProductCatalogCache,
  getManagerDashboardData,
  getProductSubscriptionDetails,
  groupSubscriptionRows,
} = require("./managerDashboard");

const envNames = [
  "SHOPIFY_DE_STORE",
  "SHOPIFY_DE_ACCESS_TOKEN",
  "SHOPIFY_DE_PUBLIC_URL",
  "SHOPIFY_TR_STORE",
  "SHOPIFY_TR_CLIENT_ID",
  "SHOPIFY_TR_CLIENT_SECRET",
  "SHOPIFY_TR_ACCESS_TOKEN",
  "SHOPIFY_TR_PUBLIC_URL",
  "SHOPIFY_API_VERSION",
];
const originalEnv = Object.fromEntries(
  envNames.map((envName) => [envName, process.env[envName]]),
);

beforeEach(() => {
  clearProductCatalogCache();
  mockFindAll.mockReset();
  axios.get.mockReset();
  axios.post.mockReset();
  process.env.SHOPIFY_DE_STORE = "de-store.myshopify.com";
  process.env.SHOPIFY_DE_ACCESS_TOKEN = "token";
  process.env.SHOPIFY_DE_PUBLIC_URL = "https://onkron.de";
  process.env.SHOPIFY_API_VERSION = "2025-10";
});

afterEach(() => {
  for (const envName of envNames) {
    if (originalEnv[envName] === undefined) delete process.env[envName];
    else process.env[envName] = originalEnv[envName];
  }
});

test("groups SKU rows into products and totals their subscriptions", () => {
  expect(
    groupSubscriptionRows([
      { country: "DE", inventory_id: "100", sku: "BLACK", subscription_count: "3" },
      { country: "DE", inventory_id: "100", sku: "WHITE", subscription_count: "2" },
    ]),
  ).toEqual([
    {
      country: "DE",
      productId: "100",
      totalSubscriptions: 5,
      skus: [
        { sku: "BLACK", subscriptions: 3 },
        { sku: "WHITE", subscriptions: 2 },
      ],
    },
  ]);
});

test("combines the same SKU from different countries into one product", () => {
  const products = buildCrossCountryProducts([
    {
      code: "DE",
      products: [{
        productId: "100",
        title: "TV Stand",
        imageUrl: "de.jpg",
        productUrl: "https://onkron.de/products/tv-stand",
        catalogStatus: "available",
        skus: [{ sku: "TS100", subscriptions: 3 }],
      }],
    },
    {
      code: "US",
      products: [{
        productId: "200",
        title: "TV Stand",
        imageUrl: "us.jpg",
        productUrl: "https://onkron.us/products/tv-stand",
        catalogStatus: "available",
        skus: [{ sku: "TS100", subscriptions: 2 }],
      }],
    },
  ]);

  expect(products).toEqual([
    expect.objectContaining({
      sku: "TS100",
      totalSubscriptions: 5,
      sites: [
        expect.objectContaining({ country: "DE", subscriptions: 3 }),
        expect.objectContaining({ country: "US", subscriptions: 2 }),
      ],
    }),
  ]);
});

test("enriches each unique product with its Shopify title and image", async () => {
  mockFindAll.mockResolvedValue([
    { country: "DE", inventory_id: "100", sku: "BLACK", subscription_count: "3" },
    { country: "DE", inventory_id: "100", sku: "WHITE", subscription_count: "2" },
  ]);
  axios.get.mockResolvedValue({
    data: {
      product: {
        title: "ONKRON Stand",
        handle: "onkron-stand",
        image: { src: "https://cdn.example.com/stand.jpg" },
      },
    },
  });

  const dashboard = await getManagerDashboardData();

  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(dashboard).toEqual(
    expect.objectContaining({
      totalSubscriptions: 5,
      countries: [
        expect.objectContaining({
          code: "DE",
          totalSubscriptions: 5,
          products: [
            expect.objectContaining({
              title: "ONKRON Stand",
              imageUrl: "https://cdn.example.com/stand.jpg",
              productUrl: "https://onkron.de/products/onkron-stand",
              totalSubscriptions: 5,
            }),
          ],
        }),
      ],
    }),
  );
});

test("loads Turkish products using a client credentials token", async () => {
  process.env.SHOPIFY_TR_STORE = "tr-store.myshopify.com";
  process.env.SHOPIFY_TR_CLIENT_ID = "dashboard-client";
  process.env.SHOPIFY_TR_CLIENT_SECRET = "dashboard-secret";
  delete process.env.SHOPIFY_TR_ACCESS_TOKEN;
  process.env.SHOPIFY_TR_PUBLIC_URL = "https://onkron.com.tr";
  mockFindAll.mockResolvedValue([
    { country: "TR", inventory_id: "200", sku: "STAND", subscription_count: "1" },
  ]);
  axios.post.mockResolvedValue({
    data: { access_token: "tr-access-token", expires_in: 86399 },
  });
  axios.get.mockResolvedValue({
    data: { product: { title: "TV Stand", handle: "tv-stand" } },
  });

  const dashboard = await getManagerDashboardData();

  expect(axios.get).toHaveBeenCalledWith(
    "https://tr-store.myshopify.com/admin/api/2025-10/products/200.json",
    expect.objectContaining({
      headers: { "X-Shopify-Access-Token": "tr-access-token" },
    }),
  );
  expect(dashboard.countries[0].products[0].productUrl).toBe(
    "https://onkron.com.tr/products/tv-stand",
  );
});

test("keeps the product visible when Shopify credentials are unavailable", async () => {
  delete process.env.SHOPIFY_DE_ACCESS_TOKEN;
  mockFindAll.mockResolvedValue([
    { country: "DE", inventory_id: "100", sku: "BLACK", subscription_count: "1" },
  ]);

  const dashboard = await getManagerDashboardData();

  expect(axios.get).not.toHaveBeenCalled();
  expect(dashboard.countries[0].products[0]).toEqual(
    expect.objectContaining({
      title: "SKU BLACK",
      imageUrl: null,
      catalogStatus: "unavailable",
    }),
  );
});

test("returns subscriber details for a product and selected country", async () => {
  mockFindAll.mockResolvedValue([
    {
      id: 1,
      nickname: "Anna",
      email: "anna@example.com",
      sku: "BLACK",
      inventory_id: "100",
      country: "DE",
      createdAt: "2026-08-04T10:00:00.000Z",
    },
  ]);
  axios.get.mockResolvedValue({
    data: {
      product: {
        title: "ONKRON Stand",
        handle: "onkron-stand",
        image: { src: "https://cdn.example.com/stand.jpg" },
      },
    },
  });

  const details = await getProductSubscriptionDetails("BLACK", "DE");

  expect(mockFindAll).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { notification_sent: false, sku: "BLACK", country: "DE" },
    }),
  );
  expect(details).toEqual({
    sku: "BLACK",
    totalSubscriptions: 1,
    sites: [
      expect.objectContaining({
        country: "DE",
        productUrl: "https://onkron.de/products/onkron-stand",
        subscribers: [
          {
            id: 1,
            nickname: "Anna",
            email: "anna@example.com",
            subscribedAt: "2026-08-04T10:00:00.000Z",
          },
        ],
      }),
    ],
  });
});

test("filters subscriber details by several selected countries", async () => {
  mockFindAll.mockResolvedValue([]);

  await getProductSubscriptionDetails("BLACK", ["ES", "IT", "ES"]);

  const where = mockFindAll.mock.calls[0][0].where;
  expect(where.notification_sent).toBe(false);
  expect(where.sku).toBe("BLACK");
  expect(where.country[Op.in]).toEqual(["ES", "IT"]);
});
