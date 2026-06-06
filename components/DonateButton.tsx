import { Button } from "@/components/ui/button";
import { getDonationLink } from "@/lib/raising-boston";

export function DonateButton() {
  const donationLink = getDonationLink();
  if (!donationLink) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      render={
        <a href={donationLink} target="_blank" rel="noopener noreferrer" />
      }
    >
      Donate
    </Button>
  );
}
