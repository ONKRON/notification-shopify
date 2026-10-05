const express = require("express");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const cors = require("cors");
const sequelize = require("./config/database");
const Subscription = require("./models/Subscription");
const CronRun = require("./models/CronRun");
const { getShopifyConfig } = require("./config/shopify");
const {
  getSubscriptionConfirmationTemplate,
} = require("./templates/subscriptionConfirmation");
const {
  deliverProductSubscriptionNotification,
} = require("./services/bitrix");
const { createHealthReport } = require("./services/health");
const { maskEmail } = require("./utils/privacy");
const { encodeSubject } = require("./utils/emailHeaders");
const { managerAuth } = require("./middleware/managerAuth");
const {
  clearProductCatalogCache,
  getManagerDashboardData,
  getProductSubscriptionDetails,
} = require("./services/managerDashboard");
const { renderManagerDashboard } = require("./views/managerDashboard");
const { renderManagerAnalytics } = require("./views/managerAnalytics");
const { renderManagerHistory } = require("./views/managerHistory");
const {
  getAnalyticsSummary,
  getAllActiveSkusByCountry,
  getWaitTimeBySku,
} = require("./services/analytics");
const {
  buildHistoryCsv,
  getHistoryFilterOptions,
  getSubscriptionHistory,
} = require("./services/subscriptionHistory");
const { buildDigestPreview } = require("./services/digest");
const { buildAnalyticsWorkbook } = require("./services/analyticsExcel");
const app = express();
const PORT = process.env.PORT || 3000;
const { Op, fn, col, literal } = require("sequelize");
const fs = require("fs");
const path = require("path");

// Создаем OAuth2 клиент
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI,
);

// Устанавливаем credentials
oAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

// Функция для отправки email через прямое Gmail API (без SMTP)
async function sendEmailDirect(email, { subject, text, html }) {
  try {
    console.log(`📧 Attempting to send email to: ${maskEmail(email)}`);

    // Получаем актуальный access token
    const { token } = await oAuth2Client.getAccessToken();
    if (!token) {
      throw new Error("Failed to get access token");
    }

    // Создаем Gmail клиент
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    // Формируем email в формате RFC 5322
    const message = [
      'Content-Type: text/html; charset="UTF-8"\r\n',
      "MIME-Version: 1.0\r\n",
      "Content-Transfer-Encoding: 7bit\r\n",
      `to: ${email}\r\n`,
      `Subject: ${encodeSubject(subject)}\r\n`,
      `from: Onkron Notifications <${process.env.GMAIL_EMAIL}>\r\n`,
      "\r\n",
      html,
    ].join("");

    // Кодируем сообщение в base64
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Отправляем через Gmail API
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
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
    if (error.code === 401) {
      console.log("🔄 Refreshing access token...");
      try {
        const { credentials } = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(credentials);
        console.log("✅ Access token refreshed");
        // Повторяем отправку
        return await sendEmailDirect(email, { subject, text, html });
      } catch (refreshError) {
        console.error("❌ Failed to refresh access token:", refreshError);
      }
    }

    throw error;
  }
}

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

// middleware for json
app.use(express.json());
app.use(cors());

app.get("/health", async (req, res) => {
  const report = await createHealthReport(sequelize, oAuth2Client, { CronRun });
  res.status(report.status === "healthy" ? 200 : 503).json(report);
});

app.get("/manager/vue.js", (req, res) => {
  res.sendFile(require.resolve("vue/dist/vue.global.prod.js"));
});

app.use(
  "/manager/assets",
  express.static(path.join(__dirname, "manager-ui"), {
    fallthrough: false,
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
  }),
);

app.get("/manager/subscriptions", (req, res) => {
  res.type("html").send(renderManagerDashboard());
});

app.get("/api/manager/subscriptions", async (req, res) => {
  try {
    if (req.query.refresh === "1") clearProductCatalogCache();
    res.json(await getManagerDashboardData());
  } catch (error) {
    console.error("Failed to build manager dashboard:", error.message);
    res.status(500).json({ message: "Failed to load subscription dashboard" });
  }
});

app.get("/manager/analytics", (req, res) => {
  res.type("html").send(renderManagerAnalytics());
});

