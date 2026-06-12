import { SiteHeaderNav } from "@/components/SiteHeaderNav";
import { getDonationProductId } from "@/lib/donation";

export function SiteHeader({ isSwimSubdomain = false }: { isSwimSubdomain?: boolean }) {
  return (
    <SiteHeaderNav
      isSwimSubdomain={isSwimSubdomain}
      hasDonation={!!getDonationProductId()}
    />
  );
}
