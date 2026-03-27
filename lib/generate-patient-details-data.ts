export interface PatientDetailData {
  empiId: string
  name: string
  mobile: string
  source: string
  program: string
  doctorName: string
  assigningAuthority: string
  abhaId: string
  cpf: string
  consultationTime: string
  dateOfBirth: string
  gender: string
  address: string
  pincode: string
  insuranceProvider: string
  lastClaimSubmissionDate: string
  headOfFamily: string
  familyId: string
  status: string
  preferredLanguage: string
  matchStrategy: string
}

export interface ConsultationHistory {
  date: string
  type: string
  duration: string
  status: string
  doctorName: string
  clinic: string
  notes: string
  referredBy?: string
}

export interface Symptom {
  date: string
  symptom: string
  severity: string
  reporter: string
  notes: string
}

export interface ActivityLog {
  date: string
  activity: string
  details: string
  time: string
}

export interface Claim {
  id: string
  submissionDate: string
  status: string
  claimType: string
  hospital: string
  insuranceProvider: string
  amountClaimed: string
  amountReimbursed: string
  reviewedBy: string
  documents: string[]
  notes: string
}

export interface HealthMarkerDataPoint {
  date: string
  value: number
  labName: string
  labIcon: string
  referenceRange: {
    min: number
    max: number
  }
  status: "normal" | "high" | "low" | "critical"
}

export interface HealthMarker {
  healthMarker: string
  category: string
  latestValue: string
  units: string
  trend: string
  history: HealthMarkerDataPoint[]
  normalRange: {
    min: number
    max: number
  }
}

export interface LabReport {
  date: string
  testName: string
  category: string
  diagnosticsName: string
  document: string
  summary: string
  prescribedBy?: string
}

export interface Medication {
  medicationName: string
  dosage: string
  frequency: string
  route: string
  startDate: string
  endDate: string
  prescribedBy: string
  purpose: string
  status: string
  notes: string
}

import { generateConditionAwareTimeline, extractConditionFromProgram, CONDITION_SYMPTOM_MAP } from './condition-aware-timeline-generator'

const consultationTypes = [
  "Initial Consultation", "Follow-up", "Diabetes Review", "Nutrition Counseling", 
  "Lab Review", "Emergency Visit", "Routine Checkup", "Specialist Referral",
  "Medication Review", "Health Assessment", "Diet Planning", "Exercise Counseling"
]

const symptoms = [
  "Excessive Thirst", "Frequent Urination", "Fatigue", "Blurred Vision", "Headache",
  "Nausea", "Dizziness", "Shortness of Breath", "Chest Pain", "Joint Pain",
  "Back Pain", "Insomnia", "Anxiety", "Depression", "Loss of Appetite"
]

const activities = [
  "Blood glucose checked", "Blood pressure checked", "Weight measured", "Meal logged",
  "Medication taken", "Exercise completed", "Sleep recorded", "Water intake logged",
  "Symptoms reported", "Doctor consultation", "Lab test done", "Prescription filled"
]

const claimTypes = [
  "Medical Consultation", "Lab Tests", "Emergency Visit", "Prescription Drugs",
  "Diagnostic Imaging", "Specialist Consultation", "Hospital Stay", "Preventive Care"
]

const healthMarkers = [
  { name: "Fasting Glucose", category: "Diabetes", units: "mg/dL", normalRange: [90, 126] },
  { name: "Post-Meal Glucose", category: "Diabetes", units: "mg/dL", normalRange: [140, 200] },
  { name: "HbA1c", category: "Diabetes", units: "%", normalRange: [5.5, 7.0] },
  { name: "Total Cholesterol", category: "Heart", units: "mg/dL", normalRange: [150, 220] },
  { name: "LDL Cholesterol", category: "Heart", units: "mg/dL", normalRange: [70, 130] },
  { name: "HDL Cholesterol", category: "Heart", units: "mg/dL", normalRange: [40, 80] },
  { name: "Triglycerides", category: "Heart", units: "mg/dL", normalRange: [80, 180] },
  { name: "Blood Pressure Systolic", category: "Heart", units: "mmHg", normalRange: [110, 140] },
  { name: "Blood Pressure Diastolic", category: "Heart", units: "mmHg", normalRange: [70, 90] },
  { name: "Creatinine", category: "Kidney", units: "mg/dL", normalRange: [0.8, 1.2] },
  { name: "BUN", category: "Kidney", units: "mg/dL", normalRange: [10, 25] },
  { name: "ALT", category: "Liver", units: "U/L", normalRange: [20, 45] },
  { name: "AST", category: "Liver", units: "U/L", normalRange: [18, 40] },
  { name: "TSH", category: "Thyroid", units: "mIU/L", normalRange: [1.5, 4.5] },
  { name: "Vitamin D", category: "Vitamins", units: "ng/mL", normalRange: [20, 50] },
  { name: "Hemoglobin", category: "Blood", units: "g/dL", normalRange: [12, 16] },
  { name: "WBC Count", category: "Blood", units: "×10³/μL", normalRange: [4, 11] }
]

const labTests = [
  { name: "Complete Blood Count", category: "Blood", summary: "All parameters within normal limits" },
  { name: "Lipid Profile", category: "Cardiovascular", summary: "Cholesterol levels monitored for cardiac health" },
  { name: "Liver Function Test", category: "Liver", summary: "Liver enzymes and function assessed" },
  { name: "Kidney Function Test", category: "Nephrology", summary: "Kidney parameters evaluated for diabetes complications" },
  { name: "Thyroid Function Test", category: "Endocrinology", summary: "Thyroid hormones checked for metabolic health" },
  { name: "Diabetes Panel", category: "Diabetes", summary: "Comprehensive glucose and insulin assessment" },
  { name: "Cardiac Markers", category: "Cardiovascular", summary: "Heart function and risk factors evaluated" },
  { name: "Diabetic Eye Screening", category: "Ophthalmology", summary: "Retinal examination for diabetic complications" },
  { name: "Urine Analysis", category: "Nephrology", summary: "Kidney function and protein levels assessed" },
  { name: "Vitamin Panel", category: "Vitamins", summary: "Essential vitamin levels measured" }
]

