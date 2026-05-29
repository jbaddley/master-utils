import { EFF_WORDS } from "@/lib/eff-words";
import { pickRandom, randomInt } from "@/lib/random";

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";

export type PasswordMode = "random" | "memorable";

export type PasswordOptions = {
  mode: PasswordMode;
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  wordCount: number;
};

function charsetFrom(opts: PasswordOptions): string {
  let chars = "";
  if (opts.lowercase) chars += LOWER;
  if (opts.uppercase) chars += UPPER;
  if (opts.numbers) chars += DIGITS;
  if (opts.symbols) chars += SYMBOLS;
  return chars;
}

export function generateRandomPassword(opts: PasswordOptions): string {
  const chars = charsetFrom(opts);
  if (!chars) return "";
  const len = Math.max(8, Math.min(128, opts.length));
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    out.push(chars[randomInt(chars.length)]!);
  }
  return out.join("");
}

export function generateMemorablePassword(wordCount: number): string {
  const n = Math.max(4, Math.min(6, wordCount));
  const words: string[] = [];
  for (let i = 0; i < n; i++) words.push(pickRandom(EFF_WORDS));
  return words.join("-");
}

export function generatePassword(opts: PasswordOptions): string {
  if (opts.mode === "memorable") return generateMemorablePassword(opts.wordCount);
  return generateRandomPassword(opts);
}

/** Approximate bits of entropy for display. */
export function estimateEntropy(opts: PasswordOptions): number {
  if (opts.mode === "memorable") {
    const n = Math.max(4, Math.min(6, opts.wordCount));
    return Math.log2(EFF_WORDS.length) * n;
  }
  const chars = charsetFrom(opts);
  if (!chars) return 0;
  const len = Math.max(8, Math.min(128, opts.length));
  return Math.log2(chars.length) * len;
}

export function strengthLabel(bits: number): { label: string; level: "weak" | "fair" | "strong" | "excellent" } {
  if (bits < 40) return { label: "Weak", level: "weak" };
  if (bits < 60) return { label: "Fair", level: "fair" };
  if (bits < 80) return { label: "Strong", level: "strong" };
  return { label: "Excellent", level: "excellent" };
}
