import { NextRequest, NextResponse } from "next/server";
import { requireMeetAccess, jsonAuthError } from "@/lib/swim/authz";
import {
  suggestColumnMapping,
  applyColumnMapping,
  parseCsvHeadersAndRows,
  type ColumnMapping,
} from "@/lib/swim/column-mapper";
import { parseSwimProgramRow, type SwimProgramRow } from "@/lib/swim/parse-meet-program";

type Params = { params: Promise<{ meetId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { meetId } = await params;
    await requireMeetAccess(meetId, true);
    const body = (await req.json()) as { text?: string; mapping?: ColumnMapping };

    if (!body.text?.trim()) {
      return NextResponse.json({ error: "CSV text required" }, { status: 400 });
    }

    const { headers, rows: rawRows } = parseCsvHeadersAndRows(body.text);
    const suggestion = suggestColumnMapping(headers);
    const mapping = body.mapping ?? suggestion.mapping;

    const rows: SwimProgramRow[] = [];
    const issues = [];

    for (let i = 0; i < rawRows.length; i++) {
      const record = applyColumnMapping(headers, rawRows[i], mapping);
      const { row, issues: rowIssues } = parseSwimProgramRow(record, i + 2);
      issues.push(...rowIssues);
      if (row) rows.push(row);
    }

    return NextResponse.json({
      headers,
      suggestion,
      mapping,
      rows,
      issues,
    });
  } catch (err) {
    return jsonAuthError(err);
  }
}
