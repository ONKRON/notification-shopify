const MAX_ERROR_LENGTH = 4000;

async function deliverAvailabilityNotification(
  subscription,
  notification,
  sendNotification,
) {
  const attempt = Number(subscription.notification_attempts || 0) + 1;

  try {
    await sendNotification(subscription.email, notification);
  } catch (error) {
    try {
      await subscription.update({
        notification_attempts: attempt,
        notification_last_error: String(error.message || error).slice(
          0,
          MAX_ERROR_LENGTH,
        ),
      });
    } catch (trackingError) {
      console.error(
        `Failed to track email delivery for subscription ${subscription.id}:`,
        trackingError.message,
      );
    }

    throw error;
  }

  await subscription.update({
    notification_sent: true,
    notification_sent_at: new Date(),
    notification_attempts: attempt,
    notification_last_error: null,
  });
}

module.exports = { deliverAvailabilityNotification };
