import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import GuardianStudentsPage from "@/features/swim/GuardianStudentsPage";
import { swimRedirectPath } from "@/lib/swim-nav";

type Params = { params: Promise<{ orgId: string }> };

export default async function Page({ params }: Params) {
  const { orgId } = await params;
  const host = (await headers()).get("host") ?? "";
  const session = await auth();
  if (!session?.user?.email) {
    redirect(swimRedirectPath(`/swim/login/?callbackUrl=/swim/manage/org/${orgId}/my-students/`, host));
  }

  const member = await prisma.swimOrgMember.findFirst({
    where: { orgId, user: { email: session.user.email } },
    include: { org: true },
  });
  if (!member) redirect(swimRedirectPath("/swim/manage/", host));
  if (member.role !== "guardian") {
    redirect(swimRedirectPath(`/swim/manage/org/${orgId}/`, host));
  }

  return <GuardianStudentsPage orgId={orgId} orgName={member.org.name} />;
}
