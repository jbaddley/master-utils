import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeetAccess, jsonAuthError } from "@/lib/swim/authz";

type Params = { params: Promise<{ meetId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { meetId } = await params;
    await requireMeetAccess(meetId);
    const q = new URL(_req.url).searchParams.get("q") ?? "";
    const teams = await prisma.swimTeam.findMany({
      where: q ? { code: { contains: q, mode: "insensitive" } } : {},
      take: 20,
      orderBy: { code: "asc" },
    });
    return NextResponse.json({ teams });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { meetId } = await params;
    await requireMeetAccess(meetId);
    const body = (await req.json()) as { code?: string; name?: string; teamId?: string };

    if (body.teamId) {
      await prisma.swimMeetTeam.upsert({
        where: { meetId_teamId: { meetId, teamId: body.teamId } },
        create: { meetId, teamId: body.teamId },
        update: {},
      });
      return NextResponse.json({ ok: true });
    }

    if (!body.code?.trim()) {
      return NextResponse.json({ error: "code or teamId required" }, { status: 400 });
    }

    const team = await prisma.swimTeam.upsert({
      where: { code: body.code.trim().toUpperCase() },
      create: { code: body.code.trim().toUpperCase(), name: body.name?.trim() },
      update: { ...(body.name ? { name: body.name.trim() } : {}) },
    });

    await prisma.swimMeetTeam.upsert({
      where: { meetId_teamId: { meetId, teamId: team.id } },
      create: { meetId, teamId: team.id },
      update: {},
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (err) {
    return jsonAuthError(err);
  }
}
