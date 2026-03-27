"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ViewMode } from "@/types/timeline"

interface TimelineViewSelectorProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  availableViews?: ViewMode[]
}

const VIEW_LABELS: Record<ViewMode, string> = {
  "daily-list": "📋 Daily List",
  "daily-timeline": "🕐 Daily Timeline",
  "monthly-summary": "📊 Monthly Summary",
  "monthly-calendar": "📅 Monthly Calendar",
}

export default function TimelineViewSelector({
  viewMode,
  onViewModeChange,
  availableViews = ["daily-list", "daily-timeline", "monthly-summary", "monthly-calendar"],
}: TimelineViewSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">View:</span>
      <Select value={viewMode} onValueChange={(value: ViewMode) => onViewModeChange(value)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableViews.map((view) => (
            <SelectItem key={view} value={view}>
              {VIEW_LABELS[view]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
