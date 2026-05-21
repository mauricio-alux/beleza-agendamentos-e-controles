import { cn } from "@/lib/utils";

type OnboardingProgressProps = {
  progress: number;
  className?: string;
};

export function OnboardingProgress({ progress, className }: OnboardingProgressProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>Progresso</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary via-glow to-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
