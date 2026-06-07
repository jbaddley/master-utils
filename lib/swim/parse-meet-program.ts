import {
  detectCsvHasHeaderRow,
  parseCsvLineCells,
  suggestColumnMapping,
  applyColumnMapping,
} from "./column-mapper";

export const CANONICAL_HEADERS = [
  "Last Name",
  "First Name",
  "Age",
  "Team",
  "Event",
  "Heat",
  "Lane",
  "Seed Time",
] as const;

export type CanonicalHeader = (typeof CANONICAL_HEADERS)[number];

export type ParsedEvent = {
  number: number;
  title: string;
};

export type ParsedHeat = {
  number: number;
  isAlternate: boolean;
  label: string;
};

export type ParsedSeedTime = {
  display: string;
  seconds: number | null;
};

export type SwimProgramRow = {
  lastName: string;
  firstName: string;
  age: number;
  teamCode: string;
  eventLabel: string;
  heatLabel: string;
  lane: number;
  seedTimeDisplay: string;
  seedTimeSeconds: number | null;
  isAlternate: boolean;
  event?: ParsedEvent;
  heat?: ParsedHeat;
};

export type ParseIssue = {
  row: number;
  field?: string;
  message: string;
};

const EVENT_RE =
  /^Event\s+(\d+)\s+(Girls|Boys)\s+(.+?)\s+(\d+)\s+Yard\s+(.+)$/i;

const HEAT_RE = /^Heat\s+(\d+)\s+of\s+(\d+)(?:\s*\(alt\))?$/i;

const HEAT_SIMPLE_RE = /^(\d+)(?:\s*\(alt\))?$/i;

export function parseEventLabel(label: string): ParsedEvent | null {
  const trimmed = label.trim();
  const match = trimmed.match(EVENT_RE);
  if (!match) {
    const numMatch = trimmed.match(/^(\d+)\s*[:\-]?\s*(.+)$/);
    if (numMatch) {
      return {
        number: parseInt(numMatch[1]!, 10),
        title: numMatch[2]!.trim(),
      };
    }
    if (trimmed) {
      return { number: 0, title: trimmed };
    }
    return null;
  }
  const number = parseInt(match[1]!, 10);
  const title = `${match[2]} ${match[3]} ${match[4]} Yard ${match[5]}`.trim();
  return { number, title };
}

export function parseHeatLabel(label: string): ParsedHeat | null {
  const trimmed = label.trim();
  const match = trimmed.match(HEAT_RE);
  if (match) {
    return {
      number: parseInt(match[1]!, 10),
      isAlternate: /\(\s*alt\s*\)/i.test(trimmed),
      label: trimmed,
    };
  }
  const simple = trimmed.match(HEAT_SIMPLE_RE);
  if (simple) {
    return {
      number: parseInt(simple[1]!, 10),
      isAlternate: /\(\s*alt\s*\)/i.test(trimmed),
      label: trimmed,
    };
  }
  const numOnly = parseInt(trimmed, 10);
  if (!Number.isNaN(numOnly)) {
    return { number: numOnly, isAlternate: false, label: trimmed };
  }
  return null;
}

export function parseSeedTime(display: string): ParsedSeedTime {
  const trimmed = display.trim();
  if (!trimmed || /^NT$/i.test(trimmed)) {
    return { display: "NT", seconds: null };
  }
  if (/^\d+:\d+(?:\.\d+)?$/.test(trimmed)) {
    const [mins, secs] = trimmed.split(":");
    const seconds = parseInt(mins!, 10) * 60 + parseFloat(secs!);
    return { display: trimmed, seconds };
  }
  const num = parseFloat(trimmed);
  if (!Number.isNaN(num)) {
    return { display: trimmed, seconds: num };
  }
  return { display: trimmed, seconds: null };
}

