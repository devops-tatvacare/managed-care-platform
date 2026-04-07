# Bradesco Care Admin — Design System

This is the single source of truth for all UI decisions. Follow it exactly. Do not invent new patterns.

---

## 1. Tokens

All colors come from `globals.css` CSS variables. **Never hardcode hex values.**

### Text

| Token | Variable | Use for |
|---|---|---|
| `text-text-primary` | `#0f172a` | Headings, names, primary values |
| `text-text-secondary` | `#374151` | Body copy, descriptions |
| `text-text-muted` | `#64748b` | Labels, metadata, secondary info |
| `text-text-placeholder` | `#94a3b8` | Disabled text, hints, empty icons |

### Backgrounds

| Token | Variable | Use for |
|---|---|---|
| `bg-bg-primary` | `#ffffff` | Cards, modals, inputs |
| `bg-bg-secondary` | `#f8fafc` | Page background (body default) |
| `bg-bg-hover` | `#f1f5f9` | Hover states on rows, buttons |

### Borders

| Token | Variable | Use for |
|---|---|---|
| `border-border-default` | `#e2e8f0` | Card borders, table borders, dividers |
| `border-border-subtle` | `#f1f5f9` | Light separators within cards |

### Brand

| Token | Variable | Use for |
|---|---|---|
| `text-brand-primary` / `bg-brand-primary` | `#4f46e5` | Primary buttons, active tabs, links, accents |
| `bg-brand-primary-light` | `#eef2ff` | Light brand backgrounds (avatars, highlights) |
| `hover:bg-brand-primary-hover` | `#4338ca` | Primary button hover (use `hover:bg-primary/90` for buttons) |

### Status

Each status has three tokens: foreground, background, border.

| Status | Foreground | Background | Border |
|---|---|---|---|
| Success | `text-status-success` | `bg-status-success-bg` | `border-status-success-border` |
| Warning | `text-status-warning` | `bg-status-warning-bg` | `border-status-warning-border` |
| Error | `text-status-error` | `bg-status-error-bg` | `border-status-error-border` |
| Info | `text-status-info` | `bg-status-info-bg` | `border-status-info-border` |

### AI

| Token | Variable | Use for |
|---|---|---|
| `text-ai-primary` / `bg-ai-primary` | `#4f46e5` | AI accent color |
| `border-ai-border` | `#c7d2fe` | AI card borders |
| AI background | `color-mix(in srgb, var(--color-ai-primary) 3%, white)` | AI card fill (use via DashboardCard `variant="ai"`) |

### Sidebar (dark theme)

| Token | Use for |
|---|---|
| `bg-sidebar-bg` | Sidebar background |
| `text-sidebar-text` | Inactive nav text |
| `bg-sidebar-active-bg` | Active nav item bg |
| `text-sidebar-active-text` | Active nav text + icon |
| `border-sidebar-active-border` | Active item left border |
| `border-sidebar-divider` | Sidebar section dividers |

---

## 2. Typography

**Font:** Geist Sans (body), Geist Mono (code/monospace).

| Purpose | Classes | Example |
|---|---|---|
| Page title | `text-xl font-bold text-text-primary` | "Patients", "Cohortisation" |
| Section heading | `text-sm font-semibold text-text-primary` | "Key Labs", "Active Medications" |
| Card title | `text-[13px] font-semibold` | DashboardCard titles |
| Body text | `text-sm text-text-secondary` | Descriptions, AI output |
| Label (form) | `text-xs font-medium text-text-muted` | Form field labels |
| Label (KPI) | `text-[11px] font-medium uppercase tracking-wide text-text-muted` | KPI card labels |
| Category label | `text-[10px] font-semibold uppercase tracking-wider text-text-muted` | Sidebar groups, builder categories |
| KPI value | `text-2xl font-bold text-text-primary` | Large metric numbers |
| Metadata | `text-xs text-text-muted` | Timestamps, counts, secondary info |
| Tiny text | `text-[10px]` or `text-[11px]` | Badges, micro-labels, trend values |
| Description (page) | `text-sm text-text-muted` | PageHeader description |

### Rules

- **Page titles:** Always `text-xl font-bold`. One per page, inside `PageHeader`.
- **Section headings:** Always `text-sm font-semibold`. Never use `text-base` or `text-lg` for section headers.
- **No `text-base` or `text-lg`** inside content areas. The hierarchy is `text-xl` → `text-sm` → `text-xs` → `text-[11px]` → `text-[10px]`.
- **Numeric values** in tables use `tabular-nums` and `text-right` alignment.

---

## 3. Spacing

### Page layout

```
AppShell main area: p-4 lg:p-6
Page sections:      space-y-6
```

### Card internals

| Component | Header | Content | Pattern |
|---|---|---|---|
| KpiCard | `px-4 py-2.5` | `px-4 py-3` | Compact — Separator between header and content |
| DashboardCard | `px-4 py-3` | `px-4 py-3` | Standard — Separator between header and content |
| Feature cards (ProgramCard, CohortCard) | — | `p-4` | Single content block, no header/content split |

