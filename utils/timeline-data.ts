import type { TimelineItem, DayData, MonthData, DataType } from "@/types/timeline"
import { generateConditionAwareTimeline, extractConditionFromProgram } from "@/lib/condition-aware-timeline-generator"

// Expanded mock data covering multiple months
const mockTimelineData: Record<string, TimelineItem[]> = {
  // January 2024
  "2024-01-14": [
    {
      time: "06:00",
      date: "2024-01-14",
      dataType: "activity",
      type: "Exercise",
      activity: "Morning cardio",
      details: "30 minutes treadmill",
      value: "30 min",
    },
    {
      time: "08:30",
      date: "2024-01-14",
      dataType: "activity",
      type: "Food",
      activity: "Breakfast",
      details: "Oatmeal with fruits",
      value: "450 cal",
    },
    {
      time: "08:30",
      date: "2024-01-14",
      dataType: "symptom",
      symptom: "Fatigue",
      severity: "Moderate",
      notes: "Woke up feeling tired",
      frequency: "Continuous",
    },
    {
      time: "12:15",
      date: "2024-01-14",
      dataType: "symptom",
      symptom: "Fatigue",
      severity: "Severe",
      notes: "Energy levels very low",
      frequency: "Continuous",
    },
    {
      time: "16:30",
      date: "2024-01-14",
      dataType: "activity",
      type: "Exercise",
      activity: "Strength training",
      details: "Upper body workout",
      value: "45 min",
    },
    {
      time: "19:00",
      date: "2024-01-14",
      dataType: "activity",
      type: "Food",
      activity: "Dinner",
      details: "Salmon with vegetables",
      value: "520 cal",
    },
  ],
  "2024-01-13": [
    {
      time: "09:00",
      date: "2024-01-13",
      dataType: "activity",
      type: "Medication",
      activity: "Vitamin D",
      details: "1000 IU supplement",
      value: "1 tablet",
    },
    {
      time: "12:30",
      date: "2024-01-13",
      dataType: "activity",
      type: "Food",
      activity: "Lunch",
      details: "Light salad",
      value: "300 cal",
    },
    {
      time: "14:00",
      date: "2024-01-13",
      dataType: "symptom",
      symptom: "Headache",
      severity: "Mild",
      notes: "Afternoon headache",
      frequency: "Intermittent",
    },
    {
      time: "18:00",
      date: "2024-01-13",
      dataType: "activity",
      type: "Food",
      activity: "Dinner",
      details: "Pasta with vegetables",
      value: "480 cal",
    },
  ],
  "2024-01-12": [
    {
      time: "08:30",
      date: "2024-01-12",
      dataType: "symptom",
      symptom: "Fatigue",
      severity: "Moderate",
      notes: "Morning fatigue",
      frequency: "Continuous",
    },
    {
      time: "12:15",
      date: "2024-01-12",
      dataType: "symptom",
      symptom: "Fatigue",
      severity: "Severe",
      notes: "Post-lunch fatigue",
      frequency: "Continuous",
    },
    {
      time: "16:45",
      date: "2024-01-12",
      dataType: "symptom",
      symptom: "Headache",
      severity: "Mild",
      notes: "Afternoon headache",
      frequency: "Intermittent",
    },
    {
      time: "09:00",
      date: "2024-01-12",
      dataType: "activity",
      type: "Medication",
      activity: "Vitamin D",
      details: "1000 IU supplement",
      value: "1 tablet",
    },
    {
      time: "17:00",
      date: "2024-01-12",
      dataType: "activity",
      type: "Exercise",
      activity: "Light walking",
      details: "20 minutes walk",
      value: "20 min",
    },
  ],
  "2024-01-11": [
    {
      time: "08:00",
      date: "2024-01-11",
      dataType: "activity",
      type: "Food",
      activity: "Breakfast",
      details: "Cereal with milk",
      value: "320 cal",
    },
    {
      time: "10:30",
      date: "2024-01-11",
      dataType: "symptom",
      symptom: "Nausea",
      severity: "Mild",
      notes: "Slight nausea",
      frequency: "Occasional",
    },
    {
      time: "15:00",
      date: "2024-01-11",
      dataType: "activity",
      type: "Steps",
      activity: "Walking",
      details: "Daily walk",
      value: "3,000 steps",
    },
  ],
  "2024-01-10": [
    {
      time: "07:00",
      date: "2024-01-10",
      dataType: "symptom",
      symptom: "Headache",
      severity: "Mild",
      notes: "Morning headache",
      frequency: "Occasional",
    },
    {
      time: "14:30",
      date: "2024-01-10",
      dataType: "symptom",
      symptom: "Headache",
      severity: "Severe",
      notes: "Intense pain after screen time",
      frequency: "Continuous",
    },
    {
      time: "18:00",
      date: "2024-01-10",
      dataType: "symptom",
      symptom: "Headache",
      severity: "Moderate",
      notes: "Pain reduced after medication",
      frequency: "Intermittent",
    },
    {
      time: "10:00",
      date: "2024-01-10",
      dataType: "activity",
      type: "Exercise",
      activity: "Light walking",
      details: "20 minutes walk",
      value: "20 min",
    },
  ],
  "2024-01-09": [
    {
      time: "09:30",
      date: "2024-01-09",
      dataType: "activity",
      type: "Food",
      activity: "Breakfast",
      details: "Toast and coffee",
      value: "280 cal",
    },
    {
      time: "13:00",
      date: "2024-01-09",
      dataType: "symptom",
      symptom: "Fatigue",
      severity: "Moderate",
      notes: "Midday tiredness",
      frequency: "Intermittent",
    },
    {
      time: "19:30",
      date: "2024-01-09",
      dataType: "activity",
      type: "Food",
      activity: "Dinner",
      details: "Chicken and rice",
      value: "550 cal",
    },
  ],
  "2024-01-08": [
    {
      time: "17:45",
      date: "2024-01-08",
      dataType: "symptom",
      symptom: "Nausea",
      severity: "Severe",
      notes: "Post-exercise nausea",
      frequency: "Intermittent",
    },
    {
      time: "19:00",
      date: "2024-01-08",
      dataType: "symptom",
      symptom: "Nausea",
      severity: "Moderate",
      notes: "Still feeling queasy",
      frequency: "Occasional",
    },
    {
      time: "08:00",
      date: "2024-01-08",
      dataType: "activity",
      type: "Food",
      activity: "Breakfast",
      details: "Toast and coffee",
      value: "250 cal",
    },
    {
      time: "17:30",
      date: "2024-01-08",
      dataType: "activity",
      type: "Exercise",
      activity: "Gym workout",
      details: "45 minutes strength training",
      value: "45 min",
    },
  ],

  // December 2023
  "2023-12-28": [
    {
      time: "11:00",
      date: "2023-12-28",
      dataType: "symptom",
      symptom: "Headache",
      severity: "Severe",
      notes: "Holiday stress headache",
      frequency: "Continuous",
    },
    {
      time: "16:00",
      date: "2023-12-28",
      dataType: "activity",
      type: "Medication",
      activity: "Pain relief",
      details: "Ibuprofen 400mg",
      value: "1 tablet",
    },
  ],
  "2023-12-27": [
    {
      time: "10:30",
      date: "2023-12-27",
      dataType: "symptom",
      symptom: "Fatigue",
      severity: "Mild",
      notes: "Post-holiday tiredness",
      frequency: "Occasional",
    },
    {
      time: "14:00",
      date: "2023-12-27",
      dataType: "activity",
      type: "Food",
      activity: "Lunch",
      details: "Holiday leftovers",
      value: "600 cal",
    },
  ],
  "2023-12-25": [
    {
      time: "12:00",
      date: "2023-12-25",
      dataType: "activity",
      type: "Food",
      activity: "Holiday meal",
      details: "Christmas dinner",
      value: "800 cal",
    },
    {
      time: "20:00",
      date: "2023-12-25",
      dataType: "symptom",
      symptom: "Nausea",
      severity: "Mild",
      notes: "Overeating",
      frequency: "Occasional",
    },
  ],

  // November 2023
  "2023-11-20": [
    {
      time: "09:00",
      date: "2023-11-20",
      dataType: "symptom",
      symptom: "Headache",
      severity: "Moderate",
      notes: "Work stress",
      frequency: "Intermittent",
    },
    {
      time: "18:00",
      date: "2023-11-20",
      dataType: "activity",
      type: "Exercise",
      activity: "Yoga",
      details: "Stress relief session",
      value: "30 min",
    },
  ],
  "2023-11-15": [
    {
      time: "08:30",
      date: "2023-11-15",
      dataType: "symptom",
      symptom: "Fatigue",
      severity: "Severe",
      notes: "Poor sleep quality",
      frequency: "Continuous",
    },
    {
      time: "12:00",
      date: "2023-11-15",
      dataType: "activity",
      type: "Food",
      activity: "Lunch",
      details: "Soup and sandwich",
      value: "400 cal",
    },
  ],

  // October 2023
  "2023-10-25": [
    {
      time: "07:30",
      date: "2023-10-25",
      dataType: "symptom",
      symptom: "Headache",
      severity: "Mild",
      notes: "Weather change",
      frequency: "Occasional",
    },
    {
      time: "16:30",
      date: "2023-10-25",
      dataType: "activity",
      type: "Exercise",
      activity: "Running",
      details: "Evening jog",
      value: "25 min",
    },
  ],
  "2023-10-20": [
    {
      time: "11:00",
      date: "2023-10-20",
      dataType: "symptom",
      symptom: "Nausea",
      severity: "Moderate",
      notes: "Stomach upset",
      frequency: "Intermittent",
    },
    {
      time: "15:00",
      date: "2023-10-20",
      dataType: "activity",
      type: "Medication",
      activity: "Antacid",
      details: "Stomach relief",
      value: "2 tablets",
    },
  ],

  // September 2023
  "2023-09-18": [
    {
      time: "09:15",
      date: "2023-09-18",
      dataType: "symptom",
      symptom: "Fatigue",
      severity: "Moderate",
      notes: "Back to work stress",
      frequency: "Intermittent",
    },
    {
      time: "19:00",
      date: "2023-09-18",
      dataType: "activity",
      type: "Food",
      activity: "Dinner",
      details: "Healthy meal prep",
      value: "450 cal",
    },
  ],
  "2023-09-10": [
    {
      time: "14:00",
      date: "2023-09-10",
      dataType: "symptom",
      symptom: "Headache",
      severity: "Severe",
      notes: "Dehydration",
      frequency: "Continuous",
    },
    {
      time: "14:30",
      date: "2023-09-10",
      dataType: "activity",
      type: "Food",
      activity: "Hydration",
      details: "Water and electrolytes",
      value: "500ml",
    },
  ],

  // August 2023
  "2023-08-22": [
    {
      time: "10:00",
      date: "2023-08-22",
      dataType: "symptom",
      symptom: "Nausea",
      severity: "Mild",
      notes: "Heat sensitivity",
      frequency: "Occasional",
    },
    {
      time: "17:00",
      date: "2023-08-22",
      dataType: "activity",
      type: "Exercise",
      activity: "Swimming",
      details: "Cool down exercise",
      value: "40 min",
    },
  ],
  "2023-08-15": [
    {
      time: "08:00",
      date: "2023-08-15",
      dataType: "symptom",
      symptom: "Fatigue",
      severity: "Mild",
      notes: "Summer heat",
      frequency: "Occasional",
    },
    {
      time: "20:00",
      date: "2023-08-15",
      dataType: "activity",
      type: "Food",
      activity: "Light dinner",
      details: "Salad and fruit",
      value: "350 cal",
    },
  ],
}

