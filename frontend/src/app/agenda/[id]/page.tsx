import type { Metadata } from "next";
import { AppointmentDetail } from "@/components/agenda/AppointmentDetail";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Agendamento | Bellory"
};

export default async function AgendamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <DashboardLayout>
      <AppointmentDetail id={id} />
    </DashboardLayout>
  );
}
