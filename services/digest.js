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
};

const COUNTRY_FLAGS = {
  US: "🇺🇸",
  UK: "🇬🇧",
  DE: "🇩🇪",
  PL: "🇵🇱",
  FR: "🇫🇷",
  IT: "🇮🇹",
  ES: "🇪🇸",
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

function formatDigestMessage(summary, previousSummary = null) {
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

  return [
    "📊 ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ ПО ПОДПИСКАМ",
    `Дата отчета — ${formatReportDate()}`,
    DIVIDER,
    "",
    countryBlocks || "Нет данных по странам",
    "",
    DIVIDER,
    "📈 ИТОГО",
    DIVIDER,
    `Активных подписок: ${summary.totalActiveSubscriptions}${formatTrend(summary.totalActiveSubscriptions, previousSummary?.totalActiveSubscriptions)}`,
    `Отправлено за 7 дней: ${summary.sentLast7d}${formatTrend(summary.sentLast7d, previousSummary?.sentLast7d)}`,
    `Отправлено за 30 дней: ${summary.sentLast30d}`,
    `Среднее время ожидания: ${formatDuration(summary.avgWaitTimeMs)}`,
    `Доля ошибок за 30 дней: ${summary.errorRate30d}% ${buildBar(summary.errorRate30d)}${formatTrend(summary.errorRate30d, previousSummary?.errorRate30d, { unit: "%" })}`,
    `⚠️ Требуют внимания: ${attentionCount}${formatTrend(attentionCount, previousAttentionCount)}`,
  ].join("\n");
}

async function getPreviousSummary() {
  const lastRun = await DigestRun.findOne({ order: [["sent_at", "DESC"]] });
  return lastRun ? lastRun.summary : null;
}

async function buildDigestPreview() {
  const [summary, previousSummary] = await Promise.all([
    getAnalyticsSummary(),
    getPreviousSummary(),
  ]);
  const message = formatDigestMessage(summary, previousSummary);
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
