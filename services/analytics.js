const { fn, col, literal, Op } = require("sequelize");
const sequelize = require("../config/database");
const Subscription = require("../models/Subscription");
const CronRun = require("../models/CronRun");

function since(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function getFunnelCounts() {
  const [totalActiveSubscriptions, sentLast24h, sentLast7d, sentLast30d] =
    await Promise.all([
      Subscription.count({ where: { notification_sent: false } }),
      Subscription.count({
        where: { notification_sent: true, notification_sent_at: { [Op.gte]: since(1) } },
      }),
      Subscription.count({
        where: { notification_sent: true, notification_sent_at: { [Op.gte]: since(7) } },
      }),
      Subscription.count({
        where: { notification_sent: true, notification_sent_at: { [Op.gte]: since(30) } },
      }),
    ]);

  return { totalActiveSubscriptions, sentLast24h, sentLast7d, sentLast30d };
}

async function getAvgWaitTimeMs() {
  const [[row]] = await sequelize.query(
    `SELECT AVG(EXTRACT(EPOCH FROM (notification_sent_at - "createdAt")) * 1000) AS avg_wait_ms
     FROM notifications
     WHERE notification_sent = true
       AND notification_sent_at IS NOT NULL
       AND notification_sent_at >= NOW() - INTERVAL '30 days'`,
  );
  if (!row || row.avg_wait_ms === null) return null;
  const avg = Number(row.avg_wait_ms);
  return Number.isFinite(avg) ? Math.round(avg) : null;
}

async function getErrorRate30d() {
  const [failedNow, sentLast30d] = await Promise.all([
    Subscription.count({
      where: {
        notification_last_error: { [Op.ne]: null },
        updatedAt: { [Op.gte]: since(30) },
      },
    }),
    Subscription.count({
      where: { notification_sent: true, notification_sent_at: { [Op.gte]: since(30) } },
    }),
  ]);
  const denominator = failedNow + sentLast30d;
  return denominator > 0 ? Number(((failedNow / denominator) * 100).toFixed(1)) : 0;
}

async function getTopSkus(limit = 10) {
  return Subscription.findAll({
    attributes: ["country", "sku", [fn("COUNT", col("id")), "total_count"]],
    where: { notification_sent: false },
    group: ["country", "sku"],
    order: [[literal("total_count"), "DESC"]],
    limit,
    raw: true,
  });
}

async function getActiveSubscriptionsByCountry() {
  return Subscription.findAll({
    attributes: ["country", [fn("COUNT", col("id")), "count"]],
    where: { notification_sent: false },
    group: ["country"],
    order: [["country", "ASC"]],
    raw: true,
  });
}

async function getTopSkusByCountry(limitPerCountry = 5) {
  const [rows] = await sequelize.query(
    `SELECT country, sku, total_count FROM (
       SELECT country, sku, COUNT(*) AS total_count,
              ROW_NUMBER() OVER (PARTITION BY country ORDER BY COUNT(*) DESC) AS rank
       FROM notifications
       WHERE notification_sent = false
       GROUP BY country, sku
     ) ranked
     WHERE rank <= :limitPerCountry
     ORDER BY country, total_count DESC`,
    { replacements: { limitPerCountry } },
  );

  const byCountry = new Map();
  for (const row of rows) {
    const country = row.country;
    if (!byCountry.has(country)) byCountry.set(country, []);
    byCountry.get(country).push({ sku: row.sku, totalCount: Number(row.total_count) });
  }

  return [...byCountry.entries()]
    .map(([country, skus]) => ({ country, skus }))
    .sort((a, b) => a.country.localeCompare(b.country));
}

async function getErrorsByCountry() {
  return Subscription.findAll({
    attributes: ["country", [fn("COUNT", col("id")), "error_count"]],
    where: { notification_last_error: { [Op.ne]: null } },
    group: ["country"],
    order: [[literal("error_count"), "DESC"]],
    raw: true,
  });
}

async function getManagerNotificationStats() {
  return Subscription.findAll({
    attributes: ["manager_notification_status", [fn("COUNT", col("id")), "count"]],
    group: ["manager_notification_status"],
    raw: true,
  });
}

async function getSubscriptionsNeedingAttention(limit = 20) {
  return Subscription.findAll({
    attributes: [
      "id",
      "email",
      "sku",
      "country",
      "notification_attempts",
      "notification_last_error",
      "manager_notification_status",
      "manager_notification_attempts",
      "manager_notification_last_error",
      "updatedAt",
    ],
    where: {
      [Op.or]: [
        { notification_last_error: { [Op.ne]: null } },
        { manager_notification_status: "failed" },
      ],
    },
    order: [["updatedAt", "DESC"]],
    limit,
    raw: true,
  });
}

async function getProblemEmails(limit = 10) {
  return Subscription.findAll({
    attributes: ["email", [fn("COUNT", col("id")), "error_count"]],
    where: { notification_last_error: { [Op.ne]: null } },
    group: ["email"],
    order: [[literal("error_count"), "DESC"]],
    limit,
    raw: true,
  });
}

function buildDailySeries(days, subscribedRows, sentRows, subscribedSkuRows) {
  const toKey = (value) => String(value).slice(0, 10);
  const subscribedByDay = new Map(
    subscribedRows.map((row) => [toKey(row.day), Number(row.count)]),
  );
  const sentByDay = new Map(
    sentRows.map((row) => [toKey(row.day), Number(row.count)]),
  );
  const skusByDay = new Map();
  for (const row of subscribedSkuRows) {
    const key = toKey(row.day);
    if (!skusByDay.has(key)) skusByDay.set(key, []);
    skusByDay
      .get(key)
      .push({ sku: row.sku, country: row.country, count: Number(row.count) });
  }

  const series = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = date.toISOString().slice(0, 10);
    series.push({
      day: key,
      subscribed: subscribedByDay.get(key) || 0,
      sent: sentByDay.get(key) || 0,
      skus: skusByDay.get(key) || [],
    });
  }
  return series;
}

