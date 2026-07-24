"use client";

import { ReactNode, useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { canAccessDashboardPath } from "@/components/dashboard/navigation";
import { useAuth } from "@/hooks/useAuth";

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isAuthenticated, isLoading } = useAuth();
  const canAccessPage = canAccessDashboardPath(session, pathname);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !canAccessPage) {
      router.replace("/dashboard");
    }
  }, [canAccessPage, isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-5 py-4 text-sm font-semibold text-muted-foreground shadow-soft">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Preparando seu painel...
        </div>
      </main>
    );
  }

  if (!canAccessPage) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-primary/20 bg-white p-6 text-center shadow-soft">
          <ShieldAlert className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-lg font-bold text-foreground">Acesso não permitido</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Você não possui permissão para acessar esta funcionalidade.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(255,179,193,0.36),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(123,75,255,0.14),transparent_30%),linear-gradient(145deg,#FFFDFC_0%,#FFE8E2_45%,#FFFDFC_100%)]" />
      <div className="relative flex min-h-screen max-w-full gap-5 px-3 py-3 sm:px-4 sm:py-4">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-4 pb-28 sm:gap-5 lg:pb-0">
          <TopHeader />
          {children}
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}
