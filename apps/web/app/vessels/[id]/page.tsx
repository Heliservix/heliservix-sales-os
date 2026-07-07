import { FleetOSClient } from "@/components/fleet/fleet-os-client";

type VesselDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VesselDetailPage({ params }: VesselDetailPageProps) {
  const { id } = await params;
  return <FleetOSClient view="vessel-detail" recordId={id} />;
}
