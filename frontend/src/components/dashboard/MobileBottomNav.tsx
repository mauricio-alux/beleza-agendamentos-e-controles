"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavItems } from "@/components/dashboard/navigation";
import { cn } from "@/lib/utils";

const mobileItems = dashboardNavItems.filter(({ href }) =>
  ["/dashboard", "/agenda", "/clientes", "/campanhas", "/configuracoes"].includes(href)
);

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-[1.5rem] border border-white/80 bg-white/95 p-2 shadow-glow backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {mobileItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "grid min-h-14 place-items-center rounded-2xl text-[11px] font-semibold transition",
                isActive ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="mb-1 h-5 w-5" />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
