import type { Metadata } from "next";
import { DayAgenda } from "@/components/agenda/DayAgenda";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Agenda | Bellory",
  description: "Agenda inteligente do Bellory."
};

export default function AgendaPage() {
  return (
    <DashboardLayout>
      <DayAgenda />
    </DashboardLayout>
  );
}
