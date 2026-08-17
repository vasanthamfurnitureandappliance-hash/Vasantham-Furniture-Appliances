import { requireAdmin } from "@/lib/require-admin";

export const revalidate = 0;

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();

  await supabase.rpc("refresh_overdue_status");

  const { count: customerCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("onboarding_status", "COMPLETE");

  const { data: purchases } = await supabase.from("purchases").select("total_payable, status");
  const { data: installments } = await supabase.from("installments").select("amount_due, amount_paid, status");

  const totalPayable = (purchases ?? []).reduce((s, p) => s + Number(p.total_payable), 0);
  const totalPaid = (installments ?? []).reduce((s, i) => s + Number(i.amount_paid), 0);
  const overdueCount = (installments ?? []).filter((i) => i.status === "OVERDUE").length;
  const activePurchases = (purchases ?? []).filter((p) => p.status === "ACTIVE").length;

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-brand-blue mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Active Customers" value={String(customerCount ?? 0)} />
        <Stat label="Active Purchases" value={String(activePurchases)} />
        <Stat label="Total Payable" value={inr(totalPayable)} />
        <Stat label="Total Collected" value={inr(totalPaid)} />
        <Stat label="Outstanding" value={inr(totalPayable - totalPaid)} tone="red" />
        <Stat label="Overdue Installments" value={String(overdueCount)} tone="red" />
      </div>
    </div>
  );
}

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "red" }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${tone === "red" ? "text-red-700" : "text-brand-blue"}`}>{value}</p>
    </div>
  );
}
