const ExcelJS = require("exceljs");

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

function countryName(code) {
  return COUNTRY_NAMES[code] || code;
}

function msToDays(ms) {
  if (!Number.isFinite(ms)) return "";
  return Math.round((ms / (24 * 60 * 60 * 1000)) * 10) / 10;
}

function addHeaderStyle(sheet) {
  sheet.getRow(1).font = { bold: true };
}

function buildSummarySheet(workbook, summary) {
  const sheet = workbook.addWorksheet("Сводка");
  sheet.columns = [
    { header: "Метрика", key: "metric", width: 35 },
    { header: "Значение", key: "value", width: 20 },
  ];
  sheet.addRows([
    { metric: "Активных подписок", value: summary.totalActiveSubscriptions },
    { metric: "Отправлено за 24ч", value: summary.sentLast24h },
    { metric: "Отправлено за 7 дней", value: summary.sentLast7d },
    { metric: "Отправлено за 30 дней", value: summary.sentLast30d },
    {
      metric: "Среднее время ожидания (дней)",
      value: Number.isFinite(summary.avgWaitTimeMs)
        ? msToDays(summary.avgWaitTimeMs)
        : "нет данных",
    },
    { metric: "Доля ошибок за 30 дней (%)", value: summary.errorRate30d },
    {
      metric: "Требуют внимания",
      value: summary.subscriptionsNeedingAttention.length,
    },
    { metric: "Отчёт сформирован", value: summary.generatedAt },
  ]);
  addHeaderStyle(sheet);
}

function buildProblemEmailsSheet(workbook, summary) {
  const sheet = workbook.addWorksheet("Проблемные email");
  sheet.columns = [
    { header: "Email", key: "email", width: 35 },
    { header: "Ошибок", key: "count", width: 12 },
  ];
  sheet.addRows(
    summary.problemEmails.map((row) => ({
      email: row.email,
      count: Number(row.error_count),
    })),
  );
  addHeaderStyle(sheet);
}

function buildCronRunsSheet(workbook, summary) {
  const sheet = workbook.addWorksheet("Прогоны проверки");
  sheet.columns = [
    { header: "Запуск", key: "started", width: 22 },
    { header: "Проверено", key: "checked", width: 12 },
    { header: "Отправлено", key: "sent", width: 12 },
    { header: "Ошибок", key: "errors", width: 12 },
  ];
  sheet.addRows(
    summary.recentCronRuns.map((row) => ({
      started: new Date(row.started_at).toLocaleString("ru-RU"),
      checked: row.subs_checked,
      sent: row.sent_count,
      errors: row.errors_count,
    })),
  );
  addHeaderStyle(sheet);
}

function buildCountrySheets(workbook, summary, allSkusByCountry, allWaitTimeBySku) {
  const skusByCountry = new Map();
  for (const row of allSkusByCountry) {
    if (!skusByCountry.has(row.country)) skusByCountry.set(row.country, []);
    skusByCountry.get(row.country).push(row);
  }

  const waitByCountrySku = new Map();
  for (const row of allWaitTimeBySku) {
    waitByCountrySku.set(`${row.country}:${row.sku}`, row);
  }

  const errorsByCountryCode = new Map(
    summary.errorsByCountry.map((row) => [row.country, Number(row.error_count)]),
  );

  const countries = [...skusByCountry.keys()].sort((a, b) =>
    countryName(a).localeCompare(countryName(b), "ru"),
  );

  for (const country of countries) {
    const sheet = workbook.addWorksheet(countryName(country).slice(0, 31));
    sheet.columns = [
      { header: "SKU", key: "sku", width: 22 },
      { header: "Активных подписок", key: "active", width: 18 },
      { header: "Отправлено", key: "sent", width: 14 },
      { header: "Среднее ожидание (дней)", key: "wait", width: 20 },
    ];
    sheet.addRows(
      skusByCountry.get(country).map((row) => {
        const waitRow = waitByCountrySku.get(`${country}:${row.sku}`);
        return {
          sku: row.sku,
          active: Number(row.total_count),
          sent: waitRow ? waitRow.sentCount : 0,
          wait: waitRow ? msToDays(waitRow.avgWaitMs) : "",
        };
      }),
    );
    addHeaderStyle(sheet);
    sheet.addRow([]);
    sheet.addRow(["Ошибок отправки в стране", errorsByCountryCode.get(country) || 0]);
  }
}

function buildAnalyticsWorkbook(summary, allSkusByCountry, allWaitTimeBySku) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ONKRON Analytics";
  workbook.created = new Date();

  buildSummarySheet(workbook, summary);
  buildCountrySheets(workbook, summary, allSkusByCountry, allWaitTimeBySku);
  buildProblemEmailsSheet(workbook, summary);
  buildCronRunsSheet(workbook, summary);

  return workbook;
}

module.exports = { buildAnalyticsWorkbook, countryName };
