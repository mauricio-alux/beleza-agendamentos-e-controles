import type { Metadata } from "next";
import { SettingsDetailPage } from "@/components/settings/SettingsDetailPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Operacao | Bellory"
};

export default function OperacaoSettingsPage() {
  return (
    <DashboardLayout>
      <SettingsDetailPage section="operation" />
    </DashboardLayout>
  );
}
