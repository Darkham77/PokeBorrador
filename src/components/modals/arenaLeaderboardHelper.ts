import { resolveFactionLabel } from '@/components/modals/trainerProfileResolver';

const PODIUM_MEDALS = ['🥇', '🥈', '🥉'] as const;

export function isValidFaction(faction?: string | null): boolean {
  if (!faction) return false;
  const trimmed = faction.trim().toLowerCase();
  return trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined';
}

export function resolveCleanPlayerClass(playerClass?: string | null): string {
  if (!playerClass) return 'Entrenador';
  const trimmed = playerClass.trim().toLowerCase();
  if (trimmed === '' || trimmed === 'null') return 'Entrenador';
  return playerClass.trim();
}

export interface LeaderboardRankBadge {
  isPodium: boolean;
  emoji?: string;
  digitText?: string;
}

export function resolveLeaderboardRankBadge(index: number): LeaderboardRankBadge {
  if (index >= 0 && index < PODIUM_MEDALS.length) {
    return {
      isPodium: true,
      emoji: PODIUM_MEDALS[index]
    };
  }
  return {
    isPodium: false,
    digitText: String(index + 1)
  };
}

import type { RankingSortKey } from '@/types/system/game';

export function resolveLeaderboardScore(
  sort: RankingSortKey,
  player: { elo?: number; level?: number; badges?: number }
): string {
  if (sort === 'elo_rating') {
    return `${player.elo ?? 0} ELO`;
  }
  if (sort === 'trainer_level') {
    return `Nv. ${player.level ?? 1}`;
  }
  return `${player.badges ?? 0} Medallas`;
}

export function resolveLeaderboardFactionLabel(faction: string): string {
  const clean = faction.trim().toLowerCase();
  if (clean === 'poder') return 'PODER';
  if (clean === 'union') return 'UNIÓN';
  if (clean === 'rocket') return 'ROCKET';
  return resolveFactionLabel(faction).toUpperCase();
}
