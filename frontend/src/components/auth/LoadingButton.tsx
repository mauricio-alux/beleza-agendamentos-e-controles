"use client";

import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

type LoadingButtonProps = ButtonProps & {
  isLoading?: boolean;
  loadingLabel?: string;
};

export function LoadingButton({
  children,
  isLoading = false,
  loadingLabel = "Entrando...",
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
