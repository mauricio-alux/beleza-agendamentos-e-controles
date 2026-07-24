import type { Metadata } from "next";
import { DayAgenda } from "@/components/agenda/DayAgenda";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Agenda inteligente do salao."
};

export default function AgendaPage() {
  return (
    <DashboardLayout>
      <DayAgenda />
    </DashboardLayout>
  );
}
