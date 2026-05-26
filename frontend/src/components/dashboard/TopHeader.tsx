"use client";

import { Bell, LogOut, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

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
    <header className="flex flex-col gap-4 rounded-[1.75rem] border border-white/80 bg-white/78 p-4 shadow-soft backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
          {session?.tenant.nome_fantasia || "Bellory"}
        </p>
        <h1 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">Painel do salao</h1>
      </div>
      <div className="flex items-center gap-2">
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
