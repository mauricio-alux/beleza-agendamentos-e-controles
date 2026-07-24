import type { Metadata } from "next";
import { ProfessionalSchedulePage } from "@/components/settings/ProfessionalSchedulePage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Horarios do profissional"
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TeamMaintenanceScheduleRoute({ params }: PageProps) {
  const { id } = await params;

  return (
    <DashboardLayout>
      <ProfessionalSchedulePage professionalId={id} backHref={`/equipe/manutencao/${id}`} />
    </DashboardLayout>
  );
}
