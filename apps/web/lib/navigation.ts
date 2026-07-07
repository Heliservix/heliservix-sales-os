import {
  AlertTriangle,
  Anchor,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  Plane,
  ShoppingCart,
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
  { label: "Helicopters", href: "/helicopters", icon: Plane, status: "ready" },
  { label: "Vessels", href: "/vessels", icon: Anchor, status: "ready" },
  { label: "Components", href: "/components", icon: Wrench, status: "ready" },
  { label: "Flight Log", href: "/flight-log", icon: ClipboardList, status: "ready" },
  { label: "Maintenance Crew", href: "/crew-portal", icon: UserRoundCog, status: "ready" },
  { label: "Vessel Inventory", href: "/inventory", icon: Boxes, status: "ready" },
  { label: "Purchasing", href: "/purchasing", icon: ShoppingCart, status: "ready" },
  { label: "Alerts", href: "/alerts", icon: AlertTriangle, status: "ready" },
  { label: "Forecast", href: "/forecast", icon: TrendingUp, status: "ready" }
];

export const quickActions = [
  { label: "Log flight", icon: Gauge },
  { label: "Review alerts", icon: AlertTriangle },
  { label: "Plan overhaul", icon: ClipboardCheck }
];
