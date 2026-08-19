import type { Metadata } from "next";
import { AppointmentActionPage } from "@/components/public-booking/AppointmentActionPage";
import { withBrand } from "@/config/app-brand";

export const metadata: Metadata = {
  title: withBrand("Ação do agendamento"),
  robots: { index: false, follow: false }
};

export default async function AcaoAgendamentoPage({
  searchParams
}: {
  searchParams: Promise<{ cmd?: string; tk?: string }>;
}) {
  const query = await searchParams;
  const command = query.cmd === "confirmar" || query.cmd === "cancelar"
    ? query.cmd
    : undefined;

  return (
    <AppointmentActionPage
      token={query.tk || undefined}
      command={command}
    />
  );
}
