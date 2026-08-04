const {
  deliverAvailabilityNotification,
} = require("./subscriberNotification");

test("marks an availability email as sent without deleting the subscription", async () => {
  const subscription = {
    id: 10,
    email: "customer@example.com",
    notification_attempts: 1,
    update: jest.fn().mockResolvedValue(undefined),
  };
  const sendNotification = jest.fn().mockResolvedValue(undefined);

  await deliverAvailabilityNotification(
    subscription,
    { subject: "Available" },
    sendNotification,
  );

  expect(sendNotification).toHaveBeenCalledWith(
    "customer@example.com",
    { subject: "Available" },
  );
  expect(subscription.update).toHaveBeenCalledWith(
    expect.objectContaining({
      notification_sent: true,
      notification_attempts: 2,
      notification_last_error: null,
    }),
  );
  expect(subscription.destroy).toBeUndefined();
});

test("records a failed email attempt and keeps it available for retry", async () => {
  const subscription = {
    id: 10,
    email: "customer@example.com",
    notification_attempts: 0,
    update: jest.fn().mockResolvedValue(undefined),
  };
  const sendNotification = jest
    .fn()
    .mockRejectedValue(new Error("Gmail unavailable"));

  await expect(
    deliverAvailabilityNotification(
      subscription,
      { subject: "Available" },
      sendNotification,
    ),
  ).rejects.toThrow("Gmail unavailable");

  expect(subscription.update).toHaveBeenCalledWith({
    notification_attempts: 1,
    notification_last_error: "Gmail unavailable",
  });
});
