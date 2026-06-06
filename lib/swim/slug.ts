export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "org";
}

export function generateMeetSlug(orgSlug: string, startsAt: Date, name: string): string {
  const date = startsAt.toISOString().slice(0, 10);
  const namePart = slugify(name).slice(0, 30);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${orgSlug}-${date}-${namePart}-${suffix}`;
}

export function generateInviteToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
