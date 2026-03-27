export const metadata = {
  title: "Style Guide – Colors",
}

type Swatch = {
  key: string
  bgClass: string
  fgClass?: string
  label: string
  cssVars?: string[]
}

const SWATCHES: Swatch[] = [
  { key: "brand", bgClass: "bg-brand", fgClass: "text-brand-foreground", label: "Brand / Primary", cssVars: ["--brand-primary", "--P-CTA-100"] },
  { key: "text100", bgClass: "bg-[hsl(var(--text-100))]", fgClass: "text-white", label: "Text 100", cssVars: ["--text-100", "--T-Text-100"] },
  { key: "text80", bgClass: "bg-[hsl(var(--text-80))]", fgClass: "text-white", label: "Text 80", cssVars: ["--text-80", "--T-Text-80"] },
  { key: "text10", bgClass: "bg-[hsl(var(--text-10))]", fgClass: "text-black", label: "Text 10", cssVars: ["--text-10", "--T-Text-10"] },
  { key: "bg10", bgClass: "bg-bg10", fgClass: "text-text80", label: "Background 10", cssVars: ["--bg-10", "--T-BG-10"] },
  { key: "bg100", bgClass: "bg-bg100", fgClass: "text-text80", label: "Background 100", cssVars: ["--bg-100", "--T-BG-100"] },
  { key: "stroke", bgClass: "bg-[hsl(var(--stroke-grey))]", fgClass: "text-text80", label: "Stroke Grey", cssVars: ["--stroke-grey", "--Stroke-Grey"] },
  { key: "success", bgClass: "bg-success", fgClass: "text-white", label: "Success", cssVars: ["--success", "--Colour-Green-Green---10 (bg)"] },
  { key: "danger", bgClass: "bg-danger", fgClass: "text-white", label: "Danger", cssVars: ["--danger", "--Colour-Red-Red---10 (bg)"] },
  { key: "warning", bgClass: "bg-warning", fgClass: "text-black", label: "Warning", cssVars: ["--warning", "--Colour-Yellow-Yellow---20 (bg)"] },
  { key: "info", bgClass: "bg-info", fgClass: "text-white", label: "Info", cssVars: ["--info"] },
]

export default function ColorsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-text100">Colors</h1>
      <p className="mt-2 text-text80">
        Design tokens mapped to Tailwind classes. Switch theme to see dynamic values.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SWATCHES.map((s) => (
          <div key={s.key} className="rounded-lg border border-stroke p-4">
            <div className={`h-16 w-full rounded ${s.bgClass} ${s.fgClass ?? ""} flex items-center justify-center`}>
              <span className="text-sm font-medium capitalize">{s.label}</span>
            </div>
            <div className="mt-3 text-xs text-text80">
              <div className="font-mono">bg class: {s.bgClass}</div>
              {s.fgClass ? <div className="font-mono">text class: {s.fgClass}</div> : null}
              {s.cssVars && s.cssVars.length > 0 ? (
                <div className="mt-1">
                  <div className="text-text10">CSS vars</div>
                  <ul className="list-disc pl-4">
                    {s.cssVars.map((v) => (
                      <li key={v} className="font-mono">{v}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

