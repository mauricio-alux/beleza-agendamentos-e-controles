import type { Metadata } from "next";
import { SettingsDetailPage } from "@/components/settings/SettingsDetailPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Assinatura | Bellory"
};

export default function AssinaturaSettingsPage() {
  return (
    <DashboardLayout>
      <SettingsDetailPage section="subscription" />
    </DashboardLayout>
  );
}
