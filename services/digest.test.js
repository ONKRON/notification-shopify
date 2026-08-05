const mockGetAnalyticsSummary = jest.fn();
const mockGetDigestDialogId = jest.fn();
const mockSendBitrixMessage = jest.fn();

jest.mock("./analytics", () => ({
  getAnalyticsSummary: (...args) => mockGetAnalyticsSummary(...args),
}));

jest.mock("./bitrix", () => ({
  getDigestDialogId: (...args) => mockGetDigestDialogId(...args),
  sendBitrixMessage: (...args) => mockSendBitrixMessage(...args),
}));

const { formatDigestMessage, sendWeeklyAnalyticsDigest } = require("./digest");

const summary = {
  totalActiveSubscriptions: 351,
  sentLast7d: 4,
  sentLast30d: 10,
  avgWaitTimeMs: 90000,
  errorRate30d: 12.5,
  subscriptionsNeedingAttention: [{ id: 1 }, { id: 2 }],
  topSkus: [
    { sku: "TS1", country: "US", total_count: "16" },
    { sku: "TS2", country: "DE", total_count: "7" },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("formatDigestMessage includes the key metrics and top SKUs", () => {
  const message = formatDigestMessage(summary);
  expect(message).toContain("Активных подписок: 351");
  expect(message).toContain("Отправлено за 7 дней: 4");
  expect(message).toContain("Требуют внимания: 2");
  expect(message).toContain("TS1 (US): 16");
});

test("formatDigestMessage handles no top SKUs", () => {
  const message = formatDigestMessage({ ...summary, topSkus: [] });
  expect(message).toContain("нет данных");
});

test("sendWeeklyAnalyticsDigest fetches the summary and posts it to Bitrix", async () => {
  mockGetAnalyticsSummary.mockResolvedValue(summary);
  mockGetDigestDialogId.mockReturnValue("777");
  mockSendBitrixMessage.mockResolvedValue(42);

  const result = await sendWeeklyAnalyticsDigest();

  expect(mockSendBitrixMessage).toHaveBeenCalledWith(
    "777",
    expect.stringContaining("Активных подписок: 351"),
  );
  expect(result.summary).toBe(summary);
});
