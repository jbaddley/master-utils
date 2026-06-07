import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeetAccess, jsonAuthError } from "@/lib/swim/authz";

type Params = { params: Promise<{ meetId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { meetId } = await params;
    await requireMeetAccess(meetId, true);

    const updated = await prisma.swimMeet.update({
      where: { id: meetId },
      data: { publishedAt: null },
    });

    return NextResponse.json({ meet: updated });
  } catch (err) {
    return jsonAuthError(err);
  }
}