// Get timeline data for a specific patient based on their condition
export function getPatientTimelineData(date: string, patientCondition: string, patientId: string): TimelineItem[] {
  // Always generate condition-aware data for patients
  const condition = extractConditionFromProgram(patientCondition)
  const generatedData = generateConditionAwareTimeline(condition, date, patientId)
  
  // DEBUG: Log what's happening
  console.log(`getPatientTimelineData DEBUG for ${date}:`, {
    patientCondition,
    condition,
    patientId,
    generatedCount: generatedData?.length || 0,
    mockDataCount: mockTimelineData[date]?.length || 0,
    returning: generatedData?.length > 0 ? 'generated' : 'mock'
  })
  
  // Return generated data if we have any, otherwise fall back to mock data
  if (generatedData && generatedData.length > 0) {
    return generatedData
  }
  
  // Fallback to mock data only if generation failed
  return mockTimelineData[date] || []
}

export function getTimelineData(date: string): TimelineItem[] {
  return mockTimelineData[date] || []
}

export function getDayData(date: string): DayData {
  const items = getTimelineData(date)
  const activities = items.filter((item) => item.dataType === "activity")
  const symptoms = items.filter((item) => item.dataType === "symptom")

  return {
    date,
    activities,
    symptoms,
    totalCount: items.length,
  }
}

