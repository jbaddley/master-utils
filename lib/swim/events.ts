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
