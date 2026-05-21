import { cn } from "@/lib/utils";

type PasswordStrengthProps = {
  password: string;
};

export function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { score, label: "fraca", className: "bg-primary", textClassName: "text-primary" };
  }

  if (score <= 3) {
    return { score, label: "media", className: "bg-glow", textClassName: "text-primary" };
  }

  return { score, label: "forte", className: "bg-accent", textClassName: "text-accent" };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = getPasswordStrength(password);
  const width = password ? Math.max(25, strength.score * 25) : 0;

  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all duration-300", strength.className)}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Forca da senha:{" "}
        <span className={cn("font-bold capitalize", strength.textClassName)}>
          {password ? strength.label : "aguardando"}
        </span>
      </p>
    </div>
  );
}
