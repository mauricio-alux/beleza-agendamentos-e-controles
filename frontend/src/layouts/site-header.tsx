import Link from "next/link";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Beneficios", href: "#beneficios" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "WhatsApp", href: "#whatsapp" },
  { label: "Planos", href: "#planos" }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" aria-label="Ir para inicio">
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-primary">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <Button variant="ghost" asChild>
            <a href="/login">Entrar</a>
          </Button>
          <Button asChild>
            <a href="/cadastro">Começar agora</a>
          </Button>
        </div>

        <Button variant="outline" size="icon" className="sm:hidden" aria-label="Abrir menu">
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}
