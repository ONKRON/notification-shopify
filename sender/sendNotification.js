const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { google } = require('googleapis');
const cron = require("node-cron");
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Subscription = require("../models/Subscription");
const CronRun = require("../models/CronRun");
const { getShopifyConfig } = require("../config/shopify");
const { resolveShopifyAccessToken } = require("../services/shopifyAccessToken");
const {
  getAvailabilityNotificationTemplate,
} = require("../templates/availabilityNotification");
const {
  deliverProductSubscriptionNotification,
  getMaxNotificationAttempts,
  notifyAvailabilityConfirmed,
} = require("../services/bitrix");
const {
  isSubscribedVariantAvailable,
} = require("../utils/productAvailability");
const {
  deliverAvailabilityNotification,
} = require("../services/subscriberNotification");
const { createHealthReport } = require("../services/health");
const { getCronConfig } = require("../config/runtime");
const { maskEmail } = require("../utils/privacy");
const { encodeSubject } = require("../utils/emailHeaders");
const { sendWeeklyAnalyticsDigest } = require("../services/digest");

const app = express();
const PORT = process.env.PORT_CHECKER || 5000;

// Создаем OAuth2 клиент для Gmail API
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Устанавливаем credentials
oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

// Функция для отправки email через Gmail API
async function sendEmailDirect(email, { subject, text, html }) {
  try {
    console.log(`📧 Attempting to send email to: ${maskEmail(email)}`);

    // Получаем актуальный access token
    const { token } = await oAuth2Client.getAccessToken();
    if (!token) {
      throw new Error("Failed to get access token");
    }

    // Создаем Gmail клиент
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // Формируем email в формате RFC 5322
    const message = [
      'Content-Type: text/html; charset="UTF-8"\r\n',
      'MIME-Version: 1.0\r\n',
      'Content-Transfer-Encoding: 7bit\r\n',
      `From: "Onkron Notifications" <${process.env.GMAIL_EMAIL}>\r\n`,
      `Reply-To: ${process.env.GMAIL_EMAIL}\r\n`,
      `To: ${email}\r\n`,
      `Subject: ${encodeSubject(subject)}\r\n`,
      'Message-ID: <' + Date.now() + Math.random().toString(36).substr(2, 9) + '@onkron.com>\r\n',
      'Date: ' + new Date().toUTCString() + '\r\n',
      'X-Priority: 1\r\n',
      'X-Mailer: Onkron Notification System v1.0\r\n',
      '\r\n',
      html
    ].join('');

    // Кодируем сообщение в base64
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Отправляем через Gmail API
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log(`✅ Email sent successfully to ${maskEmail(email)}`);
    console.log(`📫 Message ID: ${response.data.id}`);
    
    return response.data;
  } catch (error) {
    console.error(
      `❌ Failed to send email to ${maskEmail(email)}:`,
      error.message,
    );
    
    // Если ошибка аутентификации, пробуем обновить токен
    if (error.code === 401 || error.message.includes('authentication')) {
      console.log("🔄 Refreshing access token...");
      try {
        const { credentials } = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(credentials);
        console.log("✅ Access token refreshed");
        // Повторяем отправку
        return await sendEmailDirect(email, { subject, text, html });
      } catch (refreshError) {
        console.error("❌ Failed to refresh access token:", refreshError);
        // Отправляем уведомление об ошибке
        await sendErrorNotification("Gmail authentication failed", refreshError);
      }
    }
    
    throw error;
  }
}

// Функция для отправки уведомлений об ошибках
async function sendErrorNotification(subject, error) {
  try {
    const { token } = await oAuth2Client.getAccessToken();
    if (!token) return;

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const errorMessage = [
      'Content-Type: text/html; charset="UTF-8"\r\n',
      'MIME-Version: 1.0\r\n',
      'Content-Transfer-Encoding: 7bit\r\n',
      `From: "Onkron System" <${process.env.GMAIL_EMAIL}>\r\n`,
      `To: sparkygino@gmail.com\r\n`,
      `Subject: ${encodeSubject(subject)}\r\n`,
      '\r\n',
      `<h3>System Error Notification</h3>`,
      `<p><strong>Time:</strong> ${new Date().toISOString()}</p>`,
      `<p><strong>Error:</strong> ${error.message}</p>`,
      `<pre>${error.stack}</pre>`
    ].join('');

    const encodedMessage = Buffer.from(errorMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
    
    console.log("✅ Error notification sent");
  } catch (notificationError) {
    console.error("❌ Failed to send error notification:", notificationError);
  }
}

// Middleware для обработки JSON
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, headers, retries = 3, delayMs = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, { headers });
      return response;
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers["retry-after"];
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delayMs;
        console.warn(`Rate limit exceeded. Retrying in ${waitTime}ms...`);

        if (i < retries - 1) {
          await delay(waitTime);
        } else {
          throw new Error(`Failed after ${retries} attempts due to rate limit`);
        }
      } else {
        throw error;
      }
    }
  }
}

