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
  gender: string;
  ageGroup: string;
  distanceYards: number;
  stroke: string;
  label: string;
};

export type ParsedHeat = {
  heatNumber: number;
  totalHeats: number;
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

export function parseEventLabel(label: string): ParsedEvent | null {
  const trimmed = label.trim();
  const match = trimmed.match(EVENT_RE);
  if (!match) return null;
  return {
    number: parseInt(match[1], 10),
    gender: match[2],
    ageGroup: match[3].trim(),
    distanceYards: parseInt(match[4], 10),
    stroke: match[5].trim(),
    label: trimmed,
  };
}

export function parseHeatLabel(label: string): ParsedHeat | null {
  const trimmed = label.trim();
  const match = trimmed.match(HEAT_RE);
  if (!match) return null;
  return {
    heatNumber: parseInt(match[1], 10),
    totalHeats: parseInt(match[2], 10),
    isAlternate: /\(\s*alt\s*\)/i.test(trimmed),
    label: trimmed,
  };
}

export function parseSeedTime(display: string): ParsedSeedTime {
  const trimmed = display.trim();
  if (!trimmed || /^NT$/i.test(trimmed)) {
    return { display: "NT", seconds: null };
  }
  if (/^\d+:\d+(?:\.\d+)?$/.test(trimmed)) {
    const [mins, secs] = trimmed.split(":");
    const seconds = parseInt(mins, 10) * 60 + parseFloat(secs);
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

  const event = parseEventLabel(eventLabel);
  if (!event && eventLabel) {
    issues.push({ row: rowIndex, field: "Event", message: "Unparseable event" });
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
      eventLabel,
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

function parseCsvLine(line: string, delimiter: "," | "\t"): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseMeetProgramCsv(text: string): {
  rows: SwimProgramRow[];
  issues: ParseIssue[];
  headers: string[];
} {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) {
    return { rows: [], issues: [{ row: 0, message: "Empty file" }], headers: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter);
  const issues: ParseIssue[] = [];
  const rows: SwimProgramRow[] = [];

  const missingHeaders = CANONICAL_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    issues.push({
      row: 0,
      message: `Missing headers: ${missingHeaders.join(", ")}. Use column mapping for non-standard files.`,
    });
    return { rows, issues, headers };
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i], delimiter);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = cells[idx] ?? "";
    });
    const { row, issues: rowIssues } = parseSwimProgramRow(record, i + 1);
    issues.push(...rowIssues);
    if (row) rows.push(row);
  }

  return { rows, issues, headers };
}

export function swimmerDisplayName(row: Pick<SwimProgramRow, "firstName" | "lastName">): string {
  return `${row.firstName} ${row.lastName}`.trim();
}

export function swimmerKey(row: Pick<SwimProgramRow, "firstName" | "lastName" | "age" | "teamCode">): string {
  return `${row.firstName}|${row.lastName}|${row.age}|${row.teamCode}`;
}
