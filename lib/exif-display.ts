export type MetadataRow = { key: string; value: string; group: string };

function fmtValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(fmtValue).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Flatten exifr output into display rows. */
export function exifToRows(data: Record<string, unknown> | null | undefined): MetadataRow[] {
  if (!data || Object.keys(data).length === 0) return [];

  const rows: MetadataRow[] = [];
  const gps = data as { latitude?: number; longitude?: number; GPSLatitude?: number; GPSLongitude?: number };

  if (typeof gps.latitude === "number" && typeof gps.longitude === "number") {
    rows.push({
      group: "GPS",
      key: "Coordinates",
      value: `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`,
    });
  }

  const groupHints: Record<string, string> = {
    Make: "Camera",
    Model: "Camera",
    ISO: "Camera",
    FNumber: "Camera",
    ExposureTime: "Camera",
    FocalLength: "Camera",
    DateTimeOriginal: "Date & time",
    CreateDate: "Date & time",
    ModifyDate: "Date & time",
    Software: "Software",
    Artist: "Software",
    Copyright: "Software",
    ImageWidth: "Image",
    ImageHeight: "Image",
    Orientation: "Image",
  };

  for (const [key, value] of Object.entries(data)) {
    if (key === "latitude" || key === "longitude") continue;
    if (value == null || typeof value === "object") continue;
    rows.push({
      group: groupHints[key] ?? "Other",
      key,
      value: fmtValue(value),
    });
  }

  return rows.sort((a, b) => a.group.localeCompare(b.group) || a.key.localeCompare(b.key));
}
