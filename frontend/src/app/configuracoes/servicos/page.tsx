import type { Metadata } from "next";
import { SettingsDetailPage } from "@/components/settings/SettingsDetailPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Servicos | Bellory"
};

export default function ServicosSettingsPage() {
  return (
    <DashboardLayout>
      <SettingsDetailPage section="services" />
    </DashboardLayout>
  );
}
