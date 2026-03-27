import type { TimelineItem } from "@/types/timeline"

// Comprehensive condition-to-symptoms mapping
export const CONDITION_SYMPTOM_MAP = {
  "Diabetes Management": {
    primary: ["Excessive Thirst", "Frequent Urination", "Fatigue", "Blurred Vision"],
    secondary: ["Dizziness", "Nausea", "Headache"],
    complications: ["Numbness", "Slow Healing", "Frequent Infections"],
    activities: ["Blood glucose monitoring", "Insulin administration", "Carb counting", "Diabetic meal"],
    medications: ["Insulin", "Metformin", "Glucose tablets"]
  },
  "Hypertension Control": {
    primary: ["Headache", "Dizziness", "Chest Pain"],
    secondary: ["Fatigue", "Shortness of Breath", "Nausea"],
    complications: ["Heart Palpitations", "Vision Changes", "Nosebleeds"],
    activities: ["Blood pressure monitoring", "Low sodium meal", "Cardio exercise", "Meditation"],
    medications: ["Lisinopril", "Amlodipine", "Diuretic"]
  },
  "Cancer Care": {
    primary: ["Fatigue", "Nausea", "Loss of Appetite"],
    secondary: ["Pain", "Dizziness", "Weakness"],
    complications: ["Fever", "Vomiting", "Hair Loss"],
    activities: ["Chemotherapy session", "Radiation therapy", "Nutritional support", "Rest"],
    medications: ["Anti-nausea", "Pain medication", "Supplements"]
  },
  "Mental Health": {
    primary: ["Anxiety", "Depression", "Insomnia"],
    secondary: ["Fatigue", "Loss of Appetite", "Headache"],
    complications: ["Panic Attacks", "Social Withdrawal", "Concentration Issues"],
    activities: ["Therapy session", "Meditation", "Exercise", "Mood tracking"],
    medications: ["Antidepressant", "Anxiety medication", "Sleep aid"]
  },
  "Maternal Health": {
    primary: ["Morning Sickness", "Fatigue", "Back Pain"],
    secondary: ["Dizziness", "Headache", "Heartburn"],
    complications: ["Swelling", "High Blood Pressure", "Gestational Diabetes"],
    activities: ["Prenatal checkup", "Prenatal vitamins", "Light exercise", "Rest"],
    medications: ["Prenatal vitamins", "Iron supplements", "Calcium"]
  },
  "Chronic Disease Management": {
    primary: ["Fatigue", "Pain", "Shortness of Breath"],
    secondary: ["Dizziness", "Nausea", "Sleep Issues"],
    complications: ["Mobility Issues", "Cognitive Changes", "Depression"],
    activities: ["Physical therapy", "Medication monitoring", "Symptom tracking", "Lifestyle modification"],
    medications: ["Disease-specific medications", "Pain management", "Supplements"]
  }
}

// Time-based symptom severity patterns
export const SYMPTOM_PATTERNS = {
  "Diabetes Management": {
    "Excessive Thirst": { peak: [14, 15, 16], low: [2, 3, 4] },
    "Frequent Urination": { peak: [10, 11, 14, 15, 22, 23], low: [3, 4, 5] },
    "Fatigue": { peak: [13, 14, 15], low: [8, 9, 10] },
    "Blurred Vision": { peak: [16, 17, 18], low: [6, 7, 8] }
  },
  "Hypertension Control": {
    "Headache": { peak: [7, 8, 18, 19], low: [12, 13, 14] },
    "Dizziness": { peak: [6, 7, 17, 18], low: [10, 11, 15] },
    "Chest Pain": { peak: [19, 20, 21], low: [9, 10, 11] }
  },
  "Cancer Care": {
    "Fatigue": { peak: [13, 14, 15, 16], low: [8, 9, 10] },
    "Nausea": { peak: [8, 9, 18, 19], low: [14, 15, 16] },
    "Loss of Appetite": { peak: [7, 8, 12, 13], low: [10, 11, 16, 17] }
  },
  "Mental Health": {
    "Anxiety": { peak: [7, 8, 19, 20], low: [13, 14, 15] },
    "Depression": { peak: [6, 7, 18, 19, 20], low: [11, 12, 13] },
    "Insomnia": { peak: [22, 23, 1, 2], low: [10, 11, 12] }
  },
  "Chronic Disease Management": {
    "Fatigue": { peak: [13, 14, 15, 16], low: [8, 9, 10] },
    "Pain": { peak: [7, 8, 19, 20], low: [12, 13, 14] },
    "Shortness of Breath": { peak: [16, 17, 18], low: [10, 11, 12] },
    "Dizziness": { peak: [6, 7, 17, 18], low: [10, 11, 15] },
    "Nausea": { peak: [8, 9, 18, 19], low: [14, 15, 16] }
  }
}

