const { getCronConfig } = require("./runtime");

test("uses an explicit timezone for the product availability cron", () => {
  const originalSchedule = process.env.PRODUCT_AVAILABILITY_CRON;
  const originalTimezone = process.env.PRODUCT_AVAILABILITY_CRON_TIMEZONE;
  process.env.PRODUCT_AVAILABILITY_CRON = "0 */6 * * *";
  process.env.PRODUCT_AVAILABILITY_CRON_TIMEZONE = "Europe/Moscow";

  expect(getCronConfig()).toEqual({
    schedule: "0 */6 * * *",
    timezone: "Europe/Moscow",
  });

  if (originalSchedule === undefined) delete process.env.PRODUCT_AVAILABILITY_CRON;
  else process.env.PRODUCT_AVAILABILITY_CRON = originalSchedule;
  if (originalTimezone === undefined) {
    delete process.env.PRODUCT_AVAILABILITY_CRON_TIMEZONE;
  } else {
    process.env.PRODUCT_AVAILABILITY_CRON_TIMEZONE = originalTimezone;
  }
});
