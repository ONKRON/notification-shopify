const { getAnalyticsSummary } = require("./analytics");
const { getDigestDialogId, sendBitrixMessage } = require("./bitrix");

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return "нет данных";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes} мин`;
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} дн ${hours % 24} ч`;
  return `${hours} ч ${totalMinutes % 60} мин`;
}

function formatDigestMessage(summary) {
  const topSkusLines = summary.topSkus
    .slice(0, 5)
    .map((row) => `  ${row.sku} (${row.country}): ${row.total_count}`)
    .join("\n");
  const attentionCount = summary.subscriptionsNeedingAttention.length;

  return [
    "Еженедельная аналитика подписок",
    `Активных подписок: ${summary.totalActiveSubscriptions}`,
    `Отправлено за 7 дней: ${summary.sentLast7d}`,
    `Отправлено за 30 дней: ${summary.sentLast30d}`,
    `Среднее время ожидания: ${formatDuration(summary.avgWaitTimeMs)}`,
    `Доля ошибок за 30 дней: ${summary.errorRate30d}%`,
    `Требуют внимания: ${attentionCount}`,
    "",
    "Топ SKU по подпискам:",
    topSkusLines || "  нет данных",
  ].join("\n");
}

async function sendWeeklyAnalyticsDigest() {
  const summary = await getAnalyticsSummary();
  const message = formatDigestMessage(summary);
  const dialogId = getDigestDialogId();
  await sendBitrixMessage(dialogId, message);
  return { summary, message };
}

module.exports = { formatDigestMessage, sendWeeklyAnalyticsDigest };
