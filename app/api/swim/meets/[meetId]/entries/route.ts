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

type Params = { params: Promise<{ meetId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { meetId } = await params;
    const { meet } = await requireMeetAccess(meetId);

    const body = (await req.json()) as {
      lastName?: string;
      firstName?: string;
      age?: number;
      teamCode?: string;
      eventLabel?: string;
      heatLabel?: string;
      lane?: number;
      seedTimeDisplay?: string;
    };

    const required = ["lastName", "firstName", "age", "teamCode", "eventLabel", "heatLabel", "lane"] as const;
    for (const key of required) {
      if (body[key] === undefined || body[key] === "") {
        return NextResponse.json({ error: `${key} required` }, { status: 400 });
      }
    }

    let event = parseEventLabel(body.eventLabel!);
    const heat = parseHeatLabel(body.heatLabel!);
    if (!heat) {
      return NextResponse.json({ error: "Invalid heat format" }, { status: 400 });
    }

    if (!event) {
      const autoNumber = await nextEventNumber(meetId);
      event = { number: autoNumber, title: body.eventLabel!.trim() };
    } else if (event.number === 0) {
      event.number = await nextEventNumber(meetId);
    }

    const seed = parseSeedTime(body.seedTimeDisplay ?? "NT");

    const team = await prisma.swimTeam.upsert({
      where: { code: body.teamCode! },
      create: { code: body.teamCode! },
      update: {},
    });

    await prisma.swimMeetTeam.upsert({
      where: { meetId_teamId: { meetId, teamId: team.id } },
      create: { meetId, teamId: team.id },
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

    const studentResult = await findOrCreateStudent(
      meet.orgId,
      body.firstName!,
      body.lastName!,
      body.age!,
    );
    if (!studentResult.ok) {
      return NextResponse.json({ error: studentResult.error }, { status: 400 });
    }

    const participant = await prisma.swimParticipant.upsert({
      where: { heatId_lane: { heatId: swimHeat.id, lane: body.lane! } },
      create: {
        heatId: swimHeat.id,
        studentId: studentResult.studentId,
        teamId: team.id,
        lane: body.lane!,
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

    return NextResponse.json({ participant }, { status: 201 });
  } catch (err) {
    return jsonAuthError(err);
  }
}
