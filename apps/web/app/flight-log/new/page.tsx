import { ClipboardList } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { FlightLogForm } from "@/components/fleet/flight-log-form";
import { PageHeader } from "@/components/fleet/page-header";

export default function NewFlightLogPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px]">
        <PageHeader
          eyebrow="Create Flight Log"
          title="Enter a flight log for future hourmeter and component recalculation."
          description="Frontend-only screen. Saving here does not update aircraft hourmeters, component remaining hours, or maintenance alerts."
          icon={ClipboardList}
          status="Mock create screen"
        />
        <FlightLogForm mode="create" />
      </div>
    </AppShell>
  );
}
