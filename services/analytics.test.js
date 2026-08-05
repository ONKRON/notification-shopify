const { Op } = require("sequelize");

const mockSubscriptionCount = jest.fn();
const mockSubscriptionFindAll = jest.fn();
const mockCronRunFindAll = jest.fn();
const mockSequelizeQuery = jest.fn();

jest.mock("../models/Subscription", () => ({
  count: (...args) => mockSubscriptionCount(...args),
  findAll: (...args) => mockSubscriptionFindAll(...args),
}));

jest.mock("../models/CronRun", () => ({
  findAll: (...args) => mockCronRunFindAll(...args),
}));

jest.mock("../config/database", () => ({
  query: (...args) => mockSequelizeQuery(...args),
}));

const {
  getFunnelCounts,
  getAvgWaitTimeMs,
  getErrorRate30d,
  getTopSkus,
  getActiveSubscriptionsByCountry,
  getTopSkusByCountry,
  getNewSubscriptionsByCountry,
  getErrorsByCountry,
  getManagerNotificationStats,
  getSubscriptionsNeedingAttention,
  getProblemEmails,
  getDailyTrend,
  getWaitTimeBySku,
  getAllActiveSkusByCountry,
  getRecentCronRuns,
  getAnalyticsSummary,
} = require("./analytics");

beforeEach(() => {
  jest.clearAllMocks();
});

test("getFunnelCounts calls Subscription.count for each window", async () => {
  mockSubscriptionCount
    .mockResolvedValueOnce(5)
    .mockResolvedValueOnce(1)
    .mockResolvedValueOnce(2)
    .mockResolvedValueOnce(3)
    .mockResolvedValueOnce(7);

  await expect(getFunnelCounts()).resolves.toEqual({
    totalActiveSubscriptions: 5,
    sentLast24h: 1,
    sentLast7d: 2,
    sentLast30d: 3,
    newSubscriptionsLast7d: 7,
  });
  expect(mockSubscriptionCount).toHaveBeenCalledTimes(5);
});

test("getAvgWaitTimeMs returns null when there is no data", async () => {
  mockSequelizeQuery.mockResolvedValue([[{ avg_wait_ms: null }]]);
  await expect(getAvgWaitTimeMs()).resolves.toBeNull();
});

test("getAvgWaitTimeMs rounds the average", async () => {
  mockSequelizeQuery.mockResolvedValue([[{ avg_wait_ms: "1234.6" }]]);
  await expect(getAvgWaitTimeMs()).resolves.toBe(1235);
});

test("getErrorRate30d computes a percentage", async () => {
  mockSubscriptionCount.mockResolvedValueOnce(1).mockResolvedValueOnce(3);
  await expect(getErrorRate30d()).resolves.toBe(25);
});

test("getErrorRate30d returns 0 when there is no data at all", async () => {
  mockSubscriptionCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
  await expect(getErrorRate30d()).resolves.toBe(0);
});

test("getTopSkus delegates to Subscription.findAll", async () => {
  mockSubscriptionFindAll.mockResolvedValue([
    { country: "US", sku: "TS1", total_count: "3" },
  ]);
  await expect(getTopSkus()).resolves.toEqual([
    { country: "US", sku: "TS1", total_count: "3" },
  ]);
  expect(mockSubscriptionFindAll).toHaveBeenCalledWith(
    expect.objectContaining({ where: { notification_sent: false } }),
  );
});

test("getActiveSubscriptionsByCountry delegates to Subscription.findAll", async () => {
  mockSubscriptionFindAll.mockResolvedValue([{ country: "DE", count: "33" }]);
  await expect(getActiveSubscriptionsByCountry()).resolves.toEqual([
    { country: "DE", count: "33" },
  ]);
  expect(mockSubscriptionFindAll).toHaveBeenCalledWith(
    expect.objectContaining({ where: { notification_sent: false } }),
  );
});

test("getTopSkusByCountry groups ranked rows per country", async () => {
  mockSequelizeQuery.mockResolvedValue([
    [
      { country: "DE", sku: "TS2210-B", total_count: "16" },
      { country: "DE", sku: "TS73", total_count: "7" },
      { country: "US", sku: "TS1552-W", total_count: "16" },
    ],
  ]);

  await expect(getTopSkusByCountry()).resolves.toEqual([
    {
      country: "DE",
      skus: [
        { sku: "TS2210-B", totalCount: 16 },
        { sku: "TS73", totalCount: 7 },
      ],
    },
    { country: "US", skus: [{ sku: "TS1552-W", totalCount: 16 }] },
  ]);
});

test("getNewSubscriptionsByCountry groups ranked rows created within the window", async () => {
  mockSequelizeQuery.mockResolvedValue([
    [
      { country: "DE", sku: "TS73", total_count: "3" },
      { country: "US", sku: "TS1552-W", total_count: "2" },
    ],
  ]);

  await expect(getNewSubscriptionsByCountry()).resolves.toEqual([
    { country: "DE", skus: [{ sku: "TS73", totalCount: 3 }] },
    { country: "US", skus: [{ sku: "TS1552-W", totalCount: 2 }] },
  ]);
  expect(mockSequelizeQuery.mock.calls[0][1]).toEqual({
    replacements: { days: 7, limitPerCountry: 5 },
  });
});

