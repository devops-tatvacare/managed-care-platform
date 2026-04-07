import { create } from "zustand";
import type {
  PathwayListItem,
  PathwayDetail,
  PathwayBlockSchema,
  PathwayEdgeSchema,
  PathwayCreate,
  PathwayUpdate,
  BlockCreate,
  BlockUpdate,
} from "@/services/types/pathway";
import * as pathwaysApi from "@/services/api/pathways";

type BuilderMode = "ai" | "canvas" | "config";

interface PathwayBuilderState {
  // List
  pathways: PathwayListItem[];
  total: number;
  loading: boolean;
  error: string | null;

  // Builder
  selectedPathway: PathwayDetail | null;
  blocks: PathwayBlockSchema[];
  edges: PathwayEdgeSchema[];
  selectedBlockId: string | null;
  builderMode: BuilderMode;
  isDirty: boolean;
  builderLoading: boolean;

  // Actions
  loadPathways: () => Promise<void>;
  loadPathway: (id: string) => Promise<void>;
  createPathway: (data: PathwayCreate) => Promise<string>;
  updatePathwayMeta: (data: PathwayUpdate) => Promise<void>;
  publishPathway: () => Promise<void>;
  addBlock: (data: BlockCreate) => Promise<void>;
  updateBlock: (blockId: string, data: BlockUpdate) => Promise<void>;
  deleteBlock: (blockId: string) => Promise<void>;
  selectBlock: (blockId: string | null) => void;
  saveEdges: () => Promise<void>;
  setBuilderMode: (mode: BuilderMode) => void;
  setBlocks: (blocks: PathwayBlockSchema[]) => void;
  setEdges: (edges: PathwayEdgeSchema[]) => void;
  setDirty: (dirty: boolean) => void;
}

export const usePathwayBuilderStore = create<PathwayBuilderState>((set, get) => ({
  pathways: [],
  total: 0,
  loading: false,
  error: null,

  selectedPathway: null,
  blocks: [],
  edges: [],
  selectedBlockId: null,
  builderMode: "ai",
  isDirty: false,
  builderLoading: false,

  loadPathways: async () => {
    set({ loading: true, error: null });
    try {
      const res = await pathwaysApi.fetchPathways();
      set({ pathways: res.items, total: res.total, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load pathways", loading: false });
    }
  },

  loadPathway: async (id) => {
    set({ builderLoading: true, selectedPathway: null, blocks: [], edges: [], selectedBlockId: null, isDirty: false });
    try {
      const pathway = await pathwaysApi.fetchPathway(id);
      set({
        selectedPathway: pathway,
        blocks: pathway.blocks,
        edges: pathway.edges,
        builderLoading: false,
      });
    } catch (err) {
      set({ builderLoading: false, error: err instanceof Error ? err.message : "Failed to load pathway" });
    }
  },

  createPathway: async (data) => {
    set({ builderLoading: true, error: null });
    try {
      const pathway = await pathwaysApi.createPathway(data);
      set({ builderLoading: false });
      return pathway.id;
    } catch (err) {
      set({ builderLoading: false, error: err instanceof Error ? err.message : "Failed to create pathway" });
      throw err;
    }
  },

  updatePathwayMeta: async (data) => {
    const { selectedPathway } = get();
    if (!selectedPathway) return;
    set({ builderLoading: true, error: null });
    try {
      const updated = await pathwaysApi.updatePathway(selectedPathway.id, data);
      set({ selectedPathway: updated, builderLoading: false });
    } catch (err) {
      set({ builderLoading: false, error: err instanceof Error ? err.message : "Failed to update pathway" });
    }
  },

  publishPathway: async () => {
    const { selectedPathway } = get();
    if (!selectedPathway) return;
    set({ builderLoading: true, error: null });
    try {
      const published = await pathwaysApi.publishPathway(selectedPathway.id);
      set({ selectedPathway: published, builderLoading: false });
    } catch (err) {
      set({ builderLoading: false, error: err instanceof Error ? err.message : "Failed to publish pathway" });
    }
  },

  addBlock: async (data) => {
    const { selectedPathway } = get();
    // Create block locally first so drag-and-drop is instant
    const localBlock = {
      id: crypto.randomUUID(),
      block_type: data.block_type,
      category: data.category,
      label: data.label,
      config: data.config ?? {},
      position: data.position ?? null,
      order_index: data.order_index ?? get().blocks.length,
    };
    set((state) => ({
      blocks: [...state.blocks, localBlock],
      isDirty: true,
    }));
    // Persist to backend if pathway exists
    if (selectedPathway) {
      try {
        const savedBlock = await pathwaysApi.addBlock(selectedPathway.id, data);
        // Replace local block with server-assigned ID
        set((state) => ({
          blocks: state.blocks.map((b) => (b.id === localBlock.id ? savedBlock : b)),
        }));
      } catch {
        // Keep local block — will be saved on next "Save Draft"
      }
    }
  },

  updateBlock: async (blockId, data) => {
    const { selectedPathway } = get();
    if (!selectedPathway) return;
    set({ builderLoading: true, error: null });
    try {
      const updated = await pathwaysApi.updateBlock(selectedPathway.id, blockId, data);
      set((state) => ({
        blocks: state.blocks.map((b) => (b.id === blockId ? updated : b)),
        isDirty: true,
        builderLoading: false,
      }));
    } catch (err) {
      set({ builderLoading: false, error: err instanceof Error ? err.message : "Failed to update block" });
    }
  },

  deleteBlock: async (blockId) => {
    const { selectedPathway } = get();
    if (!selectedPathway) return;
    set({ builderLoading: true, error: null });
    try {
      await pathwaysApi.deleteBlock(selectedPathway.id, blockId);
      set((state) => ({
        blocks: state.blocks.filter((b) => b.id !== blockId),
        edges: state.edges.filter((e) => e.source_block_id !== blockId && e.target_block_id !== blockId),
        selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId,
        isDirty: true,
        builderLoading: false,
      }));
    } catch (err) {
      set({ builderLoading: false, error: err instanceof Error ? err.message : "Failed to delete block" });
    }
  },

  selectBlock: (blockId) => {
    set({ selectedBlockId: blockId });
  },

  saveEdges: async () => {
    const { selectedPathway, edges } = get();
    if (!selectedPathway) return;
    set({ builderLoading: true, error: null });
    try {
      const saved = await pathwaysApi.saveEdges(selectedPathway.id, edges);
      set({ edges: saved, isDirty: false, builderLoading: false });
    } catch (err) {
      set({ builderLoading: false, error: err instanceof Error ? err.message : "Failed to save edges" });
    }
  },

  setBuilderMode: (mode) => {
    set({ builderMode: mode });
  },

  setBlocks: (blocks) => {
    set({ blocks, isDirty: true });
  },

  setEdges: (edges) => {
    set({ edges, isDirty: true });
  },

  setDirty: (dirty) => {
    set({ isDirty: dirty });
  },
}));
