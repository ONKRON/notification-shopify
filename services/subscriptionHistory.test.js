jest.mock("axios");

const mockFindAndCountAll = jest.fn();
const mockFindAll = jest.fn();
jest.mock("../models/Subscription", () => ({
  findAndCountAll: (...args) => mockFindAndCountAll(...args),
  findAll: (...args) => mockFindAll(...args),
}));

const axios = require("axios");
const { Op } = require("sequelize");
const { clearProductCatalogCache } = require("./managerDashboard");
const {
  buildHistoryCsv,
  getHistoryFilterOptions,
  getSubscriptionHistory,
} = require("./subscriptionHistory");

const envNames = ["SHOPIFY_DE_STORE", "SHOPIFY_DE_ACCESS_TOKEN", "SHOPIFY_DE_PUBLIC_URL", "SHOPIFY_API_VERSION"];
const originalEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));

const SAMPLE_ROW = {
  id: 1,
  nickname: "Vasya",
  email: "vasya@example.com",
  sku: "BLACK-100",
  inventory_id: "100",
  country: "DE",
  createdAt: "2026-01-01T00:00:00.000Z",
  notification_sent: false,
  notification_sent_at: null,
  notification_attempts: 0,
  notification_last_error: null,
  manager_notification_status: "not_required",
};

beforeEach(() => {
  clearProductCatalogCache();
  mockFindAndCountAll.mockReset();
  mockFindAll.mockReset();
  axios.get.mockReset();
  process.env.SHOPIFY_DE_STORE = "de-store.myshopify.com";
  process.env.SHOPIFY_DE_ACCESS_TOKEN = "token";
  process.env.SHOPIFY_DE_PUBLIC_URL = "https://onkron.de";
  process.env.SHOPIFY_API_VERSION = "2025-10";
});

afterEach(() => {
  for (const name of envNames) {
    if (originalEnv[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
});

test("getSubscriptionHistory applies default pagination and sort, derives status, resolves product title", async () => {
  mockFindAndCountAll.mockResolvedValue({ rows: [SAMPLE_ROW], count: 1 });
  axios.get.mockResolvedValue({
    data: { product: { title: "Onkron Mount", image: { src: "https://img/1.jpg" } } },
  });

  const result = await getSubscriptionHistory({});

  expect(mockFindAndCountAll).toHaveBeenCalledWith(
    expect.objectContaining({
      order: [["createdAt", "DESC"]],
      limit: 25,
      offset: 0,
    }),
  );
  expect(result.total).toBe(1);
  expect(result.page).toBe(1);
  expect(result.totalPages).toBe(1);
  expect(result.items[0]).toMatchObject({
    id: 1,
    status: "pending",
    productTitle: "Onkron Mount",
    productImageUrl: "https://img/1.jpg",
  });
});

test("getSubscriptionHistory clamps page size and falls back to createdAt for unknown sort column", async () => {
  mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

  await getSubscriptionHistory({ page: "0", pageSize: "9999", sortBy: "notification_sent", sortDir: "asc" });

  expect(mockFindAndCountAll).toHaveBeenCalledWith(
    expect.objectContaining({
      order: [["createdAt", "ASC"]],
      limit: 100,
      offset: 0,
    }),
  );
});

test("getSubscriptionHistory builds search/status/date filters", async () => {
  mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

  await getSubscriptionHistory({
    search: "black",
    country: "de,us",
    status: "error",
    dateFrom: "2026-01-01",
    dateTo: "2026-02-01",
  });

  const where = mockFindAndCountAll.mock.calls[0][0].where;
  expect(where.country).toEqual({ [Op.in]: ["DE", "US"] });
  expect(where.notification_sent).toBe(false);
  expect(where[Op.and]).toEqual(
    expect.arrayContaining([
      { [Op.or]: [
        { sku: { [Op.iLike]: "%black%" } },
        { nickname: { [Op.iLike]: "%black%" } },
        { email: { [Op.iLike]: "%black%" } },
      ] },
      { notification_last_error: { [Op.ne]: null } },
      { createdAt: { [Op.gte]: new Date("2026-01-01") } },
      { createdAt: { [Op.lte]: new Date("2026-02-01") } },
    ]),
  );
});

test("getHistoryFilterOptions returns uppercased sorted country list", async () => {
  mockFindAll.mockResolvedValue([{ country: "de" }, { country: "US" }]);

  const countries = await getHistoryFilterOptions();

  expect(countries).toEqual(["DE", "US"]);
});

test("buildHistoryCsv renders a semicolon-delimited row per subscription", async () => {
  mockFindAll.mockResolvedValue([
    { ...SAMPLE_ROW, notification_last_error: 'timeout; "retry"' },
  ]);

  const csv = await buildHistoryCsv({});
  const lines = csv.split("\n");

  expect(lines[0]).toBe("Дата;Никнейм;Email;SKU;Страна;ID товара;Статус;Отправлено;Попыток;Ошибка");
  expect(lines[1]).toContain("vasya@example.com");
  expect(lines[1]).toContain('"timeout; ""retry"""');
});
