import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ManageDashboard from "@/features/swim/ManageDashboard";

export default async function SwimManagePage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/swim/login/?callbackUrl=/swim/manage/");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      swimOrgMembers: { include: { org: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!user) redirect("/swim/login/");

  return <ManageDashboard orgs={user.swimOrgMembers.map((m) => ({ ...m.org, role: m.role }))} />;
}
