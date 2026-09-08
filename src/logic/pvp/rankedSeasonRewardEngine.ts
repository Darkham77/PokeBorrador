import { 
  getSeasonalThemeForMonth, 
  SEASONAL_ANNUAL_THEMES,
  type RankedTierId,
  type SeasonalThemeId
} from '@/data/system/rankedData';
import { makePokemon, recalcPokemonStats } from '@/logic/pokemon/pokemonFactory';
import type { GameState } from '@/types/system/game';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { RankedSeasonMedal } from '@/types/battle/pvp';

const BASE_RANKED_ELO = 1000 as const;
const ELO_TIER_MAESTRO = 3400 as const;
const ELO_TIER_DIAMANTE = 2700 as const;
const ELO_TIER_PLATINO = 2100 as const;
const ELO_TIER_ORO = 1600 as const;
const ELO_TIER_PLATA = 1200 as const;
const MONTHS_IN_YEAR = 12 as const;
const DEFAULT_REWARD_POKEMON_LEVEL = 50 as const;
const MAX_IVS_MAESTRO = 4 as const;
const MAX_IVS_DIAMANTE = 3 as const;
const PERFECT_IV = 31 as const;

export function calculateEloSoftReset(elo: number): number {
  const current = elo > 0 ? elo : BASE_RANKED_ELO;
  return Math.max(BASE_RANKED_ELO, Math.floor((current - BASE_RANKED_ELO) * 0.5 + BASE_RANKED_ELO));
}

export function resolveRankedTierFromElo(elo: number): RankedTierId {
  if (elo >= ELO_TIER_MAESTRO) return 'maestro';
  if (elo >= ELO_TIER_DIAMANTE) return 'diamante';
  if (elo >= ELO_TIER_PLATINO) return 'platino';
  if (elo >= ELO_TIER_ORO) return 'oro';
  if (elo >= ELO_TIER_PLATA) return 'plata';
  return 'bronce';
}

export interface SeasonResolutionResult {
  resolved: boolean;
  previousSeasonId?: SeasonalThemeId;
  previousSeasonName?: string;
  tier?: RankedTierId;
  previousElo?: number;
  newElo?: number;
  rewardPokemon?: Pokemon | null;
  medal?: RankedSeasonMedal | null;
}

export function checkAndResolveSeasonEnd(
  gameState: GameState,
  currentMonthIndex: number
): SeasonResolutionResult {
  const currentTheme = getSeasonalThemeForMonth(currentMonthIndex);

  // If uninitialized, set current season as baseline without triggering retroactive rewards
  if (!gameState.lastResolvedSeasonId) {
    gameState.lastResolvedSeasonId = currentTheme.id;
    return { resolved: false };
  }

  // If already up-to-date with current season, nothing to resolve
  if (gameState.lastResolvedSeasonId === currentTheme.id) {
    return { resolved: false };
  }

  // Find the concluded theme
  const concludedTheme = SEASONAL_ANNUAL_THEMES.find(t => t.id === gameState.lastResolvedSeasonId)
    || getSeasonalThemeForMonth(currentMonthIndex === 1 ? MONTHS_IN_YEAR : currentMonthIndex - 1);

  const finalElo = gameState.rankedMaxElo || gameState.eloRating || BASE_RANKED_ELO;
  const tier = resolveRankedTierFromElo(finalElo);

  let rewardPokemon: Pokemon | null = null;

  // Check if player qualified for reward pokemon (Diamante or Maestro)
  if ((tier === 'diamante' || tier === 'maestro') && concludedTheme.rewardPokemon?.[tier]) {
    const rewardConfig = concludedTheme.rewardPokemon[tier];
    const created = makePokemon(rewardConfig.species, rewardConfig.level || DEFAULT_REWARD_POKEMON_LEVEL);
    if (created) {
      created.isShiny = true;
      const statsList: (keyof typeof created.ivs)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
      const guaranteedCount = rewardConfig.guaranteedMaxIvs || (tier === 'maestro' ? MAX_IVS_MAESTRO : MAX_IVS_DIAMANTE);
      for (let i = 0; i < guaranteedCount && i < statsList.length; i++) {
        const statKey = statsList[i];
        if (statKey) {
          created.ivs[statKey] = PERFECT_IV;
        }
      }

      // Recalculate stats with guaranteed IVs
      recalcPokemonStats(created, true);
      created.hp = created.maxHp;

      rewardPokemon = created;
      gameState.box = [...(gameState.box || []), created];
    }
  }

  // Create commemorative medal
  const timestamp = Temporal.Now.instant();
  const medal: RankedSeasonMedal = {
    id: `medal_${concludedTheme.id}_${timestamp.epochMilliseconds}`,
    seasonName: concludedTheme.name,
    tournamentName: concludedTheme.name,
    themeId: concludedTheme.id,
    tier,
    finalElo,
    awardedAt: timestamp.toString()
  };

  // Perform soft reset
  const newElo = calculateEloSoftReset(gameState.eloRating || BASE_RANKED_ELO);
  gameState.eloRating = newElo;
  gameState.rankedMaxElo = newElo;
  gameState.rankedRewardsClaimed = [];
  gameState.lastResolvedSeasonId = currentTheme.id;

  return {
    resolved: true,
    previousSeasonId: concludedTheme.id,
    previousSeasonName: concludedTheme.name,
    tier,
    previousElo: finalElo,
    newElo,
    rewardPokemon,
    medal
  };
}
