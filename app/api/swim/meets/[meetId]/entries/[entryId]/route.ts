import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeetAccess, jsonAuthError } from "@/lib/swim/authz";
import {
  parseEventLabel,
  parseHeatLabel,
  parseSeedTime,
} from "@/lib/swim/parse-meet-program";

type Params = { params: Promise<{ meetId: string; entryId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { meetId, entryId } = await params;
    await requireMeetAccess(meetId);
    const body = (await req.json()) as Record<string, unknown>;

    const existing = await prisma.swimEntry.findFirst({
      where: { id: entryId, heat: { event: { meetId } } },
      include: { swimmer: { include: { team: true } }, heat: { include: { event: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const lastName = (body.lastName as string) ?? existing.swimmer.lastName;
    const firstName = (body.firstName as string) ?? existing.swimmer.firstName;
    const age = (body.age as number) ?? existing.swimmer.age;
    const teamCode = (body.teamCode as string) ?? existing.swimmer.team.code;
    const eventLabel = (body.eventLabel as string) ?? existing.heat.event.label;
    const heatLabel = (body.heatLabel as string) ?? `Heat ${existing.heat.heatNumber} of ${existing.heat.totalHeats}`;
    const lane = (body.lane as number) ?? existing.lane;
    const seedTimeDisplay = (body.seedTimeDisplay as string) ?? existing.seedTimeDisplay;

    const event = parseEventLabel(eventLabel);
    const heat = parseHeatLabel(heatLabel);
    if (!event || !heat) {
      return NextResponse.json({ error: "Invalid event or heat" }, { status: 400 });
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
        gender: event.gender,
        ageGroup: event.ageGroup,
        distanceYards: event.distanceYards,
        stroke: event.stroke,
        label: event.label,
      },
      update: { label: event.label },
    });

    const swimHeat = await prisma.swimHeat.upsert({
      where: { eventId_heatNumber: { eventId: swimEvent.id, heatNumber: heat.heatNumber } },
      create: {
        eventId: swimEvent.id,
        heatNumber: heat.heatNumber,
        totalHeats: heat.totalHeats,
      },
      update: { totalHeats: heat.totalHeats },
    });

    const swimmer = await prisma.swimSwimmer.upsert({
      where: {
        meetId_lastName_firstName_age_teamId: { meetId, lastName, firstName, age, teamId: team.id },
      },
      create: { meetId, lastName, firstName, age, teamId: team.id },
      update: {},
    });

    if (existing.heatId !== swimHeat.id || existing.lane !== lane) {
      await prisma.swimEntry.delete({ where: { id: entryId } });
    }

    const entry = await prisma.swimEntry.upsert({
      where: { heatId_lane: { heatId: swimHeat.id, lane } },
      create: {
        heatId: swimHeat.id,
        swimmerId: swimmer.id,
        lane,
        seedTimeDisplay: seed.display,
        seedTimeSeconds: seed.seconds,
        isAlternate: heat.isAlternate,
      },
      update: {
        swimmerId: swimmer.id,
        seedTimeDisplay: seed.display,
        seedTimeSeconds: seed.seconds,
        isAlternate: heat.isAlternate,
      },
    });

    return NextResponse.json({ entry });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { meetId, entryId } = await params;
    await requireMeetAccess(meetId);
    await prisma.swimEntry.deleteMany({
      where: { id: entryId, heat: { event: { meetId } } },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonAuthError(err);
  }
}
