import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Agenda do profissional"
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProfessionalAgendaSettingsPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/equipe/manutencao/${id}/horarios`);
}
