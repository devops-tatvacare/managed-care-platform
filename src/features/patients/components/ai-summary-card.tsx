"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { streamAISummary } from "@/services/api/patients";
import type { AISummaryAction } from "@/services/types/patient";

interface AISummaryCardProps {
  patientId: string;
}

const URGENCY_CONFIG: Record<string, { dot: string; label: string }> = {
  urgent: { dot: "bg-red-500", label: "Urgent" },
  this_week: { dot: "bg-amber-500", label: "This week" },
  next_visit: { dot: "bg-blue-500", label: "Next visit" },
};

export function AISummaryCard({ patientId }: AISummaryCardProps) {
  const [streaming, setStreaming] = useState(false);
  const [text, setText] = useState("");
  const [actions, setActions] = useState<AISummaryAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const handleGenerate = useCallback(() => {
    setText("");
    setActions([]);
    setError(null);
    setStreaming(true);
    setGenerated(false);

    let fullText = "";

    cancelRef.current = streamAISummary(
      patientId,
      (chunk) => {
        fullText += chunk;
        setText(fullText);
      },
      () => {
        setStreaming(false);
        setGenerated(true);
        try {
          const parsed = JSON.parse(fullText);
          if (parsed.summary) setText(parsed.summary);
          if (parsed.actions) setActions(parsed.actions);
        } catch {
          // Text was streamed as plain text — keep as-is
        }
      },
      (err) => {
        setStreaming(false);
        setError(err);
      },
    );
  }, [patientId]);

  return (
    <Card className="mt-3 border-border-default">
      <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-sm">&#10024;</span>
          AI Clinical Summary
        </CardTitle>
        {!streaming && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleGenerate}
          >
            {generated ? (
              <>
                <Icons.recurring className="mr-1.5 h-3 w-3" />
                Regenerate
              </>
            ) : (
              "Generate"
            )}
          </Button>
        )}
        {streaming && (
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <Icons.spinner className="h-3 w-3 animate-spin" />
            Generating...
          </span>
        )}
      </CardHeader>

      {(text || error) && (
        <CardContent className="px-4 pb-3 pt-0">
          {error ? (
            <p className="text-xs text-status-error">{error}</p>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-text-secondary whitespace-pre-wrap">
                {text}
                {streaming && <span className="animate-pulse">|</span>}
              </p>

              {actions.length > 0 && (
                <div className="mt-3 border-t border-border-default pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-placeholder mb-2">
                    Recommended Actions
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {actions.map((action, i) => {
                      const config = URGENCY_CONFIG[action.urgency] ?? URGENCY_CONFIG.next_visit;
                      return (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", config.dot)} />
                          <span className="flex-1 text-text-secondary">{action.text}</span>
                          <span className="shrink-0 rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-muted">
                            {config.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
