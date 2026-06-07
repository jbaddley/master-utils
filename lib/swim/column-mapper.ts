export type FieldKey =
  | "lastName"
  | "firstName"
  | "age"
  | "teamCode"
  | "eventLabel"
  | "eventNumber"
  | "eventTitle"
  | "heatLabel"
  | "lane"
  | "seedTimeDisplay";

export const FIELD_ALIASES: Record<FieldKey, string[]> = {
  lastName: ["last name", "lastname", "last", "surname", "lname"],
  firstName: ["first name", "firstname", "first", "given name", "fname"],
  age: ["age", "swimmer age"],
  teamCode: ["team", "team code", "teamcode", "club", "team abbr"],
  eventLabel: ["event", "event name", "event description", "event label"],
  eventNumber: ["event number", "event #", "event no", "evt num"],
  eventTitle: ["event title", "event name only", "title"],
  heatLabel: ["heat", "heat assignment", "heat label", "heat number"],
  lane: ["lane", "lane number", "ln"],
  seedTimeDisplay: ["seed time", "seedtime", "seed", "entry time", "time"],
};

export const FIELD_TO_CANONICAL: Record<FieldKey, string> = {
  lastName: "Last Name",
  firstName: "First Name",
  age: "Age",
  teamCode: "Team",
  eventLabel: "Event",
  eventNumber: "Event Number",
  eventTitle: "Event Title",
  heatLabel: "Heat",
  lane: "Lane",
  seedTimeDisplay: "Seed Time",
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export type ColumnMapping = Partial<Record<FieldKey, string>>;

export function suggestColumnMapping(headers: string[]): {
  mapping: ColumnMapping;
  unmapped: string[];
  scores: { header: string; field: FieldKey; score: number }[];
} {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  const scores: { header: string; field: FieldKey; score: number }[] = [];

  for (const header of headers) {
    const norm = normalizeHeader(header);
    let bestField: FieldKey | null = null;
    let bestScore = 0;

    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [FieldKey, string[]][]) {
      for (const alias of aliases) {
        const aliasNorm = normalizeHeader(alias);
        let score = 0;
        if (norm === aliasNorm) score = 100;
        else if (norm.includes(aliasNorm) || aliasNorm.includes(norm)) score = 70;
        else if (norm.replace(/\s/g, "") === aliasNorm.replace(/\s/g, "")) score = 85;
        if (score > bestScore) {
          bestScore = score;
          bestField = field;
        }
      }
    }

    if (bestField && bestScore >= 70) {
      scores.push({ header, field: bestField, score: bestScore });
    }
  }

  scores.sort((a, b) => b.score - a.score);
  for (const { header, field } of scores) {
    if (mapping[field] || used.has(header)) continue;
    mapping[field] = header;
    used.add(header);
  }

  const unmapped = headers.filter((h) => !used.has(h));
  return { mapping, unmapped, scores };
}

export function applyColumnMapping(
  headers: string[],
  cells: string[],
  mapping: ColumnMapping,
): Record<string, string> {
  const record: Record<string, string> = {};
  const headerIndex = Object.fromEntries(headers.map((h, i) => [h, i]));

  for (const [field, sourceHeader] of Object.entries(mapping) as [FieldKey, string][]) {
    if (!sourceHeader) continue;
    const idx = headerIndex[sourceHeader];
    const canonical = FIELD_TO_CANONICAL[field];
    record[canonical] = idx !== undefined ? (cells[idx] ?? "") : "";
  }

  return record;
}

/** True when the first row looks like column headers rather than swimmer data. */
export function detectCsvHasHeaderRow(cells: string[]): boolean {
  if (cells.length === 0) return true;

  const trimmed = cells.map((c) => c.trim()).filter(Boolean);
  if (trimmed.length === 0) return true;

  // Swim program data rows contain these patterns; header rows do not.
  if (trimmed.some((c) => /^Event\s+\d+\s+(Girls|Boys)/i.test(c))) return false;
  if (trimmed.some((c) => /^Heat\s+\d+\s+of\s+\d+/i.test(c))) return false;

  let headerLike = 0;
  for (const cell of trimmed) {
    const norm = normalizeHeader(cell);
    if (!norm) continue;
    const matchesAlias = (Object.values(FIELD_ALIASES) as string[][]).some((aliases) =>
      aliases.some((a) => normalizeHeader(a) === norm),
    );
    const matchesCanonical = Object.values(FIELD_TO_CANONICAL).some((h) => normalizeHeader(h) === norm);
    if (matchesAlias || matchesCanonical) headerLike++;
  }
  if (headerLike >= 3) return true;

  // Canonical column order without a header row: age and lane are numeric at fixed positions.
  if (trimmed.length >= 8) {
    const ageMaybe = trimmed[2];
    const laneMaybe = trimmed[6];
    if (ageMaybe && /^\d{1,2}$/.test(ageMaybe) && laneMaybe && /^\d{1,2}$/.test(laneMaybe)) {
      return false;
    }
  }

  const { mapping } = suggestColumnMapping(trimmed);
  if (Object.keys(mapping).length >= 5) return true;

  return true;
}

export function parseCsvLineCells(line: string, delimiter: "," | "\t"): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += ch;
  }
  result.push(current.trim());
  return result;
}

function detectDelimiter(line: string): "," | "\t" {
  const tabs = (line.match(/\t/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  return tabs > commas ? "\t" : ",";
}

export function parseCsvHeadersAndRows(text: string): {
  headers: string[];
  rows: string[][];
  hasHeaderRow: boolean;
} {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [], hasHeaderRow: true };

  const delimiter = detectDelimiter(lines[0]);
  const parseLine = (line: string) => parseCsvLineCells(line, delimiter);

  const firstCells = parseLine(lines[0]);
  const hasHeaderRow = detectCsvHasHeaderRow(firstCells);

  if (hasHeaderRow) {
    return { headers: firstCells, rows: lines.slice(1).map(parseLine), hasHeaderRow: true };
  }

  return {
    headers: Object.values(FIELD_TO_CANONICAL),
    rows: lines.map(parseLine),
    hasHeaderRow: false,
  };
}
