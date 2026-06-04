import { NOTE_NAMES } from "@/lib/audio-utils";

export type DetectedKey = {
  root: (typeof NOTE_NAMES)[number];
  mode: "major" | "minor";
  label: string;
  confidence: number;
};

const MAJOR_PROFILE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];
const MINOR_PROFILE = [
  6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
];

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await ctx.close();
  }
}

export function computeWaveformPeaks(
  buffer: AudioBuffer,
  width: number
): Float32Array {
  const channel = buffer.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(channel.length / width));
  const peaks = new Float32Array(width);

  for (let i = 0; i < width; i++) {
    let max = 0;
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channel.length);
    for (let j = start; j < end; j++) {
      const v = Math.abs(channel[j] ?? 0);
      if (v > max) max = v;
    }
    peaks[i] = max;
  }

  return peaks;
}

function getMonoSamples(buffer: AudioBuffer, maxSamples = 220_500): Float32Array {
  const length = Math.min(buffer.length, maxSamples);
  const out = new Float32Array(length);
  const channels = buffer.numberOfChannels;

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) {
      sum += buffer.getChannelData(c)[i] ?? 0;
    }
    out[i] = sum / channels;
  }

  return out;
}

function lowPassEnvelope(samples: Float32Array, windowSize: number): Float32Array {
  const env = new Float32Array(samples.length);
  let acc = 0;

  for (let i = 0; i < samples.length; i++) {
    acc += Math.abs(samples[i] ?? 0);
    if (i >= windowSize) acc -= Math.abs(samples[i - windowSize] ?? 0);
    env[i] = acc / windowSize;
  }

  return env;
}

function autocorrelate(signal: Float32Array, minLag: number, maxLag: number): number {
  let bestLag = minLag;
  let bestScore = -Infinity;
  const len = Math.min(signal.length, 60_000);

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < len - lag; i++) {
      sum += (signal[i] ?? 0) * (signal[i + lag] ?? 0);
    }
    if (sum > bestScore) {
      bestScore = sum;
      bestLag = lag;
    }
  }

  return bestLag;
}

/** Estimate tempo from an audio buffer (returns 0 when uncertain). */
export function detectBpm(buffer: AudioBuffer): number {
  const sampleRate = buffer.sampleRate;
  const samples = getMonoSamples(buffer);
  const env = lowPassEnvelope(samples, Math.floor(sampleRate * 0.04));

  const minLag = Math.floor(sampleRate * (60 / 200));
  const maxLag = Math.floor(sampleRate * (60 / 60));
  if (maxLag <= minLag) return 0;

  const lag = autocorrelate(env, minLag, maxLag);
  const bpm = (60 * sampleRate) / lag;

  if (!Number.isFinite(bpm) || bpm < 60 || bpm > 200) return 0;
  return Math.round(bpm);
}

function computeChroma(buffer: AudioBuffer): Float32Array {
  const samples = getMonoSamples(buffer, 110_250);
  const sampleRate = buffer.sampleRate;
  const fftSize = 4096;
  const chroma = new Float32Array(12);
  const step = Math.floor(fftSize / 2);
  const segmentCount = Math.max(
    1,
    Math.floor((samples.length - fftSize) / step)
  );

  for (let seg = 0; seg < segmentCount; seg++) {
    const offset = seg * step;
    for (let note = 0; note < 12; note++) {
      let energy = 0;
      for (let octave = 2; octave <= 6; octave++) {
        const freq = 440 * Math.pow(2, (note - 9 + octave * 12) / 12);
        if (freq < 80 || freq > sampleRate / 2) continue;
        let sum = 0;
        for (let i = 0; i < fftSize; i++) {
          const t = (offset + i) / sampleRate;
          sum += (samples[offset + i] ?? 0) * Math.sin(2 * Math.PI * freq * t);
        }
        energy += Math.abs(sum);
      }
      chroma[note] = (chroma[note] ?? 0) + energy;
    }
  }

  const total = chroma.reduce((a, b) => a + b, 0) || 1;
  for (let i = 0; i < 12; i++) chroma[i] = (chroma[i] ?? 0) / total;
  return chroma;
}

function correlateProfile(chroma: Float32Array, profile: number[]): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += (chroma[i] ?? 0) * (profile[i] ?? 0);
  }
  return sum;
}

/** Estimate musical key using a chroma profile match. */
export function detectKey(buffer: AudioBuffer): DetectedKey | null {
  const chroma = computeChroma(buffer);
  let bestRoot = 0;
  let bestMode: "major" | "minor" = "major";
  let bestScore = -Infinity;

  for (let root = 0; root < 12; root++) {
    const rotated = new Float32Array(12);
    for (let i = 0; i < 12; i++) {
      rotated[i] = chroma[(i - root + 12) % 12] ?? 0;
    }

    const majorScore = correlateProfile(rotated, MAJOR_PROFILE);
    if (majorScore > bestScore) {
      bestScore = majorScore;
      bestRoot = root;
      bestMode = "major";
    }

    const minorScore = correlateProfile(rotated, MINOR_PROFILE);
    if (minorScore > bestScore) {
      bestScore = minorScore;
      bestRoot = root;
      bestMode = "minor";
    }
  }

  const root = NOTE_NAMES[bestRoot];
  if (!root) return null;

  return {
    root,
    mode: bestMode,
    label: `${root} ${bestMode}`,
    confidence: bestScore,
  };
}

export type AudioAnalysis = {
  bpm: number;
  key: DetectedKey | null;
  duration: number;
  peaks: Float32Array;
};

export async function analyzeAudioFile(
  file: File,
  peakWidth = 800
): Promise<AudioAnalysis> {
  const buffer = await decodeAudioFile(file);
  return {
    bpm: detectBpm(buffer),
    key: detectKey(buffer),
    duration: buffer.duration,
    peaks: computeWaveformPeaks(buffer, peakWidth),
  };
}
