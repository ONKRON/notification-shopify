jest.mock("axios");

const mockFindAll = jest.fn();
const mockGmailSend = jest.fn();

jest.mock("../config/database", () => ({ authenticate: jest.fn() }));
jest.mock("../models/Subscription", () => ({ findAll: mockFindAll }));
jest.mock("../models/CronRun", () => ({}));
jest.mock("../services/bitrix", () => ({
  deliverProductSubscriptionNotification: jest.fn(),
  getMaxNotificationAttempts: () => 5,
  notifyAvailabilityConfirmed: jest.fn(),
}));
jest.mock("../services/digest", () => ({ sendWeeklyAnalyticsDigest: jest.fn() }));
jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        getAccessToken: jest.fn().mockResolvedValue({ token: "gmail-token" }),
      })),
    },
    gmail: jest.fn(() => ({ users: { messages: { send: mockGmailSend } } })),
  },
}));

const axios = require("axios");
const { checkProductAvailability } = require("./sendNotification");

test("reports the store on 401 and skips repeated requests to it in the same run", async () => {
  const previousStore = process.env.SHOPIFY_DE_STORE;
  const previousToken = process.env.SHOPIFY_DE_ACCESS_TOKEN;
  process.env.SHOPIFY_DE_STORE = "de-store.myshopify.com";
  process.env.SHOPIFY_DE_ACCESS_TOKEN = "de-token";
  mockFindAll.mockResolvedValue([1, 2].map((id) => ({
    id,
    country: "DE",
    sku: `SKU-${id}`,
    inventory_id: String(id),
    notification_sent: false,
    manager_notification_status: "sent",
  })));
  const error = new Error("Request failed with status code 401");
  error.response = { status: 401 };
  axios.get.mockRejectedValue(error);
  mockGmailSend.mockResolvedValue({ data: { id: "error-email" } });
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  const consoleLog = jest.spyOn(console, "log").mockImplementation(() => {});

  try {
    const stats = await checkProductAvailability();

    expect(stats).toEqual({ checked: 2, sent: 0, errors: 1 });
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(mockGmailSend).toHaveBeenCalledTimes(1);
    const rawEmail = mockGmailSend.mock.calls[0][0].requestBody.raw;
    const message = Buffer.from(rawEmail, "base64url").toString("utf8");
    expect(message).toContain(
      "country=DE, store=de-store.myshopify.com, subscriptionId=1, productId=1, status=401, auth=static_access_token",
    );
  } finally {
    consoleError.mockRestore();
    consoleLog.mockRestore();
    if (previousStore === undefined) delete process.env.SHOPIFY_DE_STORE;
    else process.env.SHOPIFY_DE_STORE = previousStore;
    if (previousToken === undefined) delete process.env.SHOPIFY_DE_ACCESS_TOKEN;
    else process.env.SHOPIFY_DE_ACCESS_TOKEN = previousToken;
  }
});
