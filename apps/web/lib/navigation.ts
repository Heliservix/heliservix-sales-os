import {
  AlertTriangle,
  Anchor,
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

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  status?: "ready" | "planned";
};

export const primaryNavigation: NavigationItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, status: "ready" },
  { label: "Campaigns", href: "/campaigns", icon: CalendarRange, status: "ready" },
  { label: "Digital Twin", href: "/digital-twin", icon: GitBranch, status: "ready" },
  { label: "Helicopters", href: "/helicopters", icon: Plane, status: "ready" },
  { label: "Vessels", href: "/vessels", icon: Anchor, status: "ready" },
  { label: "Components", href: "/components", icon: Wrench, status: "ready" },
  { label: "Flight Log", href: "/flight-log", icon: ClipboardList, status: "ready" },
  { label: "Maintenance Crew", href: "/crew-portal", icon: UserRoundCog, status: "ready" },
  { label: "Vessel Inventory", href: "/inventory", icon: Boxes, status: "ready" },
  { label: "Purchasing", href: "/purchasing", icon: ShoppingCart, status: "ready" },
  { label: "Technical Records", href: "/technical-records", icon: FileText, status: "ready" },
  { label: "Compliance", href: "/compliance", icon: ShieldCheck, status: "ready" },
  { label: "Alerts", href: "/alerts", icon: AlertTriangle, status: "ready" },
  { label: "Forecast", href: "/forecast", icon: TrendingUp, status: "ready" }
];

export const quickActions = [
  { label: "Create campaign", icon: CalendarRange },
  { label: "Log flight", icon: Gauge },
  { label: "Review compliance", icon: ShieldCheck },
  { label: "Plan overhaul", icon: ClipboardCheck }
];
