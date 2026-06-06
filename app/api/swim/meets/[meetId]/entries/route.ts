import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeetAccess, jsonAuthError } from "@/lib/swim/authz";
import {
  parseEventLabel,
  parseHeatLabel,
  parseSeedTime,
} from "@/lib/swim/parse-meet-program";

type Params = { params: Promise<{ meetId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { meetId } = await params;
    await requireMeetAccess(meetId);

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

    const event = parseEventLabel(body.eventLabel!);
    const heat = parseHeatLabel(body.heatLabel!);
    if (!event || !heat) {
      return NextResponse.json({ error: "Invalid event or heat format" }, { status: 400 });
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
        meetId_lastName_firstName_age_teamId: {
          meetId,
          lastName: body.lastName!,
          firstName: body.firstName!,
          age: body.age!,
          teamId: team.id,
        },
      },
      create: {
        meetId,
        lastName: body.lastName!,
        firstName: body.firstName!,
        age: body.age!,
        teamId: team.id,
      },
      update: {},
    });

    const entry = await prisma.swimEntry.upsert({
      where: { heatId_lane: { heatId: swimHeat.id, lane: body.lane! } },
      create: {
        heatId: swimHeat.id,
        swimmerId: swimmer.id,
        lane: body.lane!,
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

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return jsonAuthError(err);
  }
}
