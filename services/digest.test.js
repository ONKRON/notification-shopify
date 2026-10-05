const mockGetAnalyticsSummary = jest.fn();
const mockGetDigestDialogId = jest.fn();
const mockSendBitrixMessage = jest.fn();
const mockDigestRunFindOne = jest.fn();
const mockDigestRunCreate = jest.fn();

jest.mock("./analytics", () => ({
  getAnalyticsSummary: (...args) => mockGetAnalyticsSummary(...args),
}));

jest.mock("./bitrix", () => ({
  getDigestDialogId: (...args) => mockGetDigestDialogId(...args),
  sendBitrixMessage: (...args) => mockSendBitrixMessage(...args),
}));

jest.mock("../models/DigestRun", () => ({
  findOne: (...args) => mockDigestRunFindOne(...args),
  create: (...args) => mockDigestRunCreate(...args),
}));

const {
  formatDigestMessage,
  buildDigestPreview,
  sendWeeklyAnalyticsDigest,
} = require("./digest");

const summary = {
  totalActiveSubscriptions: 351,
  newSubscriptionsLast7d: 5,
  sentLast7d: 4,
  sentLast30d: 10,
  avgWaitTimeMs: 90000,
  errorRate30d: 12.5,
  subscriptionsNeedingAttention: [{ id: 1 }, { id: 2 }],
  activeByCountry: [
    { country: "DE", count: "1" },
    { country: "US", count: "21" },
  ],
  topSkusByCountry: [
    { country: "DE", skus: [{ sku: "TS2", totalCount: 7 }] },
    {
      country: "US",
      skus: [
        { sku: "TS1", totalCount: 16 },
        { sku: "TS3", totalCount: 5 },
      ],
    },
  ],
  newSubscriptionsByCountry: [
    { country: "DE", skus: [{ sku: "TS2", totalCount: 2 }] },
    { country: "US", skus: [{ sku: "TS1", totalCount: 3 }] },
  ],
  generatedAt: "2026-08-05T00:00:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("formatDigestMessage includes a header, flags, per-country blocks, and a final summary", () => {
  const message = formatDigestMessage(summary);
  expect(message).toContain("📊 ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ ПО ПОДПИСКАМ");
  expect(message).toContain("Дата отчета —");
  expect(message).toContain("=================================");
  expect(message).toContain("🇩🇪 Германия");
  expect(message).toContain("TS2 - 7");
  expect(message).toContain("Итого активных подписок: 1");
  expect(message).toContain("🇺🇸 США");
  expect(message).toContain("TS1 - 16");
  expect(message).toContain("Итого активных подписок: 21");
  expect(message).toContain("📈 ИТОГО");
  expect(message).toContain("Активных подписок: 351");
  expect(message).toContain("Отправлено за 7 дней: 4");
  expect(message).toContain("⚠️ Требуют внимания: 2");
});

test("formatDigestMessage includes a new-subscriptions-this-week block", () => {
  const message = formatDigestMessage(summary);
  expect(message).toContain("🆕 НОВЫЕ ПОДПИСКИ ЗА 7 ДНЕЙ");
  expect(message).toContain("Новых подписок за 7 дней: 5");
  const newSectionIndex = message.indexOf("🆕 НОВЫЕ ПОДПИСКИ ЗА 7 ДНЕЙ");
  const totalsSectionIndex = message.indexOf("📈 ИТОГО");
  const newBlock = message.slice(newSectionIndex, totalsSectionIndex);
  expect(newBlock).toContain("🇩🇪 Германия");
  expect(newBlock).toContain("TS2 - 2");
  expect(newBlock).toContain("🇺🇸 США");
  expect(newBlock).toContain("TS1 - 3");
});

test("formatDigestMessage includes Turkey with its localized name and flag", () => {
  const message = formatDigestMessage({
    ...summary,
    activeByCountry: [
      ...summary.activeByCountry,
      { country: "TR", count: "4" },
    ],
    topSkusByCountry: [
      ...summary.topSkusByCountry,
      { country: "TR", skus: [{ sku: "TS1881", totalCount: 4 }] },
    ],
    newSubscriptionsByCountry: [
      ...summary.newSubscriptionsByCountry,
      { country: "TR", skus: [{ sku: "TS1881", totalCount: 2 }] },
    ],
  });

  expect(message).toContain("🇹🇷 Турция");
  expect(message).toContain("TS1881 - 4");
  expect(message).toContain("Итого активных подписок: 4");
});

test("formatDigestMessage flags an empty week when there are no new subscriptions", () => {
  const message = formatDigestMessage({ ...summary, newSubscriptionsByCountry: [] });
  expect(message).toContain("Новых подписок за 7 дней не было");
});

