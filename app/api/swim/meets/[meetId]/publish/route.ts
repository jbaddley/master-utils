import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeetAccess, jsonAuthError } from "@/lib/swim/authz";
import { notifyMeetFollowers } from "@/lib/email/swim";

type Params = { params: Promise<{ meetId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { meetId } = await params;
    const { meet } = await requireMeetAccess(meetId, true);
    const body = (await req.json()) as { slug?: string };

    const wasPublished = !!meet.publishedAt;

    const updated = await prisma.swimMeet.update({
      where: { id: meetId },
      data: {
        publishedAt: new Date(),
        ...(!wasPublished && body.slug ? { slug: body.slug.trim() } : {}),
      },
    });

    void notifyMeetFollowers(meetId, !wasPublished);

    const baseUrl = process.env.NEXT_PUBLIC_SWIM_URL ?? "http://localhost:3742/swim";
    return NextResponse.json({
      meet: updated,
      publicUrl: `${baseUrl}/m/${updated.slug}/`,
    });
  } catch (err) {
    return jsonAuthError(err);
  }
}
