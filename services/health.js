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

async function createHealthReport(sequelize, oAuth2Client) {
  const [database, gmail] = await Promise.all([
    checkConnection(() => sequelize.authenticate()),
    checkConnection(async () => {
      const { token } = await oAuth2Client.getAccessToken();
      if (!token) throw new Error("Gmail access token is unavailable");
    }),
  ]);
  const bitrix = checkBitrixConfiguration();
  const healthy =
    database.status === "connected" &&
    gmail.status === "connected" &&
    bitrix.status === "configured";

  return {
    status: healthy ? "healthy" : "unhealthy",
    database,
    gmail,
    bitrix,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { checkBitrixConfiguration, createHealthReport };
