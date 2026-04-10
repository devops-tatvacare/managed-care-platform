"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/config/icons";
import { ROUTES, buildPath } from "@/config/routes";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import type { SearchEntityType, SearchResultItem } from "@/services/types/search";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

/* ── Static data ──────────────────────────────────────────────────────────── */

const NAV_ITEMS = [
  { label: "Command Center", icon: Icons.commandCenter, path: ROUTES.commandCenter.path },
  { label: "Patients", icon: Icons.patients, path: ROUTES.patients.path },
  { label: "Communications", icon: Icons.communications, path: ROUTES.communications.path },
  { label: "Outcomes", icon: Icons.outcomes, path: ROUTES.outcomes.path },
  { label: "Cohortisation", icon: Icons.cohortisation, path: ROUTES.cohortisation.path },
  { label: "Pathway Builder", icon: Icons.pathwayBuilder, path: ROUTES.pathways.path },
];

const QUICK_ACTIONS = [
  { label: "Search Patients", icon: Icons.search, path: ROUTES.patients.path, shortcut: "Go" },
  { label: "Create Pathway", icon: Icons.plus, path: ROUTES.pathways.path, shortcut: "New" },
];

const ENTITY_CONFIG: Record<SearchEntityType, { label: string; icon: typeof Icons.patients; getPath: (item: SearchResultItem) => string }> = {
  patient: {
    label: "Patients",
    icon: Icons.patients,
    getPath: (item) => buildPath("patientDetail", { id: item.entity_id }),
  },
  pathway: {
    label: "Pathways",
    icon: Icons.pathwayBuilder,
    getPath: (item) => buildPath("pathwayEditor", { id: item.entity_id }),
  },
  program: {
    label: "Programs",
    icon: Icons.cohortisation,
    getPath: (item) => buildPath("cohortBuilderEditor", { id: item.entity_id }),
  },
  cohort: {
    label: "Cohorts",
    icon: Icons.cohortisation,
    getPath: (item) => {
      const programId = item.metadata?.program_id as string | undefined;
      return programId
        ? buildPath("cohortBuilderEditor", { id: programId })
        : ROUTES.cohortisation.path;
    },
  },
  communication: {
    label: "Communications",
    icon: Icons.communications,
    getPath: () => ROUTES.communications.path,
  },
  action: {
    label: "Actions",
    icon: Icons.commandCenter,
    getPath: () => ROUTES.commandCenter.path,
  },
};

/* ── Display order for entity type groups ─────────────────────────────────── */
const ENTITY_ORDER: SearchEntityType[] = [
  "patient", "pathway", "program", "cohort", "communication", "action",
];

/* ── Component ────────────────────────────────────────────────────────────── */

export function SpotlightSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { data, isLoading } = useDebouncedSearch(query);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const handleSelect = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const hasDbResults = data && data.total > 0;
  const showEmptyState = query.trim().length >= 2 && !isLoading && !hasDbResults;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Search across patients, pathways, programs, and more"
      className="sm:max-w-xl"
    >
      <CommandInput
        placeholder="Search patients, pathways, actions..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[400px]">
        {showEmptyState && <CommandEmpty>No results found.</CommandEmpty>}

        {/* Static pages — always visible, cmdk filters client-side */}
        <CommandGroup heading="Pages">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => handleSelect(item.path)}
              value={`page ${item.label}`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Static quick actions */}
        <CommandGroup heading="Quick Actions">
          {QUICK_ACTIONS.map((action) => (
            <CommandItem
              key={action.label}
              onSelect={() => handleSelect(action.path)}
              value={`action ${action.label}`}
            >
              <action.icon className="h-4 w-4" />
              <span>{action.label}</span>
              <CommandShortcut>{action.shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Loading skeleton */}
        {isLoading && query.trim().length >= 2 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Searching...">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-3">
                  <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="ml-auto h-3 w-20 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Dynamic DB results */}
        {hasDbResults && !isLoading && (
          <>
            <CommandSeparator />
            {ENTITY_ORDER.map((entityType) => {
              const items = data.results[entityType];
              if (!items?.length) return null;
              const config = ENTITY_CONFIG[entityType];
              const Icon = config.icon;

              return (
                <CommandGroup key={entityType} heading={config.label}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.entity_id}
                      onSelect={() => handleSelect(config.getPath(item))}
                      value={`${entityType} ${item.title} ${item.subtitle ?? ""}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.subtitle && (
                        <span className="ml-2 truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      )}
                      {item.metadata?.status ? (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {String(item.metadata.status)}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
