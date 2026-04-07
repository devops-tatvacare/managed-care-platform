import { create } from "zustand";
import {
  fetchThreads,
  fetchThread,
  fetchOrchestration,
  fetchTemplates,
  sendAction,
  draftMessage,
  rewriteMessage,
} from "@/services/api/communications";
import { fetchPatient, fetchPatientCohorts } from "@/services/api/patients";
import { fetchPrograms } from "@/services/api/programs";
import type {
  ThreadSummary,
  ThreadDetail,
  OrchestrationResponse,
  MessageTemplate,
  CommsDraftResponse,
  CommsRewriteResponse,
} from "@/services/types/communications";
import type { PatientDetail } from "@/services/types/patient";
import type { AssignmentRecord } from "@/services/types/cohort";
import type { ProgramListItem } from "@/services/types/program";

interface CommsState {
  // Threads
  threads: ThreadSummary[];
  threadsTotal: number;
  threadsPage: number;
  threadsLoading: boolean;
  selectedThread: ThreadDetail | null;
  selectedThreadLoading: boolean;

  // Patient context
  selectedPatient: PatientDetail | null;
  selectedPatientCohorts: AssignmentRecord[];
  patientContextLoading: boolean;

  // Orchestration
  orchestration: OrchestrationResponse | null;
  orchestrationLoading: boolean;

  // Templates
  templates: MessageTemplate[];
  templatesLoading: boolean;

  // Programs (for filters)
  programs: ProgramListItem[];

  // AI
  draftLoading: boolean;
  rewriteLoading: boolean;

  // Actions
  loadThreads: (page?: number, channel?: string) => Promise<void>;
  selectThread: (patientId: string) => Promise<void>;
  loadOrchestration: (params?: {
    page?: number;
    program_id?: string;
    cohort_id?: string;
    channel?: string;
    status?: string;
  }) => Promise<void>;
  loadTemplates: () => Promise<void>;
  loadPrograms: () => Promise<void>;
  doSend: (patientId: string, channel: string, actionType: string, payload?: Record<string, unknown>) => Promise<void>;
  doDraft: (patientId: string, templateId?: string, context?: string) => Promise<CommsDraftResponse | null>;
  doRewrite: (text: string, instruction: string) => Promise<CommsRewriteResponse | null>;
  reset: () => void;
}

export const useCommunicationsStore = create<CommsState>((set, get) => ({
  threads: [],
  threadsTotal: 0,
  threadsPage: 1,
  threadsLoading: false,
  selectedThread: null,
  selectedThreadLoading: false,
  selectedPatient: null,
  selectedPatientCohorts: [],
  patientContextLoading: false,
  orchestration: null,
  orchestrationLoading: false,
  templates: [],
  templatesLoading: false,
  programs: [],
  draftLoading: false,
  rewriteLoading: false,

  loadThreads: async (page = 1, channel) => {
    set({ threadsLoading: true });
    try {
      const data = await fetchThreads({ page, page_size: 20, channel });
      set({ threads: data.items, threadsTotal: data.total, threadsPage: page, threadsLoading: false });
    } catch {
      set({ threadsLoading: false });
    }
  },

  selectThread: async (patientId) => {
    set({ selectedThreadLoading: true, patientContextLoading: true });
    try {
      const [thread, patient, cohorts] = await Promise.all([
        fetchThread(patientId),
        fetchPatient(patientId),
        fetchPatientCohorts(patientId),
      ]);
      set({
        selectedThread: thread,
        selectedThreadLoading: false,
        selectedPatient: patient,
        selectedPatientCohorts: cohorts,
        patientContextLoading: false,
      });
    } catch {
      set({ selectedThreadLoading: false, patientContextLoading: false });
    }
  },

  loadOrchestration: async (params = {}) => {
    set({ orchestrationLoading: true });
    try {
      const data = await fetchOrchestration({ page_size: 25, ...params });
      set({ orchestration: data, orchestrationLoading: false });
    } catch {
      set({ orchestrationLoading: false });
    }
  },

  loadTemplates: async () => {
    set({ templatesLoading: true });
    try {
      const data = await fetchTemplates();
      set({ templates: data.items, templatesLoading: false });
    } catch {
      set({ templatesLoading: false });
    }
  },

  loadPrograms: async () => {
    try {
      const programs = await fetchPrograms();
      set({ programs });
    } catch {
      // ignore
    }
  },

  doSend: async (patientId, channel, actionType, payload) => {
    await sendAction({ patient_id: patientId, channel, action_type: `${channel === "whatsapp" ? "wa" : channel}_dispatched`, payload });
    // Refresh thread
    const { selectedThread, selectThread, loadThreads, threadsPage } = get();
    if (selectedThread?.patient_id === patientId) {
      await selectThread(patientId);
    }
    await loadThreads(threadsPage);
  },

  doDraft: async (patientId, templateId, context) => {
    set({ draftLoading: true });
    try {
      const result = await draftMessage({ patient_id: patientId, template_id: templateId, context });
      set({ draftLoading: false });
      return result;
    } catch {
      set({ draftLoading: false });
      return null;
    }
  },

  doRewrite: async (text, instruction) => {
    set({ rewriteLoading: true });
    try {
      const result = await rewriteMessage({ text, instruction });
      set({ rewriteLoading: false });
      return result;
    } catch {
      set({ rewriteLoading: false });
      return null;
    }
  },

  reset: () =>
    set({
      threads: [], threadsTotal: 0, threadsPage: 1, threadsLoading: false,
      selectedThread: null, selectedThreadLoading: false,
      selectedPatient: null, selectedPatientCohorts: [], patientContextLoading: false,
      orchestration: null, orchestrationLoading: false,
      templates: [], templatesLoading: false,
      programs: [],
      draftLoading: false, rewriteLoading: false,
    }),
}));
