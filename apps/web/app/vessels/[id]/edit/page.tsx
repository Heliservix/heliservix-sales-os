import { FleetOSClient } from "@/components/fleet/fleet-os-client";

type EditVesselPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditVesselPage({ params }: EditVesselPageProps) {
  const { id } = await params;
  return <FleetOSClient view="vessel-form" recordId={id} mode="edit" />;
}
