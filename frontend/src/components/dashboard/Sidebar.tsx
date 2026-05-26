"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { dashboardNavItems } from "@/components/dashboard/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-[calc(100vh-2rem)] w-72 flex-none rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-glow backdrop-blur-xl lg:block">
      <div className="sticky top-4 space-y-7">
        <BrandLogo />
        <nav className="space-y-1">
          {dashboardNavItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition duration-200",
                  isActive
                    ? "bg-secondary text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-white hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-[1.35rem] border border-white/80 bg-gradient-to-br from-secondary to-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Beauty Tech</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
            Operacao leve, moderna e pronta para automacoes.
          </p>
        </div>
      </div>
    </aside>
  );
}
