import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSwimSession, jsonAuthError } from "@/lib/swim/authz";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const invite = await prisma.swimOrgInvite.findUnique({
    where: { token },
    include: { org: true },
  });
  if (!invite || invite.status !== "pending") {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }
  return NextResponse.json({
    invite: {
      email: invite.email,
      role: invite.role,
      orgName: invite.org.name,
      orgId: invite.orgId,
    },
  });
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const user = await requireSwimSession();

    const invite = await prisma.swimOrgInvite.findUnique({
      where: { token },
      include: { org: true },
    });
    if (!invite || invite.status !== "pending") {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
    }
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Your account email must match the invited email" },
        { status: 403 },
      );
    }

    await prisma.$transaction([
      prisma.swimOrgMember.upsert({
        where: { orgId_userId: { orgId: invite.orgId, userId: user.id } },
        create: { orgId: invite.orgId, userId: user.id, role: invite.role },
        update: { role: invite.role },
      }),
      prisma.swimOrgInvite.update({
        where: { id: invite.id },
        data: { status: "accepted", acceptedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ orgId: invite.orgId, orgName: invite.org.name });
  } catch (err) {
    return jsonAuthError(err);
  }
}
