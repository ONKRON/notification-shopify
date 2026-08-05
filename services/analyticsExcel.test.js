const { buildAnalyticsWorkbook, countryName } = require("./analyticsExcel");

const summary = {
  totalActiveSubscriptions: 351,
  sentLast24h: 0,
  sentLast7d: 4,
  sentLast30d: 10,
  avgWaitTimeMs: 90000,
  errorRate30d: 12.5,
  subscriptionsNeedingAttention: [{ id: 1 }],
  errorsByCountry: [{ country: "DE", error_count: "2" }],
  problemEmails: [{ email: "bad@example.com", error_count: "3" }],
  recentCronRuns: [
    { id: 1, started_at: "2026-08-05T09:00:00.000Z", subs_checked: 10, sent_count: 2, errors_count: 0 },
  ],
  generatedAt: "2026-08-05T09:00:00.000Z",
};

const allSkusByCountry = [
  { country: "US", sku: "TS1", total_count: "16" },
  { country: "US", sku: "TS2", total_count: "5" },
  { country: "DE", sku: "TS3", total_count: "7" },
];

const allWaitTimeBySku = [
  { sku: "TS1", country: "US", sentCount: 4, avgWaitMs: 1500 },
];

test("countryName maps known codes and falls back to the raw code", () => {
  expect(countryName("US")).toBe("США");
  expect(countryName("XX")).toBe("XX");
});

test("builds a summary sheet, one sheet per country, problem emails, and cron runs", () => {
  const workbook = buildAnalyticsWorkbook(summary, allSkusByCountry, allWaitTimeBySku);
  const sheetNames = workbook.worksheets.map((sheet) => sheet.name);

  expect(sheetNames).toEqual([
    "Сводка",
    "Германия",
    "США",
    "Проблемные email",
    "Прогоны проверки",
  ]);
});

test("summary sheet lists the key metrics", () => {
  const workbook = buildAnalyticsWorkbook(summary, [], []);
  const sheet = workbook.getWorksheet("Сводка");
  const values = sheet.getColumn(1).values.filter(Boolean);
  expect(values).toContain("Активных подписок");
  expect(sheet.getCell("B2").value).toBe(351);
});

test("country sheet lists SKUs sorted from the source data and the country error count", () => {
  const workbook = buildAnalyticsWorkbook(summary, allSkusByCountry, allWaitTimeBySku);
  const usSheet = workbook.getWorksheet("США");

  expect(usSheet.getCell("A2").value).toBe("TS1");
  expect(usSheet.getCell("B2").value).toBe(16);
  expect(usSheet.getCell("C2").value).toBe(4);
  expect(usSheet.getCell("D2").value).toBe(1500);

  const deSheet = workbook.getWorksheet("Германия");
  const lastRow = deSheet.lastRow;
  expect(lastRow.getCell(1).value).toBe("Ошибок отправки в стране");
  expect(lastRow.getCell(2).value).toBe(2);
});

test("a country without any active SKUs still gets no sheet", () => {
  const workbook = buildAnalyticsWorkbook(summary, [], []);
  const sheetNames = workbook.worksheets.map((sheet) => sheet.name);
  expect(sheetNames).toEqual(["Сводка", "Проблемные email", "Прогоны проверки"]);
});
