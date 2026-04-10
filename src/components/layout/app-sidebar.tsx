"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { SIDEBAR_GROUPS } from "@/config/navigation";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/config/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuthStore } from "@/stores/auth-store";
import { useTheme } from "@/hooks/use-theme";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function SidebarInner({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const { theme, toggle: toggleTheme } = useTheme();

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
      {/* Brand */}
      <div
        className={cn(
          "flex items-center border-b border-sidebar-divider py-4",
          collapsed ? "justify-center px-3" : "px-4",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-2xl border border-white/10 bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.22)] ring-1 ring-brand-primary/10 backdrop-blur-sm",
            collapsed ? "h-10 w-10" : "h-11 px-3",
          )}
        >
          {collapsed ? (
            <img src="/tatvacare-logo.svg" alt="TatvaCare" className="h-5 w-5" />
          ) : (
            <img src="/tatvacare-logo.svg" alt="TatvaCare" className="h-6" />
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {/* Spotlight trigger */}
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          title={collapsed ? "Search (⌘K)" : undefined}
          className={cn(
            "flex w-full items-center gap-3 py-2 text-[13px] text-sidebar-text transition-colors hover:bg-sidebar-active-bg/50 hover:text-white border-l-[3px] border-transparent mb-1",
            collapsed ? "justify-center px-0" : "px-4",
          )}
        >
          <Icons.search className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-text-placeholder">Search...</span>
              <kbd className="rounded border border-sidebar-divider px-1.5 py-0.5 text-[10px] text-text-placeholder">⌘K</kbd>
            </>
          )}
        </button>

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
      <div className="border-t border-sidebar-divider">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={collapsed ? (theme === "dark" ? "Light mode" : "Dark mode") : undefined}
          className={cn(
            "flex w-full items-center gap-3 py-2 text-[13px] text-sidebar-text transition-colors hover:bg-sidebar-active-bg/50 hover:text-white border-l-[3px] border-transparent",
            collapsed ? "justify-center px-0" : "px-4",
          )}
        >
          {theme === "dark" ? (
            <>
              <Icons.sun className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Light Mode</span>}
            </>
          ) : (
            <>
              <Icons.moon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Dark Mode</span>}
            </>
          )}
        </button>

        {/* Collapse toggle */}
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

        {/* User with popover */}
        <div className={cn("py-3", collapsed ? "flex justify-center px-0" : "px-3")}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-sidebar-active-bg",
                  collapsed && "justify-center",
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[11px] font-semibold text-white">
                  CM
                </div>
                {!collapsed && (
                  <div className="min-w-0 text-left">
                    <p className="truncate text-[12px] text-white">Care Manager</p>
                    <p className="truncate text-[10px] text-text-placeholder">admin@tatvacare.in</p>
                  </div>
                )}
                {!collapsed && (
                  <Icons.more className="ml-auto h-4 w-4 shrink-0 text-text-placeholder" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              side={collapsed ? "right" : "top"}
              align="start"
              sideOffset={8}
              className="w-56 p-1"
            >
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-text-primary">Care Manager</p>
                <p className="text-xs text-text-muted">admin@tatvacare.in</p>
              </div>
              <Separator className="my-1" />
              <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-secondary hover:bg-bg-hover transition-colors">
                <Icons.notifications className="h-4 w-4" />
                Notifications
                <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-status-error px-1 text-[10px] font-semibold text-white">
                  7
                </span>
              </button>
              <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-secondary hover:bg-bg-hover transition-colors">
                <Icons.settings className="h-4 w-4" />
                Settings
              </button>
              <Separator className="my-1" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-status-error hover:bg-status-error-bg transition-colors"
              >
                <Icons.logout className="h-4 w-4" />
                Logout
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </aside>
  );
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex h-screen">
        <SidebarInner collapsed={collapsed} onToggle={onToggle} />
      </div>

      {/* Mobile overlay */}
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
