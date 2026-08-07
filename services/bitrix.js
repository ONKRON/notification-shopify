const axios = require("axios");

const MANAGER_ENV_BY_COUNTRY = Object.freeze({
  US: "BITRIX_PRODUCT_NOTIFICATION_MANAGER_US",
  UK: "BITRIX_PRODUCT_NOTIFICATION_MANAGER_UK",
  DE: "BITRIX_PRODUCT_NOTIFICATION_MANAGER_DE",
  FR: "BITRIX_PRODUCT_NOTIFICATION_MANAGER_FR",
  ES: "BITRIX_PRODUCT_NOTIFICATION_MANAGER_ES",
  IT: "BITRIX_PRODUCT_NOTIFICATION_MANAGER_IT",
  PL: "BITRIX_PRODUCT_NOTIFICATION_MANAGER_PL",
  CA: "BITRIX_PRODUCT_NOTIFICATION_MANAGER_CA",
  CN: "BITRIX_PRODUCT_NOTIFICATION_MANAGER_CN",
  TR: "BITRIX_PRODUCT_NOTIFICATION_MANAGER_TR",
});

const DEFAULT_MAX_NOTIFICATION_ATTEMPTS = 5;
const DEFAULT_FALLBACK_MANAGER_DIALOG_ID = "17171";
const MAX_ERROR_LENGTH = 4000;

function getMaxNotificationAttempts() {
  const configuredValue = Number.parseInt(
    process.env.BITRIX_PRODUCT_NOTIFICATION_MAX_ATTEMPTS,
    10,
  );

  return configuredValue > 0
    ? configuredValue
    : DEFAULT_MAX_NOTIFICATION_ATTEMPTS;
}

function getManagerDialogId(country) {
  const normalizedCountry = String(country || "").trim().toUpperCase();
  const managerEnvName = MANAGER_ENV_BY_COUNTRY[normalizedCountry];
  const countryManagerDialogId = managerEnvName
    ? process.env[managerEnvName]
    : null;

  return (
    countryManagerDialogId ||
    process.env.BITRIX_PRODUCT_NOTIFICATION_FALLBACK_MANAGER ||
    DEFAULT_FALLBACK_MANAGER_DIALOG_ID
  );
}

function buildProductSubscriptionMessage(subscription, shopifyStore) {
  return [
    "Новая подписка на отсутствующий товар",
    `Страна: ${subscription.country}`,
    `Магазин: ${shopifyStore}`,
    `SKU: ${subscription.sku}`,
    `Email: ${subscription.email}`,
    `Имя: ${subscription.nickname}`,
  ].join("\n");
}

async function sendBitrixMessage(dialogId, message) {
  const webhookUrl = process.env.BITRIX24_BOT_MESSAGE_WEBHOOK;
  if (!webhookUrl) {
    throw new Error(
      "Environment variable BITRIX24_BOT_MESSAGE_WEBHOOK is not configured",
    );
  }

  const botId = process.env.BITRIX24_BOT_ID;
  if (!botId) {
    throw new Error("Environment variable BITRIX24_BOT_ID is not configured");
  }
  if (!/^\d+$/.test(botId)) {
    throw new Error("Environment variable BITRIX24_BOT_ID must be numeric");
  }

  const botClientId = process.env.BITRIX24_BOT_CLIENT_ID;
  if (!botClientId) {
    throw new Error(
      "Environment variable BITRIX24_BOT_CLIENT_ID is not configured",
    );
  }

  const endpoint = `${webhookUrl.replace(/\/+$/, "")}/imbot.message.add`;
  const response = await axios.post(
    endpoint,
    {
      BOT_ID: Number(botId),
      DIALOG_ID: String(dialogId),
      MESSAGE: message,
      CLIENT_ID: botClientId,
      SYSTEM: "N",
      URL_PREVIEW: "N",
    },
    { timeout: 5000 },
  );

  if (response.data && response.data.error) {
    throw new Error(
      `Bitrix API error: ${response.data.error_description || response.data.error}`,
    );
  }

  return response.data && response.data.result;
}

function getDigestDialogId() {
  return (
    process.env.BITRIX_ANALYTICS_DIGEST_DIALOG_ID ||
    process.env.BITRIX_PRODUCT_NOTIFICATION_FALLBACK_MANAGER ||
    DEFAULT_FALLBACK_MANAGER_DIALOG_ID
  );
}

function getAvailabilityConfirmationDialogId() {
  return (
    process.env.BITRIX_AVAILABILITY_CONFIRMATION_DIALOG_ID ||
    process.env.BITRIX_PRODUCT_NOTIFICATION_FALLBACK_MANAGER ||
    DEFAULT_FALLBACK_MANAGER_DIALOG_ID
  );
}

function buildAvailabilityConfirmationMessage(subscription, shopifyStore) {
  return [
    "Товар снова в наличии — письмо подписчику отправлено",
    `Страна: ${subscription.country}`,
    `Магазин: ${shopifyStore}`,
    `SKU: ${subscription.sku}`,
    `Email: ${subscription.email}`,
    `Имя: ${subscription.nickname}`,
  ].join("\n");
}

async function notifyAvailabilityConfirmed(subscription, shopifyStore) {
  return sendBitrixMessage(
    getAvailabilityConfirmationDialogId(),
    buildAvailabilityConfirmationMessage(subscription, shopifyStore),
  );
}

async function sendProductSubscriptionNotification(subscription, shopifyStore) {
  const managerDialogId = getManagerDialogId(subscription.country);
  return sendBitrixMessage(
    managerDialogId,
    buildProductSubscriptionMessage(subscription, shopifyStore),
  );
}

async function deliverProductSubscriptionNotification(subscription, shopifyStore) {
  const attempt = Number(subscription.manager_notification_attempts || 0) + 1;
  let messageId;

  try {
    messageId = await sendProductSubscriptionNotification(
      subscription,
      shopifyStore,
    );
  } catch (error) {
    try {
      await subscription.update({
        manager_notification_status: "failed",
        manager_notification_attempts: attempt,
        manager_notification_last_error: String(error.message || error).slice(
          0,
          MAX_ERROR_LENGTH,
        ),
      });
    } catch (trackingError) {
      console.error(
        `Failed to track Bitrix delivery for subscription ${subscription.id}:`,
        trackingError.message,
      );
    }

    throw error;
  }

  await subscription.update({
    manager_notification_status: "sent",
    manager_notification_sent_at: new Date(),
    manager_notification_attempts: attempt,
    manager_notification_last_error: null,
  });

  return messageId;
}

module.exports = {
  buildAvailabilityConfirmationMessage,
  buildProductSubscriptionMessage,
  deliverProductSubscriptionNotification,
  getAvailabilityConfirmationDialogId,
  getDigestDialogId,
  getManagerDialogId,
  getMaxNotificationAttempts,
  notifyAvailabilityConfirmed,
  sendBitrixMessage,
  sendProductSubscriptionNotification,
};
