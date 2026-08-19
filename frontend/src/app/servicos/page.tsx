import type { Metadata } from "next";
import { ServicesMerManager } from "@/components/services/ServicesMerManager";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Serviços"
};

export default function ServicosPage() {
  return (
    <DashboardLayout>
      <ServicesMerManager />
    </DashboardLayout>
  );
}
