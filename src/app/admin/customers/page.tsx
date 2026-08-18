import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/require-admin";

export const revalidate = 0;

const PAGE_SIZE = 20;

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
}

function isOverdueInstallment(i: { due_date: string; amount_due: number; amount_paid: number }) {
  const today = new Date(new Date().toDateString());
  return new Date(i.due_date) < today && Number(i.amount_paid) < Number(i.amount_due);
}

type SearchParams = { q?: string; status?: string; filter?: string; page?: string };

export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireAdmin();

  const q = (searchParams.q ?? "").trim();
  const statusFilter = searchParams.status ?? "ALL";
  const extraFilter = searchParams.filter ?? "ALL";
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);

  let query = supabase
    .from("customers")
    .select(
      "id, customer_code, full_name, mobile_number, selfie_path, onboarding_status, account_status, created_at, purchases(status, total_payable, installments(amount_due, amount_paid, due_date))"
    )
    .order("created_at", { ascending: false });

  if (["ACTIVE", "CLOSED", "SUSPENDED"].includes(statusFilter)) {
    query = query.eq("account_status", statusFilter);
  }
  if (q) {
    const term = q.replace(/[%,]/g, "");
    query = query.or(`customer_code.ilike.%${term}%,full_name.ilike.%${term}%,mobile_number.ilike.%${term}%`);
  }

  const { data: rawCustomers } = await query;

  // Latest payment per customer, used for the "Last Payment" column.
  const { data: payments } = await supabase
    .from("payments")
    .select("customer_id, paid_at")
    .order("paid_at", { ascending: false });

  const lastPaymentByCustomer = new Map<string, string>();
  for (const p of payments ?? []) {
    if (!lastPaymentByCustomer.has(p.customer_id)) lastPaymentByCustomer.set(p.customer_id, p.paid_at);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let customers = (rawCustomers ?? []).map((c: any) => {
    const purchases = c.purchases ?? [];
    let outstanding = 0;
    let overdue = 0;
    for (const p of purchases) {
      if (p.status === "CANCELLED") continue;
      const installments = p.installments ?? [];
      const paid = installments.reduce((s: number, i: any) => s + Number(i.amount_paid), 0);
      outstanding += Number(p.total_payable) - paid;
      for (const i of installments) {
        if (isOverdueInstallment(i)) overdue += Number(i.amount_due) - Number(i.amount_paid);
      }
    }
    return {
      id: c.id,
      customer_code: c.customer_code,
      full_name: c.full_name,
      mobile_number: c.mobile_number,
      selfie_path: c.selfie_path as string | null,
      account_status: c.account_status,
      created_at: c.created_at,
      totalPurchases: purchases.length,
      outstanding,
      overdue,
      lastPayment: lastPaymentByCustomer.get(c.id) ?? null,
    };
  });

  if (extraFilter === "OVERDUE") customers = customers.filter((c) => c.overdue > 0);
  if (extraFilter === "OUTSTANDING") customers = customers.filter((c) => c.outstanding > 0);
  if (extraFilter === "NO_OUTSTANDING") customers = customers.filter((c) => c.outstanding <= 0);
  if (extraFilter === "NEW") customers = customers.filter((c) => new Date(c.created_at) >= thirtyDaysAgo);

  const totalCount = customers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageCustomers = customers.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const selfiePaths = pageCustomers.map((c) => c.selfie_path).filter((p): p is string => Boolean(p));
  const photoByPath = new Map<string, string>();
  if (selfiePaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("customer-documents-private")
      .createSignedUrls(selfiePaths, 60 * 10);
    for (const s of signed ?? []) {
      if (s.signedUrl && !s.error) photoByPath.set(s.path ?? "", s.signedUrl);
    }
  }

  function buildHref(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (extraFilter !== "ALL") params.set("filter", extraFilter);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === "ALL" || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  }

  const statusTabs = [
    { key: "ALL", label: "All Customers" },
    { key: "ACTIVE", label: "Active" },
    { key: "CLOSED", label: "Closed" },
  ];

  const extraFilters = [
    { key: "ALL", label: "All" },
    { key: "OVERDUE", label: "Has Overdue" },
    { key: "OUTSTANDING", label: "Has Outstanding" },
    { key: "NO_OUTSTANDING", label: "No Outstanding" },
    { key: "NEW", label: "New Customers" },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-brand-blue">Customers</h1>
        <p className="text-sm text-slate-500">
          {totalCount} customer{totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-3" action="/admin/customers">
        <input type="hidden" name="status" value={statusFilter} />
        <input type="hidden" name="filter" value={extraFilter} />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by Customer ID, name or mobile"
          className="border rounded-lg px-3 py-2 text-sm w-full sm:w-72"
        />
        <button type="submit" className="text-sm bg-brand-blue text-white px-4 py-2 rounded-lg font-medium">
          Search
        </button>
        {(q || statusFilter !== "ALL" || extraFilter !== "ALL") && (
          <Link href="/admin/customers" className="text-sm text-slate-500 hover:underline">
            Clear filters
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        {statusTabs.map((t) => (
          <Link
            key={t.key}
            href={buildHref({ status: t.key, page: "1" })}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
              statusFilter === t.key ? "bg-brand-blue text-white border-brand-blue" : "bg-white text-slate-600"
            }`}
          >
            {t.label}
          </Link>
        ))}
        <span className="w-px bg-slate-200 mx-1" />
        {extraFilters.map((f) => (
          <Link
            key={f.key}
            href={buildHref({ filter: f.key, page: "1" })}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
              extraFilter === f.key ? "bg-brand-blue text-white border-brand-blue" : "bg-white text-slate-600"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="bg-white sm:border sm:rounded-xl overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Customer ID</th>
              <th className="px-4 py-3">Photo</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Purchases</th>
              <th className="px-4 py-3">Outstanding</th>
              <th className="px-4 py-3">Overdue</th>
              <th className="px-4 py-3">Last Payment</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageCustomers.map((c) => {
              const photoUrl = c.selfie_path ? photoByPath.get(c.selfie_path) : null;
              return (
                <tr key={c.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${c.id}`} className="text-brand-blue font-medium hover:underline">
                      {c.customer_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {photoUrl ? (
                      <Image
                        src={photoUrl}
                        alt={c.full_name ?? "Customer"}
                        width={36}
                        height={36}
                        className="rounded-full object-cover border w-9 h-9"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-100 border flex items-center justify-center text-[10px] text-slate-400">
                        N/A
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{c.full_name ?? "—"}</td>
                  <td className="px-4 py-3">{c.mobile_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        c.account_status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : c.account_status === "CLOSED"
                          ? "bg-slate-200 text-slate-600"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {c.account_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.totalPurchases}</td>
                  <td className="px-4 py-3">{inr(c.outstanding)}</td>
                  <td className="px-4 py-3">
                    {c.overdue > 0 ? (
                      <span className="text-red-600 font-medium">{inr(c.overdue)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{c.lastPayment ? new Date(c.lastPayment).toLocaleDateString("en-IN") : "—"}</td>
                  <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${c.id}`} className="text-xs text-brand-blue font-medium hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {pageCustomers.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                  No customers match this search/filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {pageSafe} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Link
              href={buildHref({ page: String(Math.max(1, pageSafe - 1)) })}
              className={`px-3 py-1.5 rounded-lg border bg-white ${pageSafe <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              Previous
            </Link>
            <Link
              href={buildHref({ page: String(Math.min(totalPages, pageSafe + 1)) })}
              className={`px-3 py-1.5 rounded-lg border bg-white ${pageSafe >= totalPages ? "pointer-events-none opacity-40" : ""}`}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
