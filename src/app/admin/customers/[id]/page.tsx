import Image from "next/image";
import { requireAdmin } from "@/lib/require-admin";
import RecordPaymentForm from "@/components/RecordPaymentForm";

export const revalidate = 0;

export default async function AdminCustomerDetail({ params }: { params: { id: string } }) {
  const { supabase } = await requireAdmin();

  const { data: customer } = await supabase.from("customers").select("*").eq("id", params.id).single();
  const { data: purchases } = await supabase
    .from("purchases")
    .select("*, installments(*)")
    .eq("customer_id", params.id)
    .order("created_at", { ascending: false });

  async function signedUrl(path: string | null) {
    if (!path) return null;
    const { data } = await supabase.storage.from("customer-documents-private").createSignedUrl(path, 60 * 10);
    return data?.signedUrl ?? null;
  }

  const selfieUrl = await signedUrl(customer?.selfie_path);
  const aadhaarFrontUrl = await signedUrl(customer?.aadhaar_front_path);
  const aadhaarBackUrl = await signedUrl(customer?.aadhaar_back_path);

  if (!customer) return <div className="p-8">Customer not found.</div>;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-brand-blue">{customer.full_name}</h1>
        <p className="text-sm text-slate-500">{customer.customer_code} · {customer.mobile_number}</p>
      </div>

      <section className="bg-white border rounded-xl p-6">
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

      <section className="bg-white border rounded-xl p-6">
        <h2 className="font-semibold text-slate-700 mb-4">Purchases & Installments</h2>
        {(purchases ?? []).length === 0 && <p className="text-slate-400 text-sm">No purchases yet.</p>}
        <div className="space-y-6">
          {(purchases ?? []).map((p: any) => {
            const paid = (p.installments ?? []).reduce((s: number, i: any) => s + Number(i.amount_paid), 0);
            return (
              <div key={p.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="font-medium">{p.product_name} <span className="text-xs text-slate-400">({p.purchase_code})</span></p>
                    <p className="text-xs text-slate-500">
                      Payable {inr(p.total_payable)} · Paid {inr(paid)} · Outstanding {inr(p.total_payable - paid)} · {p.status}
                    </p>
                  </div>
                  {p.status === "ACTIVE" && <RecordPaymentForm purchaseId={p.id} />}
                </div>
                <table className="w-full text-xs">
                  <thead className="text-slate-500">
                    <tr><th className="text-left py-1">#</th><th className="text-left">Due Date</th><th className="text-left">Due</th><th className="text-left">Paid</th><th className="text-left">Status</th></tr>
                  </thead>
                  <tbody>
                    {(p.installments ?? []).sort((a: any, b: any) => a.installment_no - b.installment_no).map((i: any) => (
                      <tr key={i.id} className="border-t">
                        <td className="py-1">{i.installment_no}</td>
                        <td>{new Date(i.due_date).toLocaleDateString("en-IN")}</td>
                        <td>{inr(i.amount_due)}</td>
                        <td>{inr(i.amount_paid)}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded-full ${
                            i.status === "PAID" ? "bg-green-100 text-green-700" :
                            i.status === "OVERDUE" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                          }`}>{i.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
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
