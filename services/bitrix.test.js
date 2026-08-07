jest.mock("axios");

const axios = require("axios");
const {
  buildAvailabilityConfirmationMessage,
  buildProductSubscriptionMessage,
  deliverProductSubscriptionNotification,
  getAvailabilityConfirmationDialogId,
  getDigestDialogId,
  getManagerDialogId,
  notifyAvailabilityConfirmed,
  sendBitrixMessage,
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

test("sendBitrixMessage posts an arbitrary message to a given dialog", async () => {
  process.env.BITRIX24_BOT_MESSAGE_WEBHOOK =
    "https://example.bitrix24.com/rest/1/webhook-token";
  process.env.BITRIX24_BOT_ID = "26984";
  process.env.BITRIX24_BOT_CLIENT_ID = "onkron_notify_bot";
  axios.post.mockResolvedValue({ data: { result: 999 } });

  await expect(sendBitrixMessage("555", "digest text")).resolves.toBe(999);
  expect(axios.post).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ DIALOG_ID: "555", MESSAGE: "digest text" }),
    expect.any(Object),
  );
});

describe("getDigestDialogId", () => {
  const DIGEST_ENV = "BITRIX_ANALYTICS_DIGEST_DIALOG_ID";
  const originalDigestEnv = process.env[DIGEST_ENV];

  afterEach(() => {
    if (originalDigestEnv === undefined) delete process.env[DIGEST_ENV];
    else process.env[DIGEST_ENV] = originalDigestEnv;
  });

  test("prefers the dedicated digest dialog id", () => {
    process.env[DIGEST_ENV] = "777";
    expect(getDigestDialogId()).toBe("777");
  });

  test("falls back to the manager fallback, then the default", () => {
    delete process.env[DIGEST_ENV];
    delete process.env.BITRIX_PRODUCT_NOTIFICATION_FALLBACK_MANAGER;
    expect(getDigestDialogId()).toBe("17171");

    process.env.BITRIX_PRODUCT_NOTIFICATION_FALLBACK_MANAGER = "1377";
    expect(getDigestDialogId()).toBe("1377");
  });
});

describe("getAvailabilityConfirmationDialogId", () => {
  const AVAILABILITY_ENV = "BITRIX_AVAILABILITY_CONFIRMATION_DIALOG_ID";
  const originalAvailabilityEnv = process.env[AVAILABILITY_ENV];

  afterEach(() => {
    if (originalAvailabilityEnv === undefined) delete process.env[AVAILABILITY_ENV];
    else process.env[AVAILABILITY_ENV] = originalAvailabilityEnv;
  });

  test("prefers the dedicated availability confirmation dialog id", () => {
    process.env[AVAILABILITY_ENV] = "555";
    expect(getAvailabilityConfirmationDialogId()).toBe("555");
  });

  test("falls back to the manager fallback, then to 17171", () => {
    delete process.env[AVAILABILITY_ENV];
    delete process.env.BITRIX_PRODUCT_NOTIFICATION_FALLBACK_MANAGER;
    expect(getAvailabilityConfirmationDialogId()).toBe("17171");

    process.env.BITRIX_PRODUCT_NOTIFICATION_FALLBACK_MANAGER = "1377";
    expect(getAvailabilityConfirmationDialogId()).toBe("1377");
  });
});

test("builds the availability confirmation message", () => {
  expect(buildAvailabilityConfirmationMessage(subscription, "de-store.myshopify.com"))
    .toBe(`Товар снова в наличии — письмо подписчику отправлено
Страна: DE
Магазин: de-store.myshopify.com
SKU: TS2811-B
Email: customer@example.com
Имя: Kunde`);
});

test("notifyAvailabilityConfirmed sends the confirmation to dialog 17171 by default", async () => {
  process.env.BITRIX24_BOT_MESSAGE_WEBHOOK =
    "https://example.bitrix24.com/rest/1/webhook-token";
  process.env.BITRIX24_BOT_ID = "26984";
  process.env.BITRIX24_BOT_CLIENT_ID = "onkron_notify_bot";
  delete process.env.BITRIX_AVAILABILITY_CONFIRMATION_DIALOG_ID;
  delete process.env.BITRIX_PRODUCT_NOTIFICATION_FALLBACK_MANAGER;
  axios.post.mockResolvedValue({ data: { result: 321 } });

  await expect(
    notifyAvailabilityConfirmed(subscription, "de-store.myshopify.com"),
  ).resolves.toBe(321);
  expect(axios.post).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      DIALOG_ID: "17171",
      MESSAGE: expect.stringContaining("Товар снова в наличии"),
    }),
    expect.any(Object),
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
