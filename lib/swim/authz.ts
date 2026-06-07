import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SwimOrgRole } from "@prisma/client";
import {
  getCoachCohortStudentIds,
  getGuardianStudentIds,
  getStudentIdForUser,
} from "./students";

export class SwimAuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export const MEET_EDITOR_ROLES: SwimOrgRole[] = ["admin", "manager", "director"];
export const MEET_ADMIN_ROLES: SwimOrgRole[] = ["admin", "director"];
export const ORG_ADMIN_ROLES: SwimOrgRole[] = ["admin"];
export const ORG_INVITE_ADMIN_ROLES: SwimOrgRole[] = ["admin"];
export const ORG_INVITE_OPERATIONAL_ROLES: SwimOrgRole[] = ["admin", "director"];
export const STUDENT_MANAGER_ROLES: SwimOrgRole[] = ["admin", "manager", "director", "coach"];

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
  return requireOrgMember(orgId, ORG_ADMIN_ROLES);
}

export async function getVisibleStudentIds(
  orgId: string,
  userId: string,
  role: SwimOrgRole,
): Promise<string[] | undefined> {
  if (role === "guardian") {
    return getGuardianStudentIds(orgId, userId);
  }
  if (role === "coach") {
    return getCoachCohortStudentIds(orgId, userId);
  }
  if (role === "student") {
    const studentId = await getStudentIdForUser(userId, orgId);
    return studentId ? [studentId] : [];
  }
  return undefined;
}

export async function requireMeetAccess(meetId: string, adminOnly = false) {
  const meet = await prisma.swimMeet.findUnique({
    where: { id: meetId },
    include: { org: true },
  });
  if (!meet) {
    throw new SwimAuthError("Meet not found", 404);
  }

  const allowedRoles = adminOnly ? MEET_ADMIN_ROLES : MEET_EDITOR_ROLES;
  const { user, member } = await requireOrgMember(meet.orgId, allowedRoles);
  return { user, member, meet };
}

export async function requireMeetViewAccess(meetId: string) {
  const meet = await prisma.swimMeet.findUnique({
    where: { id: meetId },
    include: { org: true },
  });
  if (!meet) {
    throw new SwimAuthError("Meet not found", 404);
  }

  const user = await requireSwimSession();
  const member = await prisma.swimOrgMember.findUnique({
    where: { orgId_userId: { orgId: meet.orgId, userId: user.id } },
  });
  if (!member) {
    throw new SwimAuthError("Not a member of this organization", 403);
  }

  const visibleStudentIds = await getVisibleStudentIds(meet.orgId, user.id, member.role);

  return { user, member, meet, visibleStudentIds };
}

export function jsonAuthError(err: unknown) {
  if (err instanceof SwimAuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  throw err;
}

export function canInviteRole(inviterRole: SwimOrgRole, targetRole: SwimOrgRole): boolean {
  if (ORG_INVITE_ADMIN_ROLES.includes(inviterRole)) return true;
  if (ORG_INVITE_OPERATIONAL_ROLES.includes(inviterRole)) {
    return !ORG_ADMIN_ROLES.includes(targetRole) && targetRole !== "manager";
  }
  return false;
}
