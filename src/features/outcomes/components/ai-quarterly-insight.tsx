"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { BrainCircuit, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { QuarterlyInsightResponse } from "@/services/types/outcomes";

interface AIQuarterlyInsightProps {
  insight: QuarterlyInsightResponse | null;
  loading: boolean;
  onRefresh: () => void;
}

export function AIQuarterlyInsight({ insight, loading, onRefresh }: AIQuarterlyInsightProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!insight) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BrainCircuit className="h-4 w-4 text-brand-primary" />
            AI Quarterly Insight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-text-muted">
            Generate an AI-powered quarterly analysis
          </p>
          <Button variant="outline" size="sm" onClick={onRefresh} className="w-full">
            Generate Insight
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <BrainCircuit className="h-4 w-4 text-brand-primary" />
          AI Quarterly Insight
          {insight.is_fallback && (
            <Badge variant="secondary" className="text-[10px]">Fallback</Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="prose prose-sm max-w-none text-text-secondary">
            <ReactMarkdown>{insight.narrative_markdown}</ReactMarkdown>
          </div>

          {insight.key_improvements.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Key Improvements
              </h4>
              <div className="space-y-1.5">
                {insight.key_improvements.map((imp, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-success" />
                    <span>
                      <strong>{imp.metric}</strong>: {imp.change} — {imp.interpretation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insight.concerns.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Areas of Concern
              </h4>
              <div className="space-y-1.5">
                {insight.concerns.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-error" />
                    <span>
                      <strong>{c.metric}</strong>: {c.issue} — {c.recommendation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insight.strategic_recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Recommendations
              </h4>
              <ul className="ml-4 list-disc space-y-1 text-sm text-text-secondary">
                {insight.strategic_recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
