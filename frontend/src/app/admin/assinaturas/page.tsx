import type { Metadata } from "next";
import { PlatformSubscriptionsManager } from "@/components/platform/PlatformSubscriptionsManager";

export const metadata: Metadata = {
  title: "Assinaturas"
};

export default function AdminSubscriptionsPage() {
  return <PlatformSubscriptionsManager />;
}
