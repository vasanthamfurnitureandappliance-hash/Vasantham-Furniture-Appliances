import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";

export const revalidate = 0;

export default async function AdminCustomersPage() {
  const { supabase } = await requireAdmin();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, customer_code, full_name, mobile_number, onboarding_status, account_status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-brand-blue mb-6">Customers</h1>
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Customer ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Onboarding</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {(customers ?? []).map((c) => (
              <tr key={c.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/customers/${c.id}`} className="text-brand-blue font-medium hover:underline">
                    {c.customer_code}
                  </Link>
                </td>
                <td className="px-4 py-3">{c.full_name ?? "—"}</td>
                <td className="px-4 py-3">{c.mobile_number ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    c.onboarding_status === "COMPLETE" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}>{c.onboarding_status}</span>
                </td>
                <td className="px-4 py-3">{c.account_status}</td>
                <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
            {(customers ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No customers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
