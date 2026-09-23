"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Layers, Users, ListTree, LogOut, Bell, Settings, PieChart } from "lucide-react";
import { C, FONT_HEAD } from "@/app/lib/constants";
import { SUBMODULE_ROUTES } from "@/app/lib/subModuleRoutes";
import { VENDOR_PAYMENT_SUBMODULE_SLUG } from "@/app/lib/vendorPaymentMeta";

interface SubModule { id: number; name: string; slug: string }
interface ModuleWithSub { id: number; name: string; subModules: SubModule[] }
interface Me { displayName: string; username: string; isAdmin: boolean; isViewer: boolean }

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);
  const [modules, setModules] = useState<ModuleWithSub[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        setModules(d.modules ?? []);
      })
      .catch(() => {});
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div style={{ width: 240, background: C.sidebar, flexShrink: 0, display: "flex", flexDirection: "column", padding: "18px 10px", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "4px 10px 18px", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: C.teal, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 8px ${C.teal}66` }}>
            <span style={{ fontFamily: FONT_HEAD, color: "#fff", fontSize: 15 }}>N</span>
          </div>
          <div>
            <div style={{ fontFamily: FONT_HEAD, color: "#fff", fontSize: 17, letterSpacing: "0.03em", textTransform: "uppercase" }}>NCS MIS</div>
            <div style={{ color: "#8FA69F", fontSize: 11 }}>
              {user?.isAdmin ? "Admin · all modules" : user?.isViewer ? "View access · all modules" : "Your modules"}
            </div>
          </div>
        </div>

        <NavLink href="/" label="Dashboard" icon={LayoutDashboard} pathname={pathname} exact />
        <NavLink href="/reminders" label="Reminders" icon={Bell} pathname={pathname} />

        {modules.map((m) => (
          <div key={m.id} style={{ marginTop: 14 }}>
            <div style={{ padding: "0 10px 4px", color: C.sidebarLabel, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {m.name}
            </div>
            {m.subModules.length === 0 && (
              <div style={{ padding: "6px 10px", color: "#5E706A", fontSize: 12 }}>No sub-modules yet</div>
            )}
            {m.subModules.map((sm) => {
              const href = SUBMODULE_ROUTES[sm.slug] ?? "#";
              return <NavLink key={sm.id} href={href} label={sm.name} icon={Layers} pathname={pathname} />;
            })}
            {/* Vendor Payment Report is a report, not a sub-module, but
                belongs right next to Vendor Payment for whoever has that
                module — shared by Sandip and Admin, not admin-only. */}
            {m.subModules.some((sm) => sm.slug === VENDOR_PAYMENT_SUBMODULE_SLUG) && (
              <NavLink href="/vendor-payment-report" label="Vendor Payment Report" icon={PieChart} pathname={pathname} />
            )}
          </div>
        ))}

        {user?.isAdmin && (
          <div style={{ marginTop: 14 }}>
            <div style={{ padding: "0 10px 4px", color: C.sidebarLabel, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Administration
            </div>
            <NavLink href="/admin/users" label="Users & Access" icon={Users} pathname={pathname} />
            <NavLink href="/admin/modules" label="Modules" icon={ListTree} pathname={pathname} />
          </div>
        )}

        <div style={{ marginTop: "auto" }}>
          <NavLink href="/settings" label="Settings" icon={Settings} pathname={pathname} />
          <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", background: "none", border: "none", color: "#A9B7B2", fontSize: 13.5, cursor: "pointer", textAlign: "left" }}>
            <LogOut size={16} /><span style={{ flex: 1 }}>Log out</span>
          </button>
          <div style={{ padding: "10px", color: "#5E706A", fontSize: 10.5, lineHeight: 1.5 }}>
            {user ? `Signed in as ${user.displayName}` : ""}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: "22px 26px", overflowX: "auto", background: C.bg }}>{children}</div>
    </div>
  );
}

function NavLink({ href, label, icon: Icon, pathname, exact }: { href: string; label: string; icon: typeof LayoutDashboard; pathname: string; exact?: boolean }) {
  // Match on a whole path segment, not a raw prefix — otherwise "/vegetable"
  // also lights up on "/vegetable-analysis", "/vendor-payment" on
  // "/vendor-payment-report", etc.
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px",
        background: active ? C.sidebarActive : "transparent", borderRadius: 7,
        color: active ? "#fff" : "#A9B7B2", cursor: "pointer", fontSize: 13.5, fontWeight: active ? 600 : 500,
        marginBottom: 2, borderLeft: active ? `3px solid ${C.teal}` : "3px solid transparent",
        textAlign: "left", textDecoration: "none",
      }}
    >
      <Icon size={16} /><span style={{ flex: 1 }}>{label}</span>
    </Link>
  );
}
