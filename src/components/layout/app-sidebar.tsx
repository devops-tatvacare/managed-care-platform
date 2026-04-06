"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { SIDEBAR_GROUPS } from "@/config/navigation";
import { Separator } from "@/components/ui/separator";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col bg-sidebar-bg text-sidebar-text">
      <div className="border-b border-sidebar-divider px-4 py-4">
        <p className="text-[15px] font-bold text-white">Tatva Care</p>
        <p className="text-[11px] text-text-placeholder">Bradesco Saude</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {SIDEBAR_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.label && (
              <>
                <Separator className="mx-4 my-3 bg-sidebar-divider" />
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
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 text-[13px] transition-colors",
                    isActive
                      ? "border-l-[3px] border-sidebar-active-border bg-sidebar-active-bg font-semibold text-sidebar-active-text"
                      : "border-l-[3px] border-transparent hover:bg-sidebar-active-bg/50 hover:text-white"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-divider px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-active-bg text-[11px] font-semibold text-white">
            CM
          </div>
          <div>
            <p className="text-[12px] text-white">Care Manager</p>
            <p className="text-[10px] text-text-placeholder">admin@bradesco.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
