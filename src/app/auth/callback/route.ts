import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const userId = data.user.id;

  // Look for an existing customer profile tied to this auth user.
  const { data: existing } = await supabase
    .from("customers")
    .select("id, onboarding_status")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (!existing) {
    // First-ever login for this Google account: create a bare customer row.
    // customer_code is generated server-side by the DB default.
    const { error: insertError } = await supabase
      .from("customers")
      .insert({ auth_user_id: userId });

    if (insertError) {
      // Unique constraint race (double login) — fall through and re-check.
      console.error("customer insert error", insertError.message);
    }
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  if (existing.onboarding_status !== "COMPLETE") {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
