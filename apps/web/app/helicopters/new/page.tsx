import { Plane } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { HelicopterForm } from "@/components/fleet/helicopter-form";
import { PageHeader } from "@/components/fleet/page-header";

export default function NewHelicopterPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px]">
        <PageHeader
          eyebrow="Add Helicopter"
          title="Create a verified helicopter registry record."
          description="Frontend-only entry screen for real HeliServiX aircraft data. Demo records must be replaced by approved source data before operational use."
          icon={Plane}
          status="Mock create screen"
        />
        <HelicopterForm mode="create" />
      </div>
    </AppShell>
  );
}
