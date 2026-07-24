"use client";

import { Bell, LogOut, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { APP_BRAND } from "@/config/app-brand";

export function TopHeader() {
  const router = useRouter();
  const { session, logout } = useAuth();
  const initials = session?.usuario.nome
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="flex min-w-0 items-center justify-between gap-3 rounded-[1.5rem] border border-white/80 bg-white/78 p-4 shadow-soft backdrop-blur-xl sm:rounded-[1.75rem] sm:p-4">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-accent sm:text-xs sm:tracking-[0.18em]">
          {session?.tenant?.nome_fantasia || APP_BRAND.appName}
        </p>
        <h1 className="mt-1 truncate text-lg font-bold text-foreground sm:text-2xl">Painel do salao</h1>
      </div>
      <div className="flex flex-none items-center gap-2">
        <button
          type="button"
          className="hidden h-11 min-w-48 items-center gap-2 rounded-full border border-border bg-white/85 px-4 text-sm text-muted-foreground shadow-sm sm:flex"
        >
          <Search className="h-4 w-4" />
          Buscar em breve
        </button>
        <Button variant="outline" size="icon" aria-label="Notificacoes">
          <Bell className="h-4 w-4" />
        </Button>
        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href="/configuracoes/perfil">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-xs font-bold text-primary">
              {initials || <UserRound className="h-4 w-4" />}
            </span>
            Perfil
          </Link>
        </Button>
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
