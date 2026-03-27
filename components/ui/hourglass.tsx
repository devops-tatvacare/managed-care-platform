"use client";

import { Clock } from "lucide-react";

export default function Hourglass() {
  return (
    <span className="inline-flex relative items-center justify-center w-5 h-5 align-[-2px]">
      <Clock className="w-4 h-4 animate-spin" />
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </span>
  );
}