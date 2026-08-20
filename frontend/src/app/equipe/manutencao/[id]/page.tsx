import type { Metadata } from "next";
import { TeamMaintenancePage } from "@/components/team/TeamMaintenancePage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Manutenção da Equipe"
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TeamMaintenanceRoute({ params }: PageProps) {
  const { id } = await params;

  return (
    <DashboardLayout>
      <TeamMaintenancePage professionalId={id} />
    </DashboardLayout>
  );
}