describe("dashboard link", () => {
  const originalUrl = process.env.MANAGER_DASHBOARD_PUBLIC_URL;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.MANAGER_DASHBOARD_PUBLIC_URL;
    else process.env.MANAGER_DASHBOARD_PUBLIC_URL = originalUrl;
  });

  test("formatDigestMessage links to the default production dashboard", () => {
    delete process.env.MANAGER_DASHBOARD_PUBLIC_URL;
    const message = formatDigestMessage(summary);
    expect(message).toContain(
      "🔗 Подробнее — https://notification-shopify-production.up.railway.app/manager/analytics",
    );
  });

  test("formatDigestMessage honors a configured dashboard URL", () => {
    process.env.MANAGER_DASHBOARD_PUBLIC_URL = "https://example.com/";
    const message = formatDigestMessage(summary);
    expect(message).toContain("🔗 Подробнее — https://example.com/manager/analytics");
  });
});

test("formatDigestMessage orders countries by active subscriptions, busiest first", () => {
  const message = formatDigestMessage(summary);
  expect(message.indexOf("США")).toBeLessThan(message.indexOf("Германия"));
});

test("formatDigestMessage handles no top SKUs", () => {
  const message = formatDigestMessage({
    ...summary,
    topSkusByCountry: [],
    activeByCountry: [],
  });
  expect(message).toContain("Нет данных по странам");
});

test("formatDigestMessage omits trend arrows without a previous summary", () => {
  const message = formatDigestMessage(summary, null);
  expect(message).not.toContain("за неделю");
});

test("formatDigestMessage shows an up arrow when a metric grew", () => {
  const message = formatDigestMessage(summary, {
    totalActiveSubscriptions: 339,
  });
  expect(message).toContain("Активных подписок: 351 (↑ +12 за неделю)");
});

test("formatDigestMessage shows a down arrow when a metric shrank", () => {
  const message = formatDigestMessage(summary, {
    totalActiveSubscriptions: 400,
  });
  expect(message).toContain("Активных подписок: 351 (↓ -49 за неделю)");
});

test("formatDigestMessage marks an unchanged metric", () => {
  const message = formatDigestMessage(summary, { sentLast7d: 4 });
  expect(message).toContain("Отправлено за 7 дней: 4 (→ без изменений)");
});

test("formatDigestMessage shows the comparison date when a previous digest exists", () => {
  const previousSentAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const message = formatDigestMessage(summary, {}, previousSentAt);
  expect(message).toContain("Сравнение с —");
  expect(message).toContain("(7 дн назад)");
});

test("formatDigestMessage flags missing comparison data without a previous digest", () => {
  const message = formatDigestMessage(summary, null, null);
  expect(message).toContain("Сравнение — нет данных за прошлую неделю");
});

test("buildDigestPreview combines the current summary with the last stored one, without sending", async () => {
  mockGetAnalyticsSummary.mockResolvedValue(summary);
  const previousSentAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  mockDigestRunFindOne.mockResolvedValue({
    summary: { totalActiveSubscriptions: 300 },
    sent_at: previousSentAt,
  });

  const preview = await buildDigestPreview();

  expect(preview.message).toContain("(↑ +51 за неделю)");
  expect(preview.message).toContain("Сравнение с —");
  expect(preview.summary).toBe(summary);
  expect(mockSendBitrixMessage).not.toHaveBeenCalled();
  expect(mockDigestRunCreate).not.toHaveBeenCalled();
});

test("buildDigestPreview works with no prior digest history", async () => {
  mockGetAnalyticsSummary.mockResolvedValue(summary);
  mockDigestRunFindOne.mockResolvedValue(null);

  const preview = await buildDigestPreview();

  expect(preview.message).not.toContain("за неделю");
});

test("sendWeeklyAnalyticsDigest posts to Bitrix and persists a DigestRun", async () => {
  mockGetAnalyticsSummary.mockResolvedValue(summary);
  mockDigestRunFindOne.mockResolvedValue(null);
  mockGetDigestDialogId.mockReturnValue("777");
  mockSendBitrixMessage.mockResolvedValue(42);

  const result = await sendWeeklyAnalyticsDigest();

  expect(mockSendBitrixMessage).toHaveBeenCalledWith(
    "777",
    expect.stringContaining("Активных подписок: 351"),
  );
  expect(mockDigestRunCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      dialog_id: "777",
      summary,
      message: expect.stringContaining("Активных подписок: 351"),
    }),
  );
  expect(result.summary).toBe(summary);
});

test("sendWeeklyAnalyticsDigest does not persist a DigestRun when Bitrix rejects the message", async () => {
  mockGetAnalyticsSummary.mockResolvedValue(summary);
  mockDigestRunFindOne.mockResolvedValue(null);
  mockGetDigestDialogId.mockReturnValue("777");
  mockSendBitrixMessage.mockRejectedValue(new Error("Bitrix unavailable"));

  await expect(sendWeeklyAnalyticsDigest()).rejects.toThrow("Bitrix unavailable");
  expect(mockDigestRunCreate).not.toHaveBeenCalled();
});
