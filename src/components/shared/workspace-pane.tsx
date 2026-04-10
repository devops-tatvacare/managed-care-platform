"use client";

import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";

interface WorkspacePaneProps {
  icon?: React.ElementType;
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function WorkspacePane({
  icon: Icon,
  title,
  subtitle,
  badge,
  actions,
  className,
  headerClassName,
  contentClassName,
  children,
}: WorkspacePaneProps) {
  return (
    <section className={cn("flex min-h-0 flex-col bg-[color:var(--color-surface-raised)]", className)}>
      <div
        className={cn(
          "flex items-start gap-2 border-b border-[color:var(--color-surface-border)] px-[var(--space-panel-padding-compact)] py-[var(--space-panel-padding-compact)]",
          headerClassName,
        )}
      >
        {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[12px] font-semibold text-text-primary">
              {title}
            </h2>
            {badge != null && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {badge}
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-[11px] leading-4 text-text-muted">
              {subtitle}
            </p>
          )}
        </div>
        {actions}
      </div>

      <div className={cn("min-h-0 flex-1", contentClassName)}>{children}</div>
    </section>
  );
}
