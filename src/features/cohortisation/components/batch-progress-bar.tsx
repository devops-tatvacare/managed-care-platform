"use client";

import { cn } from "@/lib/cn";
import { Icons } from "@/config/icons";

interface BatchProgressBarProps {
  processed: number;
  failed: number;
  total: number;
  active: boolean;
}

export function BatchProgressBar({ processed, failed, total, active }: BatchProgressBarProps) {
  if (!active || total === 0) return null;

  const pct = Math.round(((processed + failed) / total) * 100);

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-indigo-700">
          <Icons.spinner className="h-4 w-4 animate-spin" />
          Scoring {processed + failed} / {total} patients...
        </span>
        <span className="tabular-nums text-indigo-600">{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-indigo-100">
        <div
          className="flex h-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        >
          {processed > 0 && (
            <div
              className="bg-indigo-500"
              style={{ width: `${(processed / (processed + failed || 1)) * 100}%` }}
            />
          )}
          {failed > 0 && (
            <div
              className="bg-red-400"
              style={{ width: `${(failed / (processed + failed || 1)) * 100}%` }}
            />
          )}
        </div>
      </div>
      {failed > 0 && (
        <p className="mt-1.5 text-xs text-red-600">{failed} failed</p>
      )}
    </div>
  );
}
