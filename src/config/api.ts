export const SERVER_API_BASE =
  process.env.BACKEND_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

export const API_ENDPOINTS = {
  auth: {
    login: "/api/auth/login",
    refresh: "/api/auth/refresh",
    me: "/api/auth/me",
  },
  patients: {
    list: "/api/patients",
    filterOptions: "/api/patients/filter-options",
    detail: (id: string) => `/api/patients/${id}`,
    labs: (id: string) => `/api/patients/${id}/labs`,
    medications: (id: string) => `/api/patients/${id}/medications`,
    protocols: (id: string) => `/api/patients/${id}/protocols`,
    timeline: (id: string) => `/api/patients/${id}/timeline`,
    communications: (id: string) => `/api/patients/${id}/communications`,
    cohortAssignments: (id: string) => `/api/patients/${id}/cohort-assignments`,
  },
  pathways: {
    list: "/api/pathways",
    detail: (id: string) => `/api/pathways/${id}`,
    publish: (id: string) => `/api/pathways/${id}/publish`,
    blocks: (id: string) => `/api/pathways/${id}/blocks`,
    block: (id: string, blockId: string) => `/api/pathways/${id}/blocks/${blockId}`,
    edges: (id: string) => `/api/pathways/${id}/edges`,
  },
  programs: {
    list: "/api/programs",
    detail: (id: string) => `/api/programs/${id}`,
    publish: (id: string) => `/api/programs/${id}/publish`,
    cohorts: (id: string) => `/api/programs/${id}/cohorts`,
    cohort: (id: string, cid: string) => `/api/programs/${id}/cohorts/${cid}`,
    criteria: (id: string, cid: string) => `/api/programs/${id}/cohorts/${cid}/criteria`,
    engine: (id: string) => `/api/programs/${id}/engine`,
  },
  cohortisation: {
    dashboard: "/api/cohortisation/dashboard",
    recalculate: "/api/cohortisation/recalculate",
    assignments: "/api/cohortisation/assignments",
    distribution: (programId: string) => `/api/cohortisation/distribution/${programId}`,
    stream: "/api/cohortisation/stream",
  },
  commandCenter: {
    kpis: "/api/command-center/kpis",
    actionQueue: "/api/command-center/action-queue",
    insights: "/api/command-center/insights",
    insightsStream: "/api/command-center/insights/stream",
    upcomingReviews: "/api/command-center/upcoming-reviews",
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
    migrationSummary: "/api/outcomes/migrations/summary",
    migrationHistory: "/api/outcomes/migrations/history",
    quarterlyInsight: "/api/outcomes/quarterly-insight",
    snapshots: "/api/outcomes/snapshots",
    snapshotHistory: "/api/outcomes/snapshots/history",
  },
  actions: {
    list: "/api/actions",
    update: (id: string) => `/api/actions/${id}`,
  },
  ai: {
    careSummary: "/api/ai/care-summary",
    pathwayGenerate: "/api/ai/pathway-generate",
    commsDraft: "/api/ai/comms-draft",
    populationInsights: "/api/ai/population-insights",
    commsRewrite: "/api/ai/comms-rewrite",
    sessions: "/api/ai/sessions",
    session: (id: string) => `/api/ai/sessions/${id}`,
    cohortGenerate: "/api/ai/cohort-generate",
  },
  builder: {
    turn: "/api/ai/builder/turn",
    reset: "/api/ai/builder/reset",
  },
} as const;
