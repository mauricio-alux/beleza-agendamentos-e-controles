import Link from "next/link";
import { Instagram, Linkedin, Mail } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { APP_BRAND } from "@/config/app-brand";

const footerGroups = [
  {
    title: "Produto",
    links: [
      { label: "Agenda", href: "#dashboard" },
      { label: "CRM", href: "#beneficios" },
      { label: "WhatsApp", href: "#whatsapp" },
      { label: "Planos", href: "#planos" }
    ]
  },
  {
    title: "Empresa",
    links: [
      { label: "Contato", href: `mailto:${APP_BRAND.supportEmail}` },
      { label: "Demonstração", href: "/demo" },
      { label: "Termos", href: "/termos" },
      { label: "Privacidade", href: "/privacidade" }
    ]
  }
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="container py-10 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="max-w-md">
            <BrandLogo />
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              Tecnologia elegante para profissionais da beleza organizarem agenda,
              relacionamento, campanhas e crescimento em uma rotina simples.
            </p>
            <div className="mt-6 flex items-center gap-3 text-muted-foreground">
              <Link className="transition hover:text-primary" href={`mailto:${APP_BRAND.supportEmail}`} aria-label="Email">
                <Mail className="h-5 w-5" />
              </Link>
              <Link className="transition hover:text-primary" href="#" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link className="transition hover:text-primary" href="#" aria-label="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <p className="text-sm font-semibold text-foreground">{group.title}</p>
                <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                  {group.links.map((link) => (
                    <Link key={link.label} href={link.href} className="transition hover:text-primary">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {APP_BRAND.appName}. Todos os direitos reservados.</p>
          <p>Feito para salões, estúdios e profissionais independentes.</p>
        </div>
      </div>
    </footer>
  );
}
