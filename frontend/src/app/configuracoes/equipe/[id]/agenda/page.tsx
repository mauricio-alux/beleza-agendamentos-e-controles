import type { Metadata } from "next";
import { ProfessionalSchedulePage } from "@/components/settings/ProfessionalSchedulePage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Agenda do profissional | Bellory"
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProfessionalAgendaSettingsPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <DashboardLayout>
      <ProfessionalSchedulePage professionalId={id} />
    </DashboardLayout>
  );
}
