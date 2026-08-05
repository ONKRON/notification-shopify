const { supportedCountries } = require("../config/shopify");

const BITRIX_BASE_ENV_NAMES = [
  "BITRIX24_BOT_MESSAGE_WEBHOOK",
  "BITRIX24_BOT_ID",
  "BITRIX24_BOT_CLIENT_ID",
];

async function checkConnection(check) {
  try {
    await check();
    return { status: "connected" };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

function checkBitrixConfiguration() {
  const missing = BITRIX_BASE_ENV_NAMES.filter(
    (envName) => !process.env[envName],
  );
  const countriesUsingFallback = supportedCountries.filter(
    (country) =>
      !process.env[`BITRIX_PRODUCT_NOTIFICATION_MANAGER_${country}`],
  );

  return missing.length === 0
    ? { status: "configured", countriesUsingFallback }
    : { status: "error", missing, countriesUsingFallback };
}

function getCronStaleThresholdMs() {
  const configuredHours = Number.parseInt(process.env.CRON_STALE_HOURS, 10);
  const hours = configuredHours > 0 ? configuredHours : 26;
  return hours * 60 * 60 * 1000;
}

async function checkCronHealth(CronRun) {
  if (!CronRun) return { status: "unknown" };

  try {
    const lastRun = await CronRun.findOne({ order: [["started_at", "DESC"]] });
    if (!lastRun) {
      return { status: "unknown", message: "No cron runs recorded yet" };
    }

    const ageMs = Date.now() - new Date(lastRun.started_at).getTime();
    const stale = ageMs > getCronStaleThresholdMs();

    return {
      status: stale ? "stale" : "ok",
      lastRunAt: lastRun.started_at,
      subsChecked: lastRun.subs_checked,
      sentCount: lastRun.sent_count,
      errorsCount: lastRun.errors_count,
    };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}

async function createHealthReport(sequelize, oAuth2Client, { CronRun } = {}) {
  const [database, gmail, cron] = await Promise.all([
    checkConnection(() => sequelize.authenticate()),
    checkConnection(async () => {
      const { token } = await oAuth2Client.getAccessToken();
      if (!token) throw new Error("Gmail access token is unavailable");
    }),
    checkCronHealth(CronRun),
  ]);
  const bitrix = checkBitrixConfiguration();
  const healthy =
    database.status === "connected" &&
    gmail.status === "connected" &&
    bitrix.status === "configured" &&
    cron.status !== "stale" &&
    cron.status !== "error";

  return {
    status: healthy ? "healthy" : "unhealthy",
    database,
    gmail,
    bitrix,
    cron,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { checkBitrixConfiguration, checkCronHealth, createHealthReport };
