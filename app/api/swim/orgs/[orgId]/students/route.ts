import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMember, STUDENT_MANAGER_ROLES, jsonAuthError } from "@/lib/swim/authz";

type Params = { params: Promise<{ orgId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgMember(orgId, STUDENT_MANAGER_ROLES);
    const students = await prisma.swimStudent.findMany({
      where: { orgId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        user: { select: { id: true, email: true, name: true } },
        guardianLinks: { include: { guardian: { select: { id: true, email: true, name: true } } } },
      },
    });
    return NextResponse.json({ students });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { orgId } = await params;
    await requireOrgMember(orgId, ["admin", "manager", "director"]);
    const body = (await req.json()) as {
      firstName?: string;
      lastName?: string;
      age?: number;
      userId?: string;
    };

    if (!body.firstName?.trim() || !body.lastName?.trim()) {
      return NextResponse.json({ error: "firstName and lastName required" }, { status: 400 });
    }

    const student = await prisma.swimStudent.create({
      data: {
        orgId,
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        ...(body.age != null ? { age: body.age } : {}),
        ...(body.userId ? { userId: body.userId } : {}),
      },
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (err) {
    return jsonAuthError(err);
  }
}
