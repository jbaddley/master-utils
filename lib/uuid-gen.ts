import { randomBytes } from "@/lib/random";

function hex(bytes: Uint8Array, start: number, end: number): string {
  return Array.from(bytes.subarray(start, end))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type UuidVersion = "v4" | "v1" | "v5";
export type UuidFormat = "standard" | "uppercase" | "nohyphens" | "braces";

export function formatUuid(raw: string, format: UuidFormat): string {
  switch (format) {
    case "uppercase":
      return raw.toUpperCase();
    case "nohyphens":
      return raw.replace(/-/g, "");
    case "braces":
      return `{${raw}}`;
    default:
      return raw;
  }
}

export function uuidV4(): string {
  const b = randomBytes(16);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  return `${hex(b, 0, 4)}-${hex(b, 4, 6)}-${hex(b, 6, 8)}-${hex(b, 8, 10)}-${hex(b, 10, 16)}`;
}

let lastV1Ms = 0;
let v1ClockSeq = randomBytes(2);

export function uuidV1(): string {
  let ms = Date.now();
  if (ms <= lastV1Ms) ms = lastV1Ms + 1;
  lastV1Ms = ms;

  const time = ms * 10000 + 0x01b21dd213814000;
  const timeLow = (time & 0xffffffff) >>> 0;
  const timeMid = ((time >> 32) & 0xffff) >>> 0;
  const timeHi = (((time >> 48) & 0x0fff) | 0x1000) >>> 0;

  const clock = ((v1ClockSeq[0]! << 8) | v1ClockSeq[1]!) & 0x3fff;
  const node = randomBytes(6);
  node[0] = (node[0]! | 0x01) & 0xff;

  const tl = timeLow.toString(16).padStart(8, "0");
  const tm = timeMid.toString(16).padStart(4, "0");
  const th = timeHi.toString(16).padStart(4, "0");
  const cs = (0x8000 | clock).toString(16).padStart(4, "0");
  const nd = hex(node, 0, 6);

  return `${tl.slice(0, 8)}-${tl.slice(8)}-${tm}-${th}-${cs}${nd}`;
}

const NS_DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const NS_URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

function parseUuidBytes(uuid: string): Uint8Array {
  const hexStr = uuid.replace(/-/g, "");
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    out[i] = Number.parseInt(hexStr.slice(i * 2, i * 2 + 2), 16);
  }
  // Per RFC, reorder namespace bytes for v5 input
  const reordered = new Uint8Array([
    out[3]!, out[2]!, out[1]!, out[0]!,
    out[5]!, out[4]!,
    out[7]!, out[6]!,
    out[8]!, out[9]!, out[10]!, out[11]!, out[12]!, out[13]!, out[14]!, out[15]!,
  ]);
  return reordered;
}

async function sha1(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-1", data.buffer as ArrayBuffer);
  return new Uint8Array(hash);
}

export async function uuidV5(name: string, namespace: "dns" | "url" = "dns"): Promise<string> {
  const ns = parseUuidBytes(namespace === "url" ? NS_URL : NS_DNS);
  const nameBytes = new TextEncoder().encode(name);
  const combined = new Uint8Array(ns.length + nameBytes.length);
  combined.set(ns);
  combined.set(nameBytes, ns.length);
  const hash = await sha1(combined);
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  return `${hex(hash, 0, 4)}-${hex(hash, 4, 6)}-${hex(hash, 6, 8)}-${hex(hash, 8, 10)}-${hex(hash, 10, 16)}`;
}

export async function generateUuid(
  version: UuidVersion,
  opts?: { v5Name?: string; v5Namespace?: "dns" | "url" },
): Promise<string> {
  if (version === "v4") return uuidV4();
  if (version === "v1") return uuidV1();
  return uuidV5(opts?.v5Name?.trim() || "example.com", opts?.v5Namespace ?? "dns");
}
