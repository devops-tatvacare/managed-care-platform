"use client";
import { useEffect, useRef } from "react";

type Props = {
  analyser: AnalyserNode | null;
  isRecording: boolean;
  isSpeaking: boolean;
};

export default function WaveformCanvas({ analyser, isRecording, isSpeaking }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    // Set canvas size to match its parent container's size
    const parent = canvas.parentElement;
    if (!parent) return;
    const { width, height } = parent.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      if (!ctx || !analyser) {
        raf.current = requestAnimationFrame(render);
        return;
      }
      if (!dataRef.current) {
        dataRef.current = new Uint8Array(analyser.fftSize);
      }
      analyser.getByteTimeDomainData(dataRef.current);

      ctx.clearRect(0, 0, width, height);

      // Baseline style using current project colors
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "hsl(var(--brand-primary))";

      // Draw waveform
      ctx.beginPath();
      const slice = width / dataRef.current.length;
      for (let i = 0; i < dataRef.current.length; i++) {
        const v = (dataRef.current[i] - 128) / 128; // -1..1
        const x = i * slice;
        const y = height / 2 + v * (height * 0.42);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Subtle pulse glow when speaking
      if (isSpeaking) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = "hsl(var(--brand-primary))";
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      raf.current = requestAnimationFrame(render);
    };

    if (isRecording) {
      raf.current = requestAnimationFrame(render);
    }
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [analyser, isRecording, isSpeaking]);

  // The canvas is now responsive and doesn't need a wrapper div
  return (
    <canvas
      ref={ref}
      className="w-full h-full -scale-x-100"
      style={{ color: "hsl(var(--brand-primary))" }}
      aria-hidden
    />
  );
}