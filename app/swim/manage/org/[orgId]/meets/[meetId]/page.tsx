import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MeetEditor from "@/features/swim/MeetEditor";
import { swimRedirectPath } from "@/lib/swim-nav";

type Params = { params: Promise<{ orgId: string; meetId: string }> };

export default async function Page({ params }: Params) {
  const { orgId, meetId } = await params;
  const host = (await headers()).get("host") ?? "";
  const session = await auth();
  if (!session?.user?.email) {
    redirect(
      swimRedirectPath(
        `/swim/login/?callbackUrl=/swim/manage/org/${orgId}/meets/${meetId}/`,
        host,
      ),
    );
  }

  const member = await prisma.swimOrgMember.findFirst({
    where: { orgId, user: { email: session.user.email } },
  });
  if (!member) redirect(swimRedirectPath("/swim/manage/", host));

  const meet = await prisma.swimMeet.findUnique({ where: { id: meetId, orgId } });
  if (!meet) redirect(swimRedirectPath(`/swim/manage/org/${orgId}/`, host));

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
