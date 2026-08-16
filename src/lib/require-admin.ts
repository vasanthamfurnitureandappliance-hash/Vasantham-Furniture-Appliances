import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin(minRole?: "ADMIN" | "SUPER_ADMIN") {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("admin_users")
    .select("*")
    .eq("auth_user_id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!admin) redirect("/admin/login?error=not_admin");

  if (minRole === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") {
    redirect("/admin?error=forbidden");
  }

  return { supabase, admin };
}
