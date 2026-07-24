import type { Metadata } from "next";
import { SettingsDetailPage } from "@/components/settings/SettingsDetailPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Seguranca"
};

export default function SegurancaSettingsPage() {
  return (
    <DashboardLayout>
      <SettingsDetailPage section="security" />
    </DashboardLayout>
  );
}
