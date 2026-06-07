import { prisma } from "@/lib/prisma";
import type { SwimProgramRow } from "./parse-meet-program";
import { findOrCreateStudent } from "./students";

export type NormalizeResult = {
  inserted: number;
  teams: number;
  events: number;
  heats: number;
  students: number;
  participants: number;
  entries: number;
  errors: string[];
};

export async function normalizeProgramRows(
  meetId: string,
  orgId: string,
  rows: SwimProgramRow[],
): Promise<NormalizeResult> {
  const errors: string[] = [];
  let participants = 0;
  const teamIds = new Set<string>();
  const eventIds = new Set<string>();
  const heatIds = new Set<string>();
  const studentIds = new Set<string>();

  await prisma.$transaction(
    async (tx) => {
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
            title: row.event.title,
          },
          update: { title: row.event.title },
        });
        eventIds.add(event.id);

        const heat = await tx.swimHeat.upsert({
          where: { eventId_number: { eventId: event.id, number: row.heat.number } },
          create: {
            eventId: event.id,
            number: row.heat.number,
          },
          update: {},
        });
        heatIds.add(heat.id);

        const studentResult = await findOrCreateStudent(orgId, row.firstName, row.lastName, row.age, tx);
        if (!studentResult.ok) {
          errors.push(`Row ${row.firstName} ${row.lastName}: ${studentResult.error}`);
          continue;
        }
        studentIds.add(studentResult.studentId);

        await tx.swimParticipant.upsert({
          where: { heatId_lane: { heatId: heat.id, lane: row.lane } },
          create: {
            heatId: heat.id,
            studentId: studentResult.studentId,
            teamId: team.id,
            lane: row.lane,
            seedTimeDisplay: row.seedTimeDisplay,
            seedTimeSeconds: row.seedTimeSeconds,
            isAlternate: row.isAlternate,
          },
          update: {
            studentId: studentResult.studentId,
            teamId: team.id,
            seedTimeDisplay: row.seedTimeDisplay,
            seedTimeSeconds: row.seedTimeSeconds,
            isAlternate: row.isAlternate,
          },
        });
        participants++;
      }

      if (participants > 0) {
        await tx.swimImportLog.create({
          data: { meetId, rowCount: participants },
        });
      }
    },
    { timeout: 60_000 },
  );

  return {
    inserted: participants,
    teams: teamIds.size,
    events: eventIds.size,
    heats: heatIds.size,
    students: studentIds.size,
    participants,
    entries: participants,
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
    prisma.swimParticipant.deleteMany({
      where: { heat: { event: { meetId } } },
    }),
    prisma.swimHeat.deleteMany({ where: { event: { meetId } } }),
    prisma.swimEvent.deleteMany({ where: { meetId } }),
    prisma.swimMeetTeam.deleteMany({ where: { meetId } }),
    prisma.swimImportLog.delete({ where: { id: lastLog.id } }),
  ]);
  return true;
}

export type FlatEntry = {
  id: string;
  lastName: string;
  firstName: string;
  age: number | null;
  team: string;
  event: string;
  heat: string;
  lane: number;
  seedTime: string;
  studentId: string;
  eventNumber: number;
  heatNumber: number;
};

export async function getFlatEntriesForMeet(
  meetId: string,
  studentIdsFilter?: string[],
): Promise<FlatEntry[]> {
  const participants = await prisma.swimParticipant.findMany({
    where: {
      heat: { event: { meetId } },
      ...(studentIdsFilter?.length ? { studentId: { in: studentIdsFilter } } : {}),
    },
    include: {
      student: true,
      team: true,
      heat: { include: { event: true } },
    },
    orderBy: [
      { heat: { event: { number: "asc" } } },
      { heat: { number: "asc" } },
      { lane: "asc" },
    ],
  });

  return participants.map((p) => ({
    id: p.id,
    lastName: p.student.lastName,
    firstName: p.student.firstName,
    age: p.student.age,
    team: p.team?.code ?? "",
    event: `Event ${p.heat.event.number}: ${p.heat.event.title}`,
    heat: `Heat ${p.heat.number}${p.isAlternate ? " (alt)" : ""}`,
    lane: p.lane,
    seedTime: p.seedTimeDisplay,
    studentId: p.student.id,
    eventNumber: p.heat.event.number,
    heatNumber: p.heat.number,
  }));
}
