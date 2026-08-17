import Link from "next/link";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import { createClient } from "@/lib/supabase/server";

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
    <div className="min-h-screen flex">
      <aside className="w-60 bg-brand-blue text-white flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2 border-b border-white/20">
          <Logo size={36} withLink={false} />
          <span className="font-semibold text-sm">Vasantham Admin</span>
        </div>
        <nav className="flex-1 p-3 space-y-1 text-sm">
          <NavLink href="/admin">Dashboard</NavLink>
          <NavLink href="/admin/customers">Customers</NavLink>
          <NavLink href="/admin/purchases/new">New Purchase</NavLink>
          <p className="uppercase text-[10px] tracking-wide text-blue-200 mt-4 mb-1 px-3">Settings</p>
          <NavLink href="/admin/settings/terms">Terms & Conditions</NavLink>
          <NavLink href="/admin/settings/privacy">Privacy Policy</NavLink>
        </nav>
        {adminName && (
          <div className="p-3 border-t border-white/20 text-xs">
            <p className="mb-2 text-blue-100">{adminName}</p>
            <LogoutButton />
          </div>
        )}
      </aside>
      <main className="flex-1 bg-slate-50 min-h-screen">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block px-3 py-2 rounded-lg hover:bg-white/10">
      {children}
    </Link>
  );
}
