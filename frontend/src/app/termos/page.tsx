import Link from "next/link";

export default function TermosPage() {
  return (
    <main className="container py-16">
      <Link href="/" className="text-sm font-semibold text-primary">Voltar</Link>
      <h1 className="mt-6 font-display text-4xl">Termos de uso</h1>
      <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
        Conteúdo jurídico será adicionado em etapa futura.
      </p>
    </main>
  );
}
