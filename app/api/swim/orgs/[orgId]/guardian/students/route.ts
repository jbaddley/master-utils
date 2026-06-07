import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMember, jsonAuthError } from "@/lib/swim/authz";

type Params = { params: Promise<{ orgId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { orgId } = await params;
    const { user } = await requireOrgMember(orgId, ["guardian"]);

    const links = await prisma.swimGuardianStudent.findMany({
      where: { orgId, guardianUserId: user.id },
      include: { student: true },
    });

    return NextResponse.json({
      students: links.map((l) => l.student),
    });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgMember(orgId, ["admin", "director"]);
    const body = (await req.json()) as {
      guardianUserId?: string;
      studentId?: string;
    };

    if (!body.guardianUserId || !body.studentId) {
      return NextResponse.json({ error: "guardianUserId and studentId required" }, { status: 400 });
    }

    const link = await prisma.swimGuardianStudent.upsert({
      where: {
        guardianUserId_studentId: {
          guardianUserId: body.guardianUserId,
          studentId: body.studentId,
        },
      },
      create: {
        orgId,
        guardianUserId: body.guardianUserId,
        studentId: body.studentId,
      },
      update: {},
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgMember(orgId, ["admin", "director"]);
    const guardianUserId = new URL(req.url).searchParams.get("guardianUserId");
    const studentId = new URL(req.url).searchParams.get("studentId");
    if (!guardianUserId || !studentId) {
      return NextResponse.json({ error: "guardianUserId and studentId required" }, { status: 400 });
    }

    await prisma.swimGuardianStudent.delete({
      where: { guardianUserId_studentId: { guardianUserId, studentId } },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonAuthError(err);
  }
}
