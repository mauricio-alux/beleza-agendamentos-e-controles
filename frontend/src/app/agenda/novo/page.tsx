import type { Metadata } from "next";
import { NewAppointmentForm } from "@/components/agenda/NewAppointmentForm";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Novo agendamento | Bellory"
};

export default function NovoAgendamentoPage() {
  return (
    <DashboardLayout>
      <NewAppointmentForm />
    </DashboardLayout>
  );
}
