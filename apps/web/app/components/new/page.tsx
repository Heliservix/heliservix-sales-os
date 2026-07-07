import { Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ComponentForm } from "@/components/fleet/component-form";
import { PageHeader } from "@/components/fleet/page-header";

export default function NewComponentPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px]">
        <PageHeader
          eyebrow="Add Component"
          title="Create a controlled component record from verified source data."
          description="Frontend-only component entry screen prepared for workbook import validation and future maintenance record entry."
          icon={Wrench}
          status="Mock create screen"
        />
        <ComponentForm mode="create" />
      </div>
    </AppShell>
  );
}
