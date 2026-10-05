const { getAnalyticsSummary } = require("./analytics");
const { getDigestDialogId, sendBitrixMessage } = require("./bitrix");
const DigestRun = require("../models/DigestRun");

const COUNTRY_NAMES = {
  US: "США",
  UK: "Великобритания",
  DE: "Германия",
  PL: "Польша",
  FR: "Франция",
  IT: "Италия",
  ES: "Испания",
  TR: "Турция",
};

const COUNTRY_FLAGS = {
  US: "🇺🇸",
  UK: "🇬🇧",
  DE: "🇩🇪",
  PL: "🇵🇱",
  FR: "🇫🇷",
  IT: "🇮🇹",
  ES: "🇪🇸",
  TR: "🇹🇷",
};

function countryName(code) {
  return COUNTRY_NAMES[code] || code;
}

function countryFlag(code) {
  return COUNTRY_FLAGS[code] || "🏳️";
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return "нет данных";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes} мин`;
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} дн ${hours % 24} ч`;
  return `${hours} ч ${totalMinutes % 60} мин`;
}

function formatReportDate(date = new Date()) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getUTCFullYear()}`;
}

function formatTrend(current, previous, { unit = "" } = {}) {
  if (!Number.isFinite(previous)) return "";
  const diff = Number((current - previous).toFixed(2));
  if (diff === 0) return " (→ без изменений)";
  const arrow = diff > 0 ? "↑" : "↓";
  const sign = diff > 0 ? "+" : "";
  return ` (${arrow} ${sign}${diff}${unit} за неделю)`;
}

function buildBar(percent, size = 10) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  const filled = Math.round((clamped / 100) * size);
  return "█".repeat(filled) + "░".repeat(size - filled);
}

const DIVIDER = "=================================";

const DEFAULT_DASHBOARD_URL = "https://notification-shopify-production.up.railway.app";

function getDashboardUrl() {
  const base = process.env.MANAGER_DASHBOARD_PUBLIC_URL || DEFAULT_DASHBOARD_URL;
  return `${base.replace(/\/+$/, "")}/manager/analytics`;
}

function formatComparisonLine(previousSentAt) {
  if (!previousSentAt) return "Сравнение — нет данных за прошлую неделю";
  const previousDate = new Date(previousSentAt);
  const daysAgo = Math.round((Date.now() - previousDate.getTime()) / (24 * 60 * 60 * 1000));
  return `Сравнение с — ${formatReportDate(previousDate)} (${daysAgo} дн назад)`;
}

function formatDigestMessage(summary, previousSummary = null, previousSentAt = null) {
  const attentionCount = summary.subscriptionsNeedingAttention.length;
  const previousAttentionCount = previousSummary?.subscriptionsNeedingAttention?.length;
  const activeByCountryCode = new Map(
    summary.activeByCountry.map((row) => [row.country, Number(row.count)]),
  );

  const countryBlocks = [...summary.topSkusByCountry]
    .sort(
      (a, b) =>
        (activeByCountryCode.get(b.country) || 0) -
        (activeByCountryCode.get(a.country) || 0),
    )
    .map((entry) => {
      const skuLines = entry.skus
        .map((sku) => `${sku.sku} - ${sku.totalCount}`)
        .join("\n");
      const total = activeByCountryCode.get(entry.country) || 0;
      return [
        `${countryFlag(entry.country)} ${countryName(entry.country)}`,
        skuLines,
        "---",
        `Итого активных подписок: ${total}`,
      ].join("\n");
    })
    .join("\n\n");

  const newSubscriptionBlocks = [...summary.newSubscriptionsByCountry]
    .sort(
      (a, b) =>
        b.skus.reduce((sum, sku) => sum + sku.totalCount, 0) -
        a.skus.reduce((sum, sku) => sum + sku.totalCount, 0),
    )
    .map((entry) => {
      const skuLines = entry.skus
        .map((sku) => `${sku.sku} - ${sku.totalCount}`)
        .join("\n");
      return [`${countryFlag(entry.country)} ${countryName(entry.country)}`, skuLines].join("\n");
    })
    .join("\n\n");

  return [
    "📊 ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ ПО ПОДПИСКАМ",
    `Дата отчета — ${formatReportDate()}`,
    formatComparisonLine(previousSentAt),
    DIVIDER,
    "",
    countryBlocks || "Нет данных по странам",
    "",
    DIVIDER,
    "🆕 НОВЫЕ ПОДПИСКИ ЗА 7 ДНЕЙ",
    DIVIDER,
    "",
    newSubscriptionBlocks || "Новых подписок за 7 дней не было",
    "",
    DIVIDER,
    "📈 ИТОГО",
    DIVIDER,
    `Активных подписок: ${summary.totalActiveSubscriptions}${formatTrend(summary.totalActiveSubscriptions, previousSummary?.totalActiveSubscriptions)}`,
    `Новых подписок за 7 дней: ${summary.newSubscriptionsLast7d}${formatTrend(summary.newSubscriptionsLast7d, previousSummary?.newSubscriptionsLast7d)}`,
    `Отправлено за 7 дней: ${summary.sentLast7d}${formatTrend(summary.sentLast7d, previousSummary?.sentLast7d)}`,
    `Отправлено за 30 дней: ${summary.sentLast30d}`,
    `Среднее время ожидания: ${formatDuration(summary.avgWaitTimeMs)}`,
    `Доля ошибок за 30 дней: ${summary.errorRate30d}% ${buildBar(summary.errorRate30d)}${formatTrend(summary.errorRate30d, previousSummary?.errorRate30d, { unit: "%" })}`,
    `⚠️ Требуют внимания: ${attentionCount}${formatTrend(attentionCount, previousAttentionCount)}`,
    "",
    `🔗 Подробнее — ${getDashboardUrl()}`,
  ].join("\n");
}

async function getPreviousDigestRun() {
  const lastRun = await DigestRun.findOne({ order: [["sent_at", "DESC"]] });
  return lastRun
    ? { summary: lastRun.summary, sentAt: lastRun.sent_at }
    : { summary: null, sentAt: null };
}

async function buildDigestPreview() {
  const [summary, previousRun] = await Promise.all([
    getAnalyticsSummary(),
    getPreviousDigestRun(),
  ]);
  const message = formatDigestMessage(summary, previousRun.summary, previousRun.sentAt);
  return { message, summary, generatedAt: summary.generatedAt };
}

async function sendWeeklyAnalyticsDigest() {
  const { message, summary } = await buildDigestPreview();
  const dialogId = getDigestDialogId();
  await sendBitrixMessage(dialogId, message);
  await DigestRun.create({
    sent_at: new Date(),
    dialog_id: String(dialogId),
    message,
    summary,
  });
  return { summary, message };
}

module.exports = {
  formatDigestMessage,
  buildDigestPreview,
  sendWeeklyAnalyticsDigest,
};
