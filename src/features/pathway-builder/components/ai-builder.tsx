"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

// ── Types ───────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

// ── Template prompts ────────────────────────────────────────────────────

const TEMPLATE_PROMPTS = [
  {
    label: "Diabetes T2DM — Full Program",
    prompt: `Design a comprehensive Type 2 Diabetes care pathway for Tiers 2-4. Include:
- Eligibility: ICD-10 E11.x, HbA1c ≥ 7%, exclude ESRD and hospice patients
- Lab monitoring: HbA1c quarterly, eGFR every 6 months, uACR annually, lipid panel annually
- Medication protocol: Start Metformin if not contraindicated (eGFR > 30), escalate to GLP-1RA if HbA1c remains > 8% after 3 months, add SGLT2i if eGFR 25-60 with uACR > 30
- Outreach: WhatsApp enrollment message, AI-personalised follow-ups, escalate to RN call if no response after 3 attempts
- Adherence: Flag PDC < 80% on any diabetes medication, trigger pharmacist review
- Escalation: Auto-uptier to Tier 4 if HbA1c > 10%, any DKA hospitalisation, or 2+ ER visits in 12 months. Down-tier eligible after HbA1c < 7% sustained for 2 quarters with clinician confirmation
- Safety: PHQ-9 screening quarterly, immediate RN flag if score ≥ 15 or suicidal ideation keywords detected
- Care team: RN care manager monthly, PharmD medication review quarterly, endocrinology referral if on 3+ agents`,
  },
  {
    label: "Heart Failure Comorbidity",
    prompt: "Pathway for diabetic patients with heart failure (I50.x). Cardiology referral, monthly BNP and weight monitoring, SGLT2i initiation if eGFR > 25, and 911 escalation protocol for acute decompensation.",
  },
  {
    label: "Pre-Diabetes Prevention",
    prompt: `Build a Tier 0 prevention pathway:
- Eligibility: No diabetes diagnosis, BMI ≥ 25 (≥ 23 for South/East Asian), HbA1c 5.4-6.4% or FPG 90-125
- Program: CDC-recognised DPP curriculum — 16 weekly group sessions + 6 months maintenance
- Monitoring: HbA1c every 6 months, weight monthly via connected scale, daily step tracking (target 7000/day)
- Touchpoints: Weekly group coaching video call, monthly 1:1 coach check-in, quarterly PHQ-9/DDS screening
- Escalation: Auto-promote to Tier 1 if HbA1c rises to 5.7-6.4%, or Tier 2 if HbA1c ≥ 6.5%
- Digital: Daily app nudges, habit tracking, cultural cuisine profile (South Asian, Latin American, Mediterranean options)`,
  },
  {
    label: "CKD Nephropathy",
    prompt: "Pathway for CKD stage 3+ (eGFR < 45) in diabetic patients. Nephrology referral, hold Metformin dose increase if eGFR missing, monthly renal function labs, ACE/ARB optimisation, and SGLT2i contraindication gating.",
  },
  {
    label: "Post-Discharge Transition",
    prompt: "Create a 30-day transition care pathway triggered by any DM-related hospitalisation or DKA event. Include 48-hour post-discharge RN call, medication reconciliation within 7 days, PCP follow-up within 14 days, and weekly check-ins for 4 weeks.",
  },
];

// ── Component ───────────────────────────────────────────────────────────

export function AIBuilder() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      content:
        "I can help you design a care pathway. Describe the **target condition**, **patient criteria**, **key interventions**, and **escalation rules** — or pick a template below to get started.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedPathway, setGeneratedPathway] =
    useState<AIGeneratedPathway | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { setBlocks, setEdges, setBuilderMode } = usePathwayBuilderStore();

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const handleSend = useCallback(
    async (prompt?: string) => {
      const text = (prompt ?? input).trim();
      if (!text || loading) return;

      if (!prompt) setInput("");
      setMessages((prev) => [...prev, { role: "user", content: text }]);

      setLoading(true);
      try {
        const response = await generatePathway({ prompt: text });
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
            content: "Something went wrong generating the pathway. Please try again.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleAccept = useCallback(() => {
    if (!generatedPathway) return;

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
      },
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
      {/* ── Left: Chat ──────────────────────────────────────────────── */}
      <div className="flex w-1/2 flex-col border-r border-border-default">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 p-4">
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} />
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white">
                  <Icons.ai className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-2 rounded-xl rounded-tl-none border border-border-default bg-bg-primary px-3.5 py-2.5 text-sm text-text-muted shadow-sm">
                  <Icons.spinner className="h-3.5 w-3.5 animate-spin" />
                  Generating pathway...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Template prompts */}
        {messages.length <= 1 && !loading && (
          <div className="border-t border-border-default px-4 py-2">
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_PROMPTS.map((t) => (
                <Button
                  key={t.label}
                  variant="outline"
                  size="xs"
                  onClick={() => handleSend(t.prompt)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <Icons.ai className="mr-1 h-3 w-3" />
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border-default p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your care pathway..."
              className="min-h-10 max-h-32 resize-none text-sm"
              rows={1}
              disabled={loading}
            />
            <Button
              size="icon-sm"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
            >
              <Icons.send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Right: Preview ──────────────────────────────────────────── */}
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

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col items-center gap-0">
                {generatedPathway.blocks.map((block, i) => {
                  const catDef = getCategoryDef(block.category as BlockCategory);
                  const blockDef = getBlockType(block.block_type);
                  const IconComponent = blockDef ? Icons[blockDef.icon] : Icons.idle;
                  const isLast = i === generatedPathway.blocks.length - 1;
                  const incomingEdge = generatedPathway.edges.find(
                    (e) => e.target_index === block.order_index,
                  );

                  return (
                    <div key={i} className="flex flex-col items-center">
                      {i > 0 && (
                        <div className="flex flex-col items-center">
                          <div className="h-6 w-px bg-border-default" />
                          {incomingEdge?.label && (
                            <span className="mb-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                              {incomingEdge.label}
                            </span>
                          )}
                          <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-border-default" />
                        </div>
                      )}

                      <div
                        className={cn(
                          "w-72 rounded-lg border bg-bg-primary shadow-sm",
                          catDef?.borderClass ?? "border-border-default",
                        )}
                      >
                        <div className="flex items-center gap-2.5 px-3 py-2.5">
                          <div
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded text-white",
                              catDef?.iconBgClass ?? "bg-gray-600",
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

                      {!isLast && <div className="h-2 w-px bg-border-default" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border-default p-3">
              <Button onClick={handleAccept} className="w-full">
                <Icons.completed className="mr-1.5 h-4 w-4" />
                Accept &amp; Edit on Canvas
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-text-muted">
            <Icons.ai className="h-10 w-10 opacity-20" />
            <p className="text-sm">AI-generated pathway will appear here</p>
            <p className="text-xs text-text-placeholder">
              Describe your pathway or pick a template to start
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chat Bubble ─────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAI = message.role === "ai";

  return (
    <div className={cn("flex gap-2.5", !isAI && "flex-row-reverse")}>
      {/* Avatar — aligned to top of bubble */}
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isAI ? "bg-brand-primary text-white" : "bg-muted text-text-muted",
        )}
      >
        {isAI ? (
          <Icons.ai className="h-3.5 w-3.5" />
        ) : (
          <Icons.user className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
          isAI
            ? "rounded-tl-none border-border-default bg-bg-primary text-text-primary"
            : "rounded-tr-none border-brand-primary/30 bg-brand-primary-light text-text-primary",
        )}
      >
        {isAI ? (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>
              ),
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              code: ({ children }) => (
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                  {children}
                </code>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}
