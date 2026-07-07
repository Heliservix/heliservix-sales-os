import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Compass,
  FileText,
  Plane,
  RadioTower,
  ShieldCheck,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type MetricTone = "green" | "amber" | "blue" | "teal";

export const executiveMetrics: Array<{
  label: string;
  value: string;
  detail: string;
  trend: string;
  tone: MetricTone;
}> = [
  {
    label: "Weighted Pipeline",
    value: "$2.84M",
    detail: "Across qualified fleet opportunities",
    trend: "+18% vs. last review",
    tone: "green"
  },
  {
    label: "Priority Accounts",
    value: "42",
    detail: "Owners, operators, and fleet groups",
    trend: "11 require action",
    tone: "amber"
  },
  {
    label: "Aircraft Readiness",
    value: "86%",
    detail: "Commercially available fleet window",
    trend: "2 maintenance watch items",
    tone: "teal"
  },
  {
    label: "Intelligence Signals",
    value: "27",
    detail: "Reviewed in the past 14 days",
    trend: "8 linked to active opportunities",
    tone: "blue"
  }
];

export const commandPanels = [
  {
    title: "Commercial Command",
    description: "Pipeline, account priority, next actions, contracts, and executive visibility.",
    icon: CircleDollarSign,
    stats: [
      ["Active opportunities", "18"],
      ["Proposal-ready accounts", "6"],
      ["Overdue follow-ups", "4"]
    ]
  },
  {
    title: "Flight Readiness",
    description: "Aircraft availability, maintenance constraints, campaign feasibility, and crew context.",
    icon: Plane,
    stats: [
      ["Available helicopters", "3"],
      ["Readiness reviews", "5"],
      ["Maintenance conflicts", "2"]
    ]
  },
  {
    title: "Market Intelligence",
    description: "Fleet movement, port activity, vessel signals, source confidence, and recommended actions.",
    icon: Compass,
    stats: [
      ["High-confidence signals", "9"],
      ["Pending analyst review", "14"],
      ["New vessel links", "7"]
    ]
  }
];

export const operationalTimeline: Array<{
  title: string;
  description: string;
  time: string;
  icon: LucideIcon;
  tone: MetricTone;
}> = [
  {
    title: "Demo fleet renewal signal reviewed",
    description: "Demo regional accounts moved into priority monitoring.",
    time: "08:40",
    icon: ShieldCheck,
    tone: "teal"
  },
  {
    title: "HP1804 availability window updated",
    description: "Commercial calendar now reflects maintenance-dependent readiness.",
    time: "09:15",
    icon: Wrench,
    tone: "amber"
  },
  {
    title: "Annual contract review scheduled",
    description: "Executive summary prepared for operations and commercial alignment.",
    time: "10:30",
    icon: CalendarClock,
    tone: "blue"
  },
  {
    title: "Campaign approval queue cleared",
    description: "Approved drafts are ready for controlled outbound sequencing.",
    time: "11:10",
    icon: CheckCircle2,
    tone: "green"
  }
];

export const readinessSignals: Array<{
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: MetricTone;
}> = [
  {
    label: "Operational feasibility",
    value: "Healthy",
    description: "Most near-term proposals align with current aircraft planning.",
    icon: RadioTower,
    tone: "green"
  },
  {
    label: "Contract exposure",
    value: "Watch",
    description: "Two opportunities need maintenance review before proposal release.",
    icon: AlertTriangle,
    tone: "amber"
  },
  {
    label: "Document readiness",
    value: "Current",
    description: "Aircraft and commercial documents are organized for review.",
    icon: FileText,
    tone: "teal"
  },
  {
    label: "Market movement",
    value: "Active",
    description: "Eastern Pacific fleet signals are creating new outreach windows.",
    icon: Activity,
    tone: "blue"
  }
];

export const countryExposure = [
  { country: "Ecuador", accounts: 16, value: "$1.20M", level: "High" },
  { country: "Panama", accounts: 9, value: "$640K", level: "Medium" },
  { country: "Colombia", accounts: 7, value: "$430K", level: "Medium" },
  { country: "Mexico", accounts: 5, value: "$310K", level: "Watch" },
  { country: "Peru", accounts: 5, value: "$260K", level: "Watch" }
];

export const focusCards = [
  {
    eyebrow: "Next Decision",
    title: "Define the first operational feasibility workflow",
    body: "Version 0.1 establishes the command surface. The next product step is connecting opportunity review to helicopter availability and maintenance context.",
    cta: "Review architecture",
    icon: ArrowUpRight
  },
  {
    eyebrow: "Data Foundation",
    title: "Promote CRM seed artifacts into import mapping",
    body: "The current workbook and schema are preserved as migration references for companies, contacts, opportunities, contracts, email events, and intelligence.",
    cta: "Open data model",
    icon: ArrowUpRight
  }
];
