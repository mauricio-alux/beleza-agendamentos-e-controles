import type { Metadata } from "next";
import { OperationalCatalogManager } from "@/components/operational/OperationalCatalogManager";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Servicos"
};

export default function ServicosSettingsPage() {
  return (
    <DashboardLayout>
      <OperationalCatalogManager tab="services" />
    </DashboardLayout>
  );
}