// Activity scheduling based on condition
export const ACTIVITY_SCHEDULES = {
  "Diabetes Management": {
    "Blood glucose monitoring": [7, 12, 18, 21],
    "Insulin administration": [7, 12, 18],
    "Diabetic meal": [8, 13, 19],
    "Exercise": [9, 16]
  },
  "Hypertension Control": {
    "Blood pressure monitoring": [7, 19],
    "Low sodium meal": [8, 13, 19],
    "Cardio exercise": [9, 17],
    "Meditation": [6, 20]
  },
  "Cancer Care": {
    "Chemotherapy session": [10],
    "Nutritional support": [8, 13, 16, 19],
    "Rest": [14, 15],
    "Medication": [8, 14, 20]
  },
  "Mental Health": {
    "Therapy session": [11],
    "Meditation": [7, 12, 20],
    "Exercise": [9, 17],
    "Mood tracking": [8, 20]
  },
  "Chronic Disease Management": {
    "Physical therapy": [10, 15],
    "Medication monitoring": [8, 20],
    "Symptom tracking": [8, 14, 20],
    "Lifestyle modification": [9, 18]
  }
}

// Severity distribution based on condition
export const SEVERITY_DISTRIBUTION = {
  "Diabetes Management": { Mild: 0.4, Moderate: 0.4, Severe: 0.2 },
  "Hypertension Control": { Mild: 0.5, Moderate: 0.3, Severe: 0.2 },
  "Cancer Care": { Mild: 0.2, Moderate: 0.4, Severe: 0.4 },
  "Mental Health": { Mild: 0.3, Moderate: 0.5, Severe: 0.2 },
  "Maternal Health": { Mild: 0.5, Moderate: 0.4, Severe: 0.1 },
  "Chronic Disease Management": { Mild: 0.3, Moderate: 0.5, Severe: 0.2 }
}

// Simple seed function for consistent randomness
function seededRandom(seed: string): () => number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return function() {
    hash = ((hash * 9301 + 49297) % 233280)
    return hash / 233280
  }
}

function randomChoice<T>(array: T[], random: () => number): T {
  return array[Math.floor(random() * array.length)]
}

function weightedChoice<T extends string>(
  options: Record<T, number>, 
  random: () => number
): T {
  const weights = Object.entries(options) as [T, number][]
  const totalWeight = weights.reduce((sum, [, weight]) => sum + weight, 0)
  
  let randomNum = random() * totalWeight
  
  for (const [option, weight] of weights) {
    randomNum -= weight
    if (randomNum <= 0) {
      return option
    }
  }
  
  return weights[0][0]
}

