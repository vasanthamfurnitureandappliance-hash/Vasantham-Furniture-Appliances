import { redirect } from "next/navigation";
import Image from "next/image";
import Logo from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (!customer) redirect("/onboarding");
  if (customer.onboarding_status !== "COMPLETE") redirect("/onboarding");

  const { data: purchases } = await supabase
    .from("purchases")
    .select("*, installments(*)")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  const allInstallments = (purchases ?? []).flatMap((p) => p.installments ?? []);
  const totalPayable = (purchases ?? []).reduce((s, p) => s + Number(p.total_payable), 0);
  const totalPaid = allInstallments.reduce((s: number, i: any) => s + Number(i.amount_paid), 0);
  const outstanding = totalPayable - totalPaid;
  const today = new Date().toISOString().slice(0, 10);
  const todaysDue = allInstallments.filter((i: any) => i.due_date === today && i.status !== "PAID").length;
  const overdue = allInstallments.filter((i: any) => i.status === "OVERDUE").length;
  const upcoming = allInstallments.filter((i: any) => i.due_date > today && i.status !== "PAID").length;

  let selfieUrl: string | null = null;
  if (customer.selfie_path) {
    const { data } = await supabase.storage
      .from("customer-documents-private")
      .createSignedUrl(customer.selfie_path, 60 * 10);
    selfieUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Logo size={48} withLink={false} />
          {selfieUrl && (
            <Image src={selfieUrl} alt="Profile" width={48} height={48} className="rounded-full object-cover w-12 h-12" />
          )}
          <div>
            <p className="font-bold text-brand-blue">{customer.full_name}</p>
            <p className="text-xs text-slate-500">{customer.customer_code} · {customer.account_status}</p>
          </div>
        </div>
        <LogoutButton />
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <Stat label="Total Purchases" value={String(purchases?.length ?? 0)} />
        <Stat label="Total Payable" value={inr(totalPayable)} />
        <Stat label="Total Paid" value={inr(totalPaid)} tone="green" />
        <Stat label="Outstanding" value={inr(outstanding)} tone="red" />
        <Stat label="Today's Due" value={String(todaysDue)} />
        <Stat label="Overdue" value={String(overdue)} tone="red" />
        <Stat label="Upcoming Due" value={String(upcoming)} />
      </section>

      <h2 className="text-lg font-bold text-brand-blue mb-4">Purchase History</h2>
      <div className="space-y-4">
        {(purchases ?? []).length === 0 && (
          <p className="text-slate-500 text-sm">No purchases yet. Visit our store to make your first purchase.</p>
        )}
        {(purchases ?? []).map((p: any) => {
          const paid = (p.installments ?? []).reduce((s: number, i: any) => s + Number(i.amount_paid), 0);
          const nextDue = (p.installments ?? [])
            .filter((i: any) => i.status !== "PAID")
            .sort((a: any, b: any) => a.due_date.localeCompare(b.due_date))[0];
          return (
            <div key={p.id} className="bg-white border rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-slate-800">{p.product_name}</p>
                  <p className="text-xs text-slate-500">{p.category} · {p.purchase_code}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  p.status === "CLOSED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                }`}>{p.status}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Info label="Product Price" value={inr(p.product_price)} />
                <Info label="Down Payment" value={inr(p.down_payment)} />
                <Info label="Total Payable" value={inr(p.total_payable)} />
                <Info label="Total Paid" value={inr(paid)} />
                <Info label="Outstanding" value={inr(p.total_payable - paid)} />
                <Info label="Installment" value={inr(p.installment_amount)} />
                <Info label="Purchase Date" value={new Date(p.purchase_date).toLocaleDateString("en-IN")} />
                <Info label="Next Due Date" value={nextDue ? new Date(nextDue.due_date).toLocaleDateString("en-IN") : "—"} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  const color = tone === "green" ? "text-green-700" : tone === "red" ? "text-red-700" : "text-brand-blue";
  return (
    <div className="bg-white border rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{value}</p>
    </div>
  );
}
