import type { Metadata } from "next";
import { SettingsDetailPage } from "@/components/settings/SettingsDetailPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Perfil | Bellory"
};

export default function PerfilSettingsPage() {
  return (
    <DashboardLayout>
      <SettingsDetailPage section="profile" />
    </DashboardLayout>
  );
}
