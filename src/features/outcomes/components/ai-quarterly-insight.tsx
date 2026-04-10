"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { QuarterlyInsightResponse } from "@/services/types/outcomes";

interface AIQuarterlyInsightProps {
  insight: QuarterlyInsightResponse | null;
  loading: boolean;
  onRefreshAction: () => void;
}

export function AIQuarterlyInsight({ insight, loading, onRefreshAction }: AIQuarterlyInsightProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-ai-border bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/60 dark:to-purple-950/40 px-4 py-3">
        <Skeleton className="h-4 w-40 mb-3" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="rounded-lg border border-ai-border bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/60 dark:to-purple-950/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary">AI Quarterly Insight</span>
          <Button variant="ghost" size="icon-xs" onClick={onRefreshAction} title="Generate quarterly insight">
            <Icons.ai className="h-3.5 w-3.5 text-brand-primary" />
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-text-placeholder">
          Click the sparkle to generate an AI-powered analysis of population outcomes, cohort migrations, and strategic recommendations for the selected program.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-ai-border bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/60 dark:to-purple-950/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold text-text-primary">
          AI Quarterly Insight
          {insight.is_fallback && (
            <Badge variant="secondary" className="text-[10px]">Fallback</Badge>
          )}
        </span>
        <Button variant="ghost" size="icon-xs" onClick={onRefreshAction} title="Regenerate insight">
          <RefreshCw className="h-3.5 w-3.5 text-brand-primary" />
        </Button>
      </div>

      <ScrollArea className="mt-2 max-h-[300px]">
        <div className="prose prose-sm max-w-none text-[13px] leading-snug text-text-secondary">
          <ReactMarkdown>{insight.narrative_markdown}</ReactMarkdown>
        </div>

        {insight.key_improvements.length > 0 && (
          <div className="mt-3 border-t border-border-default pt-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-placeholder">
              Key Improvements
            </h4>
            <div className="space-y-1.5">
              {insight.key_improvements.map((imp, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-success" />
                  <span className="text-text-secondary">
                    <strong>{imp.metric}</strong>: {imp.change} — {imp.interpretation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {insight.concerns.length > 0 && (
          <div className="mt-3 border-t border-border-default pt-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-placeholder">
              Areas of Concern
            </h4>
            <div className="space-y-1.5">
              {insight.concerns.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-error" />
                  <span className="text-text-secondary">
                    <strong>{c.metric}</strong>: {c.issue} — {c.recommendation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {insight.strategic_recommendations.length > 0 && (
          <div className="mt-3 border-t border-border-default pt-3">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-placeholder">
              Recommendations
            </h4>
            <ul className="ml-4 list-disc space-y-1 text-xs text-text-secondary">
              {insight.strategic_recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
