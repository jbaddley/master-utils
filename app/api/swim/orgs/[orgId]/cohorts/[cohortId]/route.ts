import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMember, jsonAuthError } from "@/lib/swim/authz";

type Params = { params: Promise<{ orgId: string; cohortId: string }> };

async function assertCohortAccess(orgId: string, cohortId: string, userId: string, role: string) {
  const cohort = await prisma.swimCohort.findFirst({
    where: { id: cohortId, orgId },
  });
  if (!cohort) return null;
  if (role === "coach" && cohort.coachUserId !== userId) return null;
  return cohort;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { orgId, cohortId } = await params;
    const { user, member } = await requireOrgMember(orgId, ["coach", "admin", "director"]);
    const cohort = await assertCohortAccess(orgId, cohortId, user.id, member.role);
    if (!cohort) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json()) as { name?: string };
    const updated = await prisma.swimCohort.update({
      where: { id: cohortId },
      data: { ...(body.name !== undefined ? { name: body.name.trim() || null } : {}) },
    });
    return NextResponse.json({ cohort: updated });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { orgId, cohortId } = await params;
    const { user, member } = await requireOrgMember(orgId, ["coach", "admin", "director"]);
    const cohort = await assertCohortAccess(orgId, cohortId, user.id, member.role);
    if (!cohort) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.swimCohort.delete({ where: { id: cohortId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { orgId, cohortId } = await params;
    const { user, member } = await requireOrgMember(orgId, ["coach", "admin", "director"]);
    const cohort = await assertCohortAccess(orgId, cohortId, user.id, member.role);
    if (!cohort) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json()) as { studentId?: string; action?: "add" | "remove" };
    if (!body.studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 });
    }

    const student = await prisma.swimStudent.findFirst({
      where: { id: body.studentId, orgId },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    if (body.action === "remove") {
      await prisma.swimCohortMember.delete({
        where: { cohortId_studentId: { cohortId, studentId: body.studentId } },
      });
    } else {
      await prisma.swimCohortMember.upsert({
        where: { cohortId_studentId: { cohortId, studentId: body.studentId } },
        create: { cohortId, studentId: body.studentId },
        update: {},
      });
    }

    const updated = await prisma.swimCohort.findUnique({
      where: { id: cohortId },
      include: { members: { include: { student: true } } },
    });

    return NextResponse.json({ cohort: updated });
  } catch (err) {
    return jsonAuthError(err);
  }
}
