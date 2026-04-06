"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { SIDEBAR_GROUPS } from "@/config/navigation";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/config/icons";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col bg-sidebar-bg text-sidebar-text transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[220px]",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-divider px-3 py-4">
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-white">Tatva Care</p>
            <p className="text-[11px] text-text-placeholder">Bradesco Saude</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onToggle}
          className="shrink-0 text-sidebar-text hover:bg-sidebar-active-bg hover:text-white"
        >
          {collapsed ? (
            <Icons.panelOpen className="h-4 w-4" />
          ) : (
            <Icons.panelClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
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

      {/* Footer */}
      <div className="border-t border-sidebar-divider px-3 py-3">
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
    </aside>
  );

  return (
    <>
      {/* Desktop: inline sidebar */}
      <div className="hidden lg:flex h-screen">
        {sidebarContent}
      </div>

      {/* Mobile: overlay sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-opacity duration-200",
          collapsed ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity",
            collapsed ? "opacity-0" : "opacity-100",
          )}
          onClick={onToggle}
        />
        {/* Drawer */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-transform duration-200",
            collapsed ? "-translate-x-full" : "translate-x-0",
          )}
        >
          <aside className="flex h-full w-[220px] shrink-0 flex-col bg-sidebar-bg text-sidebar-text">
            {/* Reuse same content but always expanded on mobile */}
            <div className="flex items-center justify-between border-b border-sidebar-divider px-3 py-4">
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-white">Tatva Care</p>
                <p className="text-[11px] text-text-placeholder">Bradesco Saude</p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onToggle}
                className="shrink-0 text-sidebar-text hover:bg-sidebar-active-bg hover:text-white"
              >
                <Icons.close className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
              {SIDEBAR_GROUPS.map((group, groupIndex) => (
                <div key={groupIndex}>
                  {group.label && (
                    <>
                      <Separator className="mx-3 my-3 bg-sidebar-divider" />
                      <p className="px-4 pb-2 text-[10px] font-medium uppercase tracking-widest text-text-placeholder">
                        {group.label}
                      </p>
                    </>
                  )}
                  {group.items.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                      <Link
                        key={item.key}
                        href={item.path}
                        onClick={onToggle}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2 text-[13px] transition-colors",
                          isActive
                            ? "border-l-[3px] border-sidebar-active-border bg-sidebar-active-bg font-semibold text-sidebar-active-text"
                            : "border-l-[3px] border-transparent hover:bg-sidebar-active-bg/50 hover:text-white",
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="border-t border-sidebar-divider px-3 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-active-bg text-[11px] font-semibold text-white">
                  CM
                </div>
                <div>
                  <p className="text-[12px] text-white">Care Manager</p>
                  <p className="text-[10px] text-text-placeholder">admin@bradesco.com</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