### Gaps

| Purpose | Class |
|---|---|
| Between page sections | `space-y-6` |
| Between section heading and content | `space-y-3` or `mb-3` |
| Between cards in a grid | `gap-4` |
| Between items in a list/stack | `space-y-3` or `space-y-4` |
| Between form label and input | `space-y-1.5` |
| Between buttons in a row | `gap-2` |
| Between inline metadata items | `gap-3` or `gap-4` |

---

## 4. Component Usage

### Shared components (from `components/shared/`)

| Component | When to use | When NOT to use |
|---|---|---|
| `PageHeader` | Top of every page. Pass `title`, optional `description`, optional `actions`. | Never skip it. Every page gets one. |
| `KpiCard` | Metric displays in grids. Pass `label`, `value`, optional `trend`, `subtitle`, `icon`. | Don't use for non-numeric content. |
| `DashboardCard` | Panels that contain lists, charts, or mixed content. Supports `variant="ai"` for AI sections. | Don't nest DashboardCards. |
| `StatusBadge` | Displaying entity status (draft, published, in_progress, etc.). | Don't create custom badge styling for statuses. |
| `EmptyState` | Any list/table/section with zero items. Pass `icon`, `title`, optional `description`, optional `action`. | Don't write inline empty states. Always use this component. |
| `SpotlightSearch` | Already mounted in AppShell. Do not add again. | — |
| `UnsavedChangesGuard` | Any editor/builder page with a dirty state. | Don't use on read-only pages. |

### UI primitives (from `components/ui/`)

#### Button

| Action type | Variant | Size |
|---|---|---|
| Primary action (Save, Create, Submit) | `default` | `default` (h-9) |
| Secondary action (Cancel, Back) | `outline` | `default` or `sm` |
| Tertiary/subtle (Filter, Toggle) | `ghost` | `sm` or `xs` |
| Destructive (Delete, Remove) | `destructive` | `default` or `sm` |
| Icon-only | `outline` or `ghost` | `icon` (9), `icon-sm` (8), `icon-xs` (6) |

**Banned:** `link` variant in forms or action bars. `lg` size unless it's a hero CTA.

#### Tabs

| Context | Variant | Styling |
|---|---|---|
| Page-level navigation (patient detail) | `line` | `w-full justify-start border-b` with trigger: `rounded-none px-4 py-2.5 text-xs font-semibold text-text-muted data-[state=active]:text-brand-primary data-[state=active]:after:bg-brand-primary` |
| Mode toggle (AI Builder / Config) | `line` | Same as above but `py-2` |
| Sub-navigation within a panel | `default` | Standard shadcn rounded pill style |

**Banned:** Never use `default` (pill) variant for page-level navigation. Always `line`.

#### Card

Always use the shadcn Card primitive. Override padding as needed:
- Feature cards: `p-4`
- Dashboard panels: Use `DashboardCard` wrapper
- KPI metrics: Use `KpiCard` wrapper

**Banned:** Don't create `<div className="rounded-lg border ...">` manually. Use Card.

#### Table

- Wrap in `rounded-lg border border-border-default` (or `rounded-md border` for compact tables)
- Use shadcn `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
- TableHead: inherits `text-xs font-semibold uppercase tracking-wider`
- TableCell: inherits `px-3 py-2.5`
- Numeric columns: `text-right tabular-nums`
- Row hover: built-in `hover:bg-muted/50 even:bg-muted/20`

#### Dialog / Sheet

- Dialogs (`Dialog`): Centered modals for confirmations, small forms. Use `sm:max-w-md` for forms.
- Sheets (`Sheet`): Side drawers for detail views, edit forms. Use `sm:max-w-md`.
- Form inside dialog/sheet: `space-y-4 py-2`

#### Badge

- Use `variant="outline"` for status badges (via `StatusBadge` component)
- Use `variant="secondary"` for counts/labels
- Size: `text-[10px]` for compact, `text-xs` for standard

---

## 5. Layout Patterns

### List page

```
<div className="space-y-6">
  <PageHeader title="..." actions={<Button>Create</Button>} />
  
  {/* Optional filters */}
  <div className="flex items-center gap-3">
    <Select ... />
    <Input placeholder="Search..." />
  </div>
  
  {/* Table or card grid */}
  {error && <ErrorBanner message={error} />}
  {loading && <CenteredSpinner />}
  {!loading && data.length === 0 && <EmptyState ... />}
  {!loading && data.length > 0 && <Table ... />}
  
  {/* Pagination */}
  <div className="flex items-center justify-between">
    <span className="text-xs text-text-muted">Showing X of Y</span>
    <div className="flex gap-1">
      <Button variant="outline" size="sm">Prev</Button>
      <Button variant="outline" size="sm">Next</Button>
    </div>
  </div>
