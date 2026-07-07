import { FleetOSClient } from "@/components/fleet/fleet-os-client";

type HelicopterDetailPageProps = {
  params: Promise<{ registration: string }>;
};

export default async function HelicopterDetailPage({ params }: HelicopterDetailPageProps) {
  const { registration } = await params;
  return <FleetOSClient view="helicopter-detail" recordId={registration} />;
}
