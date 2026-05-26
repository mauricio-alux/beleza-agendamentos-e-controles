"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { onboardingService } from "@/services/onboarding.service";

type FormErrors = {
  email?: string;
  senha?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onboardingPath = useMemo(() => process.env.NEXT_PUBLIC_AUTH_REDIRECT_PATH || "/onboarding", []);
  const dashboardPath = useMemo(() => process.env.NEXT_PUBLIC_DASHBOARD_PATH || "/dashboard", []);

  function validate() {
    const nextErrors: FormErrors = {};

    if (!email.trim()) {
      nextErrors.email = "Informe seu email.";
    } else if (!emailRegex.test(email.trim())) {
      nextErrors.email = "Informe um email válido.";
    }

    if (!senha) {
      nextErrors.senha = "Informe sua senha.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await login({ email: email.trim().toLowerCase(), senha, persist: remember });
      const onboardingStatus = await onboardingService.getStatus(session);
      router.replace(onboardingStatus.progress >= 100 ? dashboardPath : onboardingPath);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível conectar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <div className="flex gap-3 rounded-2xl border border-primary/25 bg-secondary/70 p-4 text-sm leading-6 text-foreground">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-primary" />
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@salao.com.br"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="pl-11"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
        </div>
        {errors.email ? (
          <p id="email-error" className="text-xs font-medium text-primary">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="senha">Senha</Label>
          <Link href="/recuperar-senha" className="text-xs font-semibold text-accent transition hover:text-primary">
            Esqueci minha senha
          </Link>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="senha"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Sua senha"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            className="pl-11 pr-12"
            aria-invalid={Boolean(errors.senha)}
            aria-describedby={errors.senha ? "senha-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-primary"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.senha ? (
          <p id="senha-error" className="text-xs font-medium text-primary">
            {errors.senha}
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-border bg-white/70 p-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="h-4 w-4 rounded border-border text-primary accent-primary"
        />
        Continuar conectado neste dispositivo
      </label>

      <LoadingButton className="w-full" size="lg" isLoading={isSubmitting} type="submit">
        Entrar
      </LoadingButton>

      <div className="grid gap-3 border-t border-border pt-5 text-center text-sm text-muted-foreground">
        <span>Ainda não tem uma conta?</span>
        <Button variant="outline" asChild>
          <Link href="/cadastro">Criar conta</Link>
        </Button>
      </div>
    </form>
  );
}
