jest.mock("axios");

const mockFindAll = jest.fn();
jest.mock("../models/Subscription", () => ({ findAll: mockFindAll }));

const axios = require("axios");
const {
  clearProductCatalogCache,
  getManagerDashboardData,
  groupSubscriptionRows,
} = require("./managerDashboard");

const envNames = [
  "SHOPIFY_DE_STORE",
  "SHOPIFY_DE_ACCESS_TOKEN",
  "SHOPIFY_API_VERSION",
];
const originalEnv = Object.fromEntries(
  envNames.map((envName) => [envName, process.env[envName]]),
);

beforeEach(() => {
  clearProductCatalogCache();
  mockFindAll.mockReset();
  axios.get.mockReset();
  process.env.SHOPIFY_DE_STORE = "de-store.myshopify.com";
  process.env.SHOPIFY_DE_ACCESS_TOKEN = "token";
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

test("enriches each unique product with its Shopify title and image", async () => {
  mockFindAll.mockResolvedValue([
    { country: "DE", inventory_id: "100", sku: "BLACK", subscription_count: "3" },
    { country: "DE", inventory_id: "100", sku: "WHITE", subscription_count: "2" },
  ]);
  axios.get.mockResolvedValue({
    data: {
      product: {
        title: "ONKRON Stand",
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
              totalSubscriptions: 5,
            }),
          ],
        }),
      ],
    }),
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
