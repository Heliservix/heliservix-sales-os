import { FleetOSClient } from "@/components/fleet/fleet-os-client";

type EditFlightLogPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditFlightLogPage({ params }: EditFlightLogPageProps) {
  const { id } = await params;
  return <FleetOSClient view="flight-log-form" recordId={id} mode="edit" />;
}
