import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("auth_user_id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json();
  const { purchaseId, amount, method, notes } = body;

  if (!purchaseId || !amount || amount <= 0) {
    return NextResponse.json({ error: "purchaseId and a positive amount are required" }, { status: 400 });
  }

  const { data: paymentId, error } = await supabase.rpc("record_payment", {
    p_purchase_id: purchaseId,
    p_amount: amount,
    p_method: method ?? "CASH",
    p_recorded_by: admin.id,
    p_notes: notes ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    actor_user_id: userData.user.id,
    action: "PAYMENT_RECORDED",
    entity_type: "purchase",
    entity_id: purchaseId,
    metadata: { amount, method },
  });

  return NextResponse.json({ paymentId });
}
