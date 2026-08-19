"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Button } from "@/components/ui/button";
import { PasswordStrength, getPasswordStrength } from "@/components/cadastro/PasswordStrength";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/lib/messages";

type FormErrors = {
  senha?: string;
  confirmar_senha?: string;
};

const invalidResetLinkMessage = "Link de redefinicao invalido ou expirado. Solicite um novo link.";

function getResetLinkErrorMessage(hashParams: URLSearchParams, queryParams: URLSearchParams) {
  const errorCode = hashParams.get("error_code") || queryParams.get("error_code") || "";
  const error = hashParams.get("error") || queryParams.get("error") || "";

  if (errorCode === "otp_expired") {
    return "Este link de redefinicao expirou ou ja foi usado. Solicite um novo link.";
  }

  if (errorCode || error) {
    return invalidResetLinkMessage;
  }

  return "";
}

export function ResetPasswordForm() {
  const [accessToken, setAccessToken] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordStrength = useMemo(() => getPasswordStrength(senha), [senha]);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const token = hashParams.get("access_token") || queryParams.get("access_token") || "";
    const linkError = getResetLinkErrorMessage(hashParams, queryParams);

    setAccessToken(token);
    if (linkError) {
      setFormError(linkError);
      return;
    }

    if (!token) {
      setFormError(invalidResetLinkMessage);
    }
  }, []);

  function validate() {
    const nextErrors: FormErrors = {};

    if (senha.length < 8) {
      nextErrors.senha = "Use pelo menos 8 caracteres.";
    } else if (passwordStrength.score <= 1) {
      nextErrors.senha = "Crie uma senha mais forte.";
    }

    if (confirmarSenha !== senha) {
      nextErrors.confirmar_senha = "As senhas nao conferem.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setMessage("");

    if (!accessToken) {
      setFormError(invalidResetLinkMessage);
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.resetPassword({ access_token: accessToken, senha });
      setMessage(response.message || "Senha redefinida com sucesso. Entre novamente para continuar.");
      setSenha("");
      setConfirmarSenha("");
    } catch (error) {
      setFormError(getErrorMessage(error, "Não foi possível redefinir sua senha. Tente novamente."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {message ? <FeedbackMessage tone="success" message={message} /> : null}
      {formError ? <FeedbackMessage tone="error" message={formError} /> : null}

      <PasswordField
        id="reset-password"
        label="Nova senha"
        value={senha}
        show={showPassword}
        onToggleShow={() => setShowPassword((current) => !current)}
        onChange={setSenha}
        error={errors.senha}
        autoComplete="new-password"
        disabled={!accessToken || Boolean(message)}
      />
      <PasswordStrength password={senha} />

      <PasswordField
        id="reset-password-confirm"
        label="Confirmar senha"
        value={confirmarSenha}
        show={showConfirmPassword}
        onToggleShow={() => setShowConfirmPassword((current) => !current)}
        onChange={setConfirmarSenha}
        error={errors.confirmar_senha}
        autoComplete="new-password"
        disabled={!accessToken || Boolean(message)}
      />

      <LoadingButton
        className="w-full"
        size="lg"
        isLoading={isSubmitting}
        loadingLabel="Redefinindo..."
        type="submit"
        disabled={!accessToken || Boolean(message)}
      >
        Redefinir senha
      </LoadingButton>

      <Button asChild variant="outline" className="w-full">
        <Link href="/login">Voltar para o login</Link>
      </Button>
      {!accessToken ? (
        <Button asChild variant="ghost" className="w-full">
          <Link href="/recuperar-senha">Solicitar novo link</Link>
        </Button>
      ) : null}
    </form>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  show: boolean;
  error?: string;
  autoComplete: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onToggleShow: () => void;
};

function PasswordField({
  id,
  label,
  value,
  show,
  error,
  autoComplete,
  disabled = false,
  onChange,
  onToggleShow
}: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="pl-11 pr-12"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          onClick={onToggleShow}
          disabled={disabled}
          className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-primary"
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-primary">
          {error}
        </p>
      ) : null}
    </div>
  );
}