export function parseSwimProgramRow(
  raw: Record<string, string>,
  rowIndex: number,
): { row: SwimProgramRow | null; issues: ParseIssue[] } {
  const issues: ParseIssue[] = [];
  const lastName = raw["Last Name"]?.trim() ?? "";
  const firstName = raw["First Name"]?.trim() ?? "";
  const ageStr = raw["Age"]?.trim() ?? "";
  const teamCode = raw["Team"]?.trim() ?? "";
  const eventLabel = raw["Event"]?.trim() ?? "";
  const eventNumberStr = raw["Event Number"]?.trim() ?? "";
  const eventTitleStr = raw["Event Title"]?.trim() ?? "";
  const heatLabel = raw["Heat"]?.trim() ?? "";
  const laneStr = raw["Lane"]?.trim() ?? "";
  const seedTimeDisplay = raw["Seed Time"]?.trim() ?? "NT";

  if (!lastName) issues.push({ row: rowIndex, field: "Last Name", message: "Required" });
  if (!firstName) issues.push({ row: rowIndex, field: "First Name", message: "Required" });
  if (!teamCode) issues.push({ row: rowIndex, field: "Team", message: "Required" });

  const age = parseInt(ageStr, 10);
  if (Number.isNaN(age)) {
    issues.push({ row: rowIndex, field: "Age", message: "Invalid age" });
  }

  const lane = parseInt(laneStr, 10);
  if (Number.isNaN(lane)) {
    issues.push({ row: rowIndex, field: "Lane", message: "Invalid lane" });
  }

  let event: ParsedEvent | null = null;
  if (eventNumberStr) {
    const num = parseInt(eventNumberStr, 10);
    if (Number.isNaN(num)) {
      issues.push({ row: rowIndex, field: "Event Number", message: "Invalid event number" });
    } else {
      event = { number: num, title: eventTitleStr || eventLabel || `Event ${num}` };
    }
  } else {
    event = parseEventLabel(eventLabel);
    if (!event && eventLabel) {
      issues.push({ row: rowIndex, field: "Event", message: "Unparseable event" });
    }
  }

  const heat = parseHeatLabel(heatLabel);
  if (!heat && heatLabel) {
    issues.push({ row: rowIndex, field: "Heat", message: "Unparseable heat" });
  }

  const seed = parseSeedTime(seedTimeDisplay);

  if (issues.length > 0) {
    return { row: null, issues };
  }

  return {
    row: {
      lastName,
      firstName,
      age,
      teamCode,
      eventLabel: eventLabel || (event ? `Event ${event.number}: ${event.title}` : ""),
      heatLabel,
      lane,
      seedTimeDisplay: seed.display,
      seedTimeSeconds: seed.seconds,
      isAlternate: heat?.isAlternate ?? false,
      event: event ?? undefined,
      heat: heat ?? undefined,
    },
    issues,
  };
}

function detectDelimiter(line: string): "," | "\t" {
  const tabs = (line.match(/\t/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  return tabs > commas ? "\t" : ",";
}

function cellsToCanonicalRecord(cells: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  CANONICAL_HEADERS.forEach((h, idx) => {
    record[h] = cells[idx] ?? "";
  });
  return record;
}

export function parseMeetProgramCsv(text: string): {
  rows: SwimProgramRow[];
  issues: ParseIssue[];
  headers: string[];
  hasHeaderRow: boolean;
} {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) {
    return { rows: [], issues: [{ row: 0, message: "Empty file" }], headers: [], hasHeaderRow: true };
  }

  const delimiter = detectDelimiter(lines[0]);
  const firstCells = parseCsvLineCells(lines[0], delimiter);
  const hasHeaderRow = detectCsvHasHeaderRow(firstCells);
  const issues: ParseIssue[] = [];
  const rows: SwimProgramRow[] = [];

  if (!hasHeaderRow) {
    const dataLines = lines;
    for (let i = 0; i < dataLines.length; i++) {
      const cells = parseCsvLineCells(dataLines[i], delimiter);
      const { row, issues: rowIssues } = parseSwimProgramRow(cellsToCanonicalRecord(cells), i + 1);
      issues.push(...rowIssues);
      if (row) rows.push(row);
    }
    return { rows, issues, headers: [...CANONICAL_HEADERS], hasHeaderRow: false };
  }

  const headers = firstCells;
  const missingHeaders = CANONICAL_HEADERS.filter((h) => !headers.includes(h));

  if (missingHeaders.length > 0) {
    const { mapping } = suggestColumnMapping(headers);
    const mappedFields = Object.keys(mapping).length;
    if (mappedFields >= 5) {
      for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLineCells(lines[i], delimiter);
        const record = applyColumnMapping(headers, cells, mapping);
        const { row, issues: rowIssues } = parseSwimProgramRow(record, i + 1);
        issues.push(...rowIssues);
        if (row) rows.push(row);
      }
      return { rows, issues, headers, hasHeaderRow: true };
    }

    issues.push({
      row: 0,
      message: `Missing headers: ${missingHeaders.join(", ")}. Use column mapping for non-standard files.`,
    });
    return { rows, issues, headers, hasHeaderRow: true };
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLineCells(lines[i], delimiter);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = cells[idx] ?? "";
    });
    const { row, issues: rowIssues } = parseSwimProgramRow(record, i + 1);
    issues.push(...rowIssues);
    if (row) rows.push(row);
  }

  return { rows, issues, headers, hasHeaderRow: true };
}

export function swimmerDisplayName(row: Pick<SwimProgramRow, "firstName" | "lastName">): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

export function swimmerKey(row: Pick<SwimProgramRow, "firstName" | "lastName" | "age" | "teamCode">): string {
  return `${row.firstName}|${row.lastName}|${row.age}|${row.teamCode}`;
}
