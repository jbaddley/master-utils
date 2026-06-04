export const ACCEPTED_AUDIO_INPUTS = [
  "mp3",
  "wav",
  "ogg",
  "m4a",
  "flac",
  "aac",
] as const;

export const ACCEPTED_AUDIO_ATTR = ACCEPTED_AUDIO_INPUTS.map((e) => `.${e}`).join(
  ","
);

export type AudioOutputFmt = "mp3" | "wav" | "ogg" | "m4a" | "flac" | "aac";

export const AUDIO_FMT_MIME: Record<AudioOutputFmt, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  flac: "audio/flac",
  aac: "audio/aac",
};

export const AUDIO_FMT_EXT: Record<AudioOutputFmt, string> = {
  mp3: "mp3",
  wav: "wav",
  ogg: "ogg",
  m4a: "m4a",
  flac: "flac",
  aac: "m4a",
};

export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

export function extOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "mp3";
}

export function buildAtempoFilter(speed: number): string {
  if (speed <= 0) return "atempo=1.0";
  if (speed > 2.0) {
    return `atempo=2.0,atempo=${(speed / 2).toFixed(4)}`;
  }
  if (speed < 0.5) {
    return `atempo=0.5,atempo=${(speed / 0.5).toFixed(4)}`;
  }
  return `atempo=${speed.toFixed(4)}`;
}

/** Independent pitch (semitones) and speed multiplier via ffmpeg filter chain. */
export function buildPitchSpeedFilter(semitones: number, speed: number): string | null {
  const pitchRate = Math.pow(2, semitones / 12);
  const tempoComp = speed / pitchRate;
  const parts: string[] = [];

  if (Math.abs(semitones) > 0.001) {
    parts.push(`asetrate=44100*${pitchRate.toFixed(6)},aresample=44100`);
  }
  if (Math.abs(tempoComp - 1) > 0.001) {
    parts.push(buildAtempoFilter(tempoComp));
  }

  return parts.length > 0 ? parts.join(",") : null;
}

export function transposeKeyLabel(
  root: string,
  mode: "major" | "minor",
  semitones: number
): string {
  const idx = NOTE_NAMES.indexOf(root as (typeof NOTE_NAMES)[number]);
  if (idx < 0) return `${root} ${mode}`;
  const next =
    NOTE_NAMES[(((idx + Math.round(semitones)) % 12) + 12) % 12] ?? root;
  return `${next} ${mode}`;
}

export function adjustedBpm(baseBpm: number, speed: number): number {
  return Math.round(baseBpm * speed);
}

export function buildEncodeArgs(
  inputName: string,
  outputFmt: AudioOutputFmt,
  filter: string | null
): string[] {
  const outputName = `output.${AUDIO_FMT_EXT[outputFmt]}`;
  const base = ["-i", inputName];
  if (filter) base.push("-af", filter);

  switch (outputFmt) {
    case "mp3":
      return [...base, "-q:a", "0", outputName];
    case "aac":
      return [...base, "-c:a", "aac", "-q:a", "1", outputName];
    case "ogg":
      return [...base, "-c:a", "libvorbis", outputName];
    case "flac":
      return [...base, "-c:a", "flac", outputName];
    default:
      return [...base, outputName];
  }
}
