export type CohortCode = "C1" | "C2" | "C3" | "C4" | "C5"

export interface Patient {
  empiId: string
  name: string
  mobileNumber: string
  source: string
  programName: string
  status: string
  doctorName: string
  lastConsultation: string
  nextConsultation: string
  insuranceProvider: string
  lastClaimSubmissionDate: string
  assigningAuthority: string
  headOfFamily: string
  familyId: string
  cpf: string
  cpfMasked: string
  dateOfBirth: string
  address: string
  pincode: string
  gender: string
  deceasedFlag: boolean
  preferredLanguage: string
  matchStrategy: string
  autoLinkFlag: boolean
  sourceSystems: string[]
  createdAt: string
  lastUpdatedAt: string
  cohort: CohortCode
  riskScore: number
}

const firstNames = [
  "Ana", "Maria", "João", "Pedro", "Luísa", "Carlos", "Fernanda", "Rafael", "Juliana", "Lucas",
  "Beatriz", "Gabriel", "Mariana", "Bruno", "Camila", "Thiago", "Larissa", "Felipe", "Amanda", "Rodrigo",
  "Isabela", "Gustavo", "Letícia", "André", "Patrícia", "Ricardo", "Daniela", "Eduardo", "Vanessa", "Matheus",
  "Carolina", "Diego", "Tatiana", "Renato", "Aline", "Marcelo", "Natália", "Paulo", "Bianca", "Vinícius"
]

const lastNames = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida", "Nascimento", "Lima", "Araújo",
  "Melo", "Barbosa", "Ribeiro", "Martins", "Carvalho", "Gomes", "Rocha", "Pereira", "Costa", "Cardoso",
  "Moreira", "Mendes", "Cavalcanti", "Monteiro", "Teixeira", "Nunes", "Correia", "Pinto", "Freitas", "Vieira"
]

const cities = [
  "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Salvador", "Brasília", "Fortaleza", "Curitiba", "Recife",
  "Porto Alegre", "Manaus", "Belém", "Goiânia", "Campinas", "Santos", "Florianópolis", "Vitória", "Natal",
  "Campo Grande", "João Pessoa", "Maceió"
]

const states = [
  "São Paulo", "Rio de Janeiro", "Minas Gerais", "Bahia", "Distrito Federal", "Ceará", "Paraná",
  "Pernambuco", "Rio Grande do Sul", "Amazonas", "Pará", "Goiás"
]

const hospitals = [
  "Hospital Albert Einstein", "Hospital Sírio-Libanês", "Hospital Oswaldo Cruz", "Hospital das Clínicas",
  "Hospital São Luiz", "Hospital Samaritano", "Hospital Copa D'Or", "Hospital Moinhos de Vento",
  "Hospital Nove de Julho", "Hospital Santa Catarina", "Novamed Clínica Centro", "Novamed Clínica Paulista",
  "Novamed Clínica Barra", "Novamed Clínica Sul"
]

const programs = [
  "Lifestyle Optimisation", "Diabetes Management", "Cancer Care", "Hypertension Control",
  "Preventive Screening", "CKD Management", "Mental Health Support", "Respiratory Care"
]

const languages = ["Português", "Espanhol", "Inglês"]

const sources = [
  "Walk-in", "Referral", "Emergency", "Online Registration", "Health Camp",
  "Insurance Network", "Telemedicine", "Mobile App", "Call Center"
]

const areas = [
  "Rua", "Avenida", "Travessa", "Alameda", "Praça", "Largo", "Estrada", "Rodovia"
]

// Simple seed function for consistent randomness
function seededRandom(seed: string): () => number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  return function () {
    hash = ((hash * 9301 + 49297) % 233280)
    return hash / 233280
  }
}

function generateCPF(): string {
  const d = () => Math.floor(Math.random() * 10)
  return `${d()}${d()}${d()}.${d()}${d()}${d()}.${d()}${d()}${d()}-${d()}${d()}`
}

function generateMobileNumber(): string {
  const ddd = [11, 21, 31, 41, 51, 61, 71, 81, 85, 92][Math.floor(Math.random() * 10)]
  const remaining = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
  return `+55 ${ddd} 9${remaining.slice(0, 4)}-${remaining.slice(4)}`
}

function generateDate(startYear: number, endYear: number): string {
  const start = new Date(startYear, 0, 1)
  const end = new Date(endYear, 11, 31)
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString().split('T')[0]
}

function generateDoctorName(): string {
  const titles = ["Dr.", "Dr.", "Dr.", "Dra.", "Dra.", "Dr. (Prof.)"]
  const title = titles[Math.floor(Math.random() * titles.length)]
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  const specialization = ["CRM", "CRM", "CRM", ""]
  const spec = specialization[Math.floor(Math.random() * specialization.length)]
  return spec ? `${title} ${firstName} ${lastName}, ${spec}` : `${title} ${firstName} ${lastName}`
}

