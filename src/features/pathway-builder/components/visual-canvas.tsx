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
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PathwayBlockNode } from "./pathway-block-node";
import { usePathwayBuilderStore } from "@/stores/pathway-builder-store";

function VisualCanvasInner() {
  const blocks = usePathwayBuilderStore((s) => s.blocks);
  const edges = usePathwayBuilderStore((s) => s.edges);
  const selectedBlockId = usePathwayBuilderStore((s) => s.selectedBlockId);
  const selectBlock = usePathwayBuilderStore((s) => s.selectBlock);
  const addBlock = usePathwayBuilderStore((s) => s.addBlock);
  const setBlocks = usePathwayBuilderStore((s) => s.setBlocks);
  const setEdges = usePathwayBuilderStore((s) => s.setEdges);
  const setDirty = usePathwayBuilderStore((s) => s.setDirty);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodeTypes = useMemo(
    () => ({ pathwayBlock: PathwayBlockNode }),
    [],
  );

  const nodes: Node[] = useMemo(
    () =>
      blocks.map((b) => ({
        id: b.id,
        type: "pathwayBlock",
        position: b.position ?? { x: 0, y: 0 },
        data: { label: b.label, block_type: b.block_type, category: b.category },
        selected: b.id === selectedBlockId,
      })),
    [blocks, selectedBlockId],
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
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
      })),
    [edges],
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const updated = applyNodeChanges(changes, nodes);
      const nextBlocks = blocks.map((block) => {
        const node = updated.find((n) => n.id === block.id);
        if (!node) return block;
        return { ...block, position: node.position };
      });
      setBlocks(nextBlocks);
      setDirty(true);
    },
    [blocks, nodes, setBlocks, setDirty],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const updated = applyEdgeChanges(changes, flowEdges);
      const nextEdges = updated.map((fe) => ({
        id: fe.id,
        source_block_id: fe.source,
        target_block_id: fe.target,
        edge_type: fe.animated ? "true_branch" : "default",
        label: (fe.label as string) ?? null,
      }));
      setEdges(nextEdges);
      setDirty(true);
    },
    [flowEdges, setEdges, setDirty],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: `e-${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        type: "smoothstep",
        style: { stroke: "#94a3b8", strokeWidth: 2 },
      };
      const updated = addEdge(newEdge, flowEdges);
      const nextEdges = updated.map((fe) => ({
        id: fe.id,
        source_block_id: fe.source,
        target_block_id: fe.target,
        edge_type: fe.animated ? "true_branch" : "default",
        label: (fe.label as string) ?? null,
      }));
      setEdges(nextEdges);
      setDirty(true);
    },
    [flowEdges, setEdges, setDirty],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectBlock(node.id);
    },
    [selectBlock],
  );

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
        const data = JSON.parse(raw) as {
          block_type: string;
          category: string;
          label: string;
        };
        const position = screenToFlowPosition({
          x: e.clientX,
          y: e.clientY,
        });
        addBlock({
          block_type: data.block_type,
          category: data.category,
          label: data.label,
          position,
        });
      } catch {
        // ignore malformed drops
      }
    },
    [screenToFlowPosition, addBlock],
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="h-full w-full"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
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

export function VisualCanvas() {
  return (
    <ReactFlowProvider>
      <VisualCanvasInner />
    </ReactFlowProvider>
  );
}
