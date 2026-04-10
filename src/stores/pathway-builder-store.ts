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
  AIGeneratedPathway,
  AISessionListItem,
} from "@/services/types/pathway";
import * as pathwaysApi from "@/services/api/pathways";
import { apiRequest } from "@/services/api/client";
import { API_ENDPOINTS } from "@/config/api";

type BuilderMode = "ai" | "canvas";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

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

  // AI Chat (persisted in store so tab switching doesn't lose state)
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  generatedPathway: AIGeneratedPathway | null;
  aiAccepted: boolean;
  sessions: AISessionListItem[];
  activeSessionId: string | null;
  showHistory: boolean;

  publishing: boolean;
  saving: boolean;

  // Actions — List
  loadPathways: () => Promise<void>;
  loadPathway: (id: string) => Promise<void>;
  createPathway: (data: PathwayCreate) => Promise<string>;
  updatePathwayMeta: (data: PathwayUpdate) => Promise<void>;
  saveDraft: () => Promise<void>;
  publishPathway: () => Promise<void>;

  // Actions — Blocks/Edges
  addBlock: (data: BlockCreate) => Promise<void>;
  updateBlock: (blockId: string, data: BlockUpdate) => Promise<void>;
  deleteBlock: (blockId: string) => Promise<void>;
  selectBlock: (blockId: string | null) => void;
  saveEdges: () => Promise<void>;
  setBuilderMode: (mode: BuilderMode) => void;
  setBlocks: (blocks: PathwayBlockSchema[]) => void;
  setEdges: (edges: PathwayEdgeSchema[]) => void;
  setDirty: (dirty: boolean) => void;

  // Actions — AI Chat
  sendChatMessage: (prompt: string) => Promise<void>;
  acceptGenerated: () => void;
  clearChat: () => void;
  loadSessions: () => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  deleteSessionById: (id: string) => Promise<void>;
  setShowHistory: (show: boolean) => void;
}

const INITIAL_MESSAGE: ChatMessage = {
  role: "ai",
  content: "I can help you design a care pathway. Describe the **target condition**, **patient criteria**, **key interventions**, and **escalation rules** — or pick a template below to get started.",
};

export type { ChatMessage, BuilderMode };

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
  publishing: false,
  saving: false,

  chatMessages: [INITIAL_MESSAGE],
  chatLoading: false,
  generatedPathway: null,
  aiAccepted: false,
  sessions: [],
  activeSessionId: null,
  showHistory: false,

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

  saveDraft: async () => {
    const { selectedPathway } = get();
    if (!selectedPathway) return;
    set({ saving: true, error: null });
    try {
      const updated = await pathwaysApi.updatePathway(selectedPathway.id, { status: "draft" });
      set({ selectedPathway: updated, saving: false, isDirty: false });
    } catch (err) {
      set({ saving: false, error: err instanceof Error ? err.message : "Failed to save draft" });
    }
  },

  publishPathway: async () => {
    const { selectedPathway } = get();
    if (!selectedPathway) return;
    set({ publishing: true, error: null });
    try {
      const published = await pathwaysApi.publishPathway(selectedPathway.id);
      set({ selectedPathway: published, publishing: false, isDirty: false });
    } catch (err) {
      set({ publishing: false, error: err instanceof Error ? err.message : "Failed to publish pathway" });
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

  // ── AI Chat Actions ─────────────────────────────────────────────────

  sendChatMessage: async (prompt) => {
    const isFirstMessage = get().chatMessages.length <= 1;
    const userMsg: ChatMessage = { role: "user", content: prompt };
    set((s) => ({ chatMessages: [...s.chatMessages, userMsg], chatLoading: true }));
    try {
      const result = await apiRequest<{
        message: string;
        config: AIGeneratedPathway | null;
        surface: string;
        turn_count: number;
        session_id: string;
      }>({
        method: "POST",
        path: API_ENDPOINTS.builder.turn,
        body: {
          surface: "pathway",
          message: prompt,
          reset: isFirstMessage,
        },
      });
      const aiMsg: ChatMessage = { role: "ai", content: result.message };
      set((s) => ({
        chatMessages: [...s.chatMessages, aiMsg],
        generatedPathway: result.config ?? s.generatedPathway,
        chatLoading: false,
        activeSessionId: result.session_id,
      }));
    } catch {
      const errMsg: ChatMessage = { role: "ai", content: "Something went wrong generating the pathway. Please try again." };
      set((s) => ({
        chatMessages: [...s.chatMessages, errMsg],
        chatLoading: false,
      }));
    }
  },

  acceptGenerated: () => {
    const { generatedPathway } = get();
    if (!generatedPathway) return;

    const blockIdMap = new Map<number, string>();
    const blocks: PathwayBlockSchema[] = generatedPathway.blocks.map((block, i) => {
      const id = crypto.randomUUID();
      blockIdMap.set(block.order_index, id);
      return {
        id,
        block_type: block.block_type,
        category: block.category,
        label: block.label,
        config: block.config,
        position: { x: 300, y: i * 180 },
        order_index: block.order_index,
      };
    });

    const edges: PathwayEdgeSchema[] = generatedPathway.edges
      .map((edge) => {
        const sourceId = blockIdMap.get(edge.source_index);
        const targetId = blockIdMap.get(edge.target_index);
        if (!sourceId || !targetId) return null;
        return {
          id: crypto.randomUUID(),
          source_block_id: sourceId,
          target_block_id: targetId,
          edge_type: edge.edge_type,
          label: edge.label ?? null,
        };
      })
      .filter((e): e is PathwayEdgeSchema => e !== null);

    set({ blocks, edges, builderMode: "canvas", isDirty: true, aiAccepted: true });
  },

  clearChat: () => {
    apiRequest({ method: "POST", path: API_ENDPOINTS.builder.reset, params: { surface: "pathway" } }).catch(() => {});
    set({
      chatMessages: [INITIAL_MESSAGE],
      generatedPathway: null,
      aiAccepted: false,
      activeSessionId: null,
      chatLoading: false,
    });
  },

  loadSessions: async () => {
    try {
      const sessions = await pathwaysApi.fetchSessions();
      set({ sessions });
    } catch {
      // silently fail — sessions are optional
    }
  },

  loadSession: async (id) => {
    try {
      const session = await pathwaysApi.fetchSession(id);
      set({
        activeSessionId: session.id,
        chatMessages: (session.messages as ChatMessage[]) ?? [INITIAL_MESSAGE],
        generatedPathway: session.generated_pathway,
        showHistory: false,
      });
    } catch {
      set({ error: "Failed to load session" });
    }
  },

  deleteSessionById: async (id) => {
    try {
      await pathwaysApi.deleteSession(id);
      set((s) => ({
        sessions: s.sessions.filter((sess) => sess.id !== id),
        ...(s.activeSessionId === id ? { activeSessionId: null, chatMessages: [INITIAL_MESSAGE], generatedPathway: null } : {}),
      }));
    } catch {
      // silently fail
    }
  },

  setShowHistory: (show) => {
    if (show) get().loadSessions();
    set({ showHistory: show });
  },
}));
