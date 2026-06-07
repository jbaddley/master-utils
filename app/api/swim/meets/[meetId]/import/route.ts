import { NextRequest, NextResponse } from "next/server";
import { requireMeetAccess, jsonAuthError, SwimAuthError } from "@/lib/swim/authz";
import {
  parseMeetProgramCsv,
  parseEventLabel,
  parseHeatLabel,
  type SwimProgramRow,
} from "@/lib/swim/parse-meet-program";
import { normalizeProgramRows, rollbackLastImport } from "@/lib/swim/normalize";

type Params = { params: Promise<{ meetId: string }> };

/** Re-parse event/heat from labels when client-sent rows omit nested objects. */
function hydrateProgramRows(rows: SwimProgramRow[]): SwimProgramRow[] {
  return rows.map((row) => ({
    ...row,
    event: row.event ?? parseEventLabel(row.eventLabel) ?? undefined,
    heat: row.heat ?? parseHeatLabel(row.heatLabel) ?? undefined,
  }));
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { meetId } = await params;
    const { meet } = await requireMeetAccess(meetId, true);

    const contentType = req.headers.get("content-type") ?? "";
    let csvText = "";
    let rows: SwimProgramRow[] | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (file instanceof File) {
        csvText = await file.text();
      } else {
        csvText = (form.get("text") as string) ?? "";
      }
    } else {
      const body = (await req.json()) as { text?: string; rows?: SwimProgramRow[] };
      csvText = body.text ?? "";
      rows = body.rows;
    }

    const url = new URL(req.url);
    const preview = url.searchParams.get("preview") === "true";

    if (rows) {
      if (preview) return NextResponse.json({ rows: hydrateProgramRows(rows), issues: [] });
      const result = await normalizeProgramRows(meetId, meet.orgId, hydrateProgramRows(rows));
      return NextResponse.json(result);
    }

    if (!csvText.trim()) {
      return NextResponse.json({ error: "CSV text, file, or rows required" }, { status: 400 });
    }

    const parsed = parseMeetProgramCsv(csvText);

    if (preview) {
      return NextResponse.json(parsed);
    }

    if (parsed.rows.length === 0) {
      return NextResponse.json({ error: "No valid rows", issues: parsed.issues }, { status: 400 });
    }

    const result = await normalizeProgramRows(meetId, meet.orgId, parsed.rows);
    return NextResponse.json({ ...result, issues: parsed.issues });
  } catch (err) {
    if (err instanceof SwimAuthError) {
      return jsonAuthError(err);
    }
    console.error("CSV import failed:", err);
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { meetId } = await params;
    await requireMeetAccess(meetId, true);
    const ok = await rollbackLastImport(meetId);
    return NextResponse.json({ ok });
  } catch (err) {
    return jsonAuthError(err);
  }
}
