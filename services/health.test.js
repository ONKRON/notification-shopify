const {
  checkBitrixConfiguration,
  checkCronHealth,
  createHealthReport,
} = require("./health");
const { supportedCountries } = require("../config/shopify");

const envNames = [
  "BITRIX24_BOT_MESSAGE_WEBHOOK",
  "BITRIX24_BOT_ID",
  "BITRIX24_BOT_CLIENT_ID",
  ...supportedCountries.map(
    (country) => `BITRIX_PRODUCT_NOTIFICATION_MANAGER_${country}`,
  ),
];
const originalEnv = Object.fromEntries(
  envNames.map((envName) => [envName, process.env[envName]]),
);

afterEach(() => {
  for (const envName of envNames) {
    if (originalEnv[envName] === undefined) delete process.env[envName];
    else process.env[envName] = originalEnv[envName];
  }
});

test("reports missing Bitrix configuration without exposing values", () => {
  for (const envName of envNames) delete process.env[envName];

  expect(checkBitrixConfiguration()).toEqual({
    status: "error",
    missing: [
      "BITRIX24_BOT_MESSAGE_WEBHOOK",
      "BITRIX24_BOT_ID",
      "BITRIX24_BOT_CLIENT_ID",
    ],
    countriesUsingFallback: supportedCountries,
  });
});

test("combines database, Gmail, and Bitrix readiness", async () => {
  for (const envName of envNames) process.env[envName] = "configured";
  const sequelize = { authenticate: jest.fn().mockResolvedValue(undefined) };
  const oAuth2Client = {
    getAccessToken: jest.fn().mockResolvedValue({ token: "gmail-token" }),
  };

  await expect(createHealthReport(sequelize, oAuth2Client)).resolves.toEqual(
    expect.objectContaining({
      status: "healthy",
      database: { status: "connected" },
      gmail: { status: "connected" },
      bitrix: { status: "configured", countriesUsingFallback: [] },
      cron: { status: "unknown" },
    }),
  );
});

describe("checkCronHealth", () => {
  const originalStaleHours = process.env.CRON_STALE_HOURS;

  afterEach(() => {
    if (originalStaleHours === undefined) delete process.env.CRON_STALE_HOURS;
    else process.env.CRON_STALE_HOURS = originalStaleHours;
  });

  test("reports unknown without a CronRun model", async () => {
    await expect(checkCronHealth(undefined)).resolves.toEqual({
      status: "unknown",
    });
  });

  test("reports unknown when no runs have been recorded", async () => {
    const CronRun = { findOne: jest.fn().mockResolvedValue(null) };
    await expect(checkCronHealth(CronRun)).resolves.toEqual({
      status: "unknown",
      message: "No cron runs recorded yet",
    });
  });

  test("reports ok for a recent run", async () => {
    const CronRun = {
      findOne: jest.fn().mockResolvedValue({
        started_at: new Date(),
        subs_checked: 10,
        sent_count: 2,
        errors_count: 0,
      }),
    };
    const report = await checkCronHealth(CronRun);
    expect(report.status).toBe("ok");
    expect(report.subsChecked).toBe(10);
  });

  test("reports stale for an old run", async () => {
    process.env.CRON_STALE_HOURS = "1";
    const CronRun = {
      findOne: jest.fn().mockResolvedValue({
        started_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
        subs_checked: 5,
        sent_count: 1,
        errors_count: 0,
      }),
    };
    await expect(checkCronHealth(CronRun)).resolves.toEqual(
      expect.objectContaining({ status: "stale" }),
    );
  });

  test("reports error when the query fails", async () => {
    const CronRun = {
      findOne: jest.fn().mockRejectedValue(new Error("DB down")),
    };
    await expect(checkCronHealth(CronRun)).resolves.toEqual({
      status: "error",
      error: "DB down",
    });
  });

  test("createHealthReport is unhealthy when cron is stale", async () => {
    process.env.CRON_STALE_HOURS = "1";
    const sequelize = { authenticate: jest.fn().mockResolvedValue(undefined) };
    const oAuth2Client = {
      getAccessToken: jest.fn().mockResolvedValue({ token: "gmail-token" }),
    };
    const CronRun = {
      findOne: jest.fn().mockResolvedValue({
        started_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
        subs_checked: 5,
        sent_count: 1,
        errors_count: 0,
      }),
    };

    for (const envName of envNames) process.env[envName] = "configured";

    await expect(
      createHealthReport(sequelize, oAuth2Client, { CronRun }),
    ).resolves.toEqual(
      expect.objectContaining({ status: "unhealthy", cron: expect.objectContaining({ status: "stale" }) }),
    );
  });
});
