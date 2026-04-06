"use client";

import { Button } from "@/components/ui/button";
import { Icons } from "@/config/icons";

interface AppTopbarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function AppTopbar({ onToggleSidebar, sidebarOpen }: AppTopbarProps) {
  return (
    <header className="flex h-[52px] items-center justify-between border-b border-border-default bg-bg-primary px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={onToggleSidebar} className="lg:hidden">
          <Icons.menu className="h-4 w-4 text-text-muted" />
        </Button>
        <div className="flex w-[320px] items-center gap-2 rounded-lg bg-bg-secondary px-3 py-2 text-[13px] text-text-placeholder">
          <Icons.search className="h-4 w-4" />
          <span>Search patients, pathways, actions...</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Icons.notifications className="h-4 w-4 text-text-muted" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-status-error text-[9px] font-semibold text-white">
            7
          </span>
        </Button>
        <Button variant="ghost" size="icon">
          <Icons.settings className="h-4 w-4 text-text-muted" />
        </Button>
      </div>
    </header>
  );
}
