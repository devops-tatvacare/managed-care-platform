"use client";

import { useCallback, useMemo } from "react";
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

  const { screenToFlowPosition } = useReactFlow();

  const nodeTypes = useMemo(
    () => ({ pathwayBlock: PathwayBlockNode }),
    [],
  );

  const nodes: Node[] = blocks.map((b) => ({
    id: b.id,
    type: "pathwayBlock",
    position: b.position ?? { x: 0, y: 0 },
    data: { label: b.label, block_type: b.block_type, category: b.category },
    selected: b.id === selectedBlockId,
  }));

  const flowEdges: Edge[] = edges.map((e) => ({
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
    },
  }));

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
        edge_type: fe.animated ? "true_branch" : (fe.style as { stroke?: string })?.stroke === "#ef4444" ? "false_branch" : "default",
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
        style: { stroke: "#94a3b8" },
      };
      const updated = addEdge(newEdge, flowEdges);
      const nextEdges = updated.map((fe) => ({
        id: fe.id,
        source_block_id: fe.source,
        target_block_id: fe.target,
        edge_type:
          fe.animated
            ? "true_branch"
            : (fe.style as { stroke?: string })?.stroke === "#ef4444"
              ? "false_branch"
              : "default",
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
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-bg-secondary"
      >
        <Background gap={20} size={1} color="#e2e8f0" />
        <Controls className="!bg-bg-primary !border-border-default !shadow-sm" />
        <MiniMap
          className="!bg-bg-primary !border-border-default !shadow-sm"
          maskColor="rgba(0,0,0,0.1)"
          nodeColor="#e2e8f0"
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
