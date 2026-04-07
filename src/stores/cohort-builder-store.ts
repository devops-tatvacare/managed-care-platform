import { create } from "zustand";
import * as programsApi from "@/services/api/programs";
import type {
  ProgramDetail,
  CohortSummary,
  CohortCreate,
  CohortUpdate,
  CriteriaNode,
  ScoringEngineSummary,
  ScoringEngineUpsert,
  ProgramVersion,
} from "@/services/types/program";

type BuilderMode = "ai" | "config";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

interface CohortBuilderStore {
  // Program
  program: ProgramDetail | null;
  programLoading: boolean;
  error: string | null;

  // Builder mode
  builderMode: BuilderMode;

  // AI Chat
  chatMessages: ChatMessage[];
  chatLoading: boolean;

  // Editing state
  selectedCohortId: string | null;
  isDirty: boolean;

  // Actions — Program
  loadProgram: (id: string) => Promise<void>;
  updateProgramMeta: (data: { name?: string; description?: string; condition?: string }) => Promise<void>;
  publishProgram: () => Promise<ProgramVersion | null>;

  // Actions — Cohorts
  createCohort: (data: CohortCreate) => Promise<CohortSummary | null>;
  updateCohort: (cohortId: string, data: CohortUpdate) => Promise<void>;
  deleteCohort: (cohortId: string) => Promise<void>;
  selectCohort: (cohortId: string | null) => void;
  saveCriteria: (cohortId: string, criteria: CriteriaNode[]) => Promise<void>;

  // Actions — Scoring Engine
  saveEngine: (data: ScoringEngineUpsert) => Promise<void>;

  // Actions — Builder
  setBuilderMode: (mode: BuilderMode) => void;
  sendChatMessage: (text: string) => Promise<void>;
  clearChat: () => void;

  // Reset
  reset: () => void;
}

const INITIAL_MESSAGE: ChatMessage = {
  role: "ai",
  content: "Describe the cohort program you want to create. I'll generate the cohorts, scoring engine, and criteria for you.",
};

export type { ChatMessage, BuilderMode };

export const useCohortBuilderStore = create<CohortBuilderStore>((set, get) => ({
  program: null,
  programLoading: false,
  error: null,
  builderMode: "config",
  chatMessages: [INITIAL_MESSAGE],
  chatLoading: false,
  selectedCohortId: null,
  isDirty: false,

  loadProgram: async (id) => {
    set({ programLoading: true, error: null });
    try {
      const program = await programsApi.fetchProgram(id);
      set({ program, programLoading: false });
    } catch {
      set({ error: "Failed to load program", programLoading: false });
    }
  },

  updateProgramMeta: async (data) => {
    const { program } = get();
    if (!program) return;
    try {
      const updated = await programsApi.updateProgram(program.id, data);
      set({ program: updated });
    } catch {
      set({ error: "Failed to update program" });
    }
  },

  publishProgram: async () => {
    const { program } = get();
    if (!program) return null;
    try {
      const version = await programsApi.publishProgram(program.id);
      await get().loadProgram(program.id);
      return version;
    } catch {
      set({ error: "Failed to publish" });
      return null;
    }
  },

  createCohort: async (data) => {
    const { program } = get();
    if (!program) return null;
    try {
      const cohort = await programsApi.createCohort(program.id, data);
      await get().loadProgram(program.id);
      return cohort;
    } catch {
      return null;
    }
  },

  updateCohort: async (cohortId, data) => {
    const { program } = get();
    if (!program) return;
    await programsApi.updateCohort(program.id, cohortId, data);
    await get().loadProgram(program.id);
  },

  deleteCohort: async (cohortId) => {
    const { program } = get();
    if (!program) return;
    await programsApi.deleteCohort(program.id, cohortId);
    await get().loadProgram(program.id);
    set({ selectedCohortId: null });
  },

  selectCohort: (cohortId) => set({ selectedCohortId: cohortId }),

  saveCriteria: async (cohortId, criteria) => {
    const { program } = get();
    if (!program) return;
    await programsApi.replaceCriteria(program.id, cohortId, criteria);
    await get().loadProgram(program.id);
  },

  saveEngine: async (data) => {
    const { program } = get();
    if (!program) return;
    await programsApi.upsertEngine(program.id, data);
    await get().loadProgram(program.id);
  },

  setBuilderMode: (mode) => set({ builderMode: mode }),

  sendChatMessage: async (text) => {
    set((s) => ({
      chatMessages: [...s.chatMessages, { role: "user", content: text }],
      chatLoading: true,
    }));
    // AI endpoint will be wired in Phase 4C or later — for now, stub response
    setTimeout(() => {
      set((s) => ({
        chatMessages: [...s.chatMessages, { role: "ai", content: "AI cohort generation will be available soon. For now, use the Configuration tab to set up your program manually." }],
        chatLoading: false,
      }));
    }, 500);
  },

  clearChat: () => set({
    chatMessages: [INITIAL_MESSAGE],
    chatLoading: false,
  }),

  reset: () => set({
    program: null, programLoading: false, error: null,
    builderMode: "config",
    chatMessages: [INITIAL_MESSAGE],
    chatLoading: false, selectedCohortId: null, isDirty: false,
  }),
}));
