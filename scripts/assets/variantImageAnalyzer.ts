/**
 * scripts/assets/variantImageAnalyzer.ts
 *
 * Frame cycle detection and perceptual animation analysis for sprite sheets.
 */

import sharp from 'sharp';

export interface AnimationAnalysisResult {
  pokemonSlug: string;
  suffix: string;
  hasIdle: boolean;
  idleRange: [number, number];
  attackRange: [number, number] | null;
  warning?: string;
}

export const DEFAULT_MAX_DIFF_PER_PIXEL = 12;
export const DEFAULT_MAX_MISMATCHED_PIXELS_RATIO = 0.04;

export function areBuffersSimilar(
  buf1: Buffer,
  buf2: Buffer,
  maxDiffPerPixel = DEFAULT_MAX_DIFF_PER_PIXEL,
  maxMismatchedPixelsPercent = DEFAULT_MAX_MISMATCHED_PIXELS_RATIO
): boolean {
  if (buf1.length !== buf2.length) return false;
  let mismatches = 0;
  const numPixels = buf1.length / 4;
  const maxAllowedMismatches = numPixels * maxMismatchedPixelsPercent;

  for (let i = 0; i < buf1.length; i += 4) {
    const dr = Math.abs(buf1[i]! - buf2[i]!);
    const dg = Math.abs(buf1[i + 1]! - buf2[i + 1]!);
    const db = Math.abs(buf1[i + 2]! - buf2[i + 2]!);
    const da = Math.abs(buf1[i + 3]! - buf2[i + 3]!);

    if (dr > maxDiffPerPixel || dg > maxDiffPerPixel || db > maxDiffPerPixel || da > maxDiffPerPixel) {
      mismatches++;
      if (mismatches > maxAllowedMismatches) {
        return false;
      }
    }
  }
  return true;
}

interface TransitionInfo {
  frameId: number;
  originalIndices: number[];
}

interface CandidateCycle {
  length: number;
  repeats: number;
  firstOccurrenceIndex: number;
  score?: number;
}

function matchesSegment(transitions: readonly TransitionInfo[], startA: number, startB: number, length: number): boolean {
  for (let i = 0; i < length; i++) {
    if (transitions[startA + i]!.frameId !== transitions[startB + i]!.frameId) {
      return false;
    }
  }
  return true;
}

function countCycleRepeats(transitions: readonly TransitionInfo[], startIdx: number, period: number, total: number): number {
  let repeats = 2;
  while (startIdx + (repeats + 1) * period <= total) {
    if (!matchesSegment(transitions, startIdx, startIdx + repeats * period, period)) {
      break;
    }
    repeats++;
  }
  return repeats;
}

function findCycleCandidates(transitions: TransitionInfo[]): CandidateCycle[] {
  const transTotal = transitions.length;
  const candidates: CandidateCycle[] = [];

  for (let period = 2; period <= Math.floor(transTotal / 2); period++) {
    for (let startIdx = 0; startIdx <= transTotal - period * 2; startIdx++) {
      if (matchesSegment(transitions, startIdx, startIdx + period, period)) {
        const repeats = countCycleRepeats(transitions, startIdx, period, transTotal);
        candidates.push({ length: period, repeats, firstOccurrenceIndex: startIdx });
      }
    }
  }

  return candidates;
}

async function extractFramesFromSpritesheet(varSourcePath: string): Promise<Buffer[]> {
  const image = sharp(varSourcePath);
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  if (width === 0 || height === 0) {
    throw new Error(`Dimensiones inválidas para ${varSourcePath}`);
  }

  const size = height;
  const totalFrames = Math.floor(width / size);
  const frames: Buffer[] = [];
  for (let i = 0; i < totalFrames; i++) {
    const frameImg = image.clone().extract({ left: i * size, top: 0, width: size, height: size });
    frames.push(await frameImg.raw().toBuffer());
  }
  return frames;
}

