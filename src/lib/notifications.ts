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

  try {
    await sql.begin(async (tx) => {
      for (const notification of notifications) {
        await tx`
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
      }
    });

    return notifications.length;
  } catch (err) {
    console.error("[notifications] createNotifications failed:", err);
    return 0;
  }
}
