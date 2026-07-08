import {
  AlertTriangle,
  Anchor,
  Bot,
  Boxes,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GitBranch,
  Gauge,
  LayoutDashboard,
  Plane,
  ShoppingCart,
  ShieldCheck,
  TrendingUp,
  UserRoundCog,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TranslationKey } from "@/lib/i18n";

export type NavigationItem = {
  label: string;
  labelKey: TranslationKey;
  href: string;
  icon: LucideIcon;
  status?: "ready" | "planned";
};

export const primaryNavigation: NavigationItem[] = [
  { label: "Dashboard", labelKey: "nav.dashboard", href: "/", icon: LayoutDashboard, status: "ready" },
  { label: "HeliServiX Copilot", labelKey: "nav.copilot", href: "/copilot", icon: Bot, status: "ready" },
  { label: "Campaigns", labelKey: "nav.campaigns", href: "/campaigns", icon: CalendarRange, status: "ready" },
  { label: "Aircraft Operations Center", labelKey: "nav.aircraftOperationsCenter", href: "/digital-twin", icon: GitBranch, status: "ready" },
  { label: "Helicopters", labelKey: "nav.helicopters", href: "/helicopters", icon: Plane, status: "ready" },
  { label: "Vessels", labelKey: "nav.vessels", href: "/vessels", icon: Anchor, status: "ready" },
  { label: "Components", labelKey: "nav.components", href: "/components", icon: Wrench, status: "ready" },
  { label: "Flight Log", labelKey: "nav.flightLog", href: "/flight-log", icon: ClipboardList, status: "ready" },
  { label: "Maintenance Crew", labelKey: "nav.maintenanceCrew", href: "/crew-portal", icon: UserRoundCog, status: "ready" },
  { label: "Vessel Inventory", labelKey: "nav.vesselInventory", href: "/inventory", icon: Boxes, status: "ready" },
  { label: "Purchasing", labelKey: "nav.purchasing", href: "/purchasing", icon: ShoppingCart, status: "ready" },
  { label: "Technical Records", labelKey: "nav.technicalRecords", href: "/technical-records", icon: FileText, status: "ready" },
  { label: "Compliance", labelKey: "nav.compliance", href: "/compliance", icon: ShieldCheck, status: "ready" },
  { label: "Alerts", labelKey: "nav.alerts", href: "/alerts", icon: AlertTriangle, status: "ready" },
  { label: "Forecast", labelKey: "nav.forecast", href: "/forecast", icon: TrendingUp, status: "ready" }
];

export const quickActions = [
  { label: "Create campaign", labelKey: "actions.createCampaign" as const, icon: CalendarRange },
  { label: "Log flight", labelKey: "actions.logFlight" as const, icon: Gauge },
  { label: "Review compliance", labelKey: "actions.reviewCompliance" as const, icon: ShieldCheck },
  { label: "Plan overhaul", labelKey: "actions.planOverhaul" as const, icon: ClipboardCheck }
];
