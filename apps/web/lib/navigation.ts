import {
  BarChart3,
  Building2,
  ClipboardCheck,
  FileArchive,
  FileText,
  Handshake,
  LayoutDashboard,
  Mail,
  Plane,
  RadioTower,
  ScrollText,
  Settings,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
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
  { label: "Companies", href: "/companies", icon: Building2, status: "planned" },
  { label: "Contacts", href: "/contacts", icon: UsersRound, status: "planned" },
  { label: "Fleet Owners", href: "/fleet-owners", icon: UserRoundCheck, status: "planned" },
  { label: "Opportunities", href: "/opportunities", icon: Handshake, status: "planned" },
  { label: "Contracts", href: "/contracts", icon: ScrollText, status: "planned" },
  { label: "Flight Operations", href: "/flight-operations", icon: RadioTower, status: "planned" },
  { label: "Helicopters", href: "/helicopters", icon: Plane, status: "planned" },
  { label: "Maintenance", href: "/maintenance", icon: Wrench, status: "planned" },
  { label: "Documents", href: "/documents", icon: FileArchive, status: "planned" },
  {
    label: "Market Intelligence",
    href: "/market-intelligence",
    icon: ShieldCheck,
    status: "planned"
  },
  { label: "Email Center", href: "/email-center", icon: Mail, status: "planned" },
  { label: "Reports", href: "/reports", icon: BarChart3, status: "planned" },
  { label: "Settings", href: "/settings", icon: Settings, status: "planned" }
];

export const quickActions = [
  { label: "Account brief", icon: FileText },
  { label: "Operational review", icon: ClipboardCheck },
  { label: "Campaign draft", icon: Mail }
];
