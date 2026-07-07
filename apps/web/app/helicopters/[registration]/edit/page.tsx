import { FleetOSClient } from "@/components/fleet/fleet-os-client";

type EditHelicopterPageProps = {
  params: Promise<{ registration: string }>;
};

export default async function EditHelicopterPage({ params }: EditHelicopterPageProps) {
  const { registration } = await params;
  return <FleetOSClient view="helicopter-form" recordId={registration} mode="edit" />;
}
