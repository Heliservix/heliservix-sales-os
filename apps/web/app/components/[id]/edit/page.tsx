import { Wrench } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ComponentForm } from "@/components/fleet/component-form";
import { PageHeader } from "@/components/fleet/page-header";
import { getComponent } from "@/lib/fleet-data";

type EditComponentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditComponentPage({ params }: EditComponentPageProps) {
  const { id } = await params;
  const component = getComponent(id);

  if (!component) {
    notFound();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px]">
        <PageHeader
          eyebrow="Edit Component"
          title={`Edit ${component.componentName}`}
          description="This screen simulates component editing only. Real changes require audited maintenance records."
          icon={Wrench}
          status="Mock edit screen"
        />
        <ComponentForm mode="edit" component={component} />
      </div>
    </AppShell>
  );
}
