import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MeetEditor from "@/features/swim/MeetEditor";

type Params = { params: Promise<{ orgId: string; meetId: string }> };

export default async function Page({ params }: Params) {
  const { orgId, meetId } = await params;
  const session = await auth();
  if (!session?.user?.email) {
    redirect(`/swim/login/?callbackUrl=/swim/manage/org/${orgId}/meets/${meetId}/`);
  }

  const member = await prisma.swimOrgMember.findFirst({
    where: { orgId, user: { email: session.user.email } },
  });
  if (!member) redirect("/swim/manage/");

  const meet = await prisma.swimMeet.findUnique({ where: { id: meetId, orgId } });
  if (!meet) redirect(`/swim/manage/org/${orgId}/`);

  return (
    <MeetEditor
      orgId={orgId}
      role={member.role}
      meet={{
        ...meet,
        startsAt: meet.startsAt,
        publishedAt: meet.publishedAt,
        createdAt: meet.createdAt,
        updatedAt: meet.updatedAt,
      }}
    />
  );
}
