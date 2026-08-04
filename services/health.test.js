const {
  checkBitrixConfiguration,
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
    }),
  );
});
