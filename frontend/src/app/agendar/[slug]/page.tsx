import type { Metadata } from "next";
import { PublicBookingPage } from "@/components/public-booking/PublicBookingPage";
import { API_URL, APP_BRAND, buildAppUrl } from "@/config/app-brand";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const response = await fetch(`${API_URL}/public/booking/${encodeURIComponent(slug)}`, {
    next: { revalidate: 300 }
  }).catch(() => null);
  const payload = response?.ok
    ? await response.json().catch(() => null) as { data?: { tenant?: { nome_fantasia?: string } } }
    : null;
  const tenantName = payload?.data?.tenant?.nome_fantasia || "Agendamento online";
  const description = `Escolha seu serviço e solicite um horário em ${tenantName}.`;
  const canonical = buildAppUrl(`/agendar/${encodeURIComponent(slug)}`);

  return {
    title: tenantName,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${tenantName} | ${APP_BRAND.appName}`,
      description,
      url: canonical,
      siteName: APP_BRAND.appName,
      type: "website"
    }
  };
}

export default async function AgendamentoPublicoPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ campanha?: string; tk?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  return (
    <PublicBookingPage
      slug={slug}
      campaign={query.campanha || undefined}
      linkToken={query.tk || undefined}
    />
  );
}