async function getDailyTrend(days = 30) {
  const [subscribedRows] = await sequelize.query(
    `SELECT DATE("createdAt") AS day, COUNT(*) AS count
     FROM notifications
     WHERE "createdAt" >= NOW() - (interval '1 day' * :days)
     GROUP BY day
     ORDER BY day`,
    { replacements: { days } },
  );
  const [sentRows] = await sequelize.query(
    `SELECT DATE(notification_sent_at) AS day, COUNT(*) AS count
     FROM notifications
     WHERE notification_sent_at IS NOT NULL
       AND notification_sent_at >= NOW() - (interval '1 day' * :days)
     GROUP BY day
     ORDER BY day`,
    { replacements: { days } },
  );
  const [subscribedSkuRows] = await sequelize.query(
    `SELECT DATE("createdAt") AS day, sku, country, COUNT(*) AS count
     FROM notifications
     WHERE "createdAt" >= NOW() - (interval '1 day' * :days)
     GROUP BY day, sku, country
     ORDER BY day, count DESC`,
    { replacements: { days } },
  );

  return buildDailySeries(days, subscribedRows, sentRows, subscribedSkuRows);
}

async function getWaitTimeBySku(limit = 15) {
  const [rows] = await sequelize.query(
    `SELECT sku, country,
            COUNT(*) AS sent_count,
            AVG(EXTRACT(EPOCH FROM (notification_sent_at - "createdAt")) * 1000) AS avg_wait_ms
     FROM notifications
     WHERE notification_sent = true
       AND notification_sent_at IS NOT NULL
     GROUP BY sku, country
     ORDER BY avg_wait_ms DESC
     ${limit ? "LIMIT :limit" : ""}`,
    { replacements: { limit } },
  );
  return rows.map((row) => ({
    sku: row.sku,
    country: row.country,
    sentCount: Number(row.sent_count),
    avgWaitMs: Math.round(Number(row.avg_wait_ms)),
  }));
}

async function getAllActiveSkusByCountry() {
  return Subscription.findAll({
    attributes: ["country", "sku", [fn("COUNT", col("id")), "total_count"]],
    where: { notification_sent: false },
    group: ["country", "sku"],
    order: [
      ["country", "ASC"],
      [literal("total_count"), "DESC"],
    ],
    raw: true,
  });
}

async function getRecentCronRuns(limit = 20) {
  return CronRun.findAll({
    order: [["started_at", "DESC"]],
    limit,
    raw: true,
  });
}

async function getAnalyticsSummary() {
  const [
    funnel,
    avgWaitTimeMs,
    errorRate30d,
    topSkus,
    activeByCountry,
    topSkusByCountry,
    errorsByCountry,
    managerNotificationStats,
    subscriptionsNeedingAttention,
    problemEmails,
    dailyTrend,
    waitTimeBySku,
    recentCronRuns,
  ] = await Promise.all([
    getFunnelCounts(),
    getAvgWaitTimeMs(),
    getErrorRate30d(),
    getTopSkus(),
    getActiveSubscriptionsByCountry(),
    getTopSkusByCountry(),
    getErrorsByCountry(),
    getManagerNotificationStats(),
    getSubscriptionsNeedingAttention(),
    getProblemEmails(),
    getDailyTrend(),
    getWaitTimeBySku(),
    getRecentCronRuns(),
  ]);

  return {
    ...funnel,
    avgWaitTimeMs,
    errorRate30d,
    topSkus,
    activeByCountry,
    topSkusByCountry,
    errorsByCountry,
    managerNotificationStats,
    subscriptionsNeedingAttention,
    problemEmails,
    dailyTrend,
    waitTimeBySku,
    recentCronRuns,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  getAnalyticsSummary,
  getFunnelCounts,
  getAvgWaitTimeMs,
  getErrorRate30d,
  getTopSkus,
  getActiveSubscriptionsByCountry,
  getTopSkusByCountry,
  getErrorsByCountry,
  getManagerNotificationStats,
  getSubscriptionsNeedingAttention,
  getProblemEmails,
  getDailyTrend,
  getWaitTimeBySku,
  getAllActiveSkusByCountry,
  getRecentCronRuns,
};
