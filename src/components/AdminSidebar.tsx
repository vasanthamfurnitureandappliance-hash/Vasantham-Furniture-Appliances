"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/purchases/new", label: "New Purchase" },
];

const SETTINGS_LINKS = [
  { href: "/admin/settings/terms", label: "Terms & Conditions" },
  { href: "/admin/settings/privacy", label: "Privacy Policy" },
];

export default function AdminSidebar({ adminName }: { adminName: string | null }) {
  const [open, setOpen] = useState(false);
  const rawPathname = usePathname();
  // Normalize away any trailing slash so "/admin/" and "/admin" match the same way.
  const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/$/, "") : rawPathname;

  // "/admin" (Dashboard) should only be active on the exact dashboard page,
  // not on every nested /admin/* route. Every other link is active on its
  // own page and any of its sub-routes (e.g. /admin/customers/xyz keeps
  // "Customers" highlighted).
  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const navContent = (
    <>
      <nav className="flex-1 p-3 space-y-1 text-sm">
        {LINKS.map((l) => (
          <NavLink key={l.href} href={l.href} active={isActive(l.href)} onClick={() => setOpen(false)}>
            {l.label}
          </NavLink>
        ))}
        <p className="uppercase text-[10px] tracking-wide text-blue-200 mt-4 mb-1 px-3">Settings</p>
        {SETTINGS_LINKS.map((l) => (
          <NavLink key={l.href} href={l.href} active={isActive(l.href)} onClick={() => setOpen(false)}>
            {l.label}
          </NavLink>
        ))}
      </nav>
      {adminName && (
        <div className="p-3 border-t border-white/20 text-xs">
          <p className="mb-2 text-blue-100">{adminName}</p>
          <LogoutButton />
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 h-14 bg-brand-blue text-white flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Logo size={32} withLink={false} />
          <span className="font-semibold text-sm">Vasantham Admin</span>
        </div>
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="p-2 -mr-2"
        >
          <span className="block w-6 h-0.5 bg-white mb-1.5" />
          <span className="block w-6 h-0.5 bg-white mb-1.5" />
          <span className="block w-6 h-0.5 bg-white" />
        </button>
      </div>

      {/* Mobile dropdown menu — starts below the sticky top bar so the
          first nav item (Dashboard) isn't hidden underneath it */}
      {open && (
        <div className="md:hidden fixed inset-x-0 top-14 bottom-0 z-20 flex">
          <div className="bg-brand-blue text-white w-64 max-w-[80vw] flex flex-col h-full overflow-y-auto">
            {navContent}
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-brand-blue text-white flex-col shrink-0">
        <div className="p-4 flex items-center gap-2 border-b border-white/20">
          <Logo size={36} withLink={false} />
          <span className="font-semibold text-sm">Vasantham Admin</span>
        </div>
        {navContent}
      </aside>
    </>
  );
}

function NavLink({
  href, children, active, onClick,
}: { href: string; children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block px-3 py-2 rounded-lg hover:bg-white/10 ${active ? "bg-white/15 font-medium" : ""}`}
    >
      {children}
    </Link>
  );
}
