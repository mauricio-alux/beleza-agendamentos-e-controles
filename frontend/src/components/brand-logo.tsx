import { Sparkles } from "lucide-react";

export function BrandLogo() {
  return (
    <div className="flex items-center gap-3" aria-label="Bellory">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-blush">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="leading-none">
        <p className="font-display text-3xl text-foreground">Bellory</p>
      </div>
    </div>
  );
}
