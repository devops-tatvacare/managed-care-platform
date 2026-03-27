export type ViewMode = "daily-list" | "daily-timeline" | "monthly-summary" | "monthly-calendar"
export type DataType = "symptoms" | "activity"

export interface TimelineItem {
  time: string
  date: string
  dataType: "activity" | "symptom"
  // Activity fields
  type?: string
  activity?: string
  details?: string
  value?: string
  // Symptom fields
  symptom?: string
  severity?: string
  notes?: string
  frequency?: string
}

export interface DayData {
  date: string
  activities: TimelineItem[]
  symptoms: TimelineItem[]
  totalCount: number
}

export interface MonthData {
  month: string
  year: number
  totalEpisodes: number
  mostCommon: string
  peakSeverity: string
  avgPerDay: number
  trend: "increasing" | "decreasing" | "stable"
  days: DayData[]
  dataType: DataType
}

export interface ViewConfig {
  mode: ViewMode
  dataType: DataType
  dateRange?: {
    start: string
    end: string
  }
}
