import type { Metadata } from "next";
import { ClientsManager } from "@/components/clients/ClientsManager";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Clientes | Bellory"
};

export default function ClientesPage() {
  return (
    <DashboardLayout>
      <ClientsManager />
    </DashboardLayout>
  );
}
