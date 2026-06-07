/** Format a UTC instant for display in the user's local timezone. */
export function formatMeetDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Value for `<input type="datetime-local">` or DateTimePicker (local wall time, no timezone). */
export function toDatetimeLocalValue(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse a datetime-local string as local wall time. */
export function parseDatetimeLocalValue(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Convert datetime-local input to UTC ISO for API storage. */
export function datetimeLocalToUtcIso(localValue: string): string {
  const date = parseDatetimeLocalValue(localValue);
  if (!date) return localValue;
  return date.toISOString();
}
