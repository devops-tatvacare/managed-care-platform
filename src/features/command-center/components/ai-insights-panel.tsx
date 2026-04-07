"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import ReactMarkdown from "react-markdown";
import type { AIInsightsResponse } from "@/services/types/command-center";

interface AIInsightsPanelProps {
  insights: AIInsightsResponse | null;
  loading: boolean;
}

export function AIInsightsPanel({ insights, loading }: AIInsightsPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Icons.ai className="h-4 w-4" />
            AI Population Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icons.ai className="h-4 w-4" />
          AI Population Insights
          {insights?.is_cached && (
            <Badge variant="outline" className="ml-auto text-[10px]">Cached</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights ? (
          <div className="prose prose-sm max-w-none text-text-secondary [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-text-primary [&_li]:text-sm [&_p]:text-sm [&_strong]:text-text-primary">
            <ReactMarkdown>{insights.markdown}</ReactMarkdown>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-text-muted">No insights available</p>
        )}
      </CardContent>
    </Card>
  );
}
