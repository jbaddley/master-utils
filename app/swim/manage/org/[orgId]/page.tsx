import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import OrgManagePage from "@/features/swim/OrgManagePage";

type Params = { params: Promise<{ orgId: string }> };

export default async function Page({ params }: Params) {
  const { orgId } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect(`/swim/login/?callbackUrl=/swim/manage/org/${orgId}/`);

  const member = await prisma.swimOrgMember.findFirst({
    where: { orgId, user: { email: session.user.email } },
    include: {
      org: true,
    },
  });
  if (!member) redirect("/swim/manage/");

  const meets = await prisma.swimMeet.findMany({
    where: { orgId },
    orderBy: { startsAt: "desc" },
  });

  const invites = await prisma.swimOrgInvite.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <OrgManagePage
      org={member.org}
      role={member.role}
      meets={meets}
      invites={invites}
    />
  );
}
