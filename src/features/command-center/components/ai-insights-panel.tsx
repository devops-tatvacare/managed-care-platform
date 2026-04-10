"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import ReactMarkdown from "react-markdown";
import type { AIInsightsResponse } from "@/services/types/command-center";

interface AIInsightsPanelProps {
  insights: AIInsightsResponse | null;
  loading: boolean;
}

export function AIInsightsPanel({ insights, loading }: AIInsightsPanelProps) {
  return (
    <div className="relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 shadow-sm">
      {/* Layered gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/[0.04] via-violet-500/[0.03] to-purple-400/[0.02]" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-400/[0.06] dark:bg-indigo-400/[0.12] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-purple-400/[0.05] blur-2xl" />

      {/* Header */}
      <div className="relative flex shrink-0 items-center gap-2 border-b border-indigo-200/40 dark:border-indigo-800/40 bg-gradient-to-r from-indigo-500/[0.07] dark:from-indigo-400/[0.12] to-transparent px-3.5 py-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
          <Icons.ai className="h-3 w-3 text-white" />
        </span>
        <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">Population Insights</span>
        <span className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-1.5 py-px text-[8px] font-bold text-white shadow-sm">
          AI
        </span>
        {insights?.generated_at && (
          <span className="ml-auto text-[9px] text-indigo-400/70">
            {new Date(insights.generated_at).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-y-auto px-3.5 py-3">
        {insights?.markdown ? (
          <div className="prose prose-sm max-w-none text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 [&_h2]:mb-1.5 [&_h2]:mt-3 [&_h2]:text-[12px] [&_h2]:font-bold [&_h2]:text-indigo-900 [&_h2]:dark:text-indigo-200 [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-[11px] [&_h3]:font-semibold [&_h3]:text-indigo-800 [&_h3]:dark:text-indigo-300 [&_li]:my-0.5 [&_li]:text-[11px] [&_li]:marker:text-indigo-400 [&_p]:my-1.5 [&_p]:text-[11px] [&_strong]:font-bold [&_strong]:text-indigo-900 [&_strong]:dark:text-indigo-200 [&_ul]:my-1 [&_ul]:pl-4">
            <ReactMarkdown>{insights.markdown}</ReactMarkdown>
            {loading && (
              <span className="inline-block h-3 w-1.5 animate-pulse rounded-sm bg-indigo-400/60" />
            )}
          </div>
        ) : loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full rounded-full bg-indigo-100/50 dark:bg-indigo-900/50" />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center py-6">
            <div className="space-y-2 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                <Icons.ai className="h-5 w-5 text-indigo-400" />
              </span>
              <p className="text-[11px] text-indigo-400">No insights available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
