jest.mock("axios");

const axios = require("axios");
const {
  buildProductSubscriptionMessage,
  deliverProductSubscriptionNotification,
  getManagerDialogId,
  sendProductSubscriptionNotification,
} = require("./bitrix");

const MANAGER_ENV_NAME = "BITRIX_PRODUCT_NOTIFICATION_MANAGER_DE";
const BITRIX_ENV_NAMES = [
  "BITRIX24_BOT_MESSAGE_WEBHOOK",
  "BITRIX24_BOT_ID",
  "BITRIX24_BOT_CLIENT_ID",
  "BITRIX_PRODUCT_NOTIFICATION_FALLBACK_MANAGER",
  MANAGER_ENV_NAME,
];
const originalEnv = Object.fromEntries(
  BITRIX_ENV_NAMES.map((envName) => [envName, process.env[envName]]),
);

afterEach(() => {
  jest.clearAllMocks();

  for (const envName of BITRIX_ENV_NAMES) {
    if (originalEnv[envName] === undefined) {
      delete process.env[envName];
    } else {
      process.env[envName] = originalEnv[envName];
    }
  }
});

const subscription = {
  nickname: "Kunde",
  email: "customer@example.com",
  sku: "TS2811-B",
  country: "DE",
};

test("selects the Bitrix manager by country", () => {
  process.env[MANAGER_ENV_NAME] = "42";

  expect(getManagerDialogId("de")).toBe("42");
});

test("builds a short message from the saved subscription", () => {
  expect(buildProductSubscriptionMessage(subscription, "de-store.myshopify.com"))
    .toBe(`Новая подписка на отсутствующий товар
Страна: DE
Магазин: de-store.myshopify.com
SKU: TS2811-B
Email: customer@example.com
Имя: Kunde`);
});

test("sends a personal message through the configured webhook", async () => {
  process.env.BITRIX24_BOT_MESSAGE_WEBHOOK =
    "https://example.bitrix24.com/rest/1/webhook-token/";
  process.env.BITRIX24_BOT_ID = "26984";
  process.env.BITRIX24_BOT_CLIENT_ID = "onkron_notify_bot";
  process.env[MANAGER_ENV_NAME] = "42";
  axios.post.mockResolvedValue({ data: { result: 123 } });

  await expect(
    sendProductSubscriptionNotification(subscription, "de-store.myshopify.com"),
  ).resolves.toBe(123);

  expect(axios.post).toHaveBeenCalledWith(
    "https://example.bitrix24.com/rest/1/webhook-token/imbot.message.add",
    expect.objectContaining({
      BOT_ID: 26984,
      DIALOG_ID: "42",
      MESSAGE: expect.stringContaining("SKU: TS2811-B"),
      CLIENT_ID: "onkron_notify_bot",
    }),
    { timeout: 5000 },
  );
});

test("uses manager 17171 when the country manager is not configured", async () => {
  process.env.BITRIX24_BOT_MESSAGE_WEBHOOK =
    "https://example.bitrix24.com/rest/1/webhook-token";
  process.env.BITRIX24_BOT_ID = "26984";
  process.env.BITRIX24_BOT_CLIENT_ID = "onkron_notify_bot";
  delete process.env[MANAGER_ENV_NAME];
  delete process.env.BITRIX_PRODUCT_NOTIFICATION_FALLBACK_MANAGER;
  axios.post.mockResolvedValue({ data: { result: 123 } });

  await expect(
    sendProductSubscriptionNotification(subscription, "de-store.myshopify.com"),
  ).resolves.toBe(123);
  expect(axios.post).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ DIALOG_ID: "17171" }),
    expect.any(Object),
  );
});

test("allows overriding the fallback manager through the environment", () => {
  delete process.env[MANAGER_ENV_NAME];
  process.env.BITRIX_PRODUCT_NOTIFICATION_FALLBACK_MANAGER = "1377";

  expect(getManagerDialogId("DE")).toBe("1377");
});

test("rejects a non-numeric bot ID before calling Bitrix", async () => {
  process.env.BITRIX24_BOT_MESSAGE_WEBHOOK =
    "https://example.bitrix24.com/rest/1/webhook-token";
  process.env.BITRIX24_BOT_ID = "not-a-number";
  process.env.BITRIX24_BOT_CLIENT_ID = "onkron_notify_bot";
  process.env[MANAGER_ENV_NAME] = "42";

  await expect(
    sendProductSubscriptionNotification(subscription, "de-store.myshopify.com"),
  ).rejects.toThrow("BITRIX24_BOT_ID must be numeric");
  expect(axios.post).not.toHaveBeenCalled();
});

test("tracks a successful Bitrix delivery", async () => {
  process.env.BITRIX24_BOT_MESSAGE_WEBHOOK =
    "https://example.bitrix24.com/rest/1/webhook-token";
  process.env.BITRIX24_BOT_ID = "26984";
  process.env.BITRIX24_BOT_CLIENT_ID = "onkron_notify_bot";
  process.env[MANAGER_ENV_NAME] = "42";
  axios.post.mockResolvedValue({ data: { result: 123 } });
  const trackedSubscription = {
    ...subscription,
    id: 10,
    manager_notification_attempts: 2,
    update: jest.fn().mockResolvedValue(undefined),
  };

  await expect(
    deliverProductSubscriptionNotification(
      trackedSubscription,
      "de-store.myshopify.com",
    ),
  ).resolves.toBe(123);

  expect(trackedSubscription.update).toHaveBeenCalledWith(
    expect.objectContaining({
      manager_notification_status: "sent",
      manager_notification_attempts: 3,
      manager_notification_last_error: null,
    }),
  );
});

test("tracks a failed Bitrix delivery for a later retry", async () => {
  process.env.BITRIX24_BOT_MESSAGE_WEBHOOK =
    "https://example.bitrix24.com/rest/1/webhook-token";
  process.env.BITRIX24_BOT_ID = "26984";
  process.env.BITRIX24_BOT_CLIENT_ID = "onkron_notify_bot";
  process.env[MANAGER_ENV_NAME] = "42";
  axios.post.mockRejectedValue(new Error("Bitrix unavailable"));
  const trackedSubscription = {
    ...subscription,
    id: 10,
    manager_notification_attempts: 0,
    update: jest.fn().mockResolvedValue(undefined),
  };

  await expect(
    deliverProductSubscriptionNotification(
      trackedSubscription,
      "de-store.myshopify.com",
    ),
  ).rejects.toThrow("Bitrix unavailable");

  expect(trackedSubscription.update).toHaveBeenCalledWith({
    manager_notification_status: "failed",
    manager_notification_attempts: 1,
    manager_notification_last_error: "Bitrix unavailable",
  });
});
