import { SiteHeaderNav } from "@/components/SiteHeaderNav";

export function SiteHeader({ isSwimSubdomain = false }: { isSwimSubdomain?: boolean }) {
  return <SiteHeaderNav isSwimSubdomain={isSwimSubdomain} />;
}
