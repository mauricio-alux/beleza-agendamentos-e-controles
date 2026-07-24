import type { Metadata } from "next";
import { ClientsManager } from "@/components/clients/ClientsManager";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Clientes"
};

export default function ClientesPage() {
  return (
    <DashboardLayout>
      <ClientsManager />
    </DashboardLayout>
  );
}
