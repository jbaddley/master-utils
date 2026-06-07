import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMember, jsonAuthError } from "@/lib/swim/authz";

type Params = { params: Promise<{ orgId: string; studentId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { orgId, studentId } = await params;
    await requireOrgMember(orgId, ["admin", "manager", "director"]);
    const body = (await req.json()) as {
      firstName?: string;
      lastName?: string;
      age?: number | null;
      userId?: string | null;
    };

    const student = await prisma.swimStudent.update({
      where: { id: studentId, orgId },
      data: {
        ...(body.firstName ? { firstName: body.firstName.trim() } : {}),
        ...(body.lastName ? { lastName: body.lastName.trim() } : {}),
        ...(body.age !== undefined ? { age: body.age } : {}),
        ...(body.userId !== undefined ? { userId: body.userId } : {}),
      },
    });

    return NextResponse.json({ student });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { orgId, studentId } = await params;
    await requireOrgMember(orgId, ["admin", "director"]);
    await prisma.swimStudent.delete({ where: { id: studentId, orgId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonAuthError(err);
  }
}
