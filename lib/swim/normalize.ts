import { prisma } from "@/lib/prisma";
import type { SwimProgramRow } from "./parse-meet-program";

export type NormalizeResult = {
  inserted: number;
  teams: number;
  events: number;
  heats: number;
  swimmers: number;
  entries: number;
  errors: string[];
};

export async function normalizeProgramRows(
  meetId: string,
  rows: SwimProgramRow[],
): Promise<NormalizeResult> {
  const errors: string[] = [];
  let entries = 0;
  const teamIds = new Set<string>();
  const eventIds = new Set<string>();
  const heatIds = new Set<string>();
  const swimmerIds = new Set<string>();

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      if (!row.event || !row.heat) {
        errors.push(`Skipping row: missing parsed event or heat for ${row.firstName} ${row.lastName}`);
        continue;
      }

      const team = await tx.swimTeam.upsert({
        where: { code: row.teamCode },
        create: { code: row.teamCode },
        update: {},
      });
      teamIds.add(team.id);

      await tx.swimMeetTeam.upsert({
        where: { meetId_teamId: { meetId, teamId: team.id } },
        create: { meetId, teamId: team.id },
        update: {},
      });

      const event = await tx.swimEvent.upsert({
        where: { meetId_number: { meetId, number: row.event.number } },
        create: {
          meetId,
          number: row.event.number,
          gender: row.event.gender,
          ageGroup: row.event.ageGroup,
          distanceYards: row.event.distanceYards,
          stroke: row.event.stroke,
          label: row.event.label,
        },
        update: {
          gender: row.event.gender,
          ageGroup: row.event.ageGroup,
          distanceYards: row.event.distanceYards,
          stroke: row.event.stroke,
          label: row.event.label,
        },
      });
      eventIds.add(event.id);

      const heat = await tx.swimHeat.upsert({
        where: { eventId_heatNumber: { eventId: event.id, heatNumber: row.heat.heatNumber } },
        create: {
          eventId: event.id,
          heatNumber: row.heat.heatNumber,
          totalHeats: row.heat.totalHeats,
        },
        update: { totalHeats: row.heat.totalHeats },
      });
      heatIds.add(heat.id);

      const swimmer = await tx.swimSwimmer.upsert({
        where: {
          meetId_lastName_firstName_age_teamId: {
            meetId,
            lastName: row.lastName,
            firstName: row.firstName,
            age: row.age,
            teamId: team.id,
          },
        },
        create: {
          meetId,
          lastName: row.lastName,
          firstName: row.firstName,
          age: row.age,
          teamId: team.id,
        },
        update: {},
      });
      swimmerIds.add(swimmer.id);

      await tx.swimEntry.upsert({
        where: { heatId_lane: { heatId: heat.id, lane: row.lane } },
        create: {
          heatId: heat.id,
          swimmerId: swimmer.id,
          lane: row.lane,
          seedTimeDisplay: row.seedTimeDisplay,
          seedTimeSeconds: row.seedTimeSeconds,
          isAlternate: row.isAlternate,
        },
        update: {
          swimmerId: swimmer.id,
          seedTimeDisplay: row.seedTimeDisplay,
          seedTimeSeconds: row.seedTimeSeconds,
          isAlternate: row.isAlternate,
        },
      });
      entries++;
    }

    await tx.swimImportLog.create({
      data: { meetId, rowCount: entries },
    });
  });

  return {
    inserted: entries,
    teams: teamIds.size,
    events: eventIds.size,
    heats: heatIds.size,
    swimmers: swimmerIds.size,
    entries,
    errors,
  };
}

export async function rollbackLastImport(meetId: string): Promise<boolean> {
  const lastLog = await prisma.swimImportLog.findFirst({
    where: { meetId },
    orderBy: { createdAt: "desc" },
  });
  if (!lastLog) return false;

  await prisma.$transaction([
    prisma.swimEntry.deleteMany({
      where: { heat: { event: { meetId } } },
    }),
    prisma.swimHeat.deleteMany({ where: { event: { meetId } } }),
    prisma.swimEvent.deleteMany({ where: { meetId } }),
    prisma.swimSwimmer.deleteMany({ where: { meetId } }),
    prisma.swimMeetTeam.deleteMany({ where: { meetId } }),
    prisma.swimImportLog.delete({ where: { id: lastLog.id } }),
  ]);
  return true;
}

export async function getFlatEntriesForMeet(meetId: string) {
  const entries = await prisma.swimEntry.findMany({
    where: { heat: { event: { meetId } } },
    include: {
      swimmer: { include: { team: true } },
      heat: { include: { event: true } },
    },
    orderBy: [
      { heat: { event: { number: "asc" } } },
      { heat: { heatNumber: "asc" } },
      { lane: "asc" },
    ],
  });

  return entries.map((e) => ({
    id: e.id,
    lastName: e.swimmer.lastName,
    firstName: e.swimmer.firstName,
    age: e.swimmer.age,
    team: e.swimmer.team.code,
    event: e.heat.event.label,
    heat: `Heat ${e.heat.heatNumber} of ${e.heat.totalHeats}${e.isAlternate ? " (alt)" : ""}`,
    lane: e.lane,
    seedTime: e.seedTimeDisplay,
    swimmerId: e.swimmer.id,
    eventNumber: e.heat.event.number,
    heatNumber: e.heat.heatNumber,
  }));
}