function generateTimeInHour(hour: number, random: () => number): string {
  // Ensure hour is valid
  if (typeof hour !== 'number' || hour < 0 || hour > 23) {
    hour = Math.floor(random() * 24) // Fallback to random hour
  }
  const minutes = Math.floor(random() * 60)
  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export function generateConditionAwareTimeline(
  patientCondition: string,
  date: string,
  patientId: string
): TimelineItem[] {
  const random = seededRandom(`${patientId}-${date}`)
  const timeline: TimelineItem[] = []
  
  const conditionData = CONDITION_SYMPTOM_MAP[patientCondition as keyof typeof CONDITION_SYMPTOM_MAP]
  
  // DEBUG: Log what's happening
  console.log(`generateConditionAwareTimeline DEBUG:`, {
    patientCondition,
    date,
    patientId,
    hasConditionData: !!conditionData,
    availableConditions: Object.keys(CONDITION_SYMPTOM_MAP)
  })
  
  if (!conditionData) {
    console.log(`No condition data found for: ${patientCondition}`)
    return [] // Return empty if condition not found
  }

  const symptomPatterns = SYMPTOM_PATTERNS[patientCondition as keyof typeof SYMPTOM_PATTERNS] || {}
  const activitySchedule = ACTIVITY_SCHEDULES[patientCondition as keyof typeof ACTIVITY_SCHEDULES] || {}
  const severityDist = SEVERITY_DISTRIBUTION[patientCondition as keyof typeof SEVERITY_DISTRIBUTION] || 
    { Mild: 0.4, Moderate: 0.4, Severe: 0.2 }

  // Generate symptoms based on condition patterns
  const allSymptoms = [...conditionData.primary, ...conditionData.secondary]
  const numSymptomEpisodes = 2 + Math.floor(random() * 4) // 2-5 episodes per day

  console.log(`Generating ${numSymptomEpisodes} symptoms for ${patientCondition}:`, allSymptoms)

  for (let i = 0; i < numSymptomEpisodes; i++) {
    const symptom = randomChoice(allSymptoms, random)
    const pattern = symptomPatterns[symptom]
    
    let hour: number = Math.floor(random() * 24) // Default random hour
    
    if (pattern && random() < 0.7) { // 70% chance to follow pattern
      const peakHours = pattern.peak || []
      const lowHours = pattern.low || []
      
      if (peakHours.length > 0 && random() < 0.8) {
        hour = randomChoice(peakHours, random)
      } else if (lowHours.length > 0 && random() < 0.3) {
        hour = randomChoice(lowHours, random)
      }
      // If neither condition met, keep the default random hour
    }

    const severity = weightedChoice(severityDist, random)
    const frequency = randomChoice(["Continuous", "Intermittent", "Occasional"], random)
    
    timeline.push({
      time: generateTimeInHour(hour, random),
      date,
      dataType: "symptom",
      symptom,
      severity,
      frequency,
      notes: generateSymptomNote(symptom, severity, patientCondition, random)
    })
  }

  // Generate activities based on condition schedule
  for (const [activity, preferredHours] of Object.entries(activitySchedule)) {
    if (random() < 0.8 && preferredHours.length > 0) { // 80% chance to perform scheduled activity
      const hour = randomChoice(preferredHours, random)
      const activityType = getActivityType(activity)
      
      timeline.push({
        time: generateTimeInHour(hour, random),
        date,
        dataType: "activity",
        type: activityType,
        activity,
        details: generateActivityDetails(activity, patientCondition, random),
        value: generateActivityValue(activity, random)
      })
    }
  }

  // Add some random activities
  const randomActivities = ["Water intake", "Rest", "Walking", "Meal"]
  const numRandomActivities = 1 + Math.floor(random() * 3)
  
  for (let i = 0; i < numRandomActivities; i++) {
    const activity = randomChoice(randomActivities, random)
    const hour = Math.floor(random() * 24)
    const activityType = getActivityType(activity)
    
    timeline.push({
      time: generateTimeInHour(hour, random),
      date,
      dataType: "activity",
      type: activityType,
      activity,
      details: generateActivityDetails(activity, patientCondition, random),
      value: generateActivityValue(activity, random)
    })
  }

  // Sort timeline by time
  return timeline.sort((a, b) => a.time.localeCompare(b.time))
}

function generateSymptomNote(symptom: string, severity: string, condition: string, random: () => number): string {
  const noteTemplates = {
    "Excessive Thirst": [
      `${severity} thirst, consumed extra fluids`,
      `Feeling parched, ${severity.toLowerCase()} intensity`,
      `Increased fluid intake due to ${severity.toLowerCase()} thirst`
    ],
    "Frequent Urination": [
      `${severity} urgency, multiple bathroom visits`,
      `Increased frequency, ${severity.toLowerCase()} discomfort`,
      `Frequent urges, disrupting daily activities`
    ],
    "Fatigue": [
      `${severity} tiredness affecting daily activities`,
      `Energy levels low, ${severity.toLowerCase()} impact on mood`,
      `Feeling exhausted, ${severity.toLowerCase()} intensity`
    ],
    "Headache": [
      `${severity} head pain, ${condition.toLowerCase()} related`,
      `Tension headache, ${severity.toLowerCase()} intensity`,
      `Pain behind eyes, ${severity.toLowerCase()} discomfort`
    ],
    "Nausea": [
      `${severity} nausea, possible treatment side effect`,
      `Stomach upset, ${severity.toLowerCase()} queasiness`,
      `Feeling queasy, impacting appetite`
    ],
    "Default": [
      `${severity} ${symptom?.toLowerCase() || 'symptom'}, monitoring closely`,
      `Experiencing ${severity?.toLowerCase() || 'mild'} ${symptom?.toLowerCase() || 'symptom'}`,
      `${symptom || 'Symptom'} episode, ${severity?.toLowerCase() || 'mild'} intensity`
    ]
  }

  const templates = noteTemplates[symptom as keyof typeof noteTemplates] || noteTemplates.Default
  return randomChoice(templates, random)
}

function generateActivityDetails(activity: string, condition: string, random: () => number): string {
  const detailTemplates = {
    "Blood glucose monitoring": ["Fasting reading", "Post-meal check", "Pre-exercise reading", "Bedtime reading"],
    "Insulin administration": ["Rapid-acting dose", "Long-acting dose", "Correction dose", "Meal coverage"],
    "Blood pressure monitoring": ["Morning reading", "Evening reading", "Post-medication check", "Routine monitoring"],
    "Diabetic meal": ["Low-carb breakfast", "Balanced lunch", "Portion-controlled dinner", "Diabetic-friendly snack"],
    "Chemotherapy session": ["Cycle 1 treatment", "Follow-up session", "Pre-medication given", "Post-treatment monitoring"],
    "Therapy session": ["Cognitive behavioral therapy", "Group therapy", "Individual counseling", "Mental health check-in"],
    "Exercise": ["Light cardio", "Strength training", "Yoga session", "Walking routine"],
    "Meditation": ["Mindfulness practice", "Breathing exercises", "Stress reduction", "Relaxation technique"],
    "Default": [`${activity} completed`, `Routine ${activity.toLowerCase()}`, `${activity} as prescribed`]
  }

  const templates = detailTemplates[activity as keyof typeof detailTemplates] || detailTemplates.Default
  return randomChoice(templates, random)
}

function generateActivityValue(activity: string, random: () => number): string {
  const valueRanges = {
    "Blood glucose monitoring": () => `${80 + Math.floor(random() * 120)} mg/dL`,
    "Blood pressure monitoring": () => `${110 + Math.floor(random() * 40)}/${70 + Math.floor(random() * 20)} mmHg`,
    "Exercise": () => `${15 + Math.floor(random() * 45)} min`,
    "Walking": () => `${1000 + Math.floor(random() * 4000)} steps`,
    "Meditation": () => `${10 + Math.floor(random() * 20)} min`,
    "Water intake": () => `${200 + Math.floor(random() * 300)} ml`,
    "Meal": () => `${200 + Math.floor(random() * 600)} cal`,
    "Rest": () => `${30 + Math.floor(random() * 90)} min`,
    "Default": () => "1 unit"
  }

  const generator = valueRanges[activity as keyof typeof valueRanges] || valueRanges.Default
  return generator()
}

function getActivityType(activity: string): string {
  const typeMapping = {
    "Blood glucose monitoring": "Medication",
    "Insulin administration": "Medication", 
    "Blood pressure monitoring": "Medication",
    "Diabetic meal": "Food",
    "Low sodium meal": "Food",
    "Chemotherapy session": "Treatment",
    "Radiation therapy": "Treatment",
    "Therapy session": "Treatment",
    "Exercise": "Exercise",
    "Cardio exercise": "Exercise",
    "Walking": "Exercise",
    "Meditation": "Exercise",
    "Rest": "Rest",
    "Water intake": "Food",
    "Meal": "Food",
    "Nutritional support": "Food",
    "Default": "Activity"
  }

  return typeMapping[activity as keyof typeof typeMapping] || typeMapping.Default
}

// Generate multiple days of timeline data
export function generateTimelineForDateRange(
  patientCondition: string,
  startDate: string,
  endDate: string,
  patientId: string
): Record<string, TimelineItem[]> {
  const timeline: Record<string, TimelineItem[]> = {}
  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0]
    timeline[dateStr] = generateConditionAwareTimeline(patientCondition, dateStr, patientId)
  }

  return timeline
}

// Helper function to get the primary condition from program name
export function extractConditionFromProgram(programName: string): string {
  const conditionMap = {
    "Diabetes": "Diabetes Management",
    "Hypertension": "Hypertension Control", 
    "Cancer": "Cancer Care",
    "Mental": "Mental Health",
    "Maternal": "Maternal Health",
    "TB": "Chronic Disease Management",
    "DOTS": "Chronic Disease Management",
    "Chronic": "Chronic Disease Management"
  }

  for (const [key, value] of Object.entries(conditionMap)) {
    if (programName.includes(key)) {
      return value
    }
  }

  return "Chronic Disease Management" // Default fallback
}