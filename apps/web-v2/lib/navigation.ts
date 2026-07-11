import {
  AlertTriangle,
  Anchor,
  Bot,
  Boxes,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FileSpreadsheet,
  GitBranch,
  Gauge,
  LayoutDashboard,
  Plane,
  Radar,
  ReceiptText,
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

export type NavigationGroup = {
  label: string;
  labelKey: TranslationKey;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Operations",
    labelKey: "navGroup.operations",
    items: [
      { label: "Operations Command Center", labelKey: "nav.operationsCommandCenter", href: "/", icon: Gauge, status: "ready" },
      { label: "Fleet", labelKey: "nav.fleet", href: "/helicopters", icon: Plane, status: "ready" },
      { label: "Aircraft", labelKey: "nav.aircraft", href: "/digital-twin", icon: Radar, status: "planned" },
      { label: "Vessels", labelKey: "nav.vessels", href: "/vessels", icon: Anchor, status: "ready" },
      { label: "Campaigns", labelKey: "nav.campaigns", href: "/campaigns", icon: CalendarRange, status: "ready" },
      { label: "Personnel", labelKey: "nav.personnel", href: "/personnel", icon: UserRoundCog, status: "ready" }
    ]
  },
  {
    label: "Maintenance",
    labelKey: "navGroup.maintenance",
    items: [
      { label: "Components", labelKey: "nav.components", href: "/components", icon: Wrench, status: "planned" },
      { label: "Weekly Reports", labelKey: "nav.weeklyReports", href: "/reports/import", icon: ClipboardList, status: "ready" },
      { label: "Maintenance", labelKey: "nav.maintenance", href: "/alerts", icon: AlertTriangle, status: "ready" },
      { label: "Technical Records", labelKey: "nav.technicalRecords", href: "/technical-records", icon: FileText, status: "ready" },
      { label: "Compliance", labelKey: "nav.compliance", href: "/compliance", icon: ShieldCheck, status: "ready" }
    ]
  },
  {
    label: "Supply Chain",
    labelKey: "navGroup.supplyChain",
    items: [
      { label: "Inventory", labelKey: "nav.inventory", href: "/inventory", icon: Boxes, status: "ready" },
      { label: "Purchasing", labelKey: "nav.purchasing", href: "/purchasing", icon: ShoppingCart, status: "ready" }
    ]
  },
  {
    label: "Tools",
    labelKey: "navGroup.tools",
    items: [
      { label: "Aircraft Migration Center", labelKey: "nav.aircraftMigrationCenter", href: "/components", icon: FileSpreadsheet, status: "planned" },
      { label: "Lease Simulator", labelKey: "nav.leaseSimulator", href: "#lease-simulator", icon: TrendingUp, status: "planned" },
      { label: "Reports", labelKey: "nav.reports", href: "/copilot", icon: ReceiptText, status: "planned" },
      { label: "AURA", labelKey: "nav.aura", href: "/aura", icon: Bot, status: "ready" }
    ]
  }
];

export const primaryNavigation: NavigationItem[] = navigationGroups.flatMap((group) => group.items);

export const quickActions = [
  { label: "Create campaign", labelKey: "actions.createCampaign" as const, icon: CalendarRange },
  { label: "Log flight", labelKey: "actions.logFlight" as const, icon: Gauge },
  { label: "Review compliance", labelKey: "actions.reviewCompliance" as const, icon: ShieldCheck },
  { label: "Plan overhaul", labelKey: "actions.planOverhaul" as const, icon: ClipboardCheck }
];