export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0])
  }

  return dates
}

export function getMonthData(year: number, month: number, dataType: DataType): MonthData {
  const monthStr = month.toString().padStart(2, "0")
  const startDate = `${year}-${monthStr}-01`
  const endDate = new Date(year, month, 0).toISOString().split("T")[0] // Last day of month

  const dates = getDateRange(startDate, endDate)
  const days = dates
    .map((date) => getDayData(date))
    .filter((day) => {
      // Filter days that have data for the specified type
      if (dataType === "symptoms") {
        return day.symptoms.length > 0
      } else if (dataType === "activity") {
        return day.activities.length > 0
      }
      return day.totalCount > 0
    })

  // Calculate statistics based on data type
  let totalEpisodes = 0
  let mostCommon = "None"
  let peakSeverity = "Mild"

  if (dataType === "symptoms") {
    const allSymptoms = days.flatMap((day) => day.symptoms)
    totalEpisodes = allSymptoms.length

    // Find most common symptom
    const symptomCounts = allSymptoms.reduce(
      (acc, symptom) => {
        acc[symptom.symptom!] = (acc[symptom.symptom!] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    mostCommon = Object.entries(symptomCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "None"

    // Find peak severity
    const severities = allSymptoms.map((s) => s.severity!)
    peakSeverity = severities.includes("Severe") ? "Severe" : severities.includes("Moderate") ? "Moderate" : "Mild"
  } else if (dataType === "activity") {
    const allActivities = days.flatMap((day) => day.activities)
    totalEpisodes = allActivities.length

    // Find most common activity type
    const activityCounts = allActivities.reduce(
      (acc, activity) => {
        acc[activity.type!] = (acc[activity.type!] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    mostCommon = Object.entries(activityCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "None"

    // For activities, we don't have severity, so we skip that
    peakSeverity = "N/A"
  }

  // Simple trend calculation based on episode count
  let trend: "increasing" | "decreasing" | "stable" = "stable"
  if (totalEpisodes > 15) {
    trend = "increasing"
  } else if (totalEpisodes < 5) {
    trend = "decreasing"
  }

  return {
    month: monthStr,
    year,
    totalEpisodes,
    mostCommon,
    peakSeverity,
    avgPerDay: days.length > 0 ? Math.round((totalEpisodes / days.length) * 10) / 10 : 0,
    trend,
    days,
    dataType,
  }
}

export function getAvailableMonths(): Array<{ year: number; month: number; label: string }> {
  const months = []

  // Generate months that actually have data
  const dataMonths = [
    { year: 2024, month: 1 },
    { year: 2023, month: 12 },
    { year: 2023, month: 11 },
    { year: 2023, month: 10 },
    { year: 2023, month: 9 },
    { year: 2023, month: 8 },
  ]

  return dataMonths.map(({ year, month }) => ({
    year,
    month,
    label: new Date(year, month - 1).toLocaleDateString("en-US", { year: "numeric", month: "long" }),
  }))
}
