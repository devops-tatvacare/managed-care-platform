import { create } from "zustand";
import type {
  PatientListItem,
  PatientDetail,
  PatientLabRecord,
  PatientDiagnosisRecord,
  PatientFilterOptions,
} from "@/services/types/patient";
import * as patientsApi from "@/services/api/patients";

interface PatientFilters {
  search: string;
  pathwayStatus: string | undefined;
  pathwayName: string | undefined;
  assignedTo: string | undefined;
  programId: string | undefined;
  cohortId: string | undefined;
}

interface PatientsState {
  // List
  patients: PatientListItem[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  filters: PatientFilters;
  filterOptions: PatientFilterOptions | null;
  loading: boolean;
  error: string | null;

  // Detail
  selectedPatient: PatientDetail | null;
  labs: PatientLabRecord[];
  diagnoses: PatientDiagnosisRecord[];
  detailLoading: boolean;

  // Actions
  loadPatients: () => Promise<void>;
  loadFilterOptions: () => Promise<void>;
  loadPatient: (id: string) => Promise<void>;
  loadLabs: (id: string) => Promise<void>;
  loadDiagnoses: (id: string) => Promise<void>;
  setPage: (page: number) => void;
  setFilters: (filters: Partial<PatientFilters>) => void;
  resetFilters: () => void;
  resetDetail: () => void;
}

export const usePatientsStore = create<PatientsState>((set, get) => ({
  patients: [],
  total: 0,
  page: 1,
  pageSize: 50,
  pages: 0,
  filterOptions: null,

  filters: { search: "", pathwayStatus: undefined, pathwayName: undefined, assignedTo: undefined, programId: undefined, cohortId: undefined },
  loading: false,
  error: null,

  selectedPatient: null,
  labs: [],
  diagnoses: [],
  detailLoading: false,

  loadPatients: async () => {
    const { page, pageSize, filters } = get();
    set({ loading: true, error: null });
    try {
      const res = await patientsApi.fetchPatients({
        page,
        page_size: pageSize,
        search: filters.search || undefined,
        pathway_status: filters.pathwayStatus,
        pathway_name: filters.pathwayName,
        assigned_to: filters.assignedTo,
        program_id: filters.programId,
        cohort_id: filters.cohortId,
      });
      set({
        patients: res.items,
        total: res.total,
        pages: res.pages,
        loading: false,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load patients", loading: false });
    }
  },

  loadFilterOptions: async () => {
    try {
      const options = await patientsApi.fetchPatientFilterOptions();
      set({ filterOptions: options });
    } catch {
      // silently fail — filter options are supplementary
    }
  },

  loadPatient: async (id) => {
    set({ detailLoading: true, selectedPatient: null, labs: [], diagnoses: [] });
    try {
      const patient = await patientsApi.fetchPatient(id);
      set({ selectedPatient: patient, detailLoading: false });
    } catch (err) {
      set({ detailLoading: false, error: err instanceof Error ? err.message : "Failed to load patient" });
    }
  },

  loadLabs: async (id) => {
    try {
      const labs = await patientsApi.fetchPatientLabs(id);
      set({ labs });
    } catch {
      // silently fail — labs are supplementary
    }
  },

  loadDiagnoses: async (id) => {
    try {
      const diagnoses = await patientsApi.fetchPatientDiagnoses(id);
      set({ diagnoses });
    } catch {
      // silently fail
    }
  },

  setPage: (page) => {
    set({ page });
    get().loadPatients();
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      page: 1,
    }));
    get().loadPatients();
  },

  resetFilters: () => {
    set({
      filters: { search: "", pathwayStatus: undefined, pathwayName: undefined, assignedTo: undefined, programId: undefined, cohortId: undefined },
      page: 1,
    });
    get().loadPatients();
  },

  resetDetail: () => {
    set({ selectedPatient: null, labs: [], diagnoses: [] });
  },
}));
