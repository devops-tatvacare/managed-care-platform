"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/config/icons";
import type { MessageTemplate } from "@/services/types/communications";

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp", icon: Icons.send },
  { value: "sms", label: "SMS", icon: Icons.outreach },
  { value: "call", label: "Call", icon: Icons.phone },
  { value: "app_push", label: "Push", icon: Icons.notifications },
] as const;

const LANGUAGES = [
  { value: "pt", label: "PT" },
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
] as const;

const REWRITE_OPTIONS = [
  { value: "simplify", label: "Simplify", desc: "Plain language" },
  { value: "formal", label: "Formal", desc: "Professional tone" },
  { value: "empathetic", label: "Empathetic", desc: "Warm and caring" },
  { value: "translate_pt", label: "Portuguese", desc: "Translate to PT" },
  { value: "translate_en", label: "English", desc: "Translate to EN" },
  { value: "translate_es", label: "Spanish", desc: "Translate to ES" },
] as const;

interface ComposeAreaProps {
  templates: MessageTemplate[];
  channel: string;
  language: string;
  draftLoading: boolean;
  rewriteLoading: boolean;
  onChannelChangeAction: (channel: string) => void;
  onLanguageChangeAction: (language: string) => void;
  onSendAction: (text: string, channel: string) => void;
  onRewriteAction: (text: string, instruction: string) => Promise<string | null>;
  onTemplateSelectAction: (template: MessageTemplate) => void;
}

export function ComposeArea({
  templates,
  channel,
  language,
  draftLoading,
  rewriteLoading,
  onChannelChangeAction,
  onLanguageChangeAction,
  onSendAction,
  onRewriteAction,
  onTemplateSelectAction,
}: ComposeAreaProps) {
  const [text, setText] = useState("");

  const handleRewrite = async (instruction: string) => {
    if (!text.trim()) return;
    const result = await onRewriteAction(text, instruction);
    if (result) setText(result);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSendAction(text, channel);
    setText("");
  };

  const handleTemplateClick = (tpl: MessageTemplate) => {
    setText(tpl.content);
    onTemplateSelectAction(tpl);
  };

  return (
    <div className="flex flex-col gap-2 border-t border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-raised)] px-[var(--space-panel-padding-compact)] py-2.5">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className="min-h-[72px] resize-none rounded-xl border-[color:var(--color-surface-border)] bg-bg-primary px-3 py-2.5 text-sm leading-5 shadow-none focus:border-brand-primary"
        disabled={draftLoading}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Select value={channel} onValueChange={onChannelChangeAction}>
          <SelectTrigger className="h-7 w-fit gap-1 rounded-full border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-subtle)] px-2.5 text-[11px] shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHANNELS.map((c) => (
              <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={language} onValueChange={onLanguageChangeAction}>
          <SelectTrigger className="h-7 w-fit gap-1 rounded-full border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-subtle)] px-2.5 text-[11px] shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="h-4 w-px bg-[color:var(--color-surface-border)]" />

        {templates.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="xs" className="gap-1 rounded-full text-[11px] text-text-muted">
                <Icons.documents className="h-3 w-3" />
                Templates
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-w-64">
              {templates.map((tpl) => (
                <DropdownMenuItem key={tpl.id} onClick={() => handleTemplateClick(tpl)} className="text-xs">
                  <span className="truncate">{tpl.name}</span>
                  {tpl.category && (
                    <span className="ml-auto shrink-0 text-[10px] text-text-placeholder capitalize">{tpl.category}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              className="gap-1 rounded-full text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950"
              disabled={rewriteLoading || !text.trim()}
            >
              <Icons.ai className="h-3 w-3" />
              {rewriteLoading ? "Rewriting..." : "AI Rewrite"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {REWRITE_OPTIONS.map((opt) => (
              <DropdownMenuItem key={opt.value} onClick={() => handleRewrite(opt.value)} className="flex-col items-start gap-0">
                <span className="text-xs font-medium">{opt.label}</span>
                <span className="text-[10px] text-text-muted">{opt.desc}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        <Button
          size="sm"
          className="h-7 gap-1.5 rounded-full px-4 text-[11px]"
          onClick={handleSend}
          disabled={!text.trim() || draftLoading}
        >
          <Icons.send className="h-3 w-3" />
          Send
        </Button>
      </div>
    </div>
  );
}
