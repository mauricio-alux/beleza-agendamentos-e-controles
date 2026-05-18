import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardMockup } from "@/components/dashboard-mockup";
import { Button } from "@/components/ui/button";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-background p-4 py-10">
      <div className="container">
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div className="mx-auto mt-8 max-w-3xl text-center">
          <p className="eyebrow">Demonstração</p>
          <h1 className="mt-5 font-display text-4xl sm:text-5xl">Prévia visual do dashboard Bellory</h1>
        </div>
        <div className="mt-10">
          <DashboardMockup />
        </div>
      </div>
    </main>
  );
}