async function checkProductAvailability() {
  const stats = { checked: 0, sent: 0, errors: 0 };
  try {
    const maxManagerNotificationAttempts = getMaxNotificationAttempts();
    const subscriptions = await Subscription.findAll({
      where: {
        [Op.or]: [
          { notification_sent: false },
          {
            manager_notification_status: { [Op.in]: ["pending", "failed"] },
            manager_notification_attempts: {
              [Op.lt]: maxManagerNotificationAttempts,
            },
          },
        ],
      },
    });

    for (const subscription of subscriptions) {
      stats.checked += 1;
      console.log("Checking product availability", {
        id: subscription.id,
        country: subscription.country,
        sku: subscription.sku,
      });

      const shopifyConfig = getShopifyConfig(subscription.country);
      const emailTemplate = getAvailabilityNotificationTemplate(
        subscription.country,
        subscription,
      );
      if (!shopifyConfig || !emailTemplate) {
        console.log(
          `No Shopify credentials configured for country: ${subscription.country}`
        );
        continue;
      }

      const { shopifyStore, shopifyApiVersion } =
        shopifyConfig;
      const { subject, text, html } = emailTemplate;

      const shouldRetryManagerNotification =
        ["pending", "failed"].includes(
          subscription.manager_notification_status,
        ) &&
        subscription.manager_notification_attempts <
          maxManagerNotificationAttempts;

      if (shouldRetryManagerNotification) {
        try {
          await deliverProductSubscriptionNotification(
            subscription,
            shopifyStore,
          );
          console.log(
            `Bitrix notification sent for subscription ${subscription.id}`,
          );
        } catch (error) {
          console.error(
            `Failed to retry Bitrix notification for subscription ${subscription.id}:`,
            error.message,
          );
        }
      }

      if (subscription.notification_sent) {
        continue;
      }

      try {
        const shopifyAccessToken = await resolveShopifyAccessToken(shopifyConfig);
        const response = await fetchWithRetry(
          `https://${shopifyStore}/admin/api/${shopifyApiVersion}/products/${subscription.inventory_id}.json`,
          { "X-Shopify-Access-Token": shopifyAccessToken }
        );

        const product = response.data.product;
        if (product) {
          if (isSubscribedVariantAvailable(product, subscription.sku)) {
            try {
              await deliverAvailabilityNotification(
                subscription,
                { subject, text, html },
                sendNotification,
              );
              stats.sent += 1;

              try {
                await notifyAvailabilityConfirmed(subscription, shopifyStore);
              } catch (bitrixError) {
                console.error(
                  `Failed to send Bitrix availability confirmation for subscription ${subscription.id}:`,
                  bitrixError.message,
                );
              }
            } catch (error) {
              stats.errors += 1;
              console.error(
                `Failed to notify subscription ${subscription.id}:`,
                error.message,
              );
              await sendErrorNotification(
                `Failed to process notification ${subscription.id}`,
                error,
              );
            }
          }
        } else {
          console.log(
            `Product with ID ${subscription.inventory_id} not found.`
          );
        }
      } catch (error) {
        stats.errors += 1;
        console.error(
          `Error fetching product from ${subscription.country} for subscription ${subscription.inventory_id}:`,
          error.message
        );
        await sendErrorNotification(
          `Error fetching product ${subscription.sku} from ${subscription.country}`,
          error
        );
      }
    }
  } catch (error) {
    stats.errors += 1;
    console.error("Error fetching subscriptions:", error.message);
    await sendErrorNotification("Error in checkProductAvailability", error);
  }

  return stats;
}

// Планировщик задач для ежедневной проверки
let availabilityCheckRunning = false;
function scheduleAvailabilityChecks() {
  const cronConfig = getCronConfig();

  return cron.schedule(
    cronConfig.schedule,
    async () => {
      if (availabilityCheckRunning) {
        console.warn("Product availability check is already running; skipping.");
        return;
      }

      availabilityCheckRunning = true;
      console.log("Running product availability check...");
      const startedAt = new Date();
      let stats = { checked: 0, sent: 0, errors: 0 };
      try {
        stats = await checkProductAvailability();
      } finally {
        availabilityCheckRunning = false;
        try {
          await CronRun.create({
            started_at: startedAt,
            finished_at: new Date(),
            subs_checked: stats.checked,
            sent_count: stats.sent,
            errors_count: stats.errors,
          });
        } catch (trackingError) {
          console.error("Failed to record cron run:", trackingError.message);
        }
      }
    },
    { timezone: cronConfig.timezone },
  );
}

let digestRunning = false;
function scheduleWeeklyDigest() {
  const cronConfig = getCronConfig();

  return cron.schedule(
    process.env.ANALYTICS_DIGEST_CRON || "0 9 * * 1",
    async () => {
      if (digestRunning) {
        console.warn("Weekly analytics digest is already running; skipping.");
        return;
      }

      digestRunning = true;
      console.log("Sending weekly analytics digest...");
      try {
        await sendWeeklyAnalyticsDigest();
        console.log("✅ Weekly analytics digest sent");
      } catch (error) {
        console.error("Failed to send weekly analytics digest:", error.message);
      } finally {
        digestRunning = false;
      }
    },
    { timezone: cronConfig.timezone },
  );
}

// Функция отправки уведомлений по электронной почте
async function sendNotification(email, notification) {
  await sendEmailDirect(email, {
    subject: notification.subject,
    text: notification.text,
    html: notification.html
  });
  console.log(`✅ Notification sent to ${maskEmail(email)}`);
}

// Health check endpoint
app.get("/health", async (req, res) => {
  const report = await createHealthReport(sequelize, oAuth2Client, { CronRun });
  res.status(report.status === "healthy" ? 200 : 503).json(report);
});

// Тестирование соединения при старте
async function testGmailConnection() {
  try {
    const { token } = await oAuth2Client.getAccessToken();
    if (token) {
      console.log("✅ Gmail API connection successful");
      return true;
    } else {
      throw new Error("No access token");
    }
  } catch (error) {
    console.error("❌ Gmail API connection failed:", error);
    return false;
  }
}

async function startWorkerServer() {
  await sequelize.authenticate();
  console.log("Worker database connection established");
  await testGmailConnection();
  scheduleAvailabilityChecks();
  scheduleWeeklyDigest();

  return app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

if (require.main === module) {
  startWorkerServer().catch((error) => {
    console.error("Failed to start worker:", error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  app,
  checkProductAvailability,
  scheduleAvailabilityChecks,
  scheduleWeeklyDigest,
  startWorkerServer,
};
