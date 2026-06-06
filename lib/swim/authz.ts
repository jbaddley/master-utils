import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SwimOrgRole } from "@prisma/client";

export class SwimAuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function requireSwimSession() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new SwimAuthError("Sign in required", 401);
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    throw new SwimAuthError("User not found", 404);
  }
  return user;
}

export async function requireOrgMember(orgId: string, allowedRoles?: SwimOrgRole[]) {
  const user = await requireSwimSession();
  const member = await prisma.swimOrgMember.findUnique({
    where: { orgId_userId: { orgId, userId: user.id } },
  });
  if (!member) {
    throw new SwimAuthError("Not a member of this organization", 403);
  }
  if (allowedRoles && !allowedRoles.includes(member.role)) {
    throw new SwimAuthError("Insufficient permissions", 403);
  }
  return { user, member };
}

export async function requireOrgAdmin(orgId: string) {
  return requireOrgMember(orgId, ["admin"]);
}

export async function requireMeetAccess(meetId: string, adminOnly = false) {
  const meet = await prisma.swimMeet.findUnique({
    where: { id: meetId },
    include: { org: true },
  });
  if (!meet) {
    throw new SwimAuthError("Meet not found", 404);
  }
  const { user, member } = await requireOrgMember(
    meet.orgId,
    adminOnly ? ["admin"] : ["admin", "manager"],
  );
  return { user, member, meet };
}

export function jsonAuthError(err: unknown) {
  if (err instanceof SwimAuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  throw err;
}
