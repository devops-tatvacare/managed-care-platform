import { ROUTES, type RouteName } from "@/config/routes";
import { type LucideIcon } from "lucide-react";

export interface NavItem {
  key: RouteName;
  path: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

function buildNavItems(group: "primary" | "config"): NavItem[] {
  return (Object.entries(ROUTES) as [RouteName, typeof ROUTES[RouteName]][])
    .filter(([, config]) => config.group === group && config.showInSidebar)
    .map(([key, config]) => ({
      key,
      path: config.path,
      label: config.label,
      icon: config.icon,
    }));
}

export const SIDEBAR_GROUPS: NavGroup[] = [
  { label: null, items: buildNavItems("primary") },
  { label: "Configuration", items: buildNavItems("config") },
];
