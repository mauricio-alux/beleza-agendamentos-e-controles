import type { Metadata } from "next";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { DashboardProvider } from "@/context/DashboardProvider";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Dashboard | Bellory",
  description: "Hub operacional do salao no Bellory."
};

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardProvider>
        <DashboardHome />
      </DashboardProvider>
    </DashboardLayout>
  );
}