function computeFrameTransitions(frames: Buffer[]): { frameToUniqueId: number[]; transitions: TransitionInfo[] } {
  const uniqueFrames: Buffer[] = [];
  const frameToUniqueId: number[] = [];

  for (const currentFrame of frames) {
    let uniqueId = uniqueFrames.findIndex(uf => areBuffersSimilar(uf, currentFrame));
    if (uniqueId === -1) {
      uniqueId = uniqueFrames.length;
      uniqueFrames.push(currentFrame);
    }
    frameToUniqueId.push(uniqueId);
  }

  const transitions: TransitionInfo[] = [];
  for (let i = 0; i < frameToUniqueId.length; i++) {
    const fId = frameToUniqueId[i]!;
    if (transitions.length === 0 || transitions[transitions.length - 1]!.frameId !== fId) {
      transitions.push({ frameId: fId, originalIndices: [i] });
    } else {
      transitions[transitions.length - 1]!.originalIndices.push(i);
    }
  }

  return { frameToUniqueId, transitions };
}

function checkNonAdjacentDuplicates(frames: Buffer[]): boolean {
  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 2; j < frames.length; j++) {
      if (areBuffersSimilar(frames[i]!, frames[j]!)) {
        return true;
      }
    }
  }
  return false;
}

function resolveCandidateAttackRange(
  candidate: CandidateCycle,
  transitions: TransitionInfo[],
  frameToUniqueId: number[]
): { firstCycleEnd: number; attackRange: [number, number] | null; warning?: string; fallbackFullIdle?: boolean } {
  const firstCycleEndTransIdx = candidate.firstOccurrenceIndex + candidate.length - 1;
  const firstCycleEnd = transitions[firstCycleEndTransIdx]!.originalIndices[transitions[firstCycleEndTransIdx]!.originalIndices.length - 1]!;

  const idleFramesSet = new Set<number>();
  for (let i = 0; i < candidate.length; i++) {
    idleFramesSet.add(transitions[candidate.firstOccurrenceIndex + i]!.frameId);
  }

  let s = 0;
  let e = frameToUniqueId.length - 1;
  while (s <= e && idleFramesSet.has(frameToUniqueId[s]!)) s++;
  while (e >= s && idleFramesSet.has(frameToUniqueId[e]!)) e--;

  if (e < s) {
    return { firstCycleEnd, attackRange: null };
  }

  const attackLength = e - s + 1;
  if (attackLength <= 2) {
    return { firstCycleEnd, attackRange: null, fallbackFullIdle: true };
  }
  if (attackLength === 3) {
    return { firstCycleEnd, attackRange: [s, e], warning: `Posible ataque falso corto de 3 frames (rango: ${s} a ${e})` };
  }
  return { firstCycleEnd, attackRange: [s, e] };
}

export async function analyzeVariantImage(
  varSourcePath: string,
  pokemonSlug: string,
  suffix: string
): Promise<AnimationAnalysisResult> {
  const frames = await extractFramesFromSpritesheet(varSourcePath);
  const totalFrames = frames.length;
  const { frameToUniqueId, transitions } = computeFrameTransitions(frames);
  const candidates = findCycleCandidates(transitions);

  if (candidates.length === 0) {
    const hasDupes = checkNonAdjacentDuplicates(frames);
    return {
      pokemonSlug,
      suffix,
      hasIdle: true,
      idleRange: [0, totalFrames - 1],
      attackRange: null,
      ...(hasDupes ? { warning: `No se pudo detectar el ciclo de animación en ${varSourcePath}, pero existen frames no adyacentes duplicados. Se asume Idle completo.` } : {})
    };
  }

  for (const c of candidates) {
    let totalFramesInCycle = 0;
    for (let i = 0; i < c.length * c.repeats; i++) {
      const trans = transitions[c.firstOccurrenceIndex + i];
      if (trans) totalFramesInCycle += trans.originalIndices.length;
    }
    c.score = totalFramesInCycle;
  }

  candidates.sort((a, b) => ((b.score ?? 0) - (a.score ?? 0)) || b.repeats - a.repeats || b.length - a.length);
  const idleCandidate = candidates[0]!;

  const { firstCycleEnd, attackRange, warning, fallbackFullIdle } = resolveCandidateAttackRange(idleCandidate, transitions, frameToUniqueId);

  if (fallbackFullIdle) {
    return {
      pokemonSlug,
      suffix,
      hasIdle: true,
      idleRange: [0, totalFrames - 1],
      attackRange: null
    };
  }

  return {
    pokemonSlug,
    suffix,
    hasIdle: true,
    idleRange: [0, firstCycleEnd],
    attackRange,
    warning
  };
}
