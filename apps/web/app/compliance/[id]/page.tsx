import { OperationsOSClient } from "@/components/operations/operations-os-client";

export default async function ComplianceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OperationsOSClient recordId={id} view="compliance-detail" />;
}
