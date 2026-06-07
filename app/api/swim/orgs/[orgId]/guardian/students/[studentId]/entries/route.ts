import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgMember, jsonAuthError } from "@/lib/swim/authz";
import { getFlatEntriesForMeet } from "@/lib/swim/normalize";

type Params = { params: Promise<{ orgId: string; studentId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { orgId, studentId } = await params;
    const { user, member } = await requireOrgMember(orgId);

    if (member.role === "guardian") {
      const link = await prisma.swimGuardianStudent.findUnique({
        where: { guardianUserId_studentId: { guardianUserId: user.id, studentId } },
      });
      if (!link) {
        return NextResponse.json({ error: "Student not linked to your account" }, { status: 403 });
      }
    } else if (!["admin", "manager", "director", "coach"].includes(member.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const meets = await prisma.swimMeet.findMany({
      where: { orgId },
      orderBy: { startsAt: "desc" },
    });

    const meetEntries = await Promise.all(
      meets.map(async (meet) => ({
        meet,
        entries: await getFlatEntriesForMeet(meet.id, [studentId]),
      })),
    );

    return NextResponse.json({
      entries: meetEntries.filter((m) => m.entries.length > 0),
    });
  } catch (err) {
    return jsonAuthError(err);
  }
}
