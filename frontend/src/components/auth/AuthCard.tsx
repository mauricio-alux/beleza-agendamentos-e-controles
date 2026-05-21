import { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <Card className="w-full overflow-hidden rounded-[1.75rem] border-white/80 bg-white/95 shadow-[0_28px_90px_rgba(43,43,43,0.13)] backdrop-blur">
      <CardHeader className="space-y-5 p-6 pb-4 sm:p-8 sm:pb-5">
        <BrandLogo />
        <div className="space-y-2">
          <CardTitle className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            {title}
          </CardTitle>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">{subtitle}</p>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 sm:p-8 sm:pt-0">{children}</CardContent>
    </Card>
  );
}