test("getErrorsByCountry groups by country", async () => {
  mockSubscriptionFindAll.mockResolvedValue([
    { country: "DE", error_count: "2" },
  ]);
  await expect(getErrorsByCountry()).resolves.toEqual([
    { country: "DE", error_count: "2" },
  ]);
});

test("getManagerNotificationStats groups by status", async () => {
  mockSubscriptionFindAll.mockResolvedValue([
    { manager_notification_status: "sent", count: "4" },
  ]);
  await expect(getManagerNotificationStats()).resolves.toEqual([
    { manager_notification_status: "sent", count: "4" },
  ]);
});

test("getSubscriptionsNeedingAttention filters on errors or failed manager status", async () => {
  mockSubscriptionFindAll.mockResolvedValue([{ id: 1, email: "a@b.com" }]);
  const result = await getSubscriptionsNeedingAttention();
  expect(result).toEqual([{ id: 1, email: "a@b.com" }]);
  const callArgs = mockSubscriptionFindAll.mock.calls[0][0];
  expect(callArgs.where[Op.or]).toHaveLength(2);
});

test("getProblemEmails groups by email", async () => {
  mockSubscriptionFindAll.mockResolvedValue([
    { email: "bad@example.com", error_count: "5" },
  ]);
  await expect(getProblemEmails()).resolves.toEqual([
    { email: "bad@example.com", error_count: "5" },
  ]);
});

test("getDailyTrend fills gaps with zero and attaches the SKU breakdown per day", async () => {
  const today = new Date().toISOString().slice(0, 10);
  mockSequelizeQuery
    .mockResolvedValueOnce([[{ day: today, count: "3" }]])
    .mockResolvedValueOnce([[{ day: today, count: "1" }]])
    .mockResolvedValueOnce([
      [
        { day: today, sku: "TS1", country: "US", count: "2" },
        { day: today, sku: "TS2", country: "DE", count: "1" },
      ],
    ]);

  const trend = await getDailyTrend(5);
  expect(trend).toHaveLength(5);
  expect(trend[trend.length - 1]).toEqual({
    day: today,
    subscribed: 3,
    sent: 1,
    skus: [
      { sku: "TS1", country: "US", count: 2 },
      { sku: "TS2", country: "DE", count: 1 },
    ],
  });
  expect(trend[0]).toEqual({
    day: expect.any(String),
    subscribed: 0,
    sent: 0,
    skus: [],
  });
});

test("getWaitTimeBySku maps and rounds the raw rows", async () => {
  mockSequelizeQuery.mockResolvedValue([
    [{ sku: "TS1", country: "US", sent_count: "4", avg_wait_ms: "1500.4" }],
  ]);
  await expect(getWaitTimeBySku()).resolves.toEqual([
    { sku: "TS1", country: "US", sentCount: 4, avgWaitMs: 1500 },
  ]);
});

test("getWaitTimeBySku omits the LIMIT clause when called with null", async () => {
  mockSequelizeQuery.mockResolvedValue([[]]);
  await getWaitTimeBySku(null);
  expect(mockSequelizeQuery.mock.calls[0][0]).not.toContain("LIMIT");
});

test("getAllActiveSkusByCountry returns every active SKU per country, uncapped", async () => {
  mockSubscriptionFindAll.mockResolvedValue([
    { country: "DE", sku: "TS1", total_count: "5" },
    { country: "US", sku: "TS2", total_count: "3" },
  ]);
  await expect(getAllActiveSkusByCountry()).resolves.toEqual([
    { country: "DE", sku: "TS1", total_count: "5" },
    { country: "US", sku: "TS2", total_count: "3" },
  ]);
  expect(mockSubscriptionFindAll).toHaveBeenCalledWith(
    expect.objectContaining({ where: { notification_sent: false } }),
  );
  expect(mockSubscriptionFindAll.mock.calls[0][0].limit).toBeUndefined();
});

test("getRecentCronRuns delegates to CronRun.findAll", async () => {
  mockCronRunFindAll.mockResolvedValue([{ id: 1 }]);
  await expect(getRecentCronRuns()).resolves.toEqual([{ id: 1 }]);
});

test("getAnalyticsSummary combines every metric into one object", async () => {
  mockSubscriptionCount.mockResolvedValue(0);
  mockSequelizeQuery.mockResolvedValue([[]]);
  mockSubscriptionFindAll.mockResolvedValue([]);
  mockCronRunFindAll.mockResolvedValue([]);

  const summary = await getAnalyticsSummary();
  expect(summary).toEqual(
    expect.objectContaining({
      totalActiveSubscriptions: 0,
      avgWaitTimeMs: null,
      errorRate30d: 0,
      newSubscriptionsLast7d: 0,
      topSkus: [],
      activeByCountry: [],
      topSkusByCountry: [],
      newSubscriptionsByCountry: [],
      errorsByCountry: [],
      managerNotificationStats: [],
      subscriptionsNeedingAttention: [],
      problemEmails: [],
      recentCronRuns: [],
    }),
  );
  expect(summary.dailyTrend).toHaveLength(30);
  expect(summary.waitTimeBySku).toEqual([]);
  expect(typeof summary.generatedAt).toBe("string");
});
