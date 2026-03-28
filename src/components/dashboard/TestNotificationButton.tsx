"use client";

import { useTransition } from "react";
import { sendTestNotification } from "@/app/dashboard/notifications/actions";

/** Temporary test button — remove before production */
export default function TestNotificationButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mb-[20px] p-[16px] rounded-xl border-2 border-dashed border-[#E5654E]/30 bg-[#E5654E]/5">
      <p className="text-[12px] text-[#E5654E] font-semibold uppercase tracking-[1px] mb-[8px]">
        Test Mode — Remove before production
      </p>
      <div className="flex gap-[10px]">
        <button
          onClick={() => startTransition(() => sendTestNotification())}
          disabled={isPending}
          className="px-[16px] py-[8px] bg-[#111111] text-white text-[13px] font-medium rounded-xl border-none cursor-pointer hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
        >
          {isPending ? "Sending..." : "Test: You earned $12"}
        </button>
        <p className="text-[12px] text-[#94A3B8] self-center">
          Click to trigger a test payout notification with ka-ching sound
        </p>
      </div>
    </div>
  );
}
