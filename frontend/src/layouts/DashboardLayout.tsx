"use client";

import { ReactNode, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { useAuth } from "@/hooks/useAuth";

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

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

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(255,179,193,0.36),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(123,75,255,0.14),transparent_30%),linear-gradient(145deg,#FFFDFC_0%,#FFE8E2_45%,#FFFDFC_100%)]" />
      <div className="relative flex min-h-screen gap-5 p-3 sm:p-4">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-5 pb-24 lg:pb-0">
          <TopHeader />
          {children}
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}
