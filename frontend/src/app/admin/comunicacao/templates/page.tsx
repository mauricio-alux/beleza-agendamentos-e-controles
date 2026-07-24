import type { Metadata } from "next";
import { CommunicationTemplatesManager } from "@/components/platform/CommunicationTemplatesManager";

export const metadata: Metadata = {
  title: "Templates de Comunicacao"
};

export default function CommunicationTemplatesPage() {
  return <CommunicationTemplatesManager />;
}
