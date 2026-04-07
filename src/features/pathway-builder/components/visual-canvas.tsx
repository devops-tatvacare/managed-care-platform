"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  applyNodeChanges,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PathwayBlockNode } from "./pathway-block-node";
import { usePathwayBuilderStore } from "@/stores/pathway-builder-store";
import type { PathwayBlockSchema, PathwayEdgeSchema } from "@/services/types/pathway";

// ── Helpers ─────────────────────────────────────────────────────────────

function blocksToNodes(blocks: PathwayBlockSchema[]): Node[] {
  return blocks.map((b) => ({
    id: b.id,
    type: "pathwayBlock",
    position: b.position ?? { x: 0, y: 0 },
    data: { label: b.label, block_type: b.block_type, category: b.category },
  }));
}

function storeEdgesToFlowEdges(storeEdges: PathwayEdgeSchema[]): Edge[] {
  return storeEdges.map((e) => ({
    id: e.id,
    source: e.source_block_id,
    target: e.target_block_id,
    type: "smoothstep",
    label: e.label ?? undefined,
    animated: e.edge_type === "true_branch",
    style: {
      stroke:
        e.edge_type === "true_branch"
          ? "#22c55e"
          : e.edge_type === "false_branch"
            ? "#ef4444"
            : "#94a3b8",
      strokeWidth: 2,
    },
  }));
}

// ── Canvas Inner ────────────────────────────────────────────────────────

function VisualCanvasInner() {
  const storeBlocks = usePathwayBuilderStore((s) => s.blocks);
  const storeEdges = usePathwayBuilderStore((s) => s.edges);
  const selectBlock = usePathwayBuilderStore((s) => s.selectBlock);
  const addBlock = usePathwayBuilderStore((s) => s.addBlock);
  const setStoreBlocks = usePathwayBuilderStore((s) => s.setBlocks);
  const setStoreEdges = usePathwayBuilderStore((s) => s.setEdges);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodeTypes = useMemo(() => ({ pathwayBlock: PathwayBlockNode }), []);

  // Derive React Flow nodes/edges from store on every render — single source of truth
  const nodes = useMemo(() => blocksToNodes(storeBlocks), [storeBlocks]);
  const edges = useMemo(() => storeEdgesToFlowEdges(storeEdges), [storeEdges]);

  // Handle React Flow node changes (drag, select, remove) → write back to store
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const updatedNodes = applyNodeChanges(changes, nodes);

      // Check if positions changed (drag)
      const positionChanged = changes.some((c) => c.type === "position" && c.dragging === false);
      if (positionChanged) {
        const updatedBlocks = storeBlocks.map((block) => {
          const node = updatedNodes.find((n) => n.id === block.id);
          if (node && node.position) {
            return { ...block, position: node.position };
          }
          return block;
        });
        setStoreBlocks(updatedBlocks);
      }

      // Check for removals
      const removals = changes.filter((c) => c.type === "remove");
      if (removals.length > 0) {
        const removedIds = new Set(removals.map((c) => c.id));
        const filteredBlocks = storeBlocks.filter((b) => !removedIds.has(b.id));
        const filteredEdges = storeEdges.filter(
          (e) => !removedIds.has(e.source_block_id) && !removedIds.has(e.target_block_id),
        );
        setStoreBlocks(filteredBlocks);
        setStoreEdges(filteredEdges);
      }
    },
    [nodes, storeBlocks, storeEdges, setStoreBlocks, setStoreEdges],
  );

  // Handle React Flow edge changes → write back to store
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const removals = changes.filter((c) => c.type === "remove");
      if (removals.length > 0) {
        const removedIds = new Set(removals.map((c) => c.id));
        setStoreEdges(storeEdges.filter((e) => !removedIds.has(e.id)));
      }
    },
    [storeEdges, setStoreEdges],
  );

  // New edge connection
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge: PathwayEdgeSchema = {
        id: `e-${connection.source}-${connection.target}`,
        source_block_id: connection.source,
        target_block_id: connection.target,
        edge_type: "default",
        label: null,
      };
      setStoreEdges([...storeEdges, newEdge]);
    },
    [storeEdges, setStoreEdges],
  );

  // Click node → select block for config drawer
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => selectBlock(node.id),
    [selectBlock],
  );

  // Drag-and-drop from component library — only add to store, not to local React Flow state
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      try {
        const data = JSON.parse(raw) as { block_type: string; category: string; label: string };
        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        // Only add to store — React Flow will pick it up via derived nodes
        addBlock({ block_type: data.block_type, category: data.category, label: data.label, position });
      } catch {
        // ignore
      }
    },
    [screenToFlowPosition, addBlock],
  );

  return (
    <div ref={wrapperRef} className="h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-bg-secondary"
      >
        <Background gap={20} size={1} color="#e2e8f0" />
        <Controls
          showInteractive={false}
          className="!bg-bg-primary !border !border-border-default !rounded-lg !shadow-sm [&>button]:!border-border-default [&>button]:!bg-bg-primary"
        />
        <MiniMap
          className="!bg-bg-primary !border !border-border-default !rounded-lg !shadow-sm"
          maskColor="rgba(248,250,252,0.7)"
          nodeColor={(node) => {
            const cat = (node.data as { category?: string })?.category;
            if (cat === "eligibility") return "#22c55e";
            if (cat === "action") return "#4f46e5";
            if (cat === "logic") return "#f59e0b";
            if (cat === "escalation") return "#ef4444";
            if (cat === "schedule") return "#0891b2";
            return "#94a3b8";
          }}
        />
      </ReactFlow>
    </div>
  );
}

// ── Export ───────────────────────────────────────────────────────────────

export function VisualCanvas() {
  return (
    <ReactFlowProvider>
      <VisualCanvasInner />
    </ReactFlowProvider>
  );
}
