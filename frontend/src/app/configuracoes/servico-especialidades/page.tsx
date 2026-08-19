import type { Metadata } from "next";
import { OperationalCatalogManager } from "@/components/operational/OperationalCatalogManager";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Serviços e Especialidades"
};

export default function ServicoEspecialidadesSettingsPage() {
  return (
    <DashboardLayout>
      <OperationalCatalogManager tab="service-specialties" />
    </DashboardLayout>
  );
}
