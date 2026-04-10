"use client";

import { useState, useRef, useCallback } from "react";
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

    const chunks: string[] = [];

    cancelRef.current = streamAISummary(
      patientId,
      (chunk) => {
        chunks.push(chunk);
      },
      () => {
        setStreaming(false);
        setGenerated(true);
        const fullText = chunks.join("");
        try {
          const parsed = JSON.parse(fullText);
          setText(parsed.summary ?? fullText);
          setActions(parsed.actions ?? []);
        } catch {
          setText(fullText);
        }
      },
      (err) => {
        setStreaming(false);
        setError(err);
      },
    );
  }, [patientId]);

  return (
    <div className="rounded-lg border border-ai-border bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/60 dark:to-purple-950/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-primary">AI Clinical Summary</span>
        {!streaming ? (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleGenerate}
            title={generated ? "Regenerate" : "Generate AI summary"}
          >
            {generated ? (
              <Icons.recurring className="h-3.5 w-3.5 text-brand-primary" />
            ) : (
              <Icons.ai className="h-3.5 w-3.5 text-brand-primary" />
            )}
          </Button>
        ) : (
          <Icons.spinner className="h-3.5 w-3.5 animate-spin text-text-muted" />
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-status-error">{error}</p>
      )}

      {streaming && (
        <p className="mt-2 text-[13px] text-text-muted animate-pulse">Analyzing patient data...</p>
      )}

      {!streaming && text && (
        <div className="mt-2">
          <p className="text-[13px] leading-snug text-text-secondary whitespace-pre-wrap">
            {text}
          </p>

          {actions.length > 0 && (
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              {actions.map((action, i) => {
                const config = URGENCY_CONFIG[action.urgency] ?? URGENCY_CONFIG.next_visit;
                return (
                  <Button
                    key={i}
                    size="xs"
                    variant="outline"
                    className={cn(
                      "text-text-secondary",
                      action.urgency === "urgent" && "border-red-400 text-red-600 dark:text-red-400",
                      action.urgency === "this_week" && "border-brand-primary text-brand-primary",
                    )}
                  >
                    <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", config.dot)} />
                    {action.text}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!text && !error && !streaming && (
        <p className="mt-1.5 text-[11px] text-text-placeholder">
          Click the sparkle to generate a clinical summary
        </p>
      )}
    </div>
  );
}
