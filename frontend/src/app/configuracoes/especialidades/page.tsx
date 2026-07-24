import type { Metadata } from "next";
import { OperationalCatalogManager } from "@/components/operational/OperationalCatalogManager";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Especialidades"
};

export default function EspecialidadesSettingsPage() {
  return (
    <DashboardLayout>
      <OperationalCatalogManager tab="specialties" />
    </DashboardLayout>
  );
}
