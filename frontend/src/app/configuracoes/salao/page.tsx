import type { Metadata } from "next";
import { SettingsDetailPage } from "@/components/settings/SettingsDetailPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Salão"
};

export default function SalaoSettingsPage() {
  return (
    <DashboardLayout>
      <SettingsDetailPage section="tenant" />
    </DashboardLayout>
  );
}
