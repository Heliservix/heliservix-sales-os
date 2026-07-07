import { OperationsOSClient } from "@/components/operations/operations-os-client";

export default function NewComplianceItemPage() {
  return <OperationsOSClient mode="create" view="compliance-form" />;
}
