import type { Metadata } from "next";
import { PlatformDashboard } from "@/components/platform/PlatformDashboard";

export const metadata: Metadata = {
  title: "Admin SaaS"
};

export default function AdminPage() {
  return <PlatformDashboard />;
}