</div>
```

### Detail page

```
<div className="space-y-6">
  <Breadcrumb ... />
  <EntityHeader ... />          {/* Horizontal card: avatar + identity + actions */}
  <KpiStrip ... />              {/* grid grid-cols-N divide-x */}
  <Tabs variant="line">
    <TabsList>...</TabsList>
    <TabsContent className="mt-4">...</TabsContent>
  </Tabs>
</div>
```

### Dashboard page

```
<div className="space-y-6">
  <PageHeader title="..." />
  
  {/* KPI row */}
  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
    <KpiCard ... />
  </div>
  
  {/* Content sections */}
  <section className="space-y-3">
    <h2 className="text-sm font-semibold text-text-primary">Section Title</h2>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map(...)}
    </div>
  </section>
</div>
```

### Builder/Editor page

```
<div className="flex h-full flex-col">
  {/* Top bar */}
  <div className="flex shrink-0 items-center justify-between border-b border-border-default bg-bg-primary px-4 py-2">
    <span className="text-sm font-semibold">{name}</span>
    <Tabs variant="line">...</Tabs>
    <div className="flex items-center gap-2">
      <Button variant="outline">Save Draft</Button>
      <Button>Publish</Button>
    </div>
  </div>
  
  {/* Content fills remaining height */}
  <div className="flex-1 overflow-hidden">
    {mode === "ai" ? <AIBuilder /> : <ConfigPanel />}
  </div>
</div>
```

---

## 6. Grid Breakpoints

Standard responsive grid for card layouts:

```
grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
```

For KPI rows (more columns):

```
grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5
```

---

## 7. State Patterns

### Loading (page-level)

```tsx
<div className="flex items-center justify-center py-24">
  <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
</div>
```

### Loading (inline/section)

```tsx
<div className="mt-12 flex flex-1 items-center justify-center">
  <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
</div>
```

### Error

```tsx
<div className="rounded-md border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error">
  {error}
</div>
```

### Empty

Always use `<EmptyState />`. Never inline empty states.

### Not found

```tsx
<div className="flex flex-col items-center justify-center py-24 text-center">
  <AlertCircle className="h-10 w-10 text-text-placeholder" />
  <h3 className="mt-3 text-sm font-semibold text-text-primary">Not found</h3>
</div>
```

---

## 8. Banned Patterns

| Don't | Do instead |
|---|---|
| Hardcode hex colors (`#4f46e5`) | Use token classes (`text-brand-primary`) |
| `className="rounded-lg border bg-white ..."` for cards | Use `<Card>` component |
| Inline empty states | Use `<EmptyState>` component |
| Custom status badges | Use `<StatusBadge>` component |
| Template literal class concatenation | Use `cn()` from `@/lib/cn` |
| `text-base`, `text-lg` in content areas | Use `text-xl` (title) → `text-sm` → `text-xs` |
| `link` button variant in forms | Use `ghost` or `outline` |
| `default` (pill) tabs for page nav | Use `line` variant |
| Centered page containers (`mx-auto max-w-...`) | Full-width content |
| Custom scrollbars or scroll containers | Use `<ScrollArea>` component |
| `<div>` with click handlers | Use `<Button>` or `<Link>` |
| Nesting DashboardCards | One level only |
| Creating new one-off components for things shared components already handle | Use the shared component |

---

## 9. Icons

**Library:** `lucide-react`

| Context | Size class |
|---|---|
| Button icon (default) | Inherits `size-4` from button CVA |
| KPI card label icon | `h-3.5 w-3.5 shrink-0` |
| Trend arrow | `h-3 w-3` |
| Empty state | `h-10 w-10 text-text-placeholder` |
| Sidebar nav | `h-4 w-4` |

Don't mix icon libraries. Only lucide-react.

---

## 10. Forms

```
Form field:     space-y-1.5 (label + input group)
Form sections:  space-y-4
Label:          text-xs font-medium text-text-muted
Input height:   h-9 (standard), h-8 (compact/dense forms)
Input text:     text-xs for compact, text-sm for standard
Validation:     react-hook-form + zod
Submit area:    flex items-center justify-between (or justify-end)
```

---

## 11. AI-Specific UI

AI content sections use a distinct visual treatment:

```tsx
{/* AI insight card */}
<div className="rounded-lg border border-ai-border bg-gradient-to-br from-indigo-50/60 to-purple-50/40 px-4 py-3">
  <Badge className="bg-brand-primary text-white text-[10px] font-semibold px-2 py-0.5">
    AI Summary
  </Badge>
  <p className="mt-2 text-[13px] text-text-secondary leading-snug">
    {content}
  </p>
</div>

{/* AI panel (via DashboardCard) */}
<DashboardCard variant="ai" title="AI Insights" icon={Sparkles}>
  {children}
</DashboardCard>
```

Always use `border-ai-border` + indigo gradient for AI cards. Never use plain Card for AI content.
