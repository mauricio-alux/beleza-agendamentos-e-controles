import type { Metadata } from "next";
import { AppointmentReschedulePage } from "@/components/public-booking/AppointmentReschedulePage";
import { withBrand } from "@/config/app-brand";

export const metadata: Metadata = {
  title: withBrand("Reagendar atendimento"),
  robots: { index: false, follow: false }
};

export default async function ReagendarPage({
  searchParams
}: {
  searchParams: Promise<{ tk?: string }>;
}) {
  const query = await searchParams;
  return <AppointmentReschedulePage token={query.tk || undefined} />;
}
