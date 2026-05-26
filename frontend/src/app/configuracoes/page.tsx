import type { Metadata } from "next";
import { SettingsHome } from "@/components/settings/SettingsHome";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Configuracoes | Bellory"
};

export default function ConfiguracoesPage() {
  return (
    <DashboardLayout>
      <SettingsHome />
    </DashboardLayout>
  );
}
