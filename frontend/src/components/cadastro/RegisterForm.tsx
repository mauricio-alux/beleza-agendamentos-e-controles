"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail, Phone, Store, UserRound } from "lucide-react";
import { LoadingButton } from "@/components/cadastro/LoadingButton";
import { PasswordStrength, getPasswordStrength } from "@/components/cadastro/PasswordStrength";
import { RegisterProgress } from "@/components/cadastro/RegisterProgress";
import { TermsCheckbox } from "@/components/cadastro/TermsCheckbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRegister } from "@/hooks/useRegister";
import { cn } from "@/lib/utils";
import { RegisterError } from "@/services/register.service";
import { formatPhone, isValidBrazilianPhone, normalizePhoneToE164 } from "@/utils/phone";

type FormErrors = {
  nome?: string;
  nome_salao?: string;
  email?: string;
  telefone?: string;
  senha?: string;
  confirmar_senha?: string;
  termos?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm() {
  const router = useRouter();
  const { isLoadingPlans, isRegistering, error, setError, register } = useRegister();
  const [nome, setNome] = useState("");
  const [nomeSalao, setNomeSalao] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const redirectPath = useMemo(() => process.env.NEXT_PUBLIC_AUTH_REDIRECT_PATH || "/onboarding", []);
  const passwordStrength = getPasswordStrength(senha);

  function validate() {
    const nextErrors: FormErrors = {};

    if (!nome.trim()) {
      nextErrors.nome = "Informe seu nome completo.";
    }

    if (!nomeSalao.trim()) {
      nextErrors.nome_salao = "Informe o nome do salao.";
    }

    if (!email.trim()) {
      nextErrors.email = "Informe seu email.";
    } else if (!emailRegex.test(email.trim())) {
      nextErrors.email = "Informe um email valido.";
    }

    if (!isValidBrazilianPhone(telefone)) {
      nextErrors.telefone = "Informe um WhatsApp valido.";
    }

    if (senha.length < 8) {
      nextErrors.senha = "Use pelo menos 8 caracteres.";
    } else if (passwordStrength.score <= 1) {
      nextErrors.senha = "Crie uma senha mais forte.";
    }

    if (confirmarSenha !== senha) {
      nextErrors.confirmar_senha = "As senhas nao conferem.";
    }

    if (!acceptedTerms) {
      nextErrors.termos = "Aceite os termos para continuar.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!validate()) {
      return;
    }

    try {
      await register({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha,
        telefone: normalizePhoneToE164(telefone),
        nome_salao: nomeSalao.trim()
      });
      router.replace(redirectPath);
    } catch (err) {
      if (err instanceof RegisterError) {
        setErrors((current) => ({ ...current, ...err.fieldErrors }));
      }

      return;
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <RegisterProgress isLoadingPlans={isLoadingPlans} isRegistering={isRegistering} />

      {error ? (
        <div className="flex gap-3 rounded-2xl border border-primary/35 bg-secondary/80 p-4 text-sm leading-6 text-foreground shadow-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-primary" />
          <span>
            {error}{" "}
            {Object.keys(errors).length ? (
              <strong className="font-semibold text-primary">Revise os campos destacados abaixo.</strong>
            ) : null}
          </span>
        </div>
      ) : null}

      <div className="grid gap-4">
        <Field label="Nome completo" error={errors.nome}>
          <IconInput
            icon={UserRound}
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Seu nome"
            autoComplete="name"
            invalid={Boolean(errors.nome)}
          />
        </Field>

        <Field label="Nome do salao" error={errors.nome_salao}>
          <IconInput
            icon={Store}
            value={nomeSalao}
            onChange={(event) => setNomeSalao(event.target.value)}
            placeholder="Bellory Beauty Studio"
            autoComplete="organization"
            invalid={Boolean(errors.nome_salao)}
          />
        </Field>

        <Field label="Email" error={errors.email}>
          <IconInput
            icon={Mail}
            type="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@salao.com.br"
            autoComplete="email"
            invalid={Boolean(errors.email)}
          />
        </Field>

        <Field label="WhatsApp" error={errors.telefone}>
          <IconInput
            icon={Phone}
            type="tel"
            inputMode="tel"
            value={telefone}
            onChange={(event) => setTelefone(formatPhone(event.target.value))}
            placeholder="(11) 99999-9999"
            autoComplete="tel"
            invalid={Boolean(errors.telefone)}
          />
        </Field>

        <Field label="Senha" error={errors.senha}>
          <div className="space-y-3">
            <PasswordInput
              value={senha}
              onChange={setSenha}
              show={showPassword}
              onToggle={() => setShowPassword((current) => !current)}
              placeholder="Crie uma senha segura"
              autoComplete="new-password"
              invalid={Boolean(errors.senha)}
            />
            <PasswordStrength password={senha} />
          </div>
        </Field>

        <Field label="Confirmar senha" error={errors.confirmar_senha}>
          <PasswordInput
            value={confirmarSenha}
            onChange={setConfirmarSenha}
            show={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((current) => !current)}
            placeholder="Repita sua senha"
            autoComplete="new-password"
            invalid={Boolean(errors.confirmar_senha)}
          />
        </Field>
      </div>

      <TermsCheckbox checked={acceptedTerms} onCheckedChange={setAcceptedTerms} error={errors.termos} />

      <LoadingButton className="w-full" size="lg" isLoading={isRegistering} disabled={isLoadingPlans} type="submit" loadingLabel="Criando seu salao...">
        Criar minha conta
      </LoadingButton>

      <div className="grid gap-3 border-t border-border pt-5 text-center text-sm text-muted-foreground">
        <span>Ja possui conta?</span>
        <Button variant="outline" asChild>
          <Link href="/login">Entrar</Link>
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-[1.35rem] transition",
        error && "bg-secondary/40 p-3 ring-1 ring-primary/25"
      )}
    >
      <Label className={cn(error && "text-primary")}>{label}</Label>
      {children}
      {error ? (
        <p className="flex items-center gap-2 text-xs font-semibold text-primary">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

function IconInput({
  icon: Icon,
  invalid = false,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: typeof UserRound;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <Icon
        className={cn(
          "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2",
          invalid ? "text-primary" : "text-muted-foreground"
        )}
      />
      <Input
        className={cn(
          "pl-11",
          invalid && "border-primary bg-secondary/50 shadow-[0_0_0_4px_rgba(226,109,124,0.12)]",
          className
        )}
        {...props}
      />
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  autoComplete,
  invalid = false
}: {
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  autoComplete: string;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <LockKeyhole
        className={cn(
          "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2",
          invalid ? "text-primary" : "text-muted-foreground"
        )}
      />
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(
          "pl-11 pr-12",
          invalid && "border-primary bg-secondary/50 shadow-[0_0_0_4px_rgba(226,109,124,0.12)]"
        )}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-primary"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
