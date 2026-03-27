"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { X, MessageCircle, Phone, Minus } from "lucide-react"
import ChatComposer from "@/components/ui/chat-composer"

type Mode = "chat" | "call"

type Message = {
  id: string
  sender: "you" | "adjuster" | "provider" | "system"
  content: string
  timestamp: number
}

interface WorklistChatPopupProps {
  open: boolean
  mode: Mode
  onClose: () => void
  contextClaimIds?: string[]
}

// Simple seeded messages related to claims discussions
const seedHistory = (claimIds: string[]): Message[] => {
  const target = claimIds.length ? claimIds.slice(0, 2).join(", ") : "recent claims"
  const now = Date.now()
  return [
    {
      id: "m1",
      sender: "adjuster",
      content: `Please confirm if discharge summary for claim ${target} is uploaded.`,
      timestamp: now - 1000 * 60 * 60 * 26,
    },
    {
      id: "m2",
      sender: "provider",
      content: `We uploaded lab results yesterday. Discharge summary pending for ${claimIds[0] || "one claim"}.`,
      timestamp: now - 1000 * 60 * 60 * 25,
    },
    {
      id: "m3",
      sender: "adjuster",
      content: `Noted. Also need ICD-10 coding clarification for ${claimIds[0] || "the latest claim"}.`,
      timestamp: now - 1000 * 60 * 60 * 23,
    },
    {
      id: "m4",
      sender: "you",
      content: "Acknowledged. Will share discharge summary and coding notes by EOD.",
      timestamp: now - 1000 * 60 * 60 * 22,
    },
  ]
}

export default function WorklistChatPopup({ open, mode, onClose, contextClaimIds = [] }: WorklistChatPopupProps) {
  const [minimized, setMinimized] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const endRef = useRef<HTMLDivElement>(null)
  const [callState, setCallState] = useState<"idle" | "calling" | "connected">("idle")

  useEffect(() => {
    if (open) {
      // Seed messages when opened with current context
      setMessages(seedHistory(contextClaimIds))
      setMinimized(false)
      if (mode === "call") {
        setCallState("calling")
      } else {
        setCallState("idle")
      }
    }
  }, [open, mode, contextClaimIds.join(",")])

  // Simulate connecting state for call mode
  useEffect(() => {
    if (!open || mode !== "call") return
    if (callState !== "calling") return
    const t = setTimeout(() => setCallState("connected"), 3000)
    return () => clearTimeout(t)
  }, [open, mode, callState])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, minimized])

  const title = useMemo(() => {
    const suffix = contextClaimIds.length ? ` · ${contextClaimIds.slice(0, 2).join(", ")}${contextClaimIds.length > 2 ? ", …" : ""}` : ""
    return `Claims Discussion${suffix}`
  }, [contextClaimIds.join(",")])

  if (!open) return null

  const handleSend = () => {
    const text = newMessage.trim()
    if (!text) return
    const now = Date.now()
    setMessages(prev => [
      ...prev,
      { id: `u-${now}`, sender: "you", content: text, timestamp: now },
    ])
    setNewMessage("")
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="fixed right-4 bottom-4 z-[100]">
      <div className="w-[380px] max-w-[90vw] rounded-xl overflow-hidden shadow-2xl border border-[hsl(var(--stroke-grey))] bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--stroke-grey))] bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[hsl(var(--brand-primary))] opacity-20 blur-sm" />
              <div className="relative w-7 h-7 rounded-full bg-[hsl(var(--bg-10))] border border-[hsl(var(--stroke-grey))] flex items-center justify-center">
                {mode === "chat" ? (
                  <MessageCircle className="w-4 h-4 text-[hsl(var(--brand-primary))]" />
                ) : (
                  <Phone className="w-4 h-4 text-[hsl(var(--brand-primary))]" />
                )}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-[hsl(var(--text-100))]">{title}</div>
              <div className="text-xs text-[hsl(var(--text-80))]">Secure • Internal</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-1 rounded hover:bg-[hsl(var(--bg-10))] text-[hsl(var(--text-80))]"
              onClick={() => setMinimized(m => !m)}
              aria-label={minimized ? "Restore chat" : "Minimize chat"}
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              className="p-1 rounded hover:bg-[hsl(var(--bg-10))] text-[hsl(var(--text-80))]"
              onClick={onClose}
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {!minimized && (
          <div className="flex flex-col h-[420px]">
            {/* Decorative background */}
            <div
              aria-hidden
              className="absolute left-0 right-0"
              style={{
                top: 48,
                height: 140,
                backgroundImage: "url(/primary_background.svg)",
                backgroundSize: "cover",
                backgroundPosition: "center top",
                backgroundRepeat: "no-repeat",
                pointerEvents: "none",
              }}
            />

            {/* Call status header when in call mode */}
            {mode === "call" && (
              <div className="px-3 py-2 border-b border-[hsl(var(--stroke-grey))] bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full bg-[hsl(var(--brand-primary))]/20 animate-ping" />
                    <div className="absolute inset-0 rounded-full bg-[hsl(var(--brand-primary))]/20 animate-ping" style={{ animationDelay: "0.7s" }} />
                    <div className="relative w-12 h-12 rounded-full bg-[hsl(var(--bg-10))] border border-[hsl(var(--stroke-grey))] flex items-center justify-center">
                      <Phone className="w-5 h-5 text-[hsl(var(--brand-primary))]" />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[hsl(var(--text-100))]">
                      {callState === "calling" ? "Calling provider…" : "On call"}
                    </div>
                    <div className="text-xs text-[hsl(var(--text-80))]">
                      {contextClaimIds.length ? `Regarding: ${contextClaimIds.slice(0,2).join(", ")}${contextClaimIds.length>2?", …":""}` : "General inquiry"}
                    </div>
                  </div>
                </div>
                <button
                  className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs"
                  onClick={onClose}
                >
                  End
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white relative z-10">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender === "you" ? "justify-end" : "justify-start"}`}>
                  {m.sender === "you" ? (
                    <div className="max-w-[75%] rounded-2xl px-3 py-2 bg-[hsl(var(--brand-primary))] text-white shadow-sm">
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                      <div className="text-[10px] mt-1 opacity-80">{formatTime(m.timestamp)}</div>
                    </div>
                  ) : (
                    <div className="max-w-[75%] rounded-2xl px-3 py-2 bg-[hsl(var(--bg-10))] border border-[hsl(var(--stroke-grey))] text-[hsl(var(--text-100))] shadow-sm">
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                      <div className="text-[10px] mt-1 text-[hsl(var(--text-80))]">{formatTime(m.timestamp)}</div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Composer */}
            <div className="border-t border-[hsl(var(--stroke-grey))] p-3 bg-white">
              <ChatComposer
                mode="idle"
                value={newMessage}
                onChange={setNewMessage}
                onEnterSend={handleSend}
                onStartRecording={() => {}}
                onStopRecording={() => {}}
                onSend={handleSend}
                onPickGallery={() => {}}
                placeholder={mode === "chat" ? "Type a message…" : "Leave a note about this call…"}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
