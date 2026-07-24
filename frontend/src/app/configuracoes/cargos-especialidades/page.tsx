import type { Metadata } from "next";
import { OperationalCatalogManager } from "@/components/operational/OperationalCatalogManager";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Cargos x Especialidades"
};

export default function CargosEspecialidadesSettingsPage() {
  return (
    <DashboardLayout>
      <OperationalCatalogManager tab="role-specialties" />
    </DashboardLayout>
  );
}
