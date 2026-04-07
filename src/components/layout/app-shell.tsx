"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SpotlightSearch } from "@/components/shared/spotlight-search";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024; // lg breakpoint
  });

  return (
    <div className="flex h-screen">
      <AppSidebar
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg-secondary p-4 lg:p-6">
        {children}
      </main>
      <SpotlightSearch />
    </div>
  );
}
