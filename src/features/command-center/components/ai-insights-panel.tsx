"use client";

import { forwardRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import type { AIInsightsResponse } from "@/services/types/command-center";

interface AIInsightsPanelProps {
  insights: AIInsightsResponse | null;
  loading: boolean;
}

export const AIInsightsPanel = forwardRef<HTMLDivElement, AIInsightsPanelProps>(
  function AIInsightsPanel({ insights, loading }, ref) {
    return (
      <div
        ref={ref}
        className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-ai-border bg-gradient-to-br from-indigo-50/50 to-purple-50/30"
      >
        {/* Header — pinned */}
        <div className="flex shrink-0 items-center gap-1.5 border-b border-ai-border px-3.5 py-2.5">
          <span className="text-[11px] font-semibold text-brand-primary">✦ Population Insights</span>
          <span className="rounded bg-ai-border px-1 py-px text-[8px] font-semibold text-brand-primary">AI</span>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          ) : insights ? (
            <div className="prose prose-sm max-w-none text-[10px] leading-relaxed text-text-secondary [&_h2]:mb-1 [&_h2]:mt-2.5 [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:text-text-primary [&_li]:my-0 [&_li]:text-[10px] [&_p]:my-1 [&_p]:text-[10px] [&_strong]:text-text-primary [&_ul]:my-1 [&_ul]:pl-3.5">
              <ReactMarkdown>{insights.markdown}</ReactMarkdown>
            </div>
          ) : (
            <p className="py-4 text-center text-[11px] text-text-muted">No insights available</p>
          )}
        </div>
      </div>
    );
  },
);
