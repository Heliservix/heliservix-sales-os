"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  ClipboardCheck,
  FileText,
  Gauge,
  PackageSearch,
  Plane,
  ShieldAlert,
  Sparkles,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/fleet/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { useI18n } from "@/components/i18n/i18n-provider";
import { buildCopilotAnalysis, type CopilotQuestionId, type CopilotReportId } from "@/lib/copilot";
import { fleetStorageKey, initialFleetStore } from "@/lib/fleet-ops";
import { useDeferredLocalStorageState } from "@/lib/performance";
import type { FleetStore } from "@/types/fleet";

const questionOptions: Array<{ id: CopilotQuestionId; label: string; icon: LucideIcon }> = [
  { id: "expires-next", label: "What expires next?", icon: ShieldAlert },
  { id: "inspect", label: "What should I inspect?", icon: ClipboardCheck },
  { id: "highest-risk", label: "Which helicopter has highest maintenance risk?", icon: Gauge },
  { id: "low-inventory", label: "Which inventory is low?", icon: PackageSearch }
];

const reportOptions: Array<{ id: CopilotReportId; label: string }> = [
  { id: "management-summary", label: "Management Summary" },
  { id: "fleet-status", label: "Fleet Status Report" },
  { id: "maintenance-status", label: "Maintenance Report" },
  { id: "component-due", label: "Component Due Report" },
  { id: "inventory-status", label: "Vessel Inventory Report" },
  { id: "campaign-readiness", label: "Campaign Readiness Report" }
];

