import { Anchor } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/fleet/page-header";
import { VesselForm } from "@/components/fleet/vessel-form";

export default function NewVesselPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px]">
        <PageHeader
          eyebrow="Add Vessel"
          title="Create a vessel record for future HeliServiX assignment workflows."
          description="This screen simulates vessel data entry only. Backend persistence will be added after the data model and source-of-truth process are approved."
          icon={Anchor}
          status="Mock create screen"
        />
        <VesselForm mode="create" />
      </div>
    </AppShell>
  );
}
