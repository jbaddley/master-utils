import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSubdomainLabel } from "@/lib/subdomains";
import { SwimHomeHero } from "@/features/swim/SwimHomeHero";

export default async function SwimHomePage() {
  const session = await auth();
  const host = (await headers()).get("host") ?? "";
  const isSubdomain = getSubdomainLabel(host) === "swim";

  let orgCount = 0;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { _count: { select: { swimOrgMembers: true } } },
    });
    orgCount = user?._count.swimOrgMembers ?? 0;
  }

  return (
    <SwimHomeHero
      isSignedIn={Boolean(session?.user)}
      orgCount={orgCount}
      isSubdomain={isSubdomain}
    />
  );
}
