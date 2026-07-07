import { FleetOSClient } from "@/components/fleet/fleet-os-client";

type EditComponentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditComponentPage({ params }: EditComponentPageProps) {
  const { id } = await params;
  return <FleetOSClient view="component-form" recordId={id} mode="edit" />;
}
