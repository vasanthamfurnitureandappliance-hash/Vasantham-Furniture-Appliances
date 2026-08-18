import Image from "next/image";
import { requireAdmin } from "@/lib/require-admin";
import RecordPaymentForm from "@/components/RecordPaymentForm";
import CustomerStatusActions from "@/components/CustomerStatusActions";

export const revalidate = 0;

export default async function AdminCustomerDetail({ params }: { params: { id: string } }) {
  const { supabase } = await requireAdmin();

  const { data: customer } = await supabase.from("customers").select("*").eq("id", params.id).single();
  const { data: purchases } = await supabase
    .from("purchases")
    .select("*, installments(*)")
    .eq("customer_id", params.id)
    .order("created_at", { ascending: false });
  const { data: payments } = await supabase
    .from("payments")
    .select("id, receipt_code, amount, method, paid_at, purchase_id, purchases(product_name, purchase_code), recorder:admin_users(full_name)")
    .eq("customer_id", params.id)
    .order("paid_at", { ascending: false });

  async function signedUrl(path: string | null) {
    if (!path) return null;
    const { data } = await supabase.storage.from("customer-documents-private").createSignedUrl(path, 60 * 10);
    return data?.signedUrl ?? null;
  }

  const selfieUrl = await signedUrl(customer?.selfie_path);
  const aadhaarFrontUrl = await signedUrl(customer?.aadhaar_front_path);
  const aadhaarBackUrl = await signedUrl(customer?.aadhaar_back_path);

  if (!customer) return <div className="p-8">Customer not found.</div>;

  const purchaseList = purchases ?? [];
  const activePurchases = purchaseList.filter((p: any) => p.status === "ACTIVE");
  const closedPurchases = purchaseList.filter((p: any) => p.status === "CLOSED");

  let totalPayable = 0;
  let totalPaid = 0;
  let totalOverdue = 0;
  const today = new Date(new Date().toDateString());

  for (const p of purchaseList) {
    if (p.status === "CANCELLED") continue;
    const installments = p.installments ?? [];
    const paid = installments.reduce((s: number, i: any) => s + Number(i.amount_paid), 0);
    totalPayable += Number(p.total_payable);
    totalPaid += paid;
    for (const i of installments) {
      if (new Date(i.due_date) < today && Number(i.amount_paid) < Number(i.amount_due)) {
        totalOverdue += Number(i.amount_due) - Number(i.amount_paid);
      }
    }
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-brand-blue">{customer.full_name}</h1>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                customer.account_status === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : customer.account_status === "CLOSED"
                  ? "bg-slate-200 text-slate-600"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {customer.account_status}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {customer.customer_code} · {customer.mobile_number}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Joined {new Date(customer.created_at).toLocaleDateString("en-IN")} · Last updated{" "}
            {new Date(customer.updated_at).toLocaleDateString("en-IN")}
          </p>
        </div>
        <CustomerStatusActions customerId={customer.id} accountStatus={customer.account_status} />
      </div>

      <section className="bg-white border rounded-xl p-4 sm:p-6">
        <h2 className="font-semibold text-slate-700 mb-4">Purchase Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <SummaryStat label="Total Purchases" value={String(purchaseList.length)} />
          <SummaryStat label="Active Purchases" value={String(activePurchases.length)} />
          <SummaryStat label="Completed Purchases" value={String(closedPurchases.length)} />
          <SummaryStat label="Total Payable" value={inr(totalPayable)} />
          <SummaryStat label="Total Paid" value={inr(totalPaid)} />
          <SummaryStat label="Outstanding" value={inr(totalPayable - totalPaid)} />
          <SummaryStat label="Overdue" value={inr(totalOverdue)} tone={totalOverdue > 0 ? "danger" : undefined} />
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 sm:p-6">
        <h2 className="font-semibold text-slate-700 mb-4">KYC Documents</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <DocPreview label="Selfie" url={selfieUrl} />
          <DocPreview label="Aadhaar Front" url={aadhaarFrontUrl} />
          <DocPreview label="Aadhaar Back" url={aadhaarBackUrl} />
        </div>
        <div className="mt-4 text-sm text-slate-600 space-y-1">
          <p><span className="font-medium">Address:</span> {customer.address}</p>
          <p><span className="font-medium">Nominee:</span> {customer.nominee_name} ({customer.nominee_relationship}) — {customer.nominee_contact}</p>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 sm:p-6">
        <h2 className="font-semibold text-slate-700 mb-4">Purchases & Installments</h2>
        {purchaseList.length === 0 && <p className="text-slate-400 text-sm">No purchases yet.</p>}
        <div className="space-y-6">
          {purchaseList.map((p: any) => {
            const installments = (p.installments ?? []).sort((a: any, b: any) => a.installment_no - b.installment_no);
            const paid = installments.reduce((s: number, i: any) => s + Number(i.amount_paid), 0);
            const nextDue = installments.find((i: any) => Number(i.amount_paid) < Number(i.amount_due));
            return (
              <div key={p.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                  <div>
                    <p className="font-medium">
                      {p.product_name} <span className="text-xs text-slate-400">({p.purchase_code})</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.category} · Qty {p.quantity} · Down Payment {inr(p.down_payment)} · Installment {inr(p.installment_amount)}/{p.frequency === "WEEKLY" ? "wk" : "mo"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Payable {inr(p.total_payable)} · Paid {inr(paid)} · Outstanding {inr(p.total_payable - paid)} ·{" "}
                      {nextDue ? `Next Due ${new Date(nextDue.due_date).toLocaleDateString("en-IN")}` : "No dues pending"} · {p.status}
                    </p>
                  </div>
                  {p.status === "ACTIVE" && <RecordPaymentForm purchaseId={p.id} />}
                </div>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-[480px] text-xs">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="text-left py-1 pl-4 sm:pl-0">#</th>
                        <th className="text-left">Due Date</th>
                        <th className="text-left">Due</th>
                        <th className="text-left">Paid</th>
                        <th className="text-left pr-4 sm:pr-0">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((i: any) => (
                        <tr key={i.id} className="border-t">
                          <td className="py-1 pl-4 sm:pl-0">{i.installment_no}</td>
                          <td>{new Date(i.due_date).toLocaleDateString("en-IN")}</td>
                          <td>{inr(i.amount_due)}</td>
                          <td>{inr(i.amount_paid)}</td>
                          <td className="pr-4 sm:pr-0">
                            <span
                              className={`px-2 py-0.5 rounded-full ${
                                i.status === "PAID"
                                  ? "bg-green-100 text-green-700"
                                  : i.status === "OVERDUE"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {i.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 sm:p-6">
        <h2 className="font-semibold text-slate-700 mb-4">Payment History</h2>
        {(payments ?? []).length === 0 ? (
          <p className="text-slate-400 text-sm">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[600px] text-xs">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="py-1 pl-4 sm:pl-0">Receipt</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th className="pr-4 sm:pr-0">Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((pay: any) => (
                  <tr key={pay.id} className="border-t">
                    <td className="py-1 pl-4 sm:pl-0">{pay.receipt_code}</td>
                    <td>{pay.purchases?.product_name ?? "—"} <span className="text-slate-400">({pay.purchases?.purchase_code})</span></td>
                    <td>{inr(pay.amount)}</td>
                    <td>{pay.method}</td>
                    <td>{new Date(pay.paid_at).toLocaleDateString("en-IN")}</td>
                    <td className="pr-4 sm:pr-0">{pay.recorder?.full_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-base font-semibold ${tone === "danger" ? "text-red-600" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function DocPreview({ label, url }: { label: string; url: string | null }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <Image src={url} alt={label} width={200} height={140} className="rounded-lg border object-cover w-full h-36" />
        </a>
      ) : (
        <div className="h-36 rounded-lg border flex items-center justify-center text-xs text-slate-400">Not uploaded</div>
      )}
    </div>
  );
}
