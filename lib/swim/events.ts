import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export async function nextEventNumber(meetId: string, tx: Tx | typeof prisma = prisma): Promise<number> {
  const max = await tx.swimEvent.aggregate({
    where: { meetId },
    _max: { number: true },
  });
  return (max._max.number ?? 0) + 1;
}

export async function listMeetEvents(meetId: string) {
  return prisma.swimEvent.findMany({
    where: { meetId },
    orderBy: { number: "asc" },
    include: {
      _count: { select: { heats: true } },
    },
  });
}

export async function reorderMeetEvents(meetId: string, orderedEventIds: string[]) {
  const events = await prisma.swimEvent.findMany({
    where: { meetId },
    select: { id: true },
    orderBy: { number: "asc" },
  });

  if (orderedEventIds.length !== events.length) {
    throw new Error("Reorder must include every event in the meet");
  }

  const eventIds = new Set(events.map((event) => event.id));
  for (const id of orderedEventIds) {
    if (!eventIds.has(id)) {
      throw new Error("Invalid event id");
    }
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedEventIds.length; i++) {
      await tx.swimEvent.update({
        where: { id: orderedEventIds[i] },
        data: { number: -(i + 1) },
      });
    }
    for (let i = 0; i < orderedEventIds.length; i++) {
      await tx.swimEvent.update({
        where: { id: orderedEventIds[i] },
        data: { number: i + 1 },
      });
    }
  });

  return listMeetEvents(meetId);
}
