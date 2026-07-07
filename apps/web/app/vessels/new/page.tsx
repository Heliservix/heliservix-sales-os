import { FleetOSClient } from "@/components/fleet/fleet-os-client";

export default function NewVesselPage() {
  return <FleetOSClient view="vessel-form" mode="create" />;
}
