import type { Metadata } from "next";
import { UsersRound } from "lucide-react";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Clientes | Bellory"
};

export default function ClientesPage() {
  return (
    <DashboardLayout>
      <PlaceholderPage
        title="Clientes"
        description="Centralize clientes, historico de visitas e relacionamento para aumentar recorrencia."
        icon={UsersRound}
        actionLabel="Novo cliente"
      />
    </DashboardLayout>
  );
}
