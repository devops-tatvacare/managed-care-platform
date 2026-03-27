import { generateConditionAwareTimeline, extractConditionFromProgram, CONDITION_SYMPTOM_MAP } from './condition-aware-timeline-generator'

// Test function to demonstrate the intelligent data generation system
export function testConditionAwareSystem() {
  console.log("=== Testing Condition-Aware Timeline Generation System ===\n")

  // Test different patient conditions
  const testCases = [
    {
      patientId: "EMPI1001234",
      programName: "Diabetes Management",
      date: "2024-01-15"
    },
    {
      patientId: "EMPI1001235", 
      programName: "Hypertension Control",
      date: "2024-01-15"
    },
    {
      patientId: "EMPI1001236",
      programName: "Cancer Care", 
      date: "2024-01-15"
    },
    {
      patientId: "EMPI1001237",
      programName: "Mental Health",
      date: "2024-01-15"
    }
  ]

  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test Case ${index + 1}: ${testCase.programName} ---`)
    console.log(`Patient ID: ${testCase.patientId}`)
    console.log(`Date: ${testCase.date}`)
    
    // Extract condition from program name
    const condition = extractConditionFromProgram(testCase.programName)
    console.log(`Extracted Condition: ${condition}`)
    
    // Show expected symptoms/activities for this condition
    const conditionData = CONDITION_SYMPTOM_MAP[condition as keyof typeof CONDITION_SYMPTOM_MAP]
    if (conditionData) {
      console.log(`Primary Symptoms: ${conditionData.primary.join(', ')}`)
      console.log(`Expected Activities: ${conditionData.activities.join(', ')}`)
    }
    
    // Generate timeline data
    const timeline = generateConditionAwareTimeline(condition, testCase.date, testCase.patientId)
    console.log(`Generated ${timeline.length} timeline items`)
    
    // Show sample items
    const symptoms = timeline.filter(item => item.dataType === 'symptom')
    const activities = timeline.filter(item => item.dataType === 'activity')
    
    console.log(`\nSample Symptoms (${symptoms.length} total):`)
    symptoms.slice(0, 3).forEach(symptom => {
      console.log(`  ${symptom.time} - ${symptom.symptom} (${symptom.severity}) - ${symptom.notes}`)
    })
    
    console.log(`\nSample Activities (${activities.length} total):`)
    activities.slice(0, 3).forEach(activity => {
      console.log(`  ${activity.time} - ${activity.activity} (${activity.value}) - ${activity.details}`)
    })
    
    // Show hourly distribution
    const hourlyDistribution = timeline.reduce((acc, item) => {
      const hour = parseInt(item.time.split(':')[0])
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)
    
    const busyHours = Object.entries(hourlyDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => `${hour}:00 (${count} items)`)
    
    console.log(`\nBusiest Hours: ${busyHours.join(', ')}`)
  })

  console.log("\n=== System Test Complete ===")
  console.log("\n✅ Key Features Implemented:")
  console.log("• Condition-specific symptom generation")
  console.log("• Time-pattern aware symptom distribution") 
  console.log("• Relevant activity scheduling based on condition")
  console.log("• Realistic severity distributions")
  console.log("• Smart time slot distribution (0-60 minutes per hour)")
  console.log("• Consistent data generation using patient ID as seed")
  console.log("• Integration with existing hourly timeline view")
}

// Export test function for use in development
if (typeof window === 'undefined') {
  // Only run in Node.js environment (server-side)
  testConditionAwareSystem()
}