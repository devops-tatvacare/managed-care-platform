"use client";
import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, ArrowUp, ImageIcon, Square } from "lucide-react";
import WaveformCanvas from './waveform-canvas';
import Hourglass from './hourglass';
import { SIZING } from "@/lib/design-tokens";
import { CHAT_UI, CHAT_STYLES, CHAT_ACCESSIBILITY } from "@/lib/chat-config";

export type ComposerMode = 'idle' | 'recording' | 'recording-active' | 'transcribing-send' | 'transcribing-stop';

interface ChatComposerProps {
  mode: ComposerMode;
  value: string;
  onChange: (v: string) => void;
  onEnterSend: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSend: () => void;
  onPickGallery: () => void;
  analyser?: AnalyserNode | null;
  isSpeaking?: boolean;
  disabled?: boolean;
  placeholder?: string;
  recordingTime?: number;
  audioData?: number[];
}

export default function ChatComposer({
  mode,
  value,
  onChange,
  onEnterSend,
  onStartRecording,
  onStopRecording,
  onSend,
  onPickGallery,
  analyser = null,
  isSpeaking = false,
  disabled = false,
  placeholder = CHAT_UI.PLACEHOLDER,
  recordingTime = 0,
  audioData = [],
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isRecording = mode === 'recording' || mode === 'recording-active';
  const isTranscribing =
    (typeof mode === 'string' && mode.includes('transcribing')) ||
    mode === 'transcribing-send' ||
    mode === 'transcribing-stop';

  // Auto-resize logic (token-based, no hardcoded px)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Helper: convert rem tokens (e.g., '2.5rem') to px
    const remToPx = (rem: string) => {
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const remValue = parseFloat(rem);
      return remValue * rootFontSize;
    };

    const minHeightPx = remToPx(SIZING.input.minHeight); // token: minimum input height
    const maxHeightPx = remToPx(SIZING.input.maxHeight); // token: maximum input height

    // Reset height to measure scrollHeight accurately
    textarea.style.height = 'auto';

    const newHeight = Math.max(minHeightPx, Math.min(textarea.scrollHeight, maxHeightPx));
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeightPx ? 'auto' : 'hidden';
  }, [value]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderContent = () => {
    if (mode === 'recording-active') {
      return (
        <>
          {/* Stop Button */}
          <motion.button
            onClick={onStopRecording}
            className="bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors rounded-full w-10 h-10 flex-shrink-0"
            aria-label={CHAT_UI.STOP_RECORDING_ARIA}
          >
            <Square className="w-5 h-5" />
          </motion.button>

          {/* Center Area: lock height to input baseline */}
          <div className="flex-1 h-10 flex items-center justify-center mx-2">
            <WaveformCanvas 
              analyser={analyser}
              isRecording={isRecording}
              isSpeaking={isSpeaking}
            />
          </div>

          {/* Send Button */}
          <motion.button
            onClick={onStopRecording}
            className="bg-[hsl(var(--brand-primary))] text-white hover:bg-[hsl(var(--brand-primary)/0.9)] flex items-center justify-center transition-colors rounded-full w-10 h-10 flex-shrink-0"
            aria-label={CHAT_UI.SEND_RECORDING_ARIA}
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        </>
      );
    }

    if (isTranscribing) {
      return (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-10 flex-1 flex items-center justify-center text-sm text-muted-foreground gap-2"
          aria-live={CHAT_ACCESSIBILITY.LIVE_REGION_ARIA}
        >
          <span>{CHAT_UI.TRANSCRIBING_PLACEHOLDER}</span>
          <Hourglass />
        </motion.div>
      );
    }

    return (
      <>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="flex-1 min-w-0 bg-transparent border-none resize-none text-sm focus:outline-none focus:ring-0 placeholder:text-muted-foreground disabled:opacity-50 leading-6 py-2 break-words"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !disabled) {
              e.preventDefault();
              onEnterSend();
            }
          }}
          aria-label={CHAT_ACCESSIBILITY.COMPOSER_ARIA}
        />
        <div className="flex items-center">
          {value.trim() !== '' ? (
            <motion.button
              key="send"
              onClick={onSend}
              disabled={disabled}
              className="bg-[hsl(var(--brand-primary))] text-white hover:bg-[hsl(var(--brand-primary)/0.9)] disabled:opacity-50 flex items-center justify-center transition-colors rounded-full w-10 h-10 flex-shrink-0"
              aria-label={CHAT_UI.SEND_BUTTON_ARIA}
            >
              <ArrowUp className="w-5 h-5" />
            </motion.button>
          ) : (
            <div className="flex items-center gap-1">
              <motion.button 
                key="mic"
                onClick={onStartRecording} 
                disabled={disabled}
                className="text-muted-foreground hover:bg-muted disabled:opacity-50 flex items-center justify-center transition-colors rounded-full w-10 h-10"
                aria-label={CHAT_UI.MIC_BUTTON_ARIA}
              >
                <Mic className="w-5 h-5" />
              </motion.button>
              <motion.button 
                key="gallery"
                onClick={onPickGallery} 
                disabled={disabled}
                className="text-muted-foreground hover:bg-muted disabled:opacity-50 flex items-center justify-center transition-colors rounded-full w-10 h-10"
                aria-label={CHAT_UI.GALLERY_BUTTON_ARIA}
              >
                <ImageIcon className="w-5 h-5" />
              </motion.button>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-muted border border-border transition-all duration-150 ease-out focus-within:ring-2 focus-within:ring-ring focus-within:border-ring flex items-center gap-2 p-2 rounded-lg min-h-10 max-h-24`}
    >
      {renderContent()}
    </div>
  );
}