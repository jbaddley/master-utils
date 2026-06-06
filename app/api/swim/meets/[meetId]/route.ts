import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeetAccess, jsonAuthError } from "@/lib/swim/authz";
import { getFlatEntriesForMeet } from "@/lib/swim/normalize";
import { debouncedMeetNotification } from "@/lib/email/swim";

type Params = { params: Promise<{ meetId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { meetId } = await params;
    const { meet } = await requireMeetAccess(meetId);
    const entries = await getFlatEntriesForMeet(meetId);
    const teams = await prisma.swimMeetTeam.findMany({
      where: { meetId },
      include: { team: true },
    });
    return NextResponse.json({ meet, entries, teams });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { meetId } = await params;
    const { meet } = await requireMeetAccess(meetId);
    const body = (await req.json()) as {
      name?: string;
      startsAt?: string;
      location?: string;
      slug?: string;
    };

    const updated = await prisma.swimMeet.update({
      where: { id: meetId },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.startsAt ? { startsAt: new Date(body.startsAt) } : {}),
        ...(body.location ? { location: body.location.trim() } : {}),
        ...(body.slug ? { slug: body.slug.trim() } : {}),
      },
    });

    if (updated.publishedAt) {
      debouncedMeetNotification(meetId, () =>
        import("@/lib/email/swim").then((m) => m.notifyMeetFollowers(meetId, false)),
      );
    }

    return NextResponse.json({ meet: updated });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { meetId } = await params;
    await requireMeetAccess(meetId, true);
    await prisma.swimMeet.delete({ where: { id: meetId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonAuthError(err);
  }
}
