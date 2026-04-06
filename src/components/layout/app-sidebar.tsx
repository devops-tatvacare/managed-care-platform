"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { SIDEBAR_GROUPS } from "@/config/navigation";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/config/icons";
import { useAuthStore } from "@/stores/auth-store";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function SidebarInner({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col bg-sidebar-bg text-sidebar-text transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[220px]",
      )}
    >
      {/* Header — brand only */}
      <div className={cn(
        "border-b border-sidebar-divider py-4",
        collapsed ? "px-0 flex justify-center" : "px-4",
      )}>
        {collapsed ? (
          <p className="text-[15px] font-bold text-white">TC</p>
        ) : (
          <div>
            <p className="text-[15px] font-bold text-white">Tatva Care</p>
            <p className="text-[11px] text-text-placeholder">Bradesco Saude</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {SIDEBAR_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.label && (
              <>
                <Separator className="mx-3 my-3 bg-sidebar-divider" />
                {!collapsed && (
                  <p className="px-4 pb-2 text-[10px] font-medium uppercase tracking-widest text-text-placeholder">
                    {group.label}
                  </p>
                )}
              </>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.key}
                  href={item.path}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 py-2 text-[13px] transition-colors",
                    collapsed ? "justify-center px-0" : "px-4",
                    isActive
                      ? "border-l-[3px] border-sidebar-active-border bg-sidebar-active-bg font-semibold text-sidebar-active-text"
                      : "border-l-[3px] border-transparent hover:bg-sidebar-active-bg/50 hover:text-white",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — toggle, logout, user */}
      <div className="border-t border-sidebar-divider">
        {/* Collapse toggle — same alignment as nav items */}
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center gap-3 py-2 text-[13px] text-sidebar-text transition-colors hover:bg-sidebar-active-bg/50 hover:text-white border-l-[3px] border-transparent",
            collapsed ? "justify-center px-0" : "px-4",
          )}
        >
          {collapsed ? (
            <Icons.panelOpen className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <Icons.panelClose className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
          className={cn(
            "flex w-full items-center gap-3 py-2 text-[13px] text-sidebar-text transition-colors hover:bg-sidebar-active-bg/50 hover:text-status-error border-l-[3px] border-transparent",
            collapsed ? "justify-center px-0" : "px-4",
          )}
        >
          <Icons.logout className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* User */}
        <div className={cn("py-3", collapsed ? "px-0 flex justify-center" : "px-4")}>
          <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-active-bg text-[11px] font-semibold text-white">
              CM
            </div>
            {!collapsed && (
              <div>
                <p className="text-[12px] text-white">Care Manager</p>
                <p className="text-[10px] text-text-placeholder">admin@bradesco.com</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  return (
    <>
      {/* Desktop: inline sidebar */}
      <div className="hidden lg:flex h-screen">
        <SidebarInner collapsed={collapsed} onToggle={onToggle} />
      </div>

      {/* Mobile: overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-opacity duration-200",
          collapsed ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity",
            collapsed ? "opacity-0" : "opacity-100",
          )}
          onClick={onToggle}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-transform duration-200",
            collapsed ? "-translate-x-full" : "translate-x-0",
          )}
        >
          <SidebarInner collapsed={false} onToggle={onToggle} />
        </div>
      </div>
    </>
  );
}
