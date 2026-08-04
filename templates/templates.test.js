const { supportedCountries } = require("../config/shopify");
const {
  getSubscriptionConfirmationTemplate,
} = require("./subscriptionConfirmation");
const {
  getAvailabilityNotificationTemplate,
} = require("./availabilityNotification");

test.each(supportedCountries)(
  "provides both email templates for %s",
  (country) => {
    const subscription = { country, nickname: "Customer", sku: "TS2811-B" };
    const confirmation = getSubscriptionConfirmationTemplate(country, {
      nickname: subscription.nickname,
      sku: subscription.sku,
    });
    const availability = getAvailabilityNotificationTemplate(
      country,
      subscription,
    );

    expect(confirmation).toEqual({
      subject: expect.any(String),
      text: expect.any(String),
      html: expect.stringContaining("TS2811-B"),
    });
    expect(availability).toEqual({
      subject: expect.any(String),
      text: expect.any(String),
      html: expect.stringContaining("TS2811-B"),
    });
  },
);
