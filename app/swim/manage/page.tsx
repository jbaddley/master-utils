import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ManageDashboard from "@/features/swim/ManageDashboard";
import { swimRedirectPath } from "@/lib/swim-nav";

export default async function SwimManagePage() {
  const session = await auth();
  const host = (await headers()).get("host") ?? "";
  if (!session?.user?.email) {
    redirect(swimRedirectPath("/swim/login/?callbackUrl=/swim/manage/", host));
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      swimOrgMembers: { include: { org: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!user) redirect(swimRedirectPath("/swim/login/", host));

  return <ManageDashboard orgs={user.swimOrgMembers.map((m) => ({ ...m.org, role: m.role }))} />;
}
