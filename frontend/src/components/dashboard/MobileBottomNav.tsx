"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDashboardNavItems } from "@/components/dashboard/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { session } = useAuth();
  const visibleItems = getDashboardNavItems(session).filter(({ href }) =>
    ["/dashboard", "/agenda", "/clientes", "/campanhas", "/configuracoes"].includes(href)
  );
  const mobileLabels: Record<string, string> = {
    "/dashboard": "Painel",
    "/campanhas": "Camp.",
    "/configuracoes": "Config."
  };

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 max-w-[calc(100vw-1.5rem)] rounded-[1.35rem] border border-white/80 bg-white/95 p-1.5 shadow-glow backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {visibleItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const displayLabel = mobileLabels[href] || label;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "grid min-h-[3.75rem] min-w-0 place-items-center rounded-[1rem] px-1 text-[10px] font-semibold transition sm:text-[11px]",
                isActive ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="mb-1 h-5 w-5" />
              <span className="block w-full truncate text-center leading-tight">{displayLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