const medications = [
  { name: "Metformin", category: "Diabetes", dosage: ["500mg", "850mg", "1000mg"], frequency: ["Once daily", "Twice daily"], purpose: "Blood sugar control" },
  { name: "Glimepiride", category: "Diabetes", dosage: ["1mg", "2mg", "4mg"], frequency: ["Once daily", "Twice daily"], purpose: "Insulin secretion" },
  { name: "Insulin", category: "Diabetes", dosage: ["10 units", "15 units", "20 units"], frequency: ["Twice daily", "Three times daily"], purpose: "Blood glucose management" },
  { name: "Lisinopril", category: "Heart", dosage: ["5mg", "10mg", "20mg"], frequency: ["Once daily"], purpose: "Blood pressure control" },
  { name: "Atorvastatin", category: "Heart", dosage: ["10mg", "20mg", "40mg"], frequency: ["Once daily"], purpose: "Cholesterol management" },
  { name: "Aspirin", category: "Heart", dosage: ["75mg", "81mg"], frequency: ["Once daily"], purpose: "Cardiovascular protection" },
  { name: "Losartan", category: "Heart", dosage: ["25mg", "50mg", "100mg"], frequency: ["Once daily"], purpose: "Blood pressure control" },
  { name: "Vitamin D3", category: "Vitamins", dosage: ["1000 IU", "2000 IU"], frequency: ["Once daily"], purpose: "Bone health and immunity" }
]

// Diagnostic lab chains with icons and specialties
const diagnosticLabs = [
  {
    name: "Quest Diagnostics",
    icon: "🔬",
    color: "#2563eb",
    specialties: ["General", "Diabetes", "Heart", "Kidney", "Liver", "Thyroid"],
    locations: ["National", "USA"]
  },
  {
    name: "LabCorp",
    icon: "🧪",
    color: "#dc2626",
    specialties: ["General", "Blood", "Heart", "Diabetes", "Vitamins"],
    locations: ["National", "USA"]
  },
  {
    name: "SRL Diagnostics",
    icon: "⚕️",
    color: "#059669",
    specialties: ["General", "Diabetes", "Thyroid", "Heart", "Kidney"],
    locations: ["India", "Mumbai", "Delhi", "Bangalore"]
  },
  {
    name: "Dr. Lal PathLabs",
    icon: "🏥",
    color: "#7c3aed",
    specialties: ["General", "Blood", "Diabetes", "Heart", "Liver"],
    locations: ["India", "Delhi", "NCR"]
  },
  {
    name: "Metropolis Healthcare",
    icon: "🔍",
    color: "#ea580c",
    specialties: ["General", "Diabetes", "Heart", "Kidney", "Blood"],
    locations: ["India", "Pan-India"]
  },
  {
    name: "Thyrocare",
    icon: "🧬",
    color: "#0891b2",
    specialties: ["Thyroid", "Diabetes", "Heart", "Vitamins", "General"],
    locations: ["India", "Mumbai", "Pan-India"]
  },
  {
    name: "Mayo Clinic Labs",
    icon: "🏛️",
    color: "#1d4ed8",
    specialties: ["General", "Heart", "Diabetes", "Kidney", "Liver"],
    locations: ["USA", "Minnesota", "Arizona", "Florida"]
  },
  {
    name: "Unilabs",
    icon: "🌐",
    color: "#16a34a",
    specialties: ["General", "Blood", "Diabetes", "Heart", "Kidney"],
    locations: ["Europe", "Switzerland", "France", "UK"]
  },
  {
    name: "Sonic Healthcare",
    icon: "🎯",
    color: "#be185d",
    specialties: ["General", "Blood", "Heart", "Diabetes", "Liver"],
    locations: ["Australia", "Germany", "USA", "UK"]
  },
  {
    name: "Cerba HealthCare",
    icon: "⭐",
    color: "#9333ea",
    specialties: ["General", "Blood", "Heart", "Kidney", "Vitamins"],
    locations: ["Europe", "France", "Belgium", "Italy"]
  }
]

// Doctor profiles with specialties, consultation types, and clinic associations
const doctorProfiles = [
  // International doctors (~70%)
  {
    name: "Dr. Sarah Mitchell, MD",
    specialty: "Endocrinology",
    consultationTypes: ["Diabetes Review", "Initial Consultation", "Follow-up", "Medication Review"],
    clinics: ["Mayo Clinic", "Johns Hopkins Hospital", "Cleveland Clinic"]
  },
  {
    name: "Dr. James Anderson, MBBS",
    specialty: "General Medicine", 
    consultationTypes: ["Routine Checkup", "Health Assessment", "Emergency Visit", "Initial Consultation"],
    clinics: ["Massachusetts General Hospital", "UCLA Medical Center", "Mount Sinai Hospital"]
  },
  {
    name: "Dr. Emily Roberts, MD",
    specialty: "Cardiology",
    consultationTypes: ["Specialist Referral", "Follow-up", "Emergency Visit"],
    clinics: ["Cleveland Clinic", "Johns Hopkins Hospital", "Mayo Clinic"]
  },
  {
    name: "Dr. Michael Johnson, MS",
    specialty: "General Surgery",
    consultationTypes: ["Specialist Referral", "Emergency Visit"],
    clinics: ["Presbyterian Hospital", "Mercy General Hospital", "St. Mary's Medical Center"]
  },
  {
    name: "Dr. Jennifer Davis, MD",
    specialty: "Internal Medicine",
    consultationTypes: ["Initial Consultation", "Follow-up", "Health Assessment", "Lab Review"],
    clinics: ["Mayo Clinic", "Johns Hopkins Hospital", "Cleveland Clinic"]
  },
  {
    name: "Dr. David Wilson, MBBS",
    specialty: "Family Medicine",
    consultationTypes: ["Routine Checkup", "Health Assessment", "Initial Consultation", "Follow-up"],
    clinics: ["Regional Medical Center", "NHS Foundation Trust", "Toronto General Hospital"]
  },
  {
    name: "Dr. Lisa Thompson, MD",
    specialty: "Nutrition & Dietetics",
    consultationTypes: ["Nutrition Counseling", "Diet Planning", "Follow-up"],
    clinics: ["Mayo Clinic", "Cleveland Clinic", "Johns Hopkins Hospital"]
  },
  {
    name: "Dr. Robert Brown, MD",
    specialty: "Emergency Medicine",
    consultationTypes: ["Emergency Visit", "Initial Consultation"],
    clinics: ["Royal London Hospital", "St. Bartholomew's Hospital", "Vancouver General Hospital"]
  },
  {
    name: "Dr. Amanda Clark, MBBS",
    specialty: "Preventive Medicine",
    consultationTypes: ["Health Assessment", "Routine Checkup", "Follow-up"],
    clinics: ["Regional Medical Center", "Royal Melbourne Hospital", "Sydney Hospital"]
  },
  {
    name: "Dr. Christopher Lee, MS",
    specialty: "Orthopedics",
    consultationTypes: ["Specialist Referral", "Follow-up"],
    clinics: ["Princess Alexandra Hospital", "Perth Children's Hospital", "UCLA Medical Center"]
  },
  // Indian names (~30%)
  {
    name: "Dr. Priya Sharma, MD",
    specialty: "Endocrinology",
    consultationTypes: ["Diabetes Review", "Initial Consultation", "Follow-up", "Medication Review"],
    clinics: ["AIIMS", "Government Medical College", "Apollo Hospitals"]
  },
  {
    name: "Dr. Arjun Patel, MBBS",
    specialty: "General Medicine",
    consultationTypes: ["Routine Checkup", "Health Assessment", "Initial Consultation", "Follow-up"],
    clinics: ["District Hospital", "Community Health Centre", "Fortis Healthcare"]
  },
  {
    name: "Dr. Ravi Kumar, MD",
    specialty: "Cardiology", 
    consultationTypes: ["Specialist Referral", "Follow-up", "Emergency Visit"],
    clinics: ["AIIMS", "Medanta", "Apollo Hospitals"]
  },
  {
    name: "Dr. Meera Singh, MS",
    specialty: "Gynecology",
    consultationTypes: ["Specialist Referral", "Routine Checkup", "Follow-up"],
    clinics: ["Apollo Hospitals", "Fortis Healthcare", "Government Medical College"]
  },
  {
    name: "Dr. Vikram Gupta, MD",
    specialty: "Internal Medicine",
    consultationTypes: ["Initial Consultation", "Follow-up", "Lab Review", "Health Assessment"],
    clinics: ["AIIMS", "Government Medical College", "Max Healthcare"]
  }
]

