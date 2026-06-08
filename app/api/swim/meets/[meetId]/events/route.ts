import { NextRequest, NextResponse } from "next/server";
import {
  jsonAuthError,
  requireMeetEventOrderAccess,
  requireMeetViewAccess,
} from "@/lib/swim/authz";
import { listMeetEvents, reorderMeetEvents } from "@/lib/swim/events";
import { debouncedMeetNotification } from "@/lib/email/swim";

type Params = { params: Promise<{ meetId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { meetId } = await params;
    await requireMeetViewAccess(meetId);
    const events = await listMeetEvents(meetId);
    return NextResponse.json({ events });
  } catch (err) {
    return jsonAuthError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { meetId } = await params;
    const { meet } = await requireMeetEventOrderAccess(meetId);
    const body = (await req.json()) as { eventIds?: string[] };

    if (!Array.isArray(body.eventIds) || body.eventIds.length === 0) {
      return NextResponse.json({ error: "eventIds array is required" }, { status: 400 });
    }

    const events = await reorderMeetEvents(meetId, body.eventIds);

    if (meet.publishedAt) {
      debouncedMeetNotification(meetId, () =>
        import("@/lib/email/swim").then((m) => m.notifyMeetFollowers(meetId, false)),
      );
    }

    return NextResponse.json({ events });
  } catch (err) {
    if (err instanceof Error && (err.message.includes("Reorder") || err.message.includes("Invalid"))) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return jsonAuthError(err);
  }
}
