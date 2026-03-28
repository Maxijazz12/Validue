import NotificationPanel from "@/components/dashboard/NotificationPanel";
import TestNotificationButton from "@/components/dashboard/TestNotificationButton";

export default function NotificationsPage() {
  return (
    <>
      {/* TODO: Remove before production */}
      <TestNotificationButton />
      <NotificationPanel />
    </>
  );
}
