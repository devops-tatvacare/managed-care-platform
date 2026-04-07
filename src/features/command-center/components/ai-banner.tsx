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
    <div className="flex shrink-0 items-center gap-3 rounded-xl border border-ai-border bg-gradient-to-br from-indigo-50/60 to-purple-50/40 px-4 py-2.5">
      <span className="shrink-0 rounded-md bg-brand-primary px-2 py-0.5 text-[9px] font-bold text-white">
        ✦ AI
      </span>

      <div className="min-w-0 flex-1 truncate text-[11px] text-text-secondary">
        {loading ? (
          <Skeleton className="h-3 w-3/4" />
        ) : markdown ? (
          <span dangerouslySetInnerHTML={{ __html: formatSummary(extractSummary(markdown)) }} />
        ) : (
          <span className="text-text-placeholder">No insights available</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="outline"
          size="xs"
          className="border-ai-border bg-brand-primary-light text-brand-primary"
          onClick={onDetailsAction}
        >
          Details ↓
        </Button>
        <Button
          variant="outline"
          size="xs"
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
    .replace(/(\d+\.?\d*%?)/g, '<b class="text-text-primary">$1</b>')
    .replace(/(decline|declining|drop|dropped|alert)/gi, '<span class="text-status-error">$&</span>');
}
