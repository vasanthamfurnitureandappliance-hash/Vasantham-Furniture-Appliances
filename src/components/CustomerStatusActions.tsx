"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CustomerStatusActions({
  customerId,
  accountStatus,
}: {
  customerId: string;
  accountStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClosed = accountStatus === "CLOSED";
  const nextStatus = isClosed ? "ACTIVE" : "CLOSED";
  const label = isClosed ? "Reopen Account" : "Close Account";

  async function submit() {
    const confirmMsg = isClosed
      ? "Reopen this account? The customer will be active again."
      : "Close this account? The customer, purchases, payments and history are kept — only the status changes.";
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/customers/${customerId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to update account status.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={submit}
        disabled={loading}
        className={`text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 ${
          isClosed ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}
      >
        {loading ? "Saving…" : label}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
