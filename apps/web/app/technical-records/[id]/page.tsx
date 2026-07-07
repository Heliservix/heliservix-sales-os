import { OperationsOSClient } from "@/components/operations/operations-os-client";

export default async function TechnicalRecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OperationsOSClient recordId={id} view="technical-record-detail" />;
}
