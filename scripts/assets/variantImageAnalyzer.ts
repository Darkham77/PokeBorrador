/**
 * scripts/assets/variantImageAnalyzer.ts
 *
 * Frame cycle detection and perceptual animation analysis for sprite sheets.
 */

import sharp from 'sharp';

export interface AnimationAnalysisResult {
  pokemonId: string;
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

function findCycleCandidates(transitions: TransitionInfo[]): CandidateCycle[] {
  const transTotal = transitions.length;
  const candidates: CandidateCycle[] = [];

  for (let T = 2; T <= Math.floor(transTotal / 2); T++) {
    for (let startIdx = 0; startIdx <= transTotal - T * 2; startIdx++) {
      let isCycle = true;
      for (let i = 0; i < T; i++) {
        if (transitions[startIdx + i]!.frameId !== transitions[startIdx + i + T]!.frameId) {
          isCycle = false;
          break;
        }
      }
      if (isCycle) {
        let repeats = 2;
        while (startIdx + (repeats + 1) * T <= transTotal) {
          let match = true;
          for (let j = 0; j < T; j++) {
            if (transitions[startIdx + repeats * T + j]!.frameId !== transitions[startIdx + j]!.frameId) {
              match = false;
              break;
            }
          }
          if (match) {
            repeats++;
          } else {
            break;
          }
        }
        candidates.push({ length: T, repeats, firstOccurrenceIndex: startIdx });
      }
    }
  }

  return candidates;
}

export async function analyzeVariantImage(
  varSourcePath: string,
  pokemonId: string,
  suffix: string
): Promise<AnimationAnalysisResult> {
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
    const frameBuffer = await frameImg.raw().toBuffer();
    frames.push(frameBuffer);
  }

  const uniqueFrames: Buffer[] = [];
  const frameToUniqueId: number[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const currentFrame = frames[i]!;
    let uniqueId = uniqueFrames.findIndex(uf => areBuffersSimilar(uf, currentFrame));
    if (uniqueId === -1) {
      uniqueId = uniqueFrames.length;
      uniqueFrames.push(currentFrame);
    }
    frameToUniqueId.push(uniqueId);
  }

  const total = frameToUniqueId.length;
  const transitions: TransitionInfo[] = [];
  for (let i = 0; i < total; i++) {
    const fId = frameToUniqueId[i]!;
    if (transitions.length === 0 || transitions[transitions.length - 1]!.frameId !== fId) {
      transitions.push({ frameId: fId, originalIndices: [i] });
    } else {
      transitions[transitions.length - 1]!.originalIndices.push(i);
    }
  }

  const candidates = findCycleCandidates(transitions);

  if (candidates.length === 0) {
    let hasNonAdjacentDuplicates = false;
    for (let i = 0; i < totalFrames; i++) {
      for (let j = i + 2; j < totalFrames; j++) {
        if (areBuffersSimilar(frames[i]!, frames[j]!)) {
          hasNonAdjacentDuplicates = true;
          break;
        }
      }
      if (hasNonAdjacentDuplicates) break;
    }

    if (hasNonAdjacentDuplicates) {
      return {
        pokemonId,
        suffix,
        hasIdle: true,
        idleRange: [0, totalFrames - 1],
        attackRange: null,
        warning: `No se pudo detectar el ciclo de animación en ${varSourcePath}, pero existen frames no adyacentes duplicados. Se asume Idle completo.`
      };
    }

    return {
      pokemonId,
      suffix,
      hasIdle: true,
      idleRange: [0, totalFrames - 1],
      attackRange: null
    };
  }

  candidates.forEach(c => {
    let totalFramesInCycle = 0;
    for (let i = 0; i < c.length * c.repeats; i++) {
      const trans = transitions[c.firstOccurrenceIndex + i];
      if (trans) {
        totalFramesInCycle += trans.originalIndices.length;
      }
    }
    c.score = totalFramesInCycle;
  });

  candidates.sort((a, b) => ((b.score ?? 0) - (a.score ?? 0)) || b.repeats - a.repeats || b.length - a.length);
  const idleCandidate = candidates[0]!;

  const idleStart = 0;
  const firstCycleEndTransIdx = idleCandidate.firstOccurrenceIndex + idleCandidate.length - 1;
  const firstCycleEnd = transitions[firstCycleEndTransIdx]!.originalIndices[transitions[firstCycleEndTransIdx]!.originalIndices.length - 1]!;

  const idleFramesSet = new Set<number>();
  for (let i = 0; i < idleCandidate.length; i++) {
    idleFramesSet.add(transitions[idleCandidate.firstOccurrenceIndex + i]!.frameId);
  }

  let s = 0;
  let e = total - 1;
  while (s <= e && idleFramesSet.has(frameToUniqueId[s]!)) {
    s++;
  }
  while (e >= s && idleFramesSet.has(frameToUniqueId[e]!)) {
    e--;
  }

  let attackRange: [number, number] | null = null;
  let warning: string | undefined;

  if (e >= s) {
    const attackLength = e - s + 1;
    if (attackLength <= 2) {
      return {
        pokemonId,
        suffix,
        hasIdle: true,
        idleRange: [0, totalFrames - 1],
        attackRange: null
      };
    } else if (attackLength === 3) {
      warning = `Posible ataque falso corto de 3 frames (rango: ${s} a ${e})`;
      attackRange = [s, e];
    } else {
      attackRange = [s, e];
    }
  }

  return {
    pokemonId,
    suffix,
    hasIdle: true,
    idleRange: [idleStart, firstCycleEnd],
    attackRange,
    warning
  };
}