app.get("/api/manager/analytics", async (req, res) => {
  try {
    res.json(await getAnalyticsSummary());
  } catch (error) {
    console.error("Failed to build analytics summary:", error.message);
    res.status(500).json({ message: "Failed to load analytics" });
  }
});

app.get("/manager/history", managerAuth, (req, res) => {
  res.type("html").send(renderManagerHistory());
});

app.get("/manager/history/data", managerAuth, async (req, res) => {
  try {
    const [history, countries] = await Promise.all([
      getSubscriptionHistory(req.query),
      getHistoryFilterOptions(),
    ]);
    res.json({ ...history, countries });
  } catch (error) {
    console.error("Failed to build subscription history:", error.message);
    res.status(500).json({ message: "Failed to load subscription history" });
  }
});

app.get("/manager/history/export.csv", managerAuth, async (req, res) => {
  const filePath = path.join(__dirname, "subscription_history.csv");
  try {
    const csv = await buildHistoryCsv(req.query);
    fs.writeFileSync(filePath, csv, "utf-8");
    res.download(filePath, "subscription_history.csv", (err) => {
      if (err) {
        console.error("Ошибка при скачивании CSV истории:", err);
        if (!res.headersSent) {
          res.status(500).send("Ошибка при скачивании файла.");
        }
      }
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("Ошибка удаления временного файла:", unlinkErr);
      });
    });
  } catch (error) {
    console.error("Ошибка при формировании CSV истории:", error.message);
    res.status(500).send("Ошибка при формировании CSV истории.");
  }
});

app.get("/api/manager/digest/preview", async (req, res) => {
  try {
    const { message, generatedAt } = await buildDigestPreview();
    res.json({ message, generatedAt });
  } catch (error) {
    console.error("Failed to build digest preview:", error.message);
    res.status(500).json({ message: "Failed to load digest preview" });
  }
});

function msToDays(ms) {
  if (!Number.isFinite(ms)) return "";
  return Math.round((ms / (24 * 60 * 60 * 1000)) * 10) / 10;
}

function buildAnalyticsCsv(summary) {
  const sections = [];

  sections.push(
    "Топ SKU",
    "SKU;Страна;Подписок",
    ...summary.topSkus.map((row) => `${row.sku};${row.country};${row.total_count}`),
    "",
  );

  sections.push(
    "Время ожидания по SKU",
    "SKU;Страна;Отправок;Среднее ожидание (дней)",
    ...summary.waitTimeBySku.map(
      (row) => `${row.sku};${row.country};${row.sentCount};${msToDays(row.avgWaitMs)}`,
    ),
    "",
  );

  sections.push(
    "Ошибки по странам",
    "Страна;Ошибок",
    ...summary.errorsByCountry.map((row) => `${row.country};${row.error_count}`),
    "",
  );

  sections.push(
    "Проблемные email",
    "Email;Ошибок",
    ...summary.problemEmails.map((row) => `${row.email};${row.error_count}`),
    "",
  );

  sections.push(
    "Последние прогоны проверки наличия",
    "Запуск;Проверено;Отправлено;Ошибок",
    ...summary.recentCronRuns.map(
      (row) =>
        `${new Date(row.started_at).toISOString()};${row.subs_checked};${row.sent_count};${row.errors_count}`,
    ),
  );

  return sections.join("\n");
}

app.get("/download-analytics-csv", async (req, res) => {
  const filePath = path.join(__dirname, "analytics_stats.csv");
  try {
    const summary = await getAnalyticsSummary();
    fs.writeFileSync(filePath, buildAnalyticsCsv(summary), "utf-8");
    res.download(filePath, "analytics_stats.csv", (err) => {
      if (err) {
        console.error("Ошибка при скачивании CSV аналитики:", err);
        if (!res.headersSent) {
          res.status(500).send("Ошибка при скачивании файла.");
        }
      }
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("Ошибка удаления временного файла:", unlinkErr);
      });
    });
  } catch (error) {
    console.error("Ошибка при формировании CSV аналитики:", error.message);
    res.status(500).send("Ошибка при формировании CSV аналитики.");
  }
});

