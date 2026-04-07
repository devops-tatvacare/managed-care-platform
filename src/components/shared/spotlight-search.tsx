"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/config/icons";
import { ROUTES } from "@/config/routes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

const NAV_ITEMS = [
  { label: "Command Center", icon: Icons.commandCenter, path: ROUTES.commandCenter.path },
  { label: "Patients", icon: Icons.patients, path: ROUTES.patients.path },
  { label: "Communications", icon: Icons.communications, path: ROUTES.communications.path },
  { label: "Outcomes", icon: Icons.outcomes, path: ROUTES.outcomes.path },
  { label: "Cohortisation", icon: Icons.cohortisation, path: ROUTES.cohortisation.path },
  { label: "Pathway Builder", icon: Icons.pathwayBuilder, path: ROUTES.pathways.path },
];

export function SpotlightSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

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

  const handleSelect = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Search across patients, pathways, and actions"
    >
      <CommandInput placeholder="Search patients, pathways, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => handleSelect(item.path)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => handleSelect(ROUTES.patients.path)}>
            <Icons.search className="h-4 w-4" />
            <span>Search Patients</span>
            <CommandShortcut>Patients</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(ROUTES.pathways.path)}>
            <Icons.plus className="h-4 w-4" />
            <span>Create Pathway</span>
            <CommandShortcut>Builder</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