// Simple seed function for consistent randomness
function seededRandom(seed: string): () => number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return function() {
    hash = ((hash * 9301 + 49297) % 233280)
    return hash / 233280
  }
}

function randomChoice<T>(array: T[], random: () => number): T {
  return array[Math.floor(random() * array.length)]
}

function randomChoices<T>(array: T[], count: number, random: () => number): T[] {
  const shuffled = [...array].sort(() => 0.5 - random())
  return shuffled.slice(0, Math.min(count, array.length))
}

function generateDateInRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime())
  return new Date(randomTime).toISOString().split('T')[0]
}

function generateTimeString(): string {
  const hour = Math.floor(Math.random() * 12) + 1
  const minute = Math.floor(Math.random() * 60)
  const ampm = Math.random() < 0.5 ? "AM" : "PM"
  return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`
}

function generateTrend(random: () => number): string {
  const trends = ["increasing", "decreasing", "stable"]
  return randomChoice(trends, random)
}

// Function to select appropriate doctor for consultation type
function selectDoctorForConsultation(consultationType: string, basePatientData: any, random: () => number): { doctorName: string; clinic: string } {
  // Get doctors who can handle this consultation type
  const eligibleDoctors = doctorProfiles.filter(doctor => 
    doctor.consultationTypes.includes(consultationType)
  )
  
  if (eligibleDoctors.length === 0) {
    // Fallback to primary doctor if no specialist found
    return {
      doctorName: basePatientData.doctorName,
      clinic: basePatientData.assigningAuthority
    }
  }
  
  // For first consultation, prefer primary doctor if eligible
  const primaryDoctorEligible = eligibleDoctors.find(doctor => 
    doctor.name === basePatientData.doctorName
  )
  
  let selectedDoctor
  if (primaryDoctorEligible && random() < 0.6) {
    // 60% chance to use primary doctor if eligible
    selectedDoctor = primaryDoctorEligible
  } else {
    // Select from eligible doctors
    selectedDoctor = randomChoice(eligibleDoctors, random)
  }
  
  // Select clinic from doctor's associated clinics, prefer patient's current hospital
  let selectedClinic
  if (selectedDoctor.clinics.includes(basePatientData.assigningAuthority) && random() < 0.7) {
    // 70% chance to use patient's primary hospital if doctor works there
    selectedClinic = basePatientData.assigningAuthority
  } else {
    selectedClinic = randomChoice(selectedDoctor.clinics, random)
  }
  
  return {
    doctorName: selectedDoctor.name,
    clinic: selectedClinic
  }
}

// Function to select appropriate labs for a health marker category
function getLabsForCategory(category: string, random: () => number): typeof diagnosticLabs {
  const eligibleLabs = diagnosticLabs.filter(lab => 
    lab.specialties.includes(category) || lab.specialties.includes("General")
  )
  
  // If no specific labs found, fall back to general labs
  return eligibleLabs.length > 0 ? eligibleLabs : diagnosticLabs.filter(lab => 
    lab.specialties.includes("General")
  )
}

// Function to determine status based on value and normal range
function getHealthMarkerStatus(value: number, normalRange: { min: number; max: number }): "normal" | "high" | "low" | "critical" {
  const { min, max } = normalRange
  const range = max - min
  const criticalThreshold = range * 0.3 // 30% beyond normal range is critical
  
  if (value < min) {
    return value < (min - criticalThreshold) ? "critical" : "low"
  } else if (value > max) {
    return value > (max + criticalThreshold) ? "critical" : "high"  
  } else {
    return "normal"
  }
}

function generateHealthMarkerHistory(marker: typeof healthMarkers[0], random: () => number): HealthMarkerDataPoint[] {
  const history = []
  const baseValue = marker.normalRange[0] + random() * (marker.normalRange[1] - marker.normalRange[0])
  
  // Get eligible labs for this marker's category
  const eligibleLabs = getLabsForCategory(marker.category, random)
  
  // Generate 8-12 data points over the past 18 months
  const dataPointCount = 8 + Math.floor(random() * 5)
  
  for (let i = dataPointCount - 1; i >= 0; i--) {
    const date = new Date()
    // Spread data points over 18 months with some clustering around recent dates
    const monthsBack = Math.floor(random() * 18 * Math.pow(i / dataPointCount, 0.5))
    date.setMonth(date.getMonth() - monthsBack)
    date.setDate(1 + Math.floor(random() * 28)) // Random day of month
    
    // Generate some variation in the values with trending behavior
    const trendFactor = (dataPointCount - i - 1) / dataPointCount // Recent values trend
    const variation = (random() - 0.5) * 0.3 * baseValue
    const trendAdjustment = trendFactor * (random() - 0.5) * 0.1 * baseValue
    const value = Math.max(0, baseValue + variation + trendAdjustment)
    
    // Select a lab for this data point
    const selectedLab = eligibleLabs[Math.floor(random() * eligibleLabs.length)]
    
    // Create reference range with some lab-to-lab variation
    const rangeVariation = 1 + (random() - 0.5) * 0.1 // ±5% variation
    const referenceRange = {
      min: Number((marker.normalRange[0] * rangeVariation).toFixed(1)),
      max: Number((marker.normalRange[1] * rangeVariation).toFixed(1))
    }
    
    history.push({
      date: date.toISOString().split('T')[0],
      value: Number(value.toFixed(1)),
      labName: selectedLab.name,
      labIcon: selectedLab.icon,
      referenceRange,
      status: getHealthMarkerStatus(value, referenceRange)
    })
  }
  
  // Sort by date
  return history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function generatePatientDetailsData(empiId: string, basePatientData: any): {
  patientInfo: PatientDetailData
  consultationHistory: ConsultationHistory[]
  symptoms: Symptom[]
  activityLogs: ActivityLog[]
  claims: Claim[]
  healthMarkers: HealthMarker[]
  labReports: LabReport[]
  medications: Medication[]
} {
  const random = seededRandom(empiId)

  // Special-case: Deterministic data for Maria (EMPI999901)
  if (empiId === 'EMPI999901' || (basePatientData?.name || '').toLowerCase().startsWith('maria')) {
    // Consultation history (fixed timeline for pregnancy)
    const consultationHistory: ConsultationHistory[] = []
    // For Maria, set primary hospital to Reliance United
    const clinicMain = 'Reliance United'
    const addVisit = (date: string, doctorName: string, clinic: string, notes: string, duration: string = '30 min', status: string = 'Completed', referredBy?: string) => {
      consultationHistory.push({ date, type: 'Consultation', duration, status, doctorName, clinic, notes, referredBy })
    }

    const majorVisits = [
      { date: '2024-09-02', doctor: 'Dr. Sophie', clinic: clinicMain, notes: 'Initial OB consultation with Dr Sophie for maternal health review.' },
      { date: '2024-10-02', doctor: 'Dr. Sophie', clinic: clinicMain, notes: 'Antenatal follow-up at 1 PM. Routine monitoring and counselling.' },
      { date: '2024-11-02', doctor: 'Dr. Sophie', clinic: clinicMain, notes: 'Antenatal follow-up. Routine monitoring and counselling.' },
      { date: '2024-12-02', doctor: 'Dr. Sophie', clinic: clinicMain, notes: 'Antenatal follow-up. Third trimester planning.' },
      { date: '2025-01-02', doctor: 'Dr. Philip (Senior Specialist – Gynaecology)', clinic: 'Mount Grace Hospital', notes: 'Specialist consult; referral accepted from Dr Sophie.', referredBy: 'Dr. Sophie', duration: '35 min' },
      { date: '2025-02-02', doctor: 'Dr. Sophie', clinic: clinicMain, notes: 'Antenatal follow-up visit.' },
      { date: '2025-03-02', doctor: 'Dr. Peter (Diabetologist)', clinic: 'Mount Grace Hospital', notes: 'GDM/diabetes risk review; referral from Dr Sophie.', referredBy: 'Dr. Sophie' },
      { date: '2025-05-25', doctor: 'Dr. Sophie', clinic: clinicMain, notes: 'Delivery admission and peripartum evaluation. Planned normal delivery if no complications.' },
    ]

    majorVisits.forEach(v => addVisit(v.date, v.doctor, v.clinic, v.notes, v.duration || '30 min', 'Completed', v.referredBy))

    // Biweekly visits every 2 weeks after Mar 2, 2025 until Jun 2, 2025
    const biweekly: string[] = []
    {
      const start = new Date('2025-03-16') // two weeks after Mar 2
      const end = new Date('2025-06-02')
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 14)) {
        biweekly.push(d.toISOString().split('T')[0])
        addVisit(d.toISOString().split('T')[0], 'Dr. Sophie', clinicMain, 'Biweekly antenatal follow-up (routine vitals, counselling).')
      }
    }

    // Generate lab visits 2–3 days before each visit
    const labReportsList: LabReport[] = []
    // Rotate across three different labs for Maria's reports
    const availableLabsForMaria = [
      'Reliance United Diagnostics',
      'Hi-Precision Diagnostics',
      'Quest Diagnostics',
    ]
    // Remember which lab was used on which lab date
    const labNameByDate: Record<string, string> = {}
    const labVisitEntries: { date: string; tests: string[] }[] = []
    const labLinks: { visitDate: string; labDate: string }[] = []

    const toDate = (s: string) => new Date(s)
    const fmt = (d: Date) => new Date(d).toISOString().split('T')[0]
    const minusDays = (dateStr: string, days: number) => {
      const d = toDate(dateStr); d.setDate(d.getDate() - days); return fmt(d)
    }
    const prior = (dateStr: string, idx: number) => minusDays(dateStr, (idx % 2) + 2) // 2 or 3 days prior

    const addLabVisit = (visitDate: string, tests: string[], idx: number) => {
      const labDate = prior(visitDate, idx)
      labVisitEntries.push({ date: labDate, tests })
      labLinks.push({ visitDate, labDate })
      const diagnosticsForThisDate = availableLabsForMaria[idx % availableLabsForMaria.length]
      labNameByDate[labDate] = diagnosticsForThisDate
      tests.forEach(test => {
        labReportsList.push({
          date: labDate,
          testName: test,
          category: (
            test.includes('CBC') ? 'Blood' :
            test.includes('HbA1c') ? 'Diabetes' :
            test.includes('Vitamin D') || test.includes('Vitamin B12') ? 'Vitamins' :
            test.includes('TSH') ? 'Thyroid' :
            test.includes('LH') || test.includes('FSH') || test.includes('AMH') ? 'Endocrinology' :
            test.includes('HIV') ? 'Infectious Disease' :
            test.includes('Urine') ? 'Nephrology' :
            'General'
          ),
          diagnosticsName: diagnosticsForThisDate,
          document: `${test.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_${labDate}.pdf`,
          summary: `${test} performed.`
        })
      })
    }

    // Define test panels
    const baselinePanel = ['CBC', 'HbA1c', 'Vitamin D', 'Vitamin B12', 'HIV Screening', 'Urine test', 'AMH', 'TSH', 'LH', 'FSH']
    const routinePanel = ['CBC', 'Urine test']
    const thyroidPanel = ['CBC', 'Urine test', 'TSH']
    const diabetesPanel = ['HbA1c', 'Urine test']

    // For each major visit, add corresponding labs prior
    majorVisits.forEach((v, idx) => {
      if (v.date === '2024-09-02') addLabVisit(v.date, baselinePanel, idx)
      else if (v.date === '2025-03-02') addLabVisit(v.date, diabetesPanel, idx)
      else if (v.date === '2024-10-02' || v.date === '2024-12-02') addLabVisit(v.date, thyroidPanel, idx)
      else addLabVisit(v.date, routinePanel, idx)
    })

    // For each biweekly visit, add minimal labs (urine test) 2–3 days prior
    biweekly.forEach((date, idx) => addLabVisit(date, ['Urine test'], idx))

    // Claims: show the amounts for Dr Sophie’s Consultation (2 Sept 2024)
    // Claims across consults, diagnostics, and medicines
    const claims: Claim[] = []
    const addClaim = (id: string, submissionDate: string, status: string, claimType: string, hospital: string, amountClaimed: string, amountReimbursed: string, documents: string[], notes: string) => {
      claims.push({
        id,
        submissionDate,
        status,
        claimType,
        hospital,
        insuranceProvider: basePatientData?.insuranceProvider || 'PhilHealth',
        amountClaimed,
        amountReimbursed,
        reviewedBy: status === 'Submitted' ? '—' : (status === 'Under Review' ? 'Claims Officer' : 'Claims Manager'),
        documents,
        notes
      })
    }

    // Consultation claims for major visits
    const consultStatuses: Record<string,string> = {
      '2024-09-02': 'Reimbursed',
      '2024-10-02': 'Approved',
      '2024-11-02': 'Approved',
      '2024-12-02': 'Under Review',
      '2025-01-02': 'Submitted',
      '2025-02-02': 'Approved',
      '2025-03-02': 'Approved'
    }
    majorVisits.forEach((v, i) => {
      const id = `CLM-${v.date.slice(0,4)}-C${String(i+1).padStart(3,'0')}`
      addClaim(id, v.date, consultStatuses[v.date] || 'Approved', `Medical Consultation - ${v.doctor.split(' ')[0]}`, v.clinic || clinicMain, '₱1,200', consultStatuses[v.date] === 'Under Review' || consultStatuses[v.date] === 'Submitted' ? '₱0' : '₱1,000', [`consultation_${v.date}.pdf`], `Consultation charges for visit on ${v.date}.`)
    })

    // Diagnostics claims for lab dates before major visits
    const panelAmount = (tests: string[]) => tests.length >= 8 ? '₱3,800' : tests.includes('TSH') && tests.includes('CBC') ? '₱2,200' : tests.includes('HbA1c') ? '₱1,500' : '₱1,200'
    const panelReimbursed = (amount: string) => amount === '₱1,200' ? '₱900' : amount === '₱1,500' ? '₱1,200' : amount === '₱2,200' ? '₱1,800' : '₱3,000'
    majorVisits.forEach((v, idx) => {
      const labDate = ((): string => { const d = new Date(v.date); d.setDate(d.getDate() - ((idx % 2) + 2)); return d.toISOString().split('T')[0] })()
      const tests = labVisitEntries.find(l => l.date === labDate)?.tests || []
      if (tests.length > 0) {
        const amt = panelAmount(tests)
        const reimb = panelReimbursed(amt)
        const labHospital = labNameByDate[labDate] || availableLabsForMaria[idx % availableLabsForMaria.length]
        addClaim(
          `CLM-${labDate.slice(0,4)}-L${String(idx+1).padStart(3,'0')}`,
          labDate,
          'Approved',
          'Lab Tests',
          labHospital,
          amt,
          reimb,
          tests.map(t => `${t.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_${labDate}.pdf`),
          `Diagnostics on ${labDate}: ${tests.join(', ')}`
        )
      }
    })

    // Pharmacy claims (covered and self-pay)
    addClaim('CLM-2024-009', '2024-09-05', 'Approved', 'Prescription Drugs', 'ActiveOne Pharmacy', '₱850', '₱700', ['pharmacy_bill_2024-09-05.pdf'], 'Covered: Folic Acid, Ferrous Sulfate (Iron).')
    addClaim('CLM-2024-010', '2024-09-07', 'Rejected', 'Prescription Drugs (Self-pay)', 'ActiveOne Pharmacy', '₱600', '₱0', ['pharmacy_bill_2024-09-07.pdf'], 'Non-claim: Calcium + Vitamin D, Prenatal Multivitamin paid by patient.')

    // IPD Claim for Delivery (May 25, 2025) - This should show up in Insurer worklist as Pending
    addClaim('CLM-2025-IPD-001', '2025-05-25', 'Pending', 'IPD - Delivery', 'Reliance United', '₱85,000', '₱0', [
      'discharge_summary_2025-05-25.pdf',
      'birth_certificate_baby_silva.pdf', 
      'delivery_room_notes.pdf',
      'hospital_bill_ipd.pdf',
      'room_charges_bill.pdf',
      'pharmacy_bill_ipd.pdf',
      'pre_natal_records.pdf',
      'lab_reports_delivery.pdf',
      'philhealth_case_rate_form.pdf'
    ], 'IPD claim for normal delivery. Admission: 2025-05-25. Expected PhilHealth case rate: ₱32,000. Private room charges and additional procedures claimed.')

    // Finalize Lab Reports only (do not add as consultation entries)
    // Attach Prescribed By based on the linked consultation's doctor
    const labDateToVisit = new Map(labLinks.map(l => [l.labDate, l.visitDate]))
    const visitDateToDoctor = new Map(consultationHistory
      .filter(c => c.type === 'Consultation')
      .map(c => [c.date, c.doctorName]))
    labReportsList.forEach(r => {
      const visitDate = labDateToVisit.get(r.date)
      const prescribedBy = visitDate ? (visitDateToDoctor.get(visitDate) || 'Dr. Sophie') : 'Dr. Sophie'
      r.prescribedBy = prescribedBy
    })
    const labReports: LabReport[] = labReportsList.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Tie labs to consultation notes explicitly
    const labLinkMap = new Map(labLinks.map(l => [l.visitDate, l.labDate]))
    consultationHistory.forEach(c => {
      if (c.type === 'Consultation') {
        const labDate = labLinkMap.get(c.date)
        if (labDate) c.notes = `${c.notes} Labs from ${labDate} reviewed during visit.`
      }
    })

    // Add claims for biweekly minimal labs (urine test only)
    labVisitEntries
      .filter(l => l.tests.length === 1 && l.tests[0] === 'Urine test')
      .forEach((l, i) => {
        const amountClaimed = '₱300'
        const amountReimbursed = '₱200'
        const labHospital = labNameByDate[l.date] || availableLabsForMaria[i % availableLabsForMaria.length]
        addClaim(`CLM-${l.date.slice(0,4)}-LB${String(i+1).padStart(3,'0')}`, l.date, 'Approved', 'Lab Tests (Urine)', labHospital, amountClaimed, amountReimbursed, [
          `urine_test_${l.date}.pdf`
        ], `Biweekly antenatal urine test on ${l.date}`)
      })

    // Medications: Folic Acid
    const medications: Medication[] = [
      {
        medicationName: 'Folic Acid',
        dosage: '400 mcg',
        frequency: 'Once daily',
        route: 'Oral',
        startDate: '2024-09-03',
        endDate: 'Ongoing',
        prescribedBy: 'Dr. Sophie',
        purpose: 'Prenatal supplementation',
        status: 'Active',
        notes: 'Covered by claim (CLM-2024-006). Continue daily during pregnancy.'
      },
      {
        medicationName: 'Ferrous Sulfate (Iron)',
        dosage: '325 mg',
        frequency: 'Once daily',
        route: 'Oral',
        startDate: '2024-09-05',
        endDate: 'Ongoing',
        prescribedBy: 'Dr. Sophie',
        purpose: 'Prevent/treat iron-deficiency anemia in pregnancy',
        status: 'Active',
        notes: 'Covered by claim (CLM-2024-006). Take with food.'
      },
      {
        medicationName: 'Calcium + Vitamin D',
        dosage: 'Calcium 500 mg + Vit D 400 IU',
        frequency: 'Once daily',
        route: 'Oral',
        startDate: '2024-09-07',
        endDate: 'Ongoing',
        prescribedBy: 'Dr. Sophie',
        purpose: 'Bone health during pregnancy',
        status: 'Active',
        notes: 'Non-claim (out-of-pocket).'
      },
      {
        medicationName: 'Prenatal Multivitamin',
        dosage: 'Standard prenatal formula',
        frequency: 'Once daily',
        route: 'Oral',
        startDate: '2024-09-07',
        endDate: 'Ongoing',
        prescribedBy: 'Dr. Sophie',
        purpose: 'Comprehensive prenatal support',
        status: 'Active',
        notes: 'Non-claim (out-of-pocket).'
      }
    ]

    // Biomarkers across all lab visits: build trend from labReports
    const markerMap: Record<string, HealthMarker> = {}
    const ensureMarker = (name: string, category: string, units: string, min: number, max: number) => {
      if (!markerMap[name]) markerMap[name] = { healthMarker: name, category, latestValue: '', units, trend: 'stable', history: [], normalRange: { min, max } }
    }
    const pushPoint = (name: string, date: string, value: number, lab: string) => {
      const m = markerMap[name]
      m.history.push({ date, value, labName: lab, labIcon: '🔬', referenceRange: { min: m.normalRange.min, max: m.normalRange.max }, status: value < m.normalRange.min ? 'low' : value > m.normalRange.max ? 'high' : 'normal' })
      m.latestValue = value.toString()
    }
    const randAround = (base: number, spread: number = 0.2) => {
      const factor = 1 + ((Math.random() - 0.5) * 2 * spread)
      return Math.round(base * factor * 10) / 10
    }

    // Setup markers used in our test panels
    ensureMarker('Hemoglobin', 'Blood', 'g/dL', 12, 16)
    ensureMarker('WBC Count', 'Blood', '×10³/μL', 4, 11)
    ensureMarker('HbA1c', 'Diabetes', '%', 5.5, 7.0)
    ensureMarker('Vitamin D', 'Vitamins', 'ng/mL', 20, 50)
    ensureMarker('Vitamin B12', 'Vitamins', 'pg/mL', 200, 900)
    ensureMarker('Urine Protein', 'Nephrology', 'mg/dL', 0, 30)
    ensureMarker('TSH', 'Thyroid', 'mIU/L', 1.5, 4.5)
    ensureMarker('LH', 'Endocrinology', 'mIU/mL', 2.0, 12.0)
    ensureMarker('FSH', 'Endocrinology', 'mIU/mL', 3.0, 10.0)
    ensureMarker('HIV Screening (Index)', 'Infectious Disease', 'Index', 0, 1)

    const testsByDate: Record<string, string[]> = {}
    labReports.forEach(r => {
      if (!testsByDate[r.date]) testsByDate[r.date] = []
      testsByDate[r.date].push(r.testName)
    })
    Object.entries(testsByDate).sort(([a],[b]) => new Date(a).getTime() - new Date(b).getTime()).forEach(([date, tests], idx) => {
      const labForDate = labNameByDate[date] || availableLabsForMaria[idx % availableLabsForMaria.length]
      if (tests.includes('CBC')) {
        pushPoint('Hemoglobin', date, randAround(13.0 - (idx*0.1), 0.05), labForDate)
        pushPoint('WBC Count', date, randAround(7.0 + (idx*0.1), 0.08), labForDate)
      }
      if (tests.includes('HbA1c')) {
        pushPoint('HbA1c', date, randAround(idx < 3 ? 5.6 : 5.8, 0.05), labForDate)
      }
      if (tests.includes('Vitamin D')) {
        pushPoint('Vitamin D', date, randAround(24 + idx, 0.1), labForDate)
      }
      if (tests.includes('Vitamin B12')) {
        pushPoint('Vitamin B12', date, Math.round(420 + (idx*10)), labForDate)
      }
      if (tests.includes('Urine test')) {
        pushPoint('Urine Protein', date, Math.max(0, Math.round(10 + ((idx%3)-1)*3)), labForDate)
      }
      if (tests.includes('TSH')) {
        pushPoint('TSH', date, randAround(2.4, 0.1), labForDate)
      }
      if (tests.includes('LH')) {
        pushPoint('LH', date, randAround(6.0, 0.1), labForDate)
      }
      if (tests.includes('FSH')) {
        pushPoint('FSH', date, randAround(7.5, 0.1), labForDate)
      }
      if (tests.includes('AMH')) {
        ensureMarker('AMH', 'Fertility', 'ng/mL', 1.0, 4.0)
        pushPoint('AMH', date, randAround(2.1, 0.05), labForDate)
      }
      if (tests.includes('HIV Screening')) {
        pushPoint('HIV Screening (Index)', date, 0.2, labForDate)
      }
    })

    const healthMarkers: HealthMarker[] = Object.values(markerMap).map(m => {
      const hist = m.history.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const latest = hist[hist.length - 1]
      return { ...m, latestValue: latest ? latest.value.toString() : m.latestValue, trend: hist.length > 1 ? (latest.value > hist[0].value ? 'increasing' : latest.value < hist[0].value ? 'decreasing' : 'stable') : 'stable', history: hist }
    })

    const patientInfo: PatientDetailData = {
      empiId,
      name: basePatientData?.name || 'Maria Silva',
      mobile: basePatientData?.mobileNumber || '+63 917 123 4567',
      source: basePatientData?.source || 'Referral',
      program: basePatientData?.programName || 'Maternal Health',
      doctorName: 'Dr. Sophie',
      assigningAuthority: 'Reliance United',
      abhaId: basePatientData?.abhaId || (basePatientData as any)?.cpf || '',
      cpf: (basePatientData as any)?.cpf || '',
      consultationTime: '2024-09-02 10:30 AM',
      dateOfBirth: basePatientData?.dateOfBirth || '1994-03-14',
      gender: basePatientData?.gender || 'Female',
      address: basePatientData?.address || 'Quezon City, Metro Manila',
      pincode: basePatientData?.pincode || '1100',
      insuranceProvider: basePatientData?.insuranceProvider || 'PhilHealth',
      lastClaimSubmissionDate: basePatientData?.lastClaimSubmissionDate || '2024-09-02',
      headOfFamily: basePatientData?.headOfFamily || 'Maria Silva',
      familyId: basePatientData?.familyId || 'FAM999901',
      status: basePatientData?.status || 'Active',
      preferredLanguage: basePatientData?.preferredLanguage || 'Filipino',
      matchStrategy: basePatientData?.matchStrategy || 'Deterministic'
    }

    // Sort claims by submission date (desc), but keep Pending claims at the top
    claims.sort((a,b) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1
      if (b.status === 'Pending' && a.status !== 'Pending') return 1
      return new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
    })

    return {
      patientInfo,
      consultationHistory: consultationHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      symptoms: [],
      activityLogs: [],
      claims,
      healthMarkers,
      labReports,
      medications
    }
  }
  // Generate consultation history (3-8 consultations)
  const consultationHistory: ConsultationHistory[] = []
  const consultationCount = 3 + Math.floor(random() * 6)
  
  for (let i = 0; i < consultationCount; i++) {
    const date = generateDateInRange("2023-06-01", "2024-12-31")
    const type = randomChoice(consultationTypes, random)
    const duration = `${20 + Math.floor(random() * 40)} min`
    const status = random() < 0.9 ? "Completed" : randomChoice(["Scheduled", "Cancelled"], random)
    
    // Select appropriate doctor and clinic for this consultation type
    const { doctorName, clinic } = selectDoctorForConsultation(type, basePatientData, random)
    
    consultationHistory.push({
      date,
      type,
      duration,
      status,
      doctorName,
      clinic,
      notes: `${type} session focused on ${basePatientData.programName.toLowerCase()}. Patient progress reviewed and treatment plan updated as needed.`
    })
  }
  
  // Generate condition-aware symptoms (8-15 entries)
  const symptomsList: Symptom[] = []
  const symptomCount = 8 + Math.floor(random() * 8)
  const patientCondition = extractConditionFromProgram(basePatientData.programName)
  const conditionData = CONDITION_SYMPTOM_MAP[patientCondition as keyof typeof CONDITION_SYMPTOM_MAP]
  
  // Use condition-specific symptoms if available, otherwise fall back to generic
  const availableSymptoms = conditionData 
    ? [...conditionData.primary, ...conditionData.secondary, ...conditionData.complications]
    : symptoms
  
  for (let i = 0; i < symptomCount; i++) {
    const date = generateDateInRange("2023-09-01", "2024-12-31")
    const symptom = randomChoice(availableSymptoms, random)
    
    // Use condition-specific severity distribution if available
    let severity: string
    if (conditionData) {
      // More realistic severity for condition-specific symptoms
      if (conditionData.primary.includes(symptom)) {
        severity = random() < 0.5 ? "Moderate" : random() < 0.8 ? "Severe" : "Mild"
      } else if (conditionData.complications.includes(symptom)) {
        severity = random() < 0.6 ? "Severe" : "Moderate"
      } else {
        severity = randomChoice(["Mild", "Moderate", "Severe"], random)
      }
    } else {
      severity = randomChoice(["Mild", "Moderate", "Severe"], random)
    }
    
    const reporter = random() < 0.6 ? "Patient" : "Doctor"
    
    symptomsList.push({
      date,
      symptom,
      severity,
      reporter,
      notes: `${symptom} reported by ${reporter.toLowerCase()}. ${severity} intensity noted. Related to ${patientCondition.toLowerCase()}.`
    })
  }
  
  // Generate condition-aware activity logs (15-25 entries)
  const activityLogsList: ActivityLog[] = []
  const activityCount = 15 + Math.floor(random() * 11)
  
  // Use condition-specific activities if available
  const availableActivities = conditionData 
    ? [...conditionData.activities, ...activities.slice(0, 4)] // Mix condition-specific with generic
    : activities
  
  for (let i = 0; i < activityCount; i++) {
    const date = generateDateInRange("2024-01-01", "2024-12-31")
    const activity = randomChoice(availableActivities, random)
    const time = generateTimeString()
    
    let details = ""
    if (activity.includes("glucose") || activity.includes("Blood glucose")) {
      details = `${Math.floor(random() * 100 + 80)} mg/dL`
    } else if (activity.includes("pressure") || activity.includes("Blood pressure")) {
      details = `${Math.floor(random() * 40 + 110)}/${Math.floor(random() * 30 + 70)} mmHg`
    } else if (activity.includes("Weight")) {
      details = `${Math.floor(random() * 30 + 60)} kg`
    } else if (activity.includes("Exercise") || activity.includes("exercise")) {
      details = `${Math.floor(random() * 45 + 15)} minutes`
    } else if (activity.includes("Insulin")) {
      details = `${Math.floor(random() * 10 + 5)} units`
    } else if (activity.includes("meal") || activity.includes("Meal")) {
      details = `${Math.floor(random() * 400 + 200)} calories`
    } else {
      details = "Routine monitoring completed"
    }
    
    activityLogsList.push({
      date,
      activity,
      details,
      time
    })
  }
  
  // Generate claims (2-6 claims)
  const claimsList: Claim[] = []
  const claimCount = 2 + Math.floor(random() * 5)
  
  for (let i = 0; i < claimCount; i++) {
    const submissionDate = generateDateInRange("2023-08-01", "2024-12-31")
    const claimType = randomChoice(claimTypes, random)
    const status = randomChoice(["Submitted", "Under Review", "Approved", "Reimbursed", "Rejected"], random)
    const amountClaimed = `₱${Math.floor(random() * 25000 + 3000)}`
    const reimbursementRate = random() < 0.1 ? 0 : 0.7 + random() * 0.3
    const amountReimbursed = status === "Reimbursed" || status === "Approved" 
      ? `₱${Math.floor(Number.parseInt(amountClaimed.slice(1)) * reimbursementRate)}` 
      : "₱0"
    
    claimsList.push({
      id: `CLM-${new Date(submissionDate).getFullYear()}-${String(i + 1).padStart(3, '0')}`,
      submissionDate,
      status,
      claimType,
      hospital: basePatientData.assigningAuthority,
      insuranceProvider: basePatientData.insuranceProvider,
      amountClaimed,
      amountReimbursed,
      reviewedBy: randomChoice(["Dr. Claims Officer", "Ms. Review Specialist", "Claims Manager"], random),
      documents: [`${claimType.toLowerCase().replace(/ /g, '_')}_bill.pdf`, "prescription.pdf", "report.pdf"],
      notes: `${claimType} for ${basePatientData.programName} - processed according to policy guidelines`
    })
  }
  
  // Generate health markers
  // Default (random) health markers generation
  const patientHealthMarkers: HealthMarker[] = []
  const selectedMarkers = randomChoices(healthMarkers, 8 + Math.floor(random() * 5), random)
  for (const marker of selectedMarkers) {
    const history = generateHealthMarkerHistory(marker, random)
    const latestValue = history[history.length - 1].value
    const trend = generateTrend(random)
    patientHealthMarkers.push({
      healthMarker: marker.name,
      category: marker.category,
      latestValue: latestValue.toString(),
      units: marker.units,
      trend,
      history,
      normalRange: {
        min: marker.normalRange[0],
        max: marker.normalRange[1]
      }
    })
  }
  
  // Generate lab reports (4-8 reports)
  const diagnosticsLabs = [
    "Dr. Lal PathLabs",
    "Metropolis Healthcare",
    "SRL Diagnostics", 
    "Thyrocare Technologies",
    "Apollo Diagnostics",
    "Vijaya Diagnostics",
    "Quest Diagnostics",
    "Religare Hi-Tech Lab",
    "Suburban Diagnostics",
    "Core Diagnostics",
    "Neuberg Diagnostics",
    "Supratech Micropath",
    "Pathkind Labs",
    "Ganesh Diagnostic",
    "Oncquest Laboratories"
  ]
  
  const labReportsList: LabReport[] = []
  const labCount = 4 + Math.floor(random() * 5)
  const selectedLabs = randomChoices(labTests, labCount, random)
  
  for (const lab of selectedLabs) {
    const date = generateDateInRange("2023-07-01", "2024-12-31")
    const diagnosticsName = randomChoice(diagnosticsLabs, random)
    labReportsList.push({
      date,
      testName: lab.name,
      category: lab.category,
      diagnosticsName,
      document: `${lab.name.toLowerCase().replace(/ /g, '_')}_${date}.pdf`,
      summary: lab.summary + ". Results reviewed and discussed with patient during consultation."
    })
  }
  
  // Build health marker trends from lab report dates (ONLY for Maria is already handled in the early-return branch above).

  // Generate medications (3-7 medications)
  const medicationsList: Medication[] = []
  const medicationCount = 3 + Math.floor(random() * 5)
  const selectedMeds = randomChoices(medications, medicationCount, random)
  
  // Get list of doctors from consultation history for prescriptions
  const consultingDoctors = [...new Set(consultationHistory.map(c => c.doctorName))]
  
  for (const med of selectedMeds) {
    const startDate = generateDateInRange("2023-06-01", "2024-08-31")
    const isOngoing = random() < 0.7
    const endDate = isOngoing ? "Ongoing" : generateDateInRange(startDate, "2024-12-31")
    const status = isOngoing ? "Active" : randomChoice(["Completed", "Discontinued"], random)
    
    // Select prescribing doctor from consultation history or primary doctor
    const prescribingDoctor = consultingDoctors.length > 0 && random() < 0.8 
      ? randomChoice(consultingDoctors, random)
      : basePatientData.doctorName
    
    medicationsList.push({
      medicationName: med.name,
      dosage: randomChoice(med.dosage, random),
      frequency: randomChoice(med.frequency, random),
      route: "Oral",
      startDate,
      endDate,
      prescribedBy: prescribingDoctor,
      purpose: med.purpose,
      status,
      notes: `${med.category} medication for ${basePatientData.programName.toLowerCase()}. Monitor for side effects and efficacy.`
    })
  }
  
  // Patient info
  const patientInfo: PatientDetailData = {
    empiId,
    name: basePatientData.name,
    mobile: basePatientData.mobileNumber,
    source: basePatientData.source,
    program: basePatientData.programName,
    doctorName: basePatientData.doctorName,
    assigningAuthority: basePatientData.assigningAuthority,
    abhaId: (basePatientData as any).abhaId || (basePatientData as any).cpf || '',
    cpf: (basePatientData as any).cpf || '',
    consultationTime: consultationHistory[0]?.date + " " + generateTimeString() || "Not scheduled",
    dateOfBirth: basePatientData.dateOfBirth,
    gender: basePatientData.gender,
    address: basePatientData.address,
    pincode: basePatientData.pincode,
    insuranceProvider: basePatientData.insuranceProvider,
    lastClaimSubmissionDate: basePatientData.lastClaimSubmissionDate,
    headOfFamily: basePatientData.headOfFamily,
    familyId: basePatientData.familyId,
    status: basePatientData.status,
    preferredLanguage: basePatientData.preferredLanguage,
    matchStrategy: basePatientData.matchStrategy
  }
  
  return {
    patientInfo,
    consultationHistory: consultationHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    symptoms: symptomsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    activityLogs: activityLogsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    claims: claimsList.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()),
    healthMarkers: patientHealthMarkers,
    labReports: labReportsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    medications: medicationsList.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  }
}
