import { OperationsOSClient } from "@/components/operations/operations-os-client";

export default async function DigitalTwinDetailPage({ params }: { params: Promise<{ registration: string }> }) {
  const { registration } = await params;
  return <OperationsOSClient recordId={registration} view="digital-twin-detail" />;
}
