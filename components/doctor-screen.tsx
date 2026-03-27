"use client"

import { useEffect, useMemo, useState } from "react"
import { Poppins } from "next/font/google"

const poppins = Poppins({ subsets: ["latin"], weight: ["400","500","600","700"] })

const BASE_WIDTH = 2940
const BASE_HEIGHT = 1628

export default function DoctorScreen() {
  const [scale, setScale] = useState(1)
  const [inspect, setInspect] = useState(false)
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null)
  const [lastClick, setLastClick] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const s = Math.min(vw / BASE_WIDTH, vh / BASE_HEIGHT)
      setScale(s > 1 ? 1 : s)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const canvasStyle = useMemo(
    () => ({
      width: `${BASE_WIDTH}px`,
      height: `${BASE_HEIGHT}px`,
      transform: `scale(${scale})`,
      transformOrigin: "top left" as const,
    }),
    [scale]
  )

  return (
    <div className={`flex-1 w-full h-full overflow-auto bg-white ${poppins.className}`}>
      <div
        className="relative mx-auto"
        style={canvasStyle as React.CSSProperties}
        onMouseMove={(e) => {
          if (!inspect) return
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          const x = Math.round((e.clientX - rect.left) / scale)
          const y = Math.round((e.clientY - rect.top) / scale)
          setCoords({ x, y })
        }}
        onClick={(e) => {
          if (!inspect) return
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          const x = Math.round((e.clientX - rect.left) / scale)
          const y = Math.round((e.clientY - rect.top) / scale)
          setLastClick({ x, y })
        }}
      >
        <img
          src="/doctor/tpractice-emr-advice.png"
          alt="Doctor Screen"
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: "fill", userSelect: "none" }}
        />

        {/* Overlay: Lab Results component (use provided HTML as-is) */}
        <div
          style={{
            position: "absolute",
            left: 39,
            top: 1095,
            width: 920,
            height: 150,
            zIndex: 5,
          }}
        >
          <div className="prescription-box-sm">
            <div className="d-flex align-items-center justify-content-between p-14">
              <div className="d-flex align-items-center">
                <img
                  src="https://tatvapractice.tatvacare.in/static/media/Lab.fd02efd15c841d81d8d73506a42170c9.svg"
                  alt="upload-document"
                  className="me-3"
                />
                <div className="title-common">Lab Results</div>
              </div>
              <button className="btn d-flex align-items-center btn-text">
                <i className="icon-Add me-1 fs-5" />
                <span>Add</span>
              </button>
            </div>
            <div />
          </div>
        </div>

        {/* Minimal global styles to support provided HTML classes */}
        <style jsx global>{`
          .d-flex { display: flex; }
          .align-items-center { align-items: center !important; }
          .justify-content-between { justify-content: space-between !important; }
          .p-14 { padding: 14px; }
          .me-3 { margin-inline-end: 12px; }
          .me-1 { margin-inline-end: 4px; }
          .fs-5 { font-size: 1.25rem; line-height: 1; }
          .btn { border: 0; background: transparent; cursor: pointer; }
          .btn-text { color: #4b4ad5; font-weight: 600; }
          .title-common { color: #171725; font-weight: 600; font-size: 16px; }
          .prescription-box-sm { background: transparent; border: 0; border-radius: 0; box-shadow: none; width: 100%; height: 100%; }
          .icon-Add { display: inline-block; width: 18px; height: 18px; position: relative; }
          .icon-Add::before, .icon-Add::after { content: ""; position: absolute; background: currentColor; left: 50%; top: 50%; transform: translate(-50%, -50%); }
          .icon-Add::before { width: 12px; height: 2px; }
          .icon-Add::after { width: 2px; height: 12px; }
        `}</style>

        {/* Inspect overlay */}
        {inspect && coords && (
          <>
            {/* Crosshair */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: BASE_WIDTH,
                height: BASE_HEIGHT,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: coords.y,
                  left: 0,
                  width: BASE_WIDTH,
                  height: 1,
                  background: "rgba(75,74,213,0.6)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: coords.x,
                  width: 1,
                  height: BASE_HEIGHT,
                  background: "rgba(75,74,213,0.6)",
                }}
              />
            </div>

            {/* HUD */}
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded text-sm">
              x: {coords.x}, y: {coords.y}
              {lastClick && (
                <span className="ml-3 opacity-90">last click → x: {lastClick.x}, y: {lastClick.y}</span>
              )}
            </div>
          </>
        )}

        {/* Controls */}
        <button
          onClick={() => setInspect((v) => !v)}
          className="absolute top-4 right-4 z-10 bg-black/70 text-white px-4 py-2 rounded"
        >
          {inspect ? "Exit Inspect" : "Inspect"}
        </button>
      </div>
    </div>
  )
}
