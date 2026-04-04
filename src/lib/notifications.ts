import sql from "@/lib/db";

export const NOTIFICATION_TYPES = [
  "campaign_completed",
  "payout_earned",
  "new_response",
  "ranking_complete",
  "quality_feedback",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationInsert = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  campaignId?: string | null;
  amount?: number | null;
  link?: string | null;
};

export async function createNotification(
  notification: NotificationInsert
): Promise<boolean> {
  try {
    await sql`
      INSERT INTO notifications (user_id, type, title, body, campaign_id, amount, link)
      VALUES (
        ${notification.userId},
        ${notification.type},
        ${notification.title},
        ${notification.body ?? null},
        ${notification.campaignId ?? null},
        ${notification.amount ?? null},
        ${notification.link ?? null}
      )
    `;
    return true;
  } catch (err) {
    console.error("[notifications] createNotification failed:", err);
    return false;
  }
}

export async function createNotifications(
  notifications: NotificationInsert[]
): Promise<number> {
  if (notifications.length === 0) return 0;

  let succeeded = 0;
  for (const notification of notifications) {
    try {
      await sql`
        INSERT INTO notifications (user_id, type, title, body, campaign_id, amount, link)
        VALUES (
          ${notification.userId},
          ${notification.type},
          ${notification.title},
          ${notification.body ?? null},
          ${notification.campaignId ?? null},
          ${notification.amount ?? null},
          ${notification.link ?? null}
        )
      `;
      succeeded++;
    } catch (err) {
      console.error("[notifications] createNotification failed for user", notification.userId, err);
    }
  }

  return succeeded;
}
