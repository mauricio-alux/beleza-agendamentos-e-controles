import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Login em breve</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            A autenticação backend já está estruturada. A próxima etapa pode conectar esta página ao Supabase Auth/JWT.
          </p>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Voltar para a landing
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
