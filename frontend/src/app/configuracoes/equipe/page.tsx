import type { Metadata } from "next";
import { SettingsDetailPage } from "@/components/settings/SettingsDetailPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Equipe | Bellory"
};

export default function EquipeSettingsPage() {
  return (
    <DashboardLayout>
      <SettingsDetailPage section="team" />
    </DashboardLayout>
  );
}
