import type { Metadata } from "next";
import { Scissors } from "lucide-react";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Servicos | Bellory"
};

export default function ServicosPage() {
  return (
    <DashboardLayout>
      <PlaceholderPage
        title="Servicos"
        description="Prepare catalogo, duracao, precos e comissoes para a agenda online."
        icon={Scissors}
        actionLabel="Novo servico"
      />
    </DashboardLayout>
  );
}
