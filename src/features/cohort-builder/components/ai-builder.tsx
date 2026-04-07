"use client";

import { useCallback, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { useCohortBuilderStore, type ChatMessage } from "@/stores/cohort-builder-store";

// ── Template prompts ────────────────────────────────────────────────────

const TEMPLATE_PROMPTS = [
  {
    label: "Diabetes 5-Tier Program",
    prompt: "Design a comprehensive diabetes care program with 5 risk tiers based on HbA1c levels, complication history, and medication adherence. Include scoring weights and criteria for each tier.",
  },
  {
    label: "Heart Failure 3-Tier Program",
    prompt: "Create a heart failure management program with 3 tiers based on NYHA class, BNP levels, and hospitalisation frequency. Define cohort criteria and scoring components.",
  },
  {
    label: "Simple Age-Based Cohort",
    prompt: "Create a simple cohort for members aged 40-75 with BMI >= 30. Single cohort with basic demographics criteria.",
  },
  {
    label: "Medication Adherence Cohort",
    prompt: "Build a cohort targeting members with PDC < 80% on any chronic medication. Include pharmacy adherence scoring and outreach triggers.",
  },
];

// ── Component ───────────────────────────────────────────────────────────

export function AIBuilder() {
  const {
    chatMessages,
    chatLoading,
    sendChatMessage,
    clearChat,
  } = useCohortBuilderStore();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, chatLoading, scrollToBottom]);

  const handleSend = useCallback(
    (prompt?: string) => {
      const text = (prompt ?? inputRef.current?.value ?? "").trim();
      if (!text || chatLoading) return;
      if (inputRef.current) inputRef.current.value = "";
      sendChatMessage(text);
    },
    [chatLoading, sendChatMessage],
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

  return (
    <div className="flex h-full">
      {/* ── Left: Chat ──────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col border-r border-border-default">
        {/* Toolbar */}
        <div className="flex items-center gap-1 border-b border-border-default px-3 py-1.5">
          <Button
            variant="ghost"
            size="xs"
            onClick={clearChat}
            className="text-text-muted"
          >
            <Icons.plus className="mr-1 h-3 w-3" />
            New Chat
          </Button>
        </div>

        {/* ── Active chat ─────────────────────────────────────────── */}
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4 p-4">
              {chatMessages.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}

              {chatLoading && (
                <div className="flex gap-2.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white">
                    <Icons.ai className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl rounded-tl-none border border-border-default bg-bg-primary px-3.5 py-2.5 text-sm text-text-muted shadow-sm">
                    <Icons.spinner className="h-3.5 w-3.5 animate-spin" />
                    Generating program...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Template prompts — only on initial state */}
          {chatMessages.length <= 1 && !chatLoading && (
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
            <div className="flex items-end gap-2 rounded-lg border border-input bg-bg-primary p-1.5 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
              <textarea
                ref={inputRef}
                onKeyDown={handleKeyDown}
                placeholder="Describe your cohort program..."
                className="min-h-8 max-h-32 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
                rows={1}
                disabled={chatLoading}
              />
              <Button
                size="icon-sm"
                onClick={() => handleSend()}
                disabled={chatLoading}
                className="shrink-0"
              >
                <Icons.send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      </div>

      {/* ── Right: Preview ──────────────────────────────────────────── */}
      <div className="flex w-[45%] shrink-0 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-text-muted">
          <Icons.ai className="h-10 w-10 opacity-20" />
          <p className="text-sm">AI-generated program will appear here</p>
          <p className="text-xs text-text-placeholder">
            Describe your program or pick a template to start
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Chat Bubble ─────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAI = message.role === "ai";

  return (
    <div className={cn("flex gap-2.5", !isAI && "flex-row-reverse")}>
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

      <div
        className={cn(
          "max-w-[85%] rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
          isAI
            ? "rounded-tl-none border-border-default bg-bg-primary text-text-primary"
            : "rounded-tr-none border-brand-primary/30 bg-brand-primary-light text-text-primary",
        )}
      >
        {isAI ? (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              ul: ({ children }) => <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>,
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
