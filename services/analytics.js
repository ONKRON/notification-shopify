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
    errorsByCountry,
    managerNotificationStats,
    recentCronRuns,
  ] = await Promise.all([
    getFunnelCounts(),
    getAvgWaitTimeMs(),
    getErrorRate30d(),
    getTopSkus(),
    getErrorsByCountry(),
    getManagerNotificationStats(),
    getRecentCronRuns(),
  ]);

  return {
    ...funnel,
    avgWaitTimeMs,
    errorRate30d,
    topSkus,
    errorsByCountry,
    managerNotificationStats,
    recentCronRuns,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getAnalyticsSummary };
