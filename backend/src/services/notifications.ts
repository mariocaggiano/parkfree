export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const sendExpiryWarning = async (
  userId: string,
  sessionId: string,
  minutesRemaining: number
): Promise<void> => {
  const payload: NotificationPayload = {
    title: 'Parking expiring soon',
    body: `Your parking session expires in ${minutesRemaining} minutes`,
    data: {
      type: 'parking_expiry_warning',
      sessionId: sessionId,
    },
  };

  await sendNotification(userId, payload);
};

export const sendSessionComplete = async (
  userId: string,
  sessionId: string,
  totalCost: number
): Promise<void> => {
  const payload: NotificationPayload = {
    title: 'Parking session complete',
    body: `Your parking session has ended. Total cost: €${totalCost.toFixed(2)}`,
    data: {
      type: 'parking_complete',
      sessionId: sessionId,
      totalCost: totalCost.toString(),
    },
  };

  await sendNotification(userId, payload);
};

export const sendPaymentConfirmation = async (
  userId: string,
  sessionId: string,
  amount: number
): Promise<void> => {
  const payload: NotificationPayload = {
    title: 'Payment confirmed',
    body: `Payment of €${amount.toFixed(2)} has been processed`,
    data: {
      type: 'payment_confirmed',
      sessionId: sessionId,
      amount: amount.toString(),
    },
  };

  await sendNotification(userId, payload);
};

export const sendExtensionConfirmation = async (
  userId: string,
  sessionId: string,
  newEndTime: Date,
  extensionCost: number
): Promise<void> => {
  const formattedTime = newEndTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const payload: NotificationPayload = {
    title: 'Parking extended',
    body: `Your parking has been extended until ${formattedTime}. Cost: €${extensionCost.toFixed(2)}`,
    data: {
      type: 'parking_extended',
      sessionId: sessionId,
      newEndTime: newEndTime.toISOString(),
      cost: extensionCost.toString(),
    },
  };

  await sendNotification(userId, payload);
};

async function sendNotification(userId: string, payload: NotificationPayload): Promise<void> {
  try {
    console.log(`Sending notification to user ${userId}:`, payload);

    if (process.env.FCM_PROJECT_ID && process.env.FCM_CREDENTIALS_PATH) {
      console.log('FCM is configured, notification would be sent via Firebase Cloud Messaging');
    } else {
      console.log('FCM not configured, notification skipped (configure FCM_PROJECT_ID and FCM_CREDENTIALS_PATH)');
    }
  } catch (error) {
    console.error(`Failed to send notification to user ${userId}:`, error);
  }
}