function generatePincode(): string {
  const first = Math.floor(Math.random() * 90000 + 10000)
  const last = Math.floor(Math.random() * 900 + 100)
  return `${first}-${last}`
}

function assignCohort(random: () => number): CohortCode {
  const r = random()
  if (r < 0.10) return "C1"       // Paediatric ~10%
  if (r < 0.20) return "C2"       // Maternity ~10%
  if (r < 0.35) return "C3"       // Complex Care ~15%
  if (r < 0.75) return "C4"       // General Prevention ~40%
  return "C5"                      // Rising Cardiometabolic ~25%
}

function assignRiskScore(cohort: CohortCode, random: () => number): number {
  switch (cohort) {
    case "C1": return Math.floor(random() * 4 + 2)       // 2-5
    case "C2": return Math.floor(random() * 4 + 3)       // 3-6
    case "C3": return Math.floor(random() * 3 + 7)       // 7-9
    case "C4": return Math.floor(random() * 3 + 1)       // 1-3
    case "C5": return Math.floor(random() * 3 + 5)       // 5-7
  }
}

export function generatePatientsData(count: number = 500): Patient[] {
  const patients: Patient[] = []
  const familyGroups: { [key: string]: string } = {}

  for (let i = 0; i < count; i++) {
    const empiId = `EMPI${(1000000 + i).toString()}`
    const random = seededRandom(empiId)

    const firstName = firstNames[Math.floor(random() * firstNames.length)]
    const lastName = lastNames[Math.floor(random() * lastNames.length)]
    const gender = i % 2 === 0 ? "Male" : "Female"

    const city = cities[Math.floor(random() * cities.length)]
    const state = states[Math.floor(random() * states.length)]
    const area = areas[Math.floor(random() * areas.length)]

    let familyId = ""
    let headOfFamily = ""
    if (random() < 0.2 && Object.keys(familyGroups).length > 0) {
      const families = Object.keys(familyGroups)
      familyId = families[Math.floor(random() * families.length)]
      headOfFamily = familyGroups[familyId]
    } else {
      familyId = `FAM${(1000000 + i).toString()}`
      headOfFamily = `${firstName} ${lastName}`
      familyGroups[familyId] = headOfFamily
    }

    const cohort = assignCohort(random)
    const riskScore = assignRiskScore(cohort, random)

    const birthYear = cohort === "C1"
      ? 2024 - Math.floor(random() * 17 + 1)   // 1-17 for paediatric
      : 2024 - Math.floor(random() * 60 + 18)   // 18-77 for others
    const createdDate = generateDate(2023, 2025)
    const lastUpdatedDate = generateDate(2025, 2026)
    const lastConsultDate = generateDate(2025, 2026)
    const nextConsultDate = generateDate(2026, 2027)
    const lastClaimDate = random() < 0.7 ? generateDate(2025, 2026) : ""

    const cpf = generateCPF()

    const sourceSystems: string[] = []
    if (random() < 0.8) sourceSystems.push("HIS-001")
    if (random() < 0.6) sourceSystems.push("LAB-001")
    if (random() < 0.4) sourceSystems.push("PHAR-001")
    if (random() < 0.3) sourceSystems.push("RAD-001")
    if (sourceSystems.length === 0) sourceSystems.push("HIS-001")

    const patient: Patient = {
      empiId,
      name: `${firstName} ${lastName}`,
      mobileNumber: generateMobileNumber(),
      source: sources[Math.floor(random() * sources.length)],
      programName: programs[Math.floor(random() * programs.length)],
      status: random() < 0.7 ? "Active" : random() < 0.9 ? "Inactive" : "Pending",
      doctorName: generateDoctorName(),
      lastConsultation: lastConsultDate,
      nextConsultation: nextConsultDate,
      insuranceProvider: "Bradesco Saúde",
      lastClaimSubmissionDate: lastClaimDate,
      assigningAuthority: hospitals[Math.floor(random() * hospitals.length)],
      headOfFamily,
      familyId,
      cpf,
      cpfMasked: `***.${cpf.slice(4, 7)}.***-**`,
      dateOfBirth: `${birthYear}-${String(Math.floor(random() * 12 + 1)).padStart(2, '0')}-${String(Math.floor(random() * 28 + 1)).padStart(2, '0')}`,
      address: `${area} ${firstNames[Math.floor(random() * firstNames.length)]}, ${Math.floor(random() * 999 + 1)}, ${city}, ${state}`,
      pincode: generatePincode(),
      gender,
      deceasedFlag: random() < 0.02,
      preferredLanguage: languages[Math.floor(random() * languages.length)],
      matchStrategy: random() < 0.5 ? "Deterministic" : random() < 0.8 ? "Probabilistic" : "Hybrid",
      autoLinkFlag: random() < 0.7,
      sourceSystems,
      createdAt: createdDate,
      lastUpdatedAt: lastUpdatedDate,
      cohort,
      riskScore,
    }

    patients.push(patient)
  }

  return patients
}
