import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Relatorios"
};

export default function RelatoriosPage() {
  return (
    <DashboardLayout>
      <PlaceholderPage
        title="Relatorios"
        description="Area protegida para consolidacao futura de indicadores operacionais e gerenciais."
        icon={BarChart3}
        actionLabel="Ver indicadores"
      />
    </DashboardLayout>
  );
}
