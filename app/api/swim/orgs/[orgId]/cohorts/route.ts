import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMember, jsonAuthError } from "@/lib/swim/authz";

type Params = { params: Promise<{ orgId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { orgId } = await params;
    const { user, member } = await requireOrgMember(orgId, ["coach", "admin", "director"]);

    const cohorts = await prisma.swimCohort.findMany({
      where: {
        orgId,
        ...(member.role === "coach" ? { coachUserId: user.id } : {}),
      },
      include: {
        members: { include: { student: true } },
        coach: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ cohorts });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { orgId } = await params;
    const { user, member } = await requireOrgMember(orgId, ["coach", "admin", "director"]);
    const body = (await req.json()) as { name?: string; coachUserId?: string };

    const coachUserId =
      member.role === "coach" ? user.id : body.coachUserId ?? user.id;

    const cohort = await prisma.swimCohort.create({
      data: {
        orgId,
        coachUserId,
        name: body.name?.trim() || null,
      },
    });

    return NextResponse.json({ cohort }, { status: 201 });
  } catch (err) {
    return jsonAuthError(err);
  }
}
