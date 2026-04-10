"use client";

import type { ReactNode } from "react";

interface ConfigSectionHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function ConfigSectionHeader({
  title,
  description,
  actions,
}: ConfigSectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {description && <p className="text-xs text-text-muted">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
