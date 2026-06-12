import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}

/** GET /api/preferences?key=image-to-svg → { value } (null when unset) */
export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const pref = await prisma.userPreference.findUnique({
    where: { userId_key: { userId: user.id, key } },
  });
  return NextResponse.json({ value: pref?.value ?? null });
}

/** PUT /api/preferences { key, value } → upsert for the signed-in user. */
export async function PUT(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { key?: string; value?: unknown };
  if (!body.key || typeof body.key !== "string" || body.value === undefined) {
    return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
  }

  const value = body.value as Prisma.InputJsonValue;
  await prisma.userPreference.upsert({
    where: { userId_key: { userId: user.id, key: body.key } },
    create: { userId: user.id, key: body.key, value },
    update: { value },
  });
  return NextResponse.json({ ok: true });
}
