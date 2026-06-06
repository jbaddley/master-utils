import type { CanonicalHeader } from "./parse-meet-program";

export type FieldKey =
  | "lastName"
  | "firstName"
  | "age"
  | "teamCode"
  | "eventLabel"
  | "heatLabel"
  | "lane"
  | "seedTimeDisplay";

export const FIELD_ALIASES: Record<FieldKey, string[]> = {
  lastName: ["last name", "lastname", "last", "surname", "lname"],
  firstName: ["first name", "firstname", "first", "given name", "fname"],
  age: ["age", "swimmer age"],
  teamCode: ["team", "team code", "teamcode", "club", "team abbr"],
  eventLabel: ["event", "event name", "event description", "event label"],
  heatLabel: ["heat", "heat assignment", "heat label"],
  lane: ["lane", "lane number", "ln"],
  seedTimeDisplay: ["seed time", "seedtime", "seed", "entry time", "time"],
};

export const FIELD_TO_CANONICAL: Record<FieldKey, CanonicalHeader> = {
  lastName: "Last Name",
  firstName: "First Name",
  age: "Age",
  teamCode: "Team",
  eventLabel: "Event",
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

export function parseCsvHeadersAndRows(text: string): { headers: string[]; rows: string[][] } {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = (() => {
    const tabs = (lines[0].match(/\t/g) ?? []).length;
    const commas = (lines[0].match(/,/g) ?? []).length;
    return tabs > commas ? "\t" : ",";
  })();

  const parseLine = (line: string): string[] => {
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
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}