export function HeliServiXCopilotClient() {
  const { tx } = useI18n();
  const [store, , isReady] = useDeferredLocalStorageState<FleetStore>(fleetStorageKey, {
    initialValue: initialFleetStore,
    merge: (value) => ({ ...initialFleetStore(), ...value })
  });
  const [selectedQuestion, setSelectedQuestion] = useState<CopilotQuestionId>("expires-next");
  const [selectedReport, setSelectedReport] = useState<CopilotReportId>("management-summary");
  const analysis = useMemo(() => buildCopilotAnalysis(store), [store]);
  const answer = analysis.answers[selectedQuestion];
  const report = analysis.reports.find((item) => item.id === selectedReport) ?? analysis.reports[0];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <PageHeader
          eyebrow="AURA"
          title="Executive operational recommendations from local HeliServiX OS data."
          description="AURA presents decision-support cards for fleet, maintenance, inventory, and campaigns. It does not connect to external APIs and never replaces maintenance approval."
          icon={Bot}
          status="Local-only decision support"
        />
        {!isReady ? <LoadingCopilot /> : (
          <div className="grid gap-6">
            <Panel className="overflow-hidden">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="blue">{tx("Local data only")}</StatusPill>
                    <StatusPill tone="amber">{tx("Decision support")}</StatusPill>
                    <StatusPill tone="neutral">{tx("No external API")}</StatusPill>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-ink">AURA</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-subtle">
                    {tx("Answers are generated from local helicopters, components, alerts, inventory, flight logs, campaigns, purchases, compliance, and technical records.")}
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-canvas-muted/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{tx("Audit rule")}</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">
                    {tx("Every Copilot answer must be verified against the underlying operational records before action.")}
                  </p>
                </div>
              </div>
            </Panel>

            <section className="grid gap-4 md:grid-cols-4">
              {analysis.insights.map((insight) => (
                <Panel key={insight.title} className="transition duration-150 hover:-translate-y-0.5 hover:border-aviation-blue/25">
                  <StatusPill tone={insight.tone}>{tx(insight.title)}</StatusPill>
                  <p className="mt-4 text-3xl font-semibold leading-none text-ink">{insight.value}</p>
                  <p className="mt-3 text-sm leading-6 text-ink-subtle">{tx(insight.detail)}</p>
                </Panel>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Panel>
                <SectionTitle icon={Sparkles} title="AURA Focus" description="Select one operational question for an executive recommendation view." />
                <div className="mt-5 grid gap-2">
                  {questionOptions.map((item) => {
                    const Icon = item.icon;
                    const active = item.id === selectedQuestion;
                    return (
                      <button
                        key={item.id}
                        className={[
                          "flex items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm font-semibold transition",
                          active ? "border-brand-blue bg-brand-lightBlue text-ink" : "border-line bg-white text-ink-muted hover:border-aviation-blue/30 hover:text-ink dark:bg-canvas-muted"
                        ].join(" ")}
                        type="button"
                        onClick={() => setSelectedQuestion(item.id)}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-aviation-blue" aria-hidden="true" />
                        {tx(item.label)}
                      </button>
                    );
                  })}
                </div>
              </Panel>

              <Panel>
                <SectionTitle icon={ShieldAlert} title={answer.title} description={answer.summary} />
                <div className="mt-5 grid gap-3">
                  {answer.records.length ? answer.records.map((record) => (
                    <article key={`${record.label}-${record.detail}`} className="rounded-xl border border-line bg-white p-4 shadow-control dark:bg-canvas-muted/70">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <h3 className="text-sm font-semibold text-ink">{record.label}</h3>
                        <StatusPill tone={record.tone}>{record.tone === "red" ? "Critical" : record.tone === "amber" ? "High" : "Monitor"}</StatusPill>
                      </div>
                      <div className="mt-4 grid gap-2">
                        <RecommendationLine label="Recommendation" value={record.label} />
                        <RecommendationLine label="Evidence" value={record.detail} />
                        <RecommendationLine label="Operational Impact" value={record.tone === "red" ? "May block aircraft readiness." : "Requires management review."} />
                        <RecommendationLine label="Financial Impact" value="Review cost, downtime, and reserve exposure where applicable." />
                        <RecommendationLine label="Recommended Action" value={record.tone === "green" ? "Continue monitoring." : "Assign owner and review today."} />
                      </div>
                    </article>
                  )) : <EmptyCopilotState />}
                </div>
              </Panel>
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <Panel>
                <SectionTitle icon={FileText} title="Generate management reports" description="Draft report text from local operational records." />
                <div className="mt-5 grid gap-2">
                  {reportOptions.map((item) => (
                    <button
                      key={item.id}
                      className={[
                        "rounded-lg border px-3 py-3 text-left text-sm font-semibold transition",
                        item.id === selectedReport ? "border-brand-blue bg-brand-lightBlue text-ink" : "border-line bg-white text-ink-muted hover:border-aviation-blue/30 hover:text-ink dark:bg-canvas-muted"
                      ].join(" ")}
                      type="button"
                      onClick={() => setSelectedReport(item.id)}
                    >
                      {tx(item.label)}
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">{tx(report.title)}</h2>
                    <p className="mt-1 text-sm leading-6 text-ink-subtle">{tx(report.subtitle)}</p>
                  </div>
                  <StatusPill tone="teal">{tx("Draft")}</StatusPill>
                </div>
                <div className="mt-5 grid gap-4">
                  {report.sections.map((section) => (
                    <article key={section.heading} className="rounded-lg border border-line bg-canvas-muted/50 p-4">
                      <h3 className="text-sm font-semibold text-ink">{tx(section.heading)}</h3>
                      <ul className="mt-3 grid gap-2">
                        {section.lines.map((line) => (
                          <li key={line} className="text-sm leading-6 text-ink-subtle">{line}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </Panel>
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
              <Panel>
                <SectionTitle icon={Plane} title="Imported helicopter analysis" description="User/imported data is separated from demo interface records." />
                <div className="mt-5 grid gap-3">
                  <MiniLine label="Imported helicopters" value={String(analysis.importedHelicopters.length)} />
                  <MiniLine label="Imported components" value={String(analysis.importedComponents.length)} />
                  <MiniLine label="Demo warning" value="Unknown demo assignments are not operational data." />
                </div>
              </Panel>
              <Panel>
                <SectionTitle icon={Wrench} title="Maintenance status" description="Component exposure and open alert summary." />
                <div className="mt-5 grid gap-3">
                  <MiniLine label="Open alerts" value={String(analysis.openAlerts.length)} />
                  <MiniLine label="Components not OK" value={String(analysis.expiringComponents.length)} />
                  <MiniLine label="Highest risk" value={analysis.helicopterRisks[0]?.registration ?? "None"} />
                </div>
              </Panel>
              <Panel>
                <SectionTitle icon={PackageSearch} title="Inventory and campaign summary" description="Local stock and deployment readiness signals." />
                <div className="mt-5 grid gap-3">
                  <MiniLine label="Inventory risks" value={String(analysis.lowInventory.length)} />
                  <MiniLine label="Active/planned campaigns" value={String(analysis.activeCampaigns.length)} />
                  <MiniLine label="Report source" value="localStorage FleetStore" />
                </div>
              </Panel>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SectionTitle({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  const { tx } = useI18n();
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-aviation-blue/15 bg-brand-lightBlue text-aviation-blue">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-ink">{tx(title)}</h2>
        <p className="mt-1 text-sm leading-6 text-ink-subtle">{tx(description)}</p>
      </div>
    </div>
  );
}

function MiniLine({ label, value }: { label: string; value: string }) {
  const { tx } = useI18n();
  return (
    <div className="rounded-lg border border-line bg-canvas-muted/50 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{tx(label)}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function RecommendationLine({ label, value }: { label: string; value: string }) {
  const { tx } = useI18n();
  return (
    <div className="grid gap-1 rounded-lg border border-line bg-canvas-muted/40 px-3 py-2 text-sm sm:grid-cols-[150px_1fr]">
      <span className="font-semibold text-ink">{tx(label)}</span>
      <span className="text-ink-subtle">{tx(value)}</span>
    </div>
  );
}

function EmptyCopilotState() {
  const { tx } = useI18n();
  return (
    <div className="hsv-empty-state">
      <p className="font-semibold text-ink">{tx("No local records available for this answer.")}</p>
      <p className="mt-1 text-xs text-ink-subtle">{tx("Import or enter real HeliServiX records before using this answer operationally.")}</p>
    </div>
  );
}

function LoadingCopilot() {
  const { tx } = useI18n();
  return (
    <Panel>
      <div className="flex items-center justify-between gap-4">
        <div className="hsv-skeleton-line h-3 w-44" />
        <div className="hsv-skeleton-line h-8 w-24" />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="hsv-skeleton-line h-24" />
        <div className="hsv-skeleton-line h-24" />
        <div className="hsv-skeleton-line h-24" />
        <div className="hsv-skeleton-line h-24" />
      </div>
      <p className="mt-4 text-sm font-medium text-ink-subtle">{tx("Loading local records...")}</p>
    </Panel>
  );
}
