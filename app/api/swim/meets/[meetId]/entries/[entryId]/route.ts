import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeetAccess, jsonAuthError } from "@/lib/swim/authz";
import {
  parseEventLabel,
  parseHeatLabel,
  parseSeedTime,
} from "@/lib/swim/parse-meet-program";
import { findOrCreateStudent } from "@/lib/swim/students";
import { nextEventNumber } from "@/lib/swim/events";

type Params = { params: Promise<{ meetId: string; entryId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { meetId, entryId } = await params;
    const { meet } = await requireMeetAccess(meetId);
    const body = (await req.json()) as Record<string, unknown>;

    const existing = await prisma.swimParticipant.findFirst({
      where: { id: entryId, heat: { event: { meetId } } },
      include: { student: true, team: true, heat: { include: { event: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const lastName = (body.lastName as string) ?? existing.student.lastName;
    const firstName = (body.firstName as string) ?? existing.student.firstName;
    const age = (body.age as number) ?? existing.student.age ?? undefined;
    const teamCode = (body.teamCode as string) ?? existing.team?.code ?? "";
    const eventLabel = (body.eventLabel as string) ?? `Event ${existing.heat.event.number}: ${existing.heat.event.title}`;
    const heatLabel = (body.heatLabel as string) ?? String(existing.heat.number);
    const lane = (body.lane as number) ?? existing.lane;
    const seedTimeDisplay = (body.seedTimeDisplay as string) ?? existing.seedTimeDisplay;

    let event = parseEventLabel(eventLabel);
    const heat = parseHeatLabel(heatLabel);
    if (!heat) {
      return NextResponse.json({ error: "Invalid heat" }, { status: 400 });
    }
    if (!event) {
      event = {
        number: existing.heat.event.number,
        title: eventLabel.trim(),
      };
    } else if (event.number === 0) {
      event.number = await nextEventNumber(meetId);
    }
    const seed = parseSeedTime(seedTimeDisplay);

    const team = await prisma.swimTeam.upsert({
      where: { code: teamCode },
      create: { code: teamCode },
      update: {},
    });

    const swimEvent = await prisma.swimEvent.upsert({
      where: { meetId_number: { meetId, number: event.number } },
      create: {
        meetId,
        number: event.number,
        title: event.title,
      },
      update: { title: event.title },
    });

    const swimHeat = await prisma.swimHeat.upsert({
      where: { eventId_number: { eventId: swimEvent.id, number: heat.number } },
      create: {
        eventId: swimEvent.id,
        number: heat.number,
      },
      update: {},
    });

    const studentResult = await findOrCreateStudent(meet.orgId, firstName, lastName, age);
    if (!studentResult.ok) {
      return NextResponse.json({ error: studentResult.error }, { status: 400 });
    }

    if (existing.heatId !== swimHeat.id || existing.lane !== lane) {
      await prisma.swimParticipant.delete({ where: { id: entryId } });
    }

    const participant = await prisma.swimParticipant.upsert({
      where: { heatId_lane: { heatId: swimHeat.id, lane } },
      create: {
        heatId: swimHeat.id,
        studentId: studentResult.studentId,
        teamId: team.id,
        lane,
        seedTimeDisplay: seed.display,
        seedTimeSeconds: seed.seconds,
        isAlternate: heat.isAlternate,
      },
      update: {
        studentId: studentResult.studentId,
        teamId: team.id,
        seedTimeDisplay: seed.display,
        seedTimeSeconds: seed.seconds,
        isAlternate: heat.isAlternate,
      },
    });

    return NextResponse.json({ participant });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { meetId, entryId } = await params;
    await requireMeetAccess(meetId);
    await prisma.swimParticipant.deleteMany({
      where: { id: entryId, heat: { event: { meetId } } },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonAuthError(err);
  }
}
