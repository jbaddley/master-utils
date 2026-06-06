"use client";

import type { ComponentProps } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

type UpgradeToProButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  label?: string;
};

export function UpgradeToProButton({
  label = "Upgrade to Pro",
  children,
  ...props
}: UpgradeToProButtonProps) {
  const { openSubscribeModal } = useAuth();

  return (
    <Button type="button" onClick={openSubscribeModal} {...props}>
      {children ?? label}
    </Button>
  );
}
