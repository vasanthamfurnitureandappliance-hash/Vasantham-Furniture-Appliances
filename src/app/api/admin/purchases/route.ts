import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function addInterval(date: Date, frequency: "WEEKLY" | "MONTHLY", n: number) {
  const d = new Date(date);
  if (frequency === "WEEKLY") d.setDate(d.getDate() + 7 * n);
  else d.setMonth(d.getMonth() + n);
  return d;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json();
  const {
    customerId, productName, category, description, quantity,
    productPrice, downPayment, installmentCount, frequency,
    purchaseDate, firstDueDate,
  } = body;

  if (!customerId || !productName || !category || !productPrice || !installmentCount || !firstDueDate) {
    return NextResponse.json({ error: "Missing required purchase fields" }, { status: 400 });
  }

  const qty = Number(quantity) || 1;
  const price = Number(productPrice);
  const down = Number(downPayment) || 0;
  const totalPayable = price * qty - down;
  const installmentAmount = Math.round((totalPayable / Number(installmentCount)) * 100) / 100;

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      customer_id: customerId,
      product_name: productName,
      category,
      description: description ?? null,
      quantity: qty,
      product_price: price,
      down_payment: down,
      total_payable: totalPayable,
      installment_amount: installmentAmount,
      installment_count: Number(installmentCount),
      frequency: frequency ?? "MONTHLY",
      purchase_date: purchaseDate ?? new Date().toISOString().slice(0, 10),
      first_due_date: firstDueDate,
      created_by: admin.id,
    })
    .select()
    .single();

  if (purchaseError) return NextResponse.json({ error: purchaseError.message }, { status: 500 });

  const rows = [];
  let due = new Date(firstDueDate);
  let remaining = totalPayable;
  for (let i = 1; i <= Number(installmentCount); i++) {
    const amt = i === Number(installmentCount)
      ? Math.round(remaining * 100) / 100
      : installmentAmount;
    remaining = Math.round((remaining - amt) * 100) / 100;
    rows.push({
      purchase_id: purchase.id,
      installment_no: i,
      due_date: due.toISOString().slice(0, 10),
      amount_due: amt,
    });
    due = addInterval(due, frequency ?? "MONTHLY", 1);
  }

  const { error: instError } = await supabase.from("installments").insert(rows);
  if (instError) return NextResponse.json({ error: instError.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    actor_user_id: userData.user.id,
    action: "PURCHASE_CREATED",
    entity_type: "purchase",
    entity_id: purchase.id,
    metadata: { productName, totalPayable },
  });

  return NextResponse.json({ purchase });
}
