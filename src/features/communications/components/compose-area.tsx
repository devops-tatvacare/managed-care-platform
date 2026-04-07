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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/config/icons";
import type { MessageTemplate } from "@/services/types/communications";

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "call", label: "Call" },
  { value: "app_push", label: "Push" },
] as const;

const LANGUAGES = [
  { value: "pt", label: "PT" },
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
] as const;

const REWRITE_OPTIONS = [
  { value: "simplify", label: "Simplify" },
  { value: "formal", label: "Formal" },
  { value: "empathetic", label: "Empathetic" },
  { value: "translate_pt", label: "Translate to PT" },
  { value: "translate_en", label: "Translate to EN" },
  { value: "translate_es", label: "Translate to ES" },
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
    <div className="flex flex-col gap-2 border-t border-border-default bg-bg-primary p-3">
      {/* Template chips */}
      {templates.length > 0 && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-1.5 pb-1">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleTemplateClick(tpl)}
                className="shrink-0 rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-[11px] text-text-secondary transition-colors hover:bg-bg-tertiary"
              >
                {tpl.name}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Textarea */}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className="min-h-[72px] resize-none text-sm"
        disabled={draftLoading}
      />

      {/* Controls row */}
      <div className="flex items-center gap-2">
        <Select value={channel} onValueChange={onChannelChangeAction}>
          <SelectTrigger className="h-7 w-[110px] text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHANNELS.map((c) => (
              <SelectItem key={c.value} value={c.value} className="text-xs">
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={language} onValueChange={onLanguageChangeAction}>
          <SelectTrigger className="h-7 w-[64px] text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.value} value={l.value} className="text-xs">
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* AI Rewrite dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" disabled={rewriteLoading || !text.trim()}>
              <Icons.ai className="h-3 w-3" />
              {rewriteLoading ? "Rewriting..." : "AI Rewrite"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {REWRITE_OPTIONS.map((opt) => (
              <DropdownMenuItem key={opt.value} onClick={() => handleRewrite(opt.value)} className="text-xs">
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        <Button size="sm" className="h-7 gap-1 text-[11px]" onClick={handleSend} disabled={!text.trim() || draftLoading}>
          <Icons.send className="h-3 w-3" />
          Send
        </Button>
      </div>
    </div>
  );
}
