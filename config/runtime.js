function getCronConfig() {
  return {
    schedule: process.env.PRODUCT_AVAILABILITY_CRON || "0 0 * * *",
    timezone: process.env.PRODUCT_AVAILABILITY_CRON_TIMEZONE || "UTC",
  };
}

module.exports = { getCronConfig };
