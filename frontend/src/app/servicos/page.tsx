import type { Metadata } from "next";
import { ServicesManager } from "@/components/services/ServicesManager";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Servicos"
};

export default function ServicosPage() {
  return (
    <DashboardLayout>
      <ServicesManager />
    </DashboardLayout>
  );
}
