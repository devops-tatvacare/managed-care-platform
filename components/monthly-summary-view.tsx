"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { getAvailableMonths, getMonthData } from "@/utils/timeline-data"
import type { DataType } from "@/types/timeline"

interface MonthlySummaryViewProps {
  dataType: DataType
  onMonthClick?: (year: number, month: number) => void
}

export default function MonthlySummaryView({ dataType, onMonthClick }: MonthlySummaryViewProps) {
  const availableMonths = getAvailableMonths()
  const monthlyData = availableMonths.map((month) => getMonthData(month.year, month.month, dataType))

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="w-4 h-4 text-red-600" />
      case "decreasing":
        return <TrendingDown className="w-4 h-4 text-green-600" />
      default:
        return <Minus className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Month</TableHead>
          <TableHead>Total Episodes</TableHead>
          <TableHead>Most Common</TableHead>
          <TableHead>Avg per Day</TableHead>
          {dataType === "symptoms" && <TableHead>Peak Severity</TableHead>}
          <TableHead>Trend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {monthlyData.map((month, index) => (
          <TableRow
            key={`${month.year}-${month.month}`}
            className="cursor-pointer hover:bg-gray-50"
            onDoubleClick={() => onMonthClick?.(month.year, Number.parseInt(month.month))}
          >
            <TableCell className="font-medium">
              {new Date(month.year, Number.parseInt(month.month) - 1).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              })}
            </TableCell>
            <TableCell>{month.totalEpisodes}</TableCell>
            <TableCell>{month.mostCommon}</TableCell>
            <TableCell>{month.avgPerDay}</TableCell>
            {dataType === "symptoms" && (
              <TableCell>
                {month.peakSeverity !== "N/A" ? (
                  <Badge
                    variant={
                      month.peakSeverity === "Severe"
                        ? "destructive"
                        : month.peakSeverity === "Moderate"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {month.peakSeverity}
                  </Badge>
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </TableCell>
            )}
            <TableCell>
              <div className="flex items-center gap-2">
                {getTrendIcon(month.trend)}
                <span className="capitalize text-sm">{month.trend}</span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
