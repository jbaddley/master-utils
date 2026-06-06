"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { useDonation } from "@/context/DonationContext";
import type { VariantProps } from "class-variance-authority";

type DonateButtonProps = {
  className?: string;
} & Pick<VariantProps<typeof buttonVariants>, "variant" | "size">;

export function DonateButton({
  variant = "outline",
  size = "sm",
  className,
}: DonateButtonProps) {
  const { openDonateModal } = useDonation();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={openDonateModal}
    >
      Donate
    </Button>
  );
}
