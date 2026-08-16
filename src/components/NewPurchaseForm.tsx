"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Customer = { id: string; customer_code: string; full_name: string | null };

const PRODUCT_EXAMPLES = ["Refrigerator", "Washing Machine", "TV", "Sofa", "Bed", "Wardrobe", "Dining Table", "AC", "Fan", "Mixer Grinder"];

export default function NewPurchaseForm({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    customerId: "",
    productName: "",
    category: "",
    description: "",
    quantity: "1",
    productPrice: "",
    downPayment: "0",
    installmentCount: "10",
    frequency: "MONTHLY",
    purchaseDate: new Date().toISOString().slice(0, 10),
    firstDueDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    const res = await fetch("/api/admin/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create purchase.");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  const totalPayable = (Number(form.productPrice || 0) * Number(form.quantity || 1)) - Number(form.downPayment || 0);
  const installmentAmount = form.installmentCount ? Math.round((totalPayable / Number(form.installmentCount)) * 100) / 100 : 0;

  return (
    <form onSubmit={submit} className="bg-white border rounded-xl p-6 max-w-2xl space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1">Customer</label>
        <select required className="input" value={form.customerId} onChange={(e) => set("customerId", e.target.value)}>
          <option value="">Select customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.customer_code} — {c.full_name}</option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Product Name</label>
          <input required list="products" className="input" value={form.productName} onChange={(e) => set("productName", e.target.value)} />
          <datalist id="products">{PRODUCT_EXAMPLES.map((p) => <option key={p} value={p} />)}</datalist>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <input required className="input" value={form.category} onChange={(e) => set("category", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea className="input" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Quantity</label>
          <input type="number" min={1} className="input" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Product Price (₹)</label>
          <input type="number" required min={0} className="input" value={form.productPrice} onChange={(e) => set("productPrice", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Down Payment (₹)</label>
          <input type="number" min={0} className="input" value={form.downPayment} onChange={(e) => set("downPayment", e.target.value)} />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">No. of Installments</label>
          <input type="number" required min={1} className="input" value={form.installmentCount} onChange={(e) => set("installmentCount", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Frequency</label>
          <select className="input" value={form.frequency} onChange={(e) => set("frequency", e.target.value)}>
            <option value="MONTHLY">Monthly</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">First Due Date</label>
          <input type="date" required className="input" value={form.firstDueDate} onChange={(e) => set("firstDueDate", e.target.value)} />
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 text-sm">
        <p>Total Payable: <span className="font-semibold">₹{totalPayable.toLocaleString("en-IN")}</span></p>
        <p>Installment Amount (approx.): <span className="font-semibold">₹{installmentAmount.toLocaleString("en-IN")}</span></p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">Purchase created and installment schedule generated.</p>}

      <button disabled={loading} className="bg-brand-blue text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-60">
        {loading ? "Creating…" : "Create Purchase"}
      </button>

      <style jsx global>{`
        .input { width: 100%; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.55rem 0.75rem; font-size: 0.9rem; }
      `}</style>
    </form>
  );
}
