/**
 * Send Notification Job
 *
 * Simulates sending notifications (email, slack, etc.)
 */

import { Job } from 'bullmq';

interface NotificationPayload {
  type: 'email' | 'slack' | 'webhook';
  recipient: string;
  subject?: string;
  message: string;
}

export async function sendNotificationJob(job: Job<NotificationPayload>): Promise<{ sent: boolean; notificationId: string }> {
  const { type, recipient, subject, message } = job.data;

  await job.log(`Sending ${type} notification to ${recipient}`);
  await job.updateProgress(25);

  // Simulate notification sending
  await sleep(1000);
  await job.updateProgress(50);

  // Validate recipient
  if (!recipient) {
    throw new Error('Recipient is required');
  }

  // Simulate API call
  await sleep(500);
  await job.updateProgress(75);

  // Generate notification ID
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  await job.log(`Notification sent: ${notificationId}`);
  await job.updateProgress(100);

  return {
    sent: true,
    notificationId,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
