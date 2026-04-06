"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { getCategoryDef, getBlockType } from "@/config/block-types";
import type { BlockCategory } from "@/config/block-types";
import { usePathwayBuilderStore } from "@/stores/pathway-builder-store";
import { generatePathway } from "@/services/api/pathways";
import type {
  AIGeneratedPathway,
  PathwayBlockSchema,
  PathwayEdgeSchema,
} from "@/services/types/pathway";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIBuilder() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      content:
        "Describe the care pathway you'd like to build. Include the target condition, patient criteria, key interventions, and any escalation rules.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedPathway, setGeneratedPathway] =
    useState<AIGeneratedPathway | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { setBlocks, setEdges, setBuilderMode } = usePathwayBuilderStore();

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        const viewport = scrollRef.current.querySelector(
          "[data-radix-scroll-area-viewport]"
        );
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
      }
    });
  }, []);

  const handleSend = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    scrollToBottom();

    setLoading(true);
    try {
      const response = await generatePathway({ prompt });
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: response.message },
      ]);
      setGeneratedPathway(response.pathway);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "Sorry, something went wrong generating the pathway. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, scrollToBottom]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleAccept = useCallback(() => {
    if (!generatedPathway) return;

    // Generate UUIDs for each block keyed by order_index
    const blockIdMap = new Map<number, string>();
    const blocks: PathwayBlockSchema[] = generatedPathway.blocks.map(
      (block, i) => {
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
      }
    );

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

    setBlocks(blocks);
    setEdges(edges);
    setBuilderMode("canvas");
  }, [generatedPathway, setBlocks, setEdges, setBuilderMode]);

  return (
    <div className="flex h-full">
      {/* ── Left Panel: Chat ─────────────────────────────────────────── */}
      <div className="flex w-1/2 flex-col border-r border-border-default">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    msg.role === "ai"
                      ? "bg-brand-primary text-white"
                      : "bg-bg-tertiary text-text-muted"
                  )}
                >
                  {msg.role === "ai" ? (
                    <Icons.ai className="h-3.5 w-3.5" />
                  ) : (
                    <Icons.user className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-brand-primary/10 text-text-primary"
                      : "bg-bg-secondary text-text-primary"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white">
                  <Icons.ai className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-bg-secondary px-3 py-2 text-sm text-text-muted">
                  <Icons.spinner className="h-3.5 w-3.5 animate-spin" />
                  Generating pathway...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input bar */}
        <div className="border-t border-border-default p-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your care pathway..."
              className="min-h-10 resize-none"
              rows={1}
              disabled={loading}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="self-end"
            >
              <Icons.send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Right Panel: Preview ─────────────────────────────────────── */}
      <div className="flex w-1/2 flex-col overflow-hidden">
        {generatedPathway ? (
          <>
            <div className="border-b border-border-default px-4 py-3">
              <h3 className="text-sm font-semibold text-text-primary">
                {generatedPathway.name}
              </h3>
              <p className="text-xs text-text-muted">
                {generatedPathway.description}
              </p>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="flex flex-col items-center gap-0">
                {generatedPathway.blocks.map((block, i) => {
                  const catDef = getCategoryDef(
                    block.category as BlockCategory
                  );
                  const blockDef = getBlockType(block.block_type);
                  const IconComponent = blockDef
                    ? Icons[blockDef.icon]
                    : Icons.idle;
                  const isLast = i === generatedPathway.blocks.length - 1;

                  // Find edge leading to this block for a label
                  const incomingEdge = generatedPathway.edges.find(
                    (e) => e.target_index === block.order_index
                  );

                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center"
                    >
                      {/* Connecting line + edge label */}
                      {i > 0 && (
                        <div className="flex flex-col items-center">
                          <div className="h-6 w-px bg-border-default" />
                          {incomingEdge?.label && (
                            <span className="mb-1 rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                              {incomingEdge.label}
                            </span>
                          )}
                          <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-border-default" />
                        </div>
                      )}

                      {/* Block card */}
                      <div
                        className={cn(
                          "w-72 rounded-lg border bg-bg-primary shadow-sm",
                          catDef?.borderClass ?? "border-border-default"
                        )}
                      >
                        <div className="flex items-center gap-2.5 px-3 py-2.5">
                          <div
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded",
                              catDef?.iconBgClass ?? "bg-gray-600",
                              "text-white"
                            )}
                          >
                            <IconComponent className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-text-primary">
                              {block.label}
                            </p>
                            <p className="text-[10px] text-text-muted">
                              {blockDef?.description ?? block.block_type}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom connector line for non-last blocks */}
                      {!isLast && (
                        <div className="h-2 w-px bg-border-default" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Accept button */}
            <div className="border-t border-border-default p-3">
              <Button onClick={handleAccept} className="w-full">
                <Icons.completed className="mr-1.5 h-4 w-4" />
                Accept &amp; Edit
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-text-muted">
            <Icons.ai className="h-10 w-10 opacity-20" />
            <p className="text-sm">
              AI-generated pathway will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
