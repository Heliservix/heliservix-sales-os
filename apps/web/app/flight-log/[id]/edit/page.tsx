import { ClipboardList } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { FlightLogForm } from "@/components/fleet/flight-log-form";
import { PageHeader } from "@/components/fleet/page-header";
import { getFlightLog } from "@/lib/fleet-data";

type EditFlightLogPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditFlightLogPage({ params }: EditFlightLogPageProps) {
  const { id } = await params;
  const flightLog = getFlightLog(id);

  if (!flightLog) {
    notFound();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px]">
        <PageHeader
          eyebrow="Edit Flight Log"
          title={`Edit ${flightLog.helicopterRegistration} flight log`}
          description="This screen simulates editing only. Approved flight logs will later trigger hourmeter and component recalculation."
          icon={ClipboardList}
          status="Mock edit screen"
        />
        <FlightLogForm mode="edit" flightLog={flightLog} />
      </div>
    </AppShell>
  );
}
