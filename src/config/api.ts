export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    refresh: "/api/auth/refresh",
    me: "/api/auth/me",
  },
  patients: {
    list: "/api/patients",
    detail: (id: string) => `/api/patients/${id}`,
    labs: (id: string) => `/api/patients/${id}/labs`,
    medications: (id: string) => `/api/patients/${id}/medications`,
    protocols: (id: string) => `/api/patients/${id}/protocols`,
    timeline: (id: string) => `/api/patients/${id}/timeline`,
    communications: (id: string) => `/api/patients/${id}/communications`,
  },
  pathways: {
    list: "/api/pathways",
    detail: (id: string) => `/api/pathways/${id}`,
    publish: (id: string) => `/api/pathways/${id}/publish`,
    blocks: (id: string) => `/api/pathways/${id}/blocks`,
    block: (id: string, blockId: string) => `/api/pathways/${id}/blocks/${blockId}`,
    edges: (id: string) => `/api/pathways/${id}/edges`,
  },
  cohortisation: {
    tiers: "/api/cohortisation/tiers",
    crsConfig: "/api/cohortisation/crs-config",
    assignments: "/api/cohortisation/assignments",
    recalculate: "/api/cohortisation/recalculate",
    distribution: "/api/cohortisation/distribution",
  },
  communications: {
    threads: "/api/communications/threads",
    thread: (id: string) => `/api/communications/threads/${id}`,
    send: "/api/communications/send",
    orchestration: "/api/communications/orchestration",
    templates: "/api/communications/templates",
  },
  outcomes: {
    clinical: "/api/outcomes/clinical",
    hedis: "/api/outcomes/hedis",
    engagement: "/api/outcomes/engagement",
    financial: "/api/outcomes/financial",
    recohortisation: "/api/outcomes/recohortisation",
  },
  ai: {
    careSummary: "/api/ai/care-summary",
    pathwayGenerate: "/api/ai/pathway-generate",
    commsDraft: "/api/ai/comms-draft",
    populationInsights: "/api/ai/population-insights",
    commsRewrite: "/api/ai/comms-rewrite",
    sessions: "/api/ai/sessions",
    session: (id: string) => `/api/ai/sessions/${id}`,
  },
} as const;
