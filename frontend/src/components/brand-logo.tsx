import { Sparkles } from "lucide-react";
import { APP_BRAND } from "@/config/app-brand";

export function BrandLogo() {
  return (
    <div className="flex items-center gap-3" aria-label={APP_BRAND.appName}>
      {APP_BRAND.logoUrl ? (
        <img
          src={APP_BRAND.logoUrl}
          alt=""
          className="h-10 w-10 object-contain"
          aria-hidden="true"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-blush">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <div className="leading-none">
        <p className="font-display text-3xl text-foreground">{APP_BRAND.appName}</p>
      </div>
    </div>
  );
}