app.get("/download-analytics-excel", async (req, res) => {
  const filePath = path.join(__dirname, "analytics_stats.xlsx");
  try {
    const [summary, allSkusByCountry, allWaitTimeBySku] = await Promise.all([
      getAnalyticsSummary(),
      getAllActiveSkusByCountry(),
      getWaitTimeBySku(null),
    ]);
    const workbook = buildAnalyticsWorkbook(summary, allSkusByCountry, allWaitTimeBySku);
    await workbook.xlsx.writeFile(filePath);
    res.download(filePath, "analytics_stats.xlsx", (err) => {
      if (err) {
        console.error("Ошибка при скачивании Excel аналитики:", err);
        if (!res.headersSent) {
          res.status(500).send("Ошибка при скачивании файла.");
        }
      }
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error("Ошибка удаления временного файла:", unlinkErr);
      });
    });
  } catch (error) {
    console.error("Ошибка при формировании Excel аналитики:", error.message);
    res.status(500).send("Ошибка при формировании Excel аналитики.");
  }
});

app.get(
  "/api/manager/subscription-details",
  async (req, res) => {
    try {
      const sku = String(req.query.sku || "").trim();
      const countries = String(req.query.countries || req.query.country || "")
        .split(",")
        .map((country) => country.trim().toUpperCase())
        .filter(Boolean);
      if (!sku) return res.status(400).json({ message: "SKU is required" });

      res.json(await getProductSubscriptionDetails(sku, countries));
    } catch (error) {
      console.error("Failed to load subscription details:", error.message);
      res.status(500).json({ message: "Failed to load subscription details" });
    }
  },
);

app.post("/send-notification", async (req, res) => {
  const { email, sku, nickname, inventory_id, country } = req.body;
  const normalizedCountry = String(country || "").trim().toUpperCase();
  const normalizedNickname =
    typeof nickname === "string" ? nickname.trim() : "";

  if (normalizedCountry !== "DE" && !normalizedNickname) {
    return res.status(400).json({ message: "Nickname is required" });
  }

  // В DE клиент запрашивает только email, поэтому используем нейтральное обращение.
  const subscriptionNickname = normalizedNickname || "Kunde";
  console.log("Subscription request received", {
    country: normalizedCountry,
    sku,
  });

  const shopifyConfig = getShopifyConfig(normalizedCountry);
  const emailTemplate = getSubscriptionConfirmationTemplate(
    normalizedCountry,
    {
      nickname: subscriptionNickname,
      sku,
    },
  );

  if (!shopifyConfig || !emailTemplate) {
    return res.status(400).json({ message: "Unsupported country" });
  }

  const { subject, text, html } = emailTemplate;

  const mailOptions = {
    from: process.env.USER_AGENT,
    to: email,
    subject: subject,
    text: text,
    html: html,
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
    },
  };

  try {
    const existingSubscription = await Subscription.findOne({
      where: {
        email,
        sku,
        country: normalizedCountry,
        notification_sent: false,
      },
    });
    if (existingSubscription) {
      return res
        .status(400)
        .json({ message: "Subscription already exists for this email" });
    }

    const subscription = new Subscription({
      email,
      sku,
      nickname: subscriptionNickname,
      inventory_id,
      country: normalizedCountry,
      manager_notification_status: "pending",
    });
    await subscription.save();
    console.log("Subscription saved", {
      id: subscription.id,
      country: subscription.country,
      sku: subscription.sku,
    });

    try {
      await deliverProductSubscriptionNotification(
        subscription,
        shopifyConfig.shopifyStore,
      );
      console.log(`Bitrix notification sent for subscription ${subscription.id}`);
    } catch (bitrixError) {
      // Подписка уже сохранена, поэтому ошибка Bitrix не должна блокировать email клиенту.
      console.error(
        `Failed to send Bitrix notification for subscription ${subscription.id}:`,
        bitrixError.message,
      );
    }

    // Отправляем email через Gmail API
    await sendEmailDirect(email, { subject, text, html });

    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error saving subscription:", error.message);
    res.status(500).json({ message: "Error saving subscription" });
  }
});
app.get("/check-subscription", managerAuth, async (req, res) => {
  try {
    const [results] = await sequelize.query("SELECT * FROM notifications");
    res.status(200).json(results);
  } catch (error) {
    console.error("Error checking subscriptions:", error);
    res.status(500).json({ message: "Error checking subscriptions" });
  }
});

