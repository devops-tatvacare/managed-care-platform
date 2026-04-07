import { type LucideIcon } from "lucide-react";
import { Icons } from "@/config/icons";

export interface RouteConfig {
  path: string;
  label: string;
  icon: LucideIcon;
  group: "primary" | "config";
  showInSidebar: boolean;
}

export const ROUTES = {
  login: {
    path: "/login",
    label: "Login",
    icon: Icons.user,
    group: "primary" as const,
    showInSidebar: false,
  },
  commandCenter: {
    path: "/dashboard",
    label: "Command Center",
    icon: Icons.commandCenter,
    group: "primary" as const,
    showInSidebar: true,
  },
  patients: {
    path: "/dashboard/patients",
    label: "Patients",
    icon: Icons.patients,
    group: "primary" as const,
    showInSidebar: true,
  },
  patientDetail: {
    path: "/dashboard/patients/[id]",
    label: "Patient Detail",
    icon: Icons.patients,
    group: "primary" as const,
    showInSidebar: false,
  },
  communications: {
    path: "/dashboard/communications",
    label: "Communications",
    icon: Icons.communications,
    group: "primary" as const,
    showInSidebar: true,
  },
  outcomes: {
    path: "/dashboard/outcomes",
    label: "Outcomes",
    icon: Icons.outcomes,
    group: "primary" as const,
    showInSidebar: true,
  },
  cohortisation: {
    path: "/dashboard/cohortisation",
    label: "Cohortisation",
    icon: Icons.cohortisation,
    group: "config" as const,
    showInSidebar: true,
  },
  pathways: {
    path: "/dashboard/pathways",
    label: "Pathway Builder",
    icon: Icons.pathwayBuilder,
    group: "config" as const,
    showInSidebar: true,
  },
  pathwayEditor: {
    path: "/dashboard/pathways/[id]",
    label: "Edit Pathway",
    icon: Icons.pathwayBuilder,
    group: "config" as const,
    showInSidebar: false,
  },
  cohortBuilder: {
    path: "/dashboard/cohortisation/builder",
    label: "Cohort Builder",
    icon: Icons.cohortisation,
    group: "config" as const,
    showInSidebar: false,
  },
  cohortBuilderEditor: {
    path: "/dashboard/cohortisation/builder/[id]",
    label: "Edit Program",
    icon: Icons.cohortisation,
    group: "config" as const,
    showInSidebar: false,
  },
} as const;

export type RouteName = keyof typeof ROUTES;

export function getRoute(name: RouteName): RouteConfig {
  return ROUTES[name];
}

export function buildPath(name: RouteName, params?: Record<string, string>): string {
  let path: string = ROUTES[name].path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`[${key}]`, value);
    }
  }
  return path;
}
