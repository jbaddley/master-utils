import { DonateButton } from "@/components/DonateButton";
import { getDonationProductId } from "@/lib/donation";
import type { ComponentProps } from "react";

type DonateButtonSlotProps = ComponentProps<typeof DonateButton>;

export function DonateButtonSlot(props: DonateButtonSlotProps) {
  if (!getDonationProductId()) return null;
  return <DonateButton {...props} />;
}
