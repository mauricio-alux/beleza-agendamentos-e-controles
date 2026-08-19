"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/lib/messages";

type FormErrors = {
  email?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const successMessage = "Se o email estiver cadastrado, enviaremos instrucoes para redefinir sua senha.";

export function RecoverPasswordForm() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const nextErrors: FormErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      nextErrors.email = "Informe seu email.";
    } else if (!emailRegex.test(normalizedEmail)) {
      nextErrors.email = "Informe um email valido.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setMessage("");

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.recoverPassword({ email: email.trim().toLowerCase() });
      setMessage(response.message || successMessage);
    } catch (error) {
      setFormError(getErrorMessage(error, "Não foi possível enviar as instruções. Tente novamente."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {message ? <FeedbackMessage tone="success" message={message} /> : null}
      {formError ? <FeedbackMessage tone="error" message={formError} /> : null}

      <div className="space-y-2">
        <Label htmlFor="recover-email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="recover-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@salao.com.br"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="pl-11"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "recover-email-error" : undefined}
          />
        </div>
        {errors.email ? (
          <p id="recover-email-error" className="text-xs font-medium text-primary">
            {errors.email}
          </p>
        ) : null}
      </div>

      <LoadingButton className="w-full" size="lg" isLoading={isSubmitting} loadingLabel="Enviando..." type="submit">
        Enviar instrucoes
      </LoadingButton>

      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o login
      </Link>
    </form>
  );
}
