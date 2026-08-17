import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = ["ACTIVE", "CLOSED"] as const;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("auth_user_id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();

  // VIEWER role is read-only; only ADMIN / SUPER_ADMIN may close/reopen accounts.
  if (!admin || admin.role === "VIEWER") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const status = body.status;
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "status must be ACTIVE or CLOSED" }, { status: 400 });
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id, account_status")
    .eq("id", params.id)
    .maybeSingle();
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  if (customer.account_status === status) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  // Account status only — never deletes the customer, purchases, installments,
  // payments, receipts, audit logs or consent records.
  const { error } = await supabase
    .from("customers")
    .update({ account_status: status, updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    actor_user_id: userData.user.id,
    action: status === "CLOSED" ? "CUSTOMER_CLOSED" : "CUSTOMER_REOPENED",
    entity_type: "customer",
    entity_id: params.id,
    metadata: { previous_status: customer.account_status, new_status: status },
  });

  return NextResponse.json({ ok: true });
}
