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

    await prisma.$transaction(async (tx) => {
      await tx.swimOrgMember.upsert({
        where: { orgId_userId: { orgId: invite.orgId, userId: user.id } },
        create: { orgId: invite.orgId, userId: user.id, role: invite.role },
        update: { role: invite.role },
      });
      await tx.swimOrgInvite.update({
        where: { id: invite.id },
        data: { status: "accepted", acceptedAt: new Date() },
      });

      if (invite.role === "student") {
        const existing = await tx.swimStudent.findFirst({
          where: { orgId: invite.orgId, userId: user.id },
        });
        if (!existing) {
          const nameParts = (user.name ?? user.email.split("@")[0] ?? "Student").split(/\s+/);
          const firstName = nameParts[0] ?? "Student";
          const lastName = nameParts.slice(1).join(" ") || firstName;
          await tx.swimStudent.create({
            data: {
              orgId: invite.orgId,
              firstName,
              lastName,
              userId: user.id,
            },
          });
        } else if (!existing.userId) {
          await tx.swimStudent.update({
            where: { id: existing.id },
            data: { userId: user.id },
          });
        }
      }
    });

    return NextResponse.json({ orgId: invite.orgId, orgName: invite.org.name });
  } catch (err) {
    return jsonAuthError(err);
  }
}
