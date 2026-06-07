import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export type FindOrCreateStudentResult =
  | { ok: true; studentId: string }
  | { ok: false; error: string };

export async function findOrCreateStudent(
  orgId: string,
  firstName: string,
  lastName: string,
  age?: number | null,
  tx: Tx | typeof prisma = prisma,
): Promise<FindOrCreateStudentResult> {
  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();

  const matches = await tx.swimStudent.findMany({
    where: {
      orgId,
      firstName: { equals: trimmedFirst, mode: "insensitive" },
      lastName: { equals: trimmedLast, mode: "insensitive" },
    },
  });

  if (matches.length === 0) {
    try {
      const student = await tx.swimStudent.create({
        data: {
          orgId,
          firstName: trimmedFirst,
          lastName: trimmedLast,
          ...(age != null && !Number.isNaN(age) ? { age } : {}),
        },
      });
      return { ok: true, studentId: student.id };
    } catch (err) {
      const retry = await tx.swimStudent.findFirst({
        where: {
          orgId,
          firstName: { equals: trimmedFirst, mode: "insensitive" },
          lastName: { equals: trimmedLast, mode: "insensitive" },
        },
      });
      if (retry) {
        return { ok: true, studentId: retry.id };
      }
      throw err;
    }
  }

  if (matches.length === 1) {
    const student = matches[0]!;
    if (age != null && !Number.isNaN(age) && student.age !== age) {
      await tx.swimStudent.update({
        where: { id: student.id },
        data: { age },
      });
    }
    return { ok: true, studentId: student.id };
  }

  if (age != null && !Number.isNaN(age)) {
    const ageMatch = matches.find((s) => s.age === age);
    if (ageMatch) {
      return { ok: true, studentId: ageMatch.id };
    }
  }

  return {
    ok: false,
    error: `Ambiguous student name "${trimmedFirst} ${trimmedLast}" — multiple matches in org`,
  };
}

export async function getGuardianStudentIds(orgId: string, guardianUserId: string): Promise<string[]> {
  const links = await prisma.swimGuardianStudent.findMany({
    where: { orgId, guardianUserId },
    select: { studentId: true },
  });
  return links.map((l) => l.studentId);
}

export async function getCoachCohortStudentIds(orgId: string, coachUserId: string): Promise<string[]> {
  const members = await prisma.swimCohortMember.findMany({
    where: { cohort: { orgId, coachUserId } },
    select: { studentId: true },
  });
  return [...new Set(members.map((m) => m.studentId))];
}

export async function getStudentIdForUser(userId: string, orgId: string): Promise<string | null> {
  const student = await prisma.swimStudent.findFirst({
    where: { orgId, userId },
    select: { id: true },
  });
  return student?.id ?? null;
}
