import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  let adminName: string | null = null;
  if (userData.user) {
    const { data: admin } = await supabase
      .from("admin_users")
      .select("full_name, role")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();
    if (admin) adminName = `${admin.full_name} (${admin.role})`;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <AdminSidebar adminName={adminName} />
      <main className="flex-1 bg-slate-50 min-h-screen w-full min-w-0">{children}</main>
    </div>
  );
}
