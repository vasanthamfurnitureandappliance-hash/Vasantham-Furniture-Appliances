"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RecordPaymentForm({ purchaseId }: { purchaseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseId, amount: Number(amount), method }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to record payment.");
      return;
    }
    setOpen(false);
    setAmount("");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs bg-brand-blue text-white px-3 py-1.5 rounded-lg font-medium">
        Record Payment
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-24 border rounded-lg px-2 py-1 text-xs"
      />
      <select value={method} onChange={(e) => setMethod(e.target.value)} className="border rounded-lg px-2 py-1 text-xs">
        <option value="CASH">Cash</option>
        <option value="UPI">UPI</option>
        <option value="BANK_TRANSFER">Bank Transfer</option>
        <option value="OTHER">Other</option>
      </select>
      <button disabled={loading || !amount} onClick={submit} className="text-xs bg-brand-blue text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
        {loading ? "Saving…" : "Save"}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-slate-400">Cancel</button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
