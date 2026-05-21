import Link from "next/link";
import { cn } from "@/lib/utils";

type TermsCheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  error?: string;
};

export function TermsCheckbox({ checked, onCheckedChange, error }: TermsCheckboxProps) {
  return (
    <div className="space-y-2">
      <label
        className={cn(
          "flex items-start gap-3 rounded-2xl border bg-white/80 p-4 text-sm leading-6 text-muted-foreground transition",
          error ? "border-primary/40" : "border-border"
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border accent-primary"
        />
        <span>
          Li e aceito os{" "}
          <Link href="/termos" className="font-semibold text-accent transition hover:text-primary">
            Termos de uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="font-semibold text-accent transition hover:text-primary">
            Politica de privacidade
          </Link>
          .
        </span>
      </label>
      {error ? <p className="text-xs font-medium text-primary">{error}</p> : null}
    </div>
  );
}
