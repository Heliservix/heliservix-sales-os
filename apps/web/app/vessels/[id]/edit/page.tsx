import { Anchor } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/fleet/page-header";
import { VesselForm } from "@/components/fleet/vessel-form";
import { getVessel } from "@/lib/fleet-data";

type EditVesselPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditVesselPage({ params }: EditVesselPageProps) {
  const { id } = await params;
  const vessel = getVessel(id);

  if (!vessel) {
    notFound();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px]">
        <PageHeader
          eyebrow="Edit Vessel"
          title={`Edit ${vessel.name}`}
          description="This edit screen simulates frontend state only. Real vessel updates require an approved backend workflow."
          icon={Anchor}
          status="Mock edit screen"
        />
        <VesselForm mode="edit" vessel={vessel} />
      </div>
    </AppShell>
  );
}
