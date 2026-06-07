import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFlatEntriesForMeet } from "@/lib/swim/normalize";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  const meet = await prisma.swimMeet.findFirst({
    where: { slug, publishedAt: { not: null } },
    include: { org: true },
  });
  if (!meet) {
    return NextResponse.json({ error: "Meet not found" }, { status: 404 });
  }

  const entries = await getFlatEntriesForMeet(meet.id);
  const students = [...new Map(
    entries.map((e) => [
      e.studentId,
      {
        id: e.studentId,
        label: `${e.firstName} ${e.lastName}`,
        age: e.age,
        team: e.team,
      },
    ]),
  ).values()];

  return NextResponse.json({ meet, org: meet.org, entries, students });
}
