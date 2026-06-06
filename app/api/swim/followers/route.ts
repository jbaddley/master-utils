import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSwimSession, jsonAuthError } from "@/lib/swim/authz";

export async function GET() {
  try {
    const user = await requireSwimSession();
    const followers = await prisma.swimOrgFollower.findMany({
      where: { userId: user.id },
      include: { org: true },
    });
    return NextResponse.json({ followers });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSwimSession();
    const body = (await req.json()) as {
      orgId?: string;
      emailMeetUpdates?: boolean;
      savedSwimmerIds?: string[];
    };
    if (!body.orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    const follower = await prisma.swimOrgFollower.upsert({
      where: { userId_orgId: { userId: user.id, orgId: body.orgId } },
      create: {
        userId: user.id,
        orgId: body.orgId,
        emailMeetUpdates: body.emailMeetUpdates ?? true,
        savedSwimmerIds: body.savedSwimmerIds ?? [],
      },
      update: {
        ...(body.emailMeetUpdates !== undefined ? { emailMeetUpdates: body.emailMeetUpdates } : {}),
        ...(body.savedSwimmerIds ? { savedSwimmerIds: body.savedSwimmerIds } : {}),
      },
    });
    return NextResponse.json({ follower });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireSwimSession();
    const orgId = new URL(req.url).searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });
    await prisma.swimOrgFollower.delete({
      where: { userId_orgId: { userId: user.id, orgId } },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonAuthError(err);
  }
}
