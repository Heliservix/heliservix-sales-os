import { Plane } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { HelicopterForm } from "@/components/fleet/helicopter-form";
import { PageHeader } from "@/components/fleet/page-header";
import { getHelicopter } from "@/lib/fleet-data";

type EditHelicopterPageProps = {
  params: Promise<{ registration: string }>;
};

export default async function EditHelicopterPage({ params }: EditHelicopterPageProps) {
  const { registration } = await params;
  const helicopter = getHelicopter(registration);

  if (!helicopter) {
    notFound();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px]">
        <PageHeader
          eyebrow="Edit Helicopter"
          title={`Edit ${helicopter.registration}`}
          description="This screen simulates editing only. Real HeliServiX aircraft changes require verified source data."
          icon={Plane}
          status="Mock edit screen"
        />
        <HelicopterForm mode="edit" helicopter={helicopter} />
      </div>
    </AppShell>
  );
}
