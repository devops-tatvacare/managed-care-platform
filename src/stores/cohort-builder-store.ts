import { create } from "zustand";
import * as programsApi from "@/services/api/programs";
import { apiRequest } from "@/services/api/client";
import { API_ENDPOINTS } from "@/config/api";
import { toast } from "sonner";
import type {
  ProgramDetail,
  CohortSummary,
  CohortCreate,
  CohortUpdate,
  CriteriaNode,
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
  generatedConfig: Record<string, any> | null;

  // Editing state
  selectedCohortId: string | null;
  isDirty: boolean;

  // Actions — Program
  loadProgram: (id: string) => Promise<void>;
  updateProgramMeta: (data: { name?: string; description?: string; condition?: string }) => Promise<void>;
  saveDraft: () => Promise<void>;
  publishProgram: () => Promise<ProgramVersion | null>;
  publishing: boolean;
  saving: boolean;

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
  applyGeneratedConfig: () => Promise<void>;
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
  publishing: false,
  saving: false,
  builderMode: "ai",
  chatMessages: [INITIAL_MESSAGE],
  chatLoading: false,
  generatedConfig: null,
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
      set({ program: updated, isDirty: true });
    } catch {
      set({ error: "Failed to update program" });
    }
  },

  saveDraft: async () => {
    const { program } = get();
    if (!program) return;
    set({ saving: true });
    try {
      await programsApi.updateProgram(program.id, { status: "draft" });
      await get().loadProgram(program.id);
      set({ isDirty: false });
    } catch {
      set({ error: "Failed to save draft" });
    } finally {
      set({ saving: false });
    }
  },

  publishProgram: async () => {
    const { program } = get();
    if (!program) return null;
    set({ publishing: true });
    try {
      const version = await programsApi.publishProgram(program.id);
      await get().loadProgram(program.id);
      set({ isDirty: false });
      return version;
    } catch {
      set({ error: "Failed to publish" });
      return null;
    } finally {
      set({ publishing: false });
    }
  },

  createCohort: async (data) => {
    const { program } = get();
    if (!program) return null;
    try {
      const cohort = await programsApi.createCohort(program.id, data);
      await get().loadProgram(program.id);
      set({ isDirty: true });
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
    set({ isDirty: true });
  },

  deleteCohort: async (cohortId) => {
    const { program } = get();
    if (!program) return;
    await programsApi.deleteCohort(program.id, cohortId);
    await get().loadProgram(program.id);
    set({ selectedCohortId: null, isDirty: true });
  },

  selectCohort: (cohortId) => set({ selectedCohortId: cohortId }),

  saveCriteria: async (cohortId, criteria) => {
    const { program } = get();
    if (!program) return;
    await programsApi.replaceCriteria(program.id, cohortId, criteria);
    await get().loadProgram(program.id);
    set({ isDirty: true });
  },

  saveEngine: async (data) => {
    const { program } = get();
    if (!program) return;
    await programsApi.upsertEngine(program.id, data);
    await get().loadProgram(program.id);
    set({ isDirty: true });
  },

  setBuilderMode: (mode) => set({ builderMode: mode }),

  sendChatMessage: async (text) => {
    const isFirstMessage = get().chatMessages.length <= 1;
    set((s) => ({
      chatMessages: [...s.chatMessages, { role: "user", content: text }],
      chatLoading: true,
    }));
    try {
      const result = await apiRequest<{
        message: string;
        config: Record<string, unknown> | null;
        surface: string;
        turn_count: number;
      }>({
        method: "POST",
        path: API_ENDPOINTS.builder.turn,
        body: {
          surface: "cohort_program",
          message: text,
          reset: isFirstMessage,
        },
      });
      set((s) => ({
        chatMessages: [...s.chatMessages, { role: "ai", content: result.message }],
        chatLoading: false,
        generatedConfig: result.config as any ?? s.generatedConfig,
      }));
    } catch {
      set((s) => ({
        chatMessages: [...s.chatMessages, { role: "ai", content: "Failed to generate. Please try again." }],
        chatLoading: false,
      }));
      toast.error("AI generation failed");
    }
  },

  applyGeneratedConfig: async () => {
    const { program, generatedConfig } = get();
    if (!program || !generatedConfig) return;

    try {
      await programsApi.updateProgram(program.id, {
        name: generatedConfig.program_name,
        condition: generatedConfig.condition,
        description: generatedConfig.description,
      });

      for (const cohort of generatedConfig.cohorts) {
        await programsApi.createCohort(program.id, cohort);
      }

      await programsApi.upsertEngine(program.id, {
        components: generatedConfig.scoring_engine.components,
        tiebreaker_rules: (generatedConfig.override_rules ?? []).map(
          (r: { priority: number; rule: string; action: string }) => ({ ...r, condition: {} }),
        ),
        aggregation_method: generatedConfig.scoring_engine.aggregation_method ?? "weighted_sum",
      } as any);

      await get().loadProgram(program.id);
      set({ generatedConfig: null, builderMode: "ai", isDirty: true });
      toast.success("Program configuration applied");
    } catch {
      toast.error("Failed to apply configuration");
    }
  },

  clearChat: () => {
    apiRequest({ method: "POST", path: API_ENDPOINTS.builder.reset, params: { surface: "cohort_program" } }).catch(() => {});
    set({
      chatMessages: [INITIAL_MESSAGE],
      chatLoading: false,
      generatedConfig: null,
    });
  },

  reset: () => set({
    program: null, programLoading: false, error: null, publishing: false, saving: false,
    builderMode: "ai",
    chatMessages: [INITIAL_MESSAGE],
    chatLoading: false, generatedConfig: null, selectedCohortId: null, isDirty: false,
  }),
}));
