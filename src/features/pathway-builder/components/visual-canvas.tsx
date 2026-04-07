"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PathwayBlockNode } from "./pathway-block-node";
import { usePathwayBuilderStore } from "@/stores/pathway-builder-store";
import type { PathwayEdgeSchema } from "@/services/types/pathway";

// ── Helpers ─────────────────────────────────────────────────────────────

function blocksToNodes(
  blocks: ReturnType<typeof usePathwayBuilderStore.getState>["blocks"],
): Node[] {
  return blocks.map((b) => ({
    id: b.id,
    type: "pathwayBlock",
    position: b.position ?? { x: 0, y: 0 },
    data: { label: b.label, block_type: b.block_type, category: b.category },
  }));
}

function storeEdgesToFlowEdges(
  storeEdges: ReturnType<typeof usePathwayBuilderStore.getState>["edges"],
): Edge[] {
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
  const setDirty = usePathwayBuilderStore((s) => s.setDirty);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const nodeTypes = useMemo(() => ({ pathwayBlock: PathwayBlockNode }), []);

  // React Flow internal state
  const [nodes, setNodes, onNodesChange] = useNodesState(blocksToNodes(storeBlocks));
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdgesToFlowEdges(storeEdges));

  // Sync store → React Flow when store blocks/edges change (e.g. from API load or AI accept)
  const prevBlockIdsRef = useRef<string>("");
  const prevEdgeIdsRef = useRef<string>("");

  useEffect(() => {
    const blockIds = storeBlocks.map((b) => b.id).join(",");
    if (blockIds !== prevBlockIdsRef.current) {
      prevBlockIdsRef.current = blockIds;
      setNodes(blocksToNodes(storeBlocks));
      // fitView after nodes update
      setTimeout(() => fitView({ padding: 0.15 }), 100);
    }
  }, [storeBlocks, setNodes, fitView]);

  useEffect(() => {
    const edgeIds = storeEdges.map((e) => e.id).join(",");
    if (edgeIds !== prevEdgeIdsRef.current) {
      prevEdgeIdsRef.current = edgeIds;
      setEdges(storeEdgesToFlowEdges(storeEdges));
    }
  }, [storeEdges, setEdges]);

  // Sync position changes back to store on drag stop
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const updated = storeBlocks.map((b) =>
        b.id === node.id ? { ...b, position: node.position } : b,
      );
      setStoreBlocks(updated);
      setDirty(true);
    },
    [storeBlocks, setStoreBlocks, setDirty],
  );

  // New edge connection
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          { ...connection, type: "smoothstep", style: { stroke: "#94a3b8", strokeWidth: 2 } },
          eds,
        ),
      );
      const newEdge: PathwayEdgeSchema = {
        id: `e-${connection.source}-${connection.target}`,
        source_block_id: connection.source,
        target_block_id: connection.target,
        edge_type: "default",
        label: null,
      };
      setStoreEdges([...storeEdges, newEdge]);
      setDirty(true);
    },
    [setEdges, storeEdges, setStoreEdges, setDirty],
  );

  // Click node → select block for config drawer
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => selectBlock(node.id),
    [selectBlock],
  );

  // Drag-and-drop from component library
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

        // Add to React Flow immediately
        const id = crypto.randomUUID();
        setNodes((nds) => [
          ...nds,
          {
            id,
            type: "pathwayBlock",
            position,
            data: { label: data.label, block_type: data.block_type, category: data.category },
          },
        ]);

        // Add to store (async, persists to backend)
        addBlock({ block_type: data.block_type, category: data.category, label: data.label, position });
      } catch {
        // ignore
      }
    },
    [screenToFlowPosition, setNodes, addBlock],
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
        onNodeDragStop={onNodeDragStop}
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
