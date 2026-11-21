"use client";

import { useState, useTransition } from "react";
import { Printer, Loader2 } from "lucide-react";
import { updateStoreOrderStatus } from "@/app/actions/ecommerce";

const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "DISPATCHED",
  "COMPLETED",
  "CANCELLED",
] as const;

export function OrderDetailControls({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (next: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateStoreOrderStatus(orderId, next);
      if (res.success) {
        setStatus(next);
        setFeedback(`Order status updated to ${next}.`);
      } else {
        setFeedback(res.error || "Could not update order.");
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2.5 print:hidden">
        <div className="flex items-center gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-[#FF8A00]" />}
          <select
            value={status}
            disabled={isPending}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#FF8A00] focus:outline-none"
          >
            {ORDER_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#101827] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1f2937] transition"
        >
          <Printer className="h-3.5 w-3.5 text-[#FF8A00]" />
          <span>Print Receipt</span>
        </button>
      </div>
      {feedback && (
        <p className="text-xs font-medium text-[#FF8A00] print:hidden">{feedback}</p>
      )}
    </div>
  );
}
