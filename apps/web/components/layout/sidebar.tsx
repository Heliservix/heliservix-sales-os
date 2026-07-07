import { primaryNavigation } from "@/lib/navigation";
import { StatusPill } from "@/components/ui/status-pill";

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-line bg-white/74 px-4 py-5 backdrop-blur-xl dark:bg-canvas-muted/70 lg:flex lg:flex-col">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-sm font-semibold text-white shadow-control dark:bg-white dark:text-ink">
          HX
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">HeliServiX</p>
          <p className="truncate text-xs text-ink-subtle">Commercial Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1" aria-label="Primary navigation">
        {primaryNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = item.label === "Dashboard";

          return (
            <a
              key={item.label}
              href={item.href}
              className={[
                "group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                isActive
                  ? "bg-ink text-white shadow-control dark:bg-white dark:text-ink"
                  : "text-ink-muted hover:bg-canvas-muted hover:text-ink dark:hover:bg-white/6"
              ].join(" ")}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.status === "ready" ? (
                <span className="h-1.5 w-1.5 rounded-full bg-aviation-green" aria-label="Ready" />
              ) : null}
            </a>
          );
        })}
      </nav>

      <div className="mt-6 rounded-lg border border-line bg-canvas-muted/72 p-4">
        <StatusPill tone="teal">Version 0.1</StatusPill>
        <p className="mt-3 text-sm font-medium text-ink">UI foundation active</p>
        <p className="mt-1 text-xs leading-5 text-ink-subtle">
          Navigation, layout, and dashboard architecture are ready for product workflows.
        </p>
      </div>
    </aside>
  );
}
