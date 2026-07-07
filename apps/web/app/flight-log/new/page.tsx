import { FleetOSClient } from "@/components/fleet/fleet-os-client";

export default function NewFlightLogPage() {
  return <FleetOSClient view="flight-log-form" mode="create" />;
}
