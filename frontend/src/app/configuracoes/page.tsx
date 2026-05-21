import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Configuracoes | Bellory"
};

export default function ConfiguracoesPage() {
  return (
    <DashboardLayout>
      <PlaceholderPage
        title="Configuracoes"
        description="Ajuste dados do salao, preferencias operacionais, links publicos e integracoes futuras."
        icon={Settings}
        actionLabel="Editar configuracoes"
      />
    </DashboardLayout>
  );
}
