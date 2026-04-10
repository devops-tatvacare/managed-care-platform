"use client";

import { Button } from "@/components/ui/button";
import { Icons } from "@/config/icons";
import { Skeleton } from "@/components/ui/skeleton";

interface AIBannerProps {
  markdown: string | null;
  loading: boolean;
  onRefreshAction: () => void;
  onDetailsAction: () => void;
}

function extractSummary(markdown: string): string {
  const firstLine = markdown.split("\n").find((l) => l.trim().length > 0 && !l.startsWith("#"));
  if (!firstLine) return markdown.slice(0, 150);
  return firstLine.length > 150 ? firstLine.slice(0, 147) + "…" : firstLine;
}

export function AIBanner({ markdown, loading, onRefreshAction, onDetailsAction }: AIBannerProps) {
  return (
    <div className="relative flex shrink-0 items-center gap-3 overflow-hidden rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 px-4 py-2.5 shadow-sm">
      {/* Gradient bg */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-500/[0.06] via-violet-500/[0.04] to-purple-400/[0.02]" />
      <div className="pointer-events-none absolute -left-4 top-0 h-full w-24 bg-gradient-to-r from-indigo-500/[0.08] to-transparent" />

      <span className="relative shrink-0 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
        ✦ AI
      </span>

      <div className="relative min-w-0 flex-1 truncate text-[11px] text-slate-600 dark:text-slate-400">
        {loading ? (
          <Skeleton className="h-3 w-3/4 bg-indigo-100/50 dark:bg-indigo-900/50" />
        ) : markdown ? (
          <span dangerouslySetInnerHTML={{ __html: formatSummary(extractSummary(markdown)) }} />
        ) : (
          <span className="text-indigo-400">No insights available</span>
        )}
      </div>

      <div className="relative flex shrink-0 items-center gap-1.5">
        <Button
          variant="outline"
          size="xs"
          className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
          onClick={onDetailsAction}
        >
          Details ↓
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950"
          onClick={onRefreshAction}
          disabled={loading}
        >
          <Icons.recurring className="size-3" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

/** Bold numbers and highlight error phrases */
function formatSummary(text: string): string {
  return text
    .replace(/(\d+\.?\d*%?)/g, '<b class="text-indigo-900 dark:text-indigo-200">$1</b>')
    .replace(/(decline|declining|drop|dropped|alert)/gi, '<span class="text-red-600 dark:text-red-400 font-medium">$&</span>');
}
