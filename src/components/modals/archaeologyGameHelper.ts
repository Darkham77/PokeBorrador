/**
 * src/components/modals/archaeologyGameHelper.ts
 *
 * Pure domain generation and calculation helpers for the Archaeology minigame.
 */

import type { MinigameDifficulty } from '@/types/battle/battle';

export const ARCHAEOLOGY_DIFFICULTIES: Record<MinigameDifficulty, { grid: number; energy: number; parts: number; label: string; items: number; color: string }> = {
  easy: { grid: 5, energy: 12, parts: 3, label: 'Fácil', items: 1, color: '#4ade80' },
  medium: { grid: 6, energy: 10, parts: 4, label: 'Medio', items: 2, color: '#facc15' },
  hard: { grid: 7, energy: 8, parts: 5, label: 'Difícil', items: 3, color: '#fb923c' },
  expert: { grid: 8, energy: 6, parts: 6, label: 'Experto', items: 4, color: '#f87171' }
} as const;

export interface ArchaeologyTile {
  r: number;
  c: number;
  isFossil: boolean;
  isDug: boolean;
  clue: 'HOT' | 'COLD' | '';
}

const ARCHAEOLOGY_RARE_DIFFICULTY_EASY_PCT = 10;
const ARCHAEOLOGY_RARE_DIFFICULTY_MEDIUM_PCT = 35;
const ARCHAEOLOGY_RARE_DIFFICULTY_HARD_PCT = 75;

const ARCHAEOLOGY_NORMAL_DIFFICULTY_EASY_PCT = 40;
const ARCHAEOLOGY_NORMAL_DIFFICULTY_MEDIUM_PCT = 70;
const ARCHAEOLOGY_NORMAL_DIFFICULTY_HARD_PCT = 90;

const MANHATTAN_MAX_INITIAL_DISTANCE = 999;

export function calculateArchaeologyDifficulty(
  rarity: number,
  randRoll: number = Math.random() * 100
): MinigameDifficulty {
  const isRare = (rarity || 50) < 15;

  if (isRare) {
    if (randRoll < ARCHAEOLOGY_RARE_DIFFICULTY_EASY_PCT) return 'easy';
    if (randRoll < ARCHAEOLOGY_RARE_DIFFICULTY_MEDIUM_PCT) return 'medium';
    if (randRoll < ARCHAEOLOGY_RARE_DIFFICULTY_HARD_PCT) return 'hard';
    return 'expert';
  }

  if (randRoll < ARCHAEOLOGY_NORMAL_DIFFICULTY_EASY_PCT) return 'easy';
  if (randRoll < ARCHAEOLOGY_NORMAL_DIFFICULTY_MEDIUM_PCT) return 'medium';
  if (randRoll < ARCHAEOLOGY_NORMAL_DIFFICULTY_HARD_PCT) return 'hard';
  return 'expert';
}

const DIRECTIONS = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 }
] as const;

export function generateArchaeologyGrid(gridSize: number, totalFossilParts: number): ArchaeologyTile[] {
  const tempGrid: ArchaeologyTile[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      tempGrid.push({
        r,
        c,
        isFossil: false,
        isDug: false,
        clue: ''
      });
    }
  }

  const fossilCoords = new Set<string>();
  let currentR = Math.floor(Math.random() * gridSize);
  let currentC = Math.floor(Math.random() * gridSize);
  fossilCoords.add(`${currentR},${currentC}`);

  while (fossilCoords.size < totalFossilParts) {
    const activeList = Array.from(fossilCoords).map(str => {
      const parts = str.split(',');
      const r = Number(parts[0] ?? 0);
      const c = Number(parts[1] ?? 0);
      return { r, c };
    });

    const candidates: { r: number; c: number }[] = [];
    for (const cell of activeList) {
      for (const dir of DIRECTIONS) {
        const nr = cell.r + dir.r;
        const nc = cell.c + dir.c;
        if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize) {
          const key = `${nr},${nc}`;
          if (!fossilCoords.has(key)) {
            candidates.push({ r: nr, c: nc });
          }
        }
      }
    }

    if (candidates.length === 0) {
      fossilCoords.clear();
      currentR = Math.floor(Math.random() * gridSize);
      currentC = Math.floor(Math.random() * gridSize);
      fossilCoords.add(`${currentR},${currentC}`);
      continue;
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)]!;
    fossilCoords.add(`${chosen.r},${chosen.c}`);
  }

  for (const tile of tempGrid) {
    if (fossilCoords.has(`${tile.r},${tile.c}`)) {
      tile.isFossil = true;
    }
  }

  return tempGrid;
}

export function getDistanceToNearestFossil(grid: readonly ArchaeologyTile[], r: number, c: number): number {
  let minDistance = MANHATTAN_MAX_INITIAL_DISTANCE;
  for (const tile of grid) {
    if (tile.isFossil && !tile.isDug) {
      const dist = Math.abs(tile.r - r) + Math.abs(tile.c - c);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
  }
  return minDistance;
}
