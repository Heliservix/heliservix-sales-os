import { FleetOSClient } from "@/components/fleet/fleet-os-client";

type ComponentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ComponentDetailPage({ params }: ComponentDetailPageProps) {
  const { id } = await params;
  return <FleetOSClient view="component-detail" recordId={id} />;
}