app.get("/subscription-stats", managerAuth, async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      attributes: ["country", "sku", [fn("COUNT", col("sku")), "total_count"]],
      where: { notification_sent: false },
      group: ["country", "sku"],
      order: [[literal("total_count"), "DESC"]],
      raw: true,
    });

    const totalSubscriptions = await Subscription.count({
      where: { notification_sent: false },
    });

    // Группируем по стране
    const statsByCountry = {};
    for (const item of subscriptions) {
      const country = item.country || "Unknown";
      if (!statsByCountry[country]) statsByCountry[country] = [];
      statsByCountry[country].push(item);
    }

    // Формируем текст
    const columnCount = 4;
    let lines = [`📦 Общее количество подписок: ${totalSubscriptions}\n`];

    for (const [country, entries] of Object.entries(statsByCountry)) {
      lines.push(`\n🌍 ${country}`);

      const rows = Math.ceil(entries.length / columnCount);
      for (let row = 0; row < rows; row++) {
        let line = "";
        for (let col = 0; col < columnCount; col++) {
          const index = row + col * rows;
          if (index < entries.length) {
            const entry =
              `${entries[index].sku}: ${entries[index].total_count}`.padEnd(25);
            line += entry;
          }
        }
        lines.push(line.trimEnd());
      }
    }

    const formattedText = lines.join("\n");

    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(formattedText);
  } catch (error) {
    console.error("Error getting subscription statistics:", error);
    res.status(500).send("Ошибка при получении статистики подписок");
  }
});

app.get("/all-subs", managerAuth, async (req, res) => {
  try {
    const [results] = await sequelize.query(
      "SELECT sku, country FROM notifications WHERE notification_sent = false",
    );

    if (!results.length) {
      return res.status(200).send("Нет подписок.");
    }

    // Группировка по странам
    const countryMap = {};
    for (const { sku, country } of results) {
      if (!countryMap[country]) countryMap[country] = [];
      countryMap[country].push(sku);
    }

    // Формирование CSV
    const csvLines = [
      "SKU;Country",
      ...results.map(({ sku, country }) => `${sku};${country}`),
    ];
    const csvContent = csvLines.join("\n");
    const filePath = path.join(__dirname, "subscription_stats.csv");
    fs.writeFileSync(filePath, csvContent, "utf-8");

    // Генерация HTML с таблицами по странам
    const countryTables = Object.entries(countryMap).map(([country, skus]) => {
      const rows = [];
      for (let i = 0; i < skus.length; i += 4) {
        const row = skus
          .slice(i, i + 4)
          .map((sku) => `<td>${sku} - ${country}</td>`)
          .join("");
        rows.push(`<tr>${row}</tr>`);
      }

      return `
        <h3>${country}</h3>
        <table>
          ${rows.join("\n")}
        </table>
      `;
    });

    const downloadUrl = "/download-subscription-csv";

    // HTML-шаблон
    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Подписки</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            h3 {
              margin-top: 30px;
              color: #333;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            td {
              border: 1px solid #ccc;
              padding: 6px 10px;
              vertical-align: top;
            }
            button {
              font-size: 16px;
              padding: 10px 16px;
              background-color: #4CAF50;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            }
            button:hover {
              background-color: #45a049;
            }
          </style>
        </head>
        <body>
          <h2>Статистика подписок по странам:</h2>
          ${countryTables.join("\n")}
          <a href="${downloadUrl}" download="subscription_stats.csv">
            <button>Скачать CSV</button>
          </a>
        </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error("Error generating subscription data:", error);
    res.status(500).send("Ошибка при проверке подписок.");
  }
});

// Отдельный эндпоинт для скачивания CSV
app.get("/download-subscription-csv", managerAuth, (req, res) => {
  const filePath = path.join(__dirname, "subscription_stats.csv");
  res.download(filePath, "subscription_stats.csv", (err) => {
    if (err) {
      console.error("Ошибка при скачивании CSV:", err);
      res.status(500).send("Ошибка при скачивании файла.");
    }

    // Удаляем после отправки
    fs.unlink(filePath, (err) => {
      if (err) console.error("Ошибка удаления временного файла:", err);
    });
  });
});

async function startServer() {
  await sequelize.authenticate();
  console.log("Database connection established");
  await testGmailConnection();

  return app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };
