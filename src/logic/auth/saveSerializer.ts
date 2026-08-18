/**
 * src/logic/auth/saveSerializer.ts
 *
 * Pure serialization logic for GameState into persistent SaveDataDto.
 * Zero UI / Pinia dependencies.
 */

import type { Pokemon, PokemonEgg, PokemonGender, PokemonIVs } from '@/types/pokemon/pokemon';
import type { GameState } from '@/types/system/game';
import type { SaveDataDto } from '@/logic/validation/schemas';
import { requireAbilityId } from '@/data/battle/abilities';
import { logger } from '@/logic/utils/logger';
import type { GenderName } from '@pkmn/sim';

const DEFAULT_POKEMON_FRIENDSHIP_FALLBACK = 70;

interface EnemyPokemonSerialized {
  uid: string;
  id: string;
  name: string;
  emoji?: string;
  type: string;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  moves: unknown[];
  status: string | null;
  isShiny: boolean;
  gender: string | null;
  ivs: PokemonIVs;
  nature: string;
  ability: string;
  exp: number;
  expNeeded: number;
  friendship: number;
  _revealed: boolean;
  _gymLeader: string | null;
  _gymBadge: string | null;
}

interface ActiveBattleSerialized {
  isGym: boolean;
  gymId: string | null;
  isTrainer: boolean;
  trainerName: string | null;
  locationId: string | null;
  enemyTeam: EnemyPokemonSerialized[] | null;
  timestamp: number;
  isPvP?: boolean;
}

type PersistedPokemon = Omit<Pokemon, 'gender'> & { gender: GenderName };
type PersistedPokemonEgg = Omit<PokemonEgg, 'gender'> & { gender: GenderName };

function toPersistedPokemonGender(gender: PokemonGender | undefined): GenderName {
  if (gender === 'm') return 'M';
  if (gender === 'f') return 'F';
  return 'N';
}

function withPersistedPokemonGender(pokemon: Pokemon): PersistedPokemon {
  return {
    ...pokemon,
    gender: toPersistedPokemonGender(pokemon.gender),
  };
}

function withPersistedEggGender(egg: PokemonEgg): PersistedPokemonEgg {
  return {
    ...egg,
    gender: toPersistedPokemonGender(egg.gender),
  };
}

function serializeActiveBattleGenderCodes(activeBattle: unknown): unknown {
  if (!activeBattle || typeof activeBattle !== 'object') return activeBattle;
  const battle = activeBattle as ActiveBattleSerialized;
  if (!battle.enemyTeam) return activeBattle;
  return {
    ...battle,
    enemyTeam: battle.enemyTeam.map(enemy => ({
      ...enemy,
      gender: toPersistedPokemonGender(enemy.gender === 'm' || enemy.gender === 'f' ? enemy.gender : null),
    })),
  };
}

export function serializeSaveGenderCodes(data: SaveDataDto): unknown {
  return {
    ...data,
    team: data.team.map((p) => withPersistedPokemonGender(p as Pokemon)),
    box: data.box.map((p) => (p ? withPersistedPokemonGender(p as Pokemon) : null)),
    eggs: (data.eggs || []).map(egg => {
      if (!egg || typeof egg !== 'object' || !('gender' in egg)) return egg;
      return withPersistedEggGender(egg as PokemonEgg);
    }),
    activeBattle: serializeActiveBattleGenderCodes(data.activeBattle),
  };
}

export function normalizeRuntimePokemonGender(pokemon: { gender?: string | null }): void {
  if (Object.is(pokemon.gender, 'M')) pokemon.gender = 'm';
  if (Object.is(pokemon.gender, 'F')) pokemon.gender = 'f';
  if (Object.is(pokemon.gender, 'N')) pokemon.gender = null;
}

export function serializeState(state: GameState): SaveDataDto {
  let activeBattle: ActiveBattleSerialized | null = null;
  const battle = state.activeBattle;

  if (battle && !battle.over && (battle.isTrainer || battle.isGym)) {
    try {
      const serialized: ActiveBattleSerialized = {
        isGym: battle.isGym || false,
        gymId: battle.gymId || null,
        isTrainer: battle.isTrainer || false,
        trainerName: battle.trainerName || null,
        locationId: battle.locationId || null,
        enemyTeam: battle.enemyTeam
          ? (battle.enemyTeam as Pokemon[]).map(p => ({
              uid: p.uid,
              id: p.id,
              name: p.name,
              emoji: (p as Pokemon & { emoji?: string }).emoji,
              type: p.type,
              level: p.level,
              hp: p.hp,
              maxHp: p.maxHp,
              atk: p.atk,
              def: p.def,
              spa: p.spa,
              spd: p.spd,
              spe: p.spe,
              moves: p.moves,
              status: p.status || null,
              isShiny: p.isShiny || false,
              gender: p.gender || null,
              ivs: p.ivs,
              nature: p.nature,
              ability: p.ability ? requireAbilityId(p.ability) : '',
              exp: p.exp || 0,
              expNeeded: p.expNeeded || 1,
              friendship: p.friendship || DEFAULT_POKEMON_FRIENDSHIP_FALLBACK,
              _revealed: (p as Pokemon & { _revealed?: boolean })._revealed || false,
              _gymLeader: (p as Pokemon & { _gymLeader?: string })._gymLeader || null,
              _gymBadge: (p as Pokemon & { _gymBadge?: string })._gymBadge || null,
            }))
          : null,
        timestamp: Temporal.Now.instant().epochMilliseconds,
      };
      activeBattle = serialized;
    } catch(e) {
      logger.warn('SAVE', `Error serializando batalla activa: ${(e as Error).message}`);
      activeBattle = null;
    }
  } else if (state.activeBattle && state.activeBattle.isPvP) {
    const b = state.activeBattle;
    activeBattle = {
      isGym: Boolean(b.isGym),
      gymId: b.gymId || null,
      isTrainer: Boolean(b.isTrainer),
      trainerName: b.trainerName || null,
      locationId: b.locationId || null,
      enemyTeam: null,
      timestamp: Temporal.Now.instant().epochMilliseconds,
      isPvP: true
    };
  }

  return {
    trainer: state.trainer,
    gender: state.gender || 'h',
    badges: state.badges,
    balls: state.balls,
    money: state.money,
    battleCoins: state.battleCoins || 0,
    eggs: (state.eggs || []) as SaveDataDto['eggs'],
    trainerLevel: state.trainerLevel,
    trainerExp: state.trainerExp,
    trainerExpNeeded: state.trainerExpNeeded,
    inventory: (state.inventory || {}) as SaveDataDto['inventory'],
    team: (state.team || []) as SaveDataDto['team'],
    box: (state.box || []) as SaveDataDto['box'],
    pokedex: state.pokedex,
    seenPokedex: state.seenPokedex || [],
    defeatedGyms: state.defeatedGyms,
    gymProgress: state.gymProgress || {},
    lastGymWins: state.lastGymWins || {},
    lastGymAttempts: state.lastGymAttempts || {},
    starterChosen: state.starterChosen || false,
    lastRankedSeason: state.lastRankedSeason || null,
    nick_style: state.nick_style || null,
    avatar_style: state.avatar_style || null,
    stats: state.stats || {},
    eloRating: state.eloRating,
    pvpStats: state.pvpStats,
    rankedMaxElo: state.rankedMaxElo,
    passiveTeamActive: state.passiveTeamActive,
    daycare_mission_refreshes: state.daycare_mission_refreshes,
    boxCount: state.boxCount,
    classLevel: state.classLevel,
    classXP: state.classXP,
    classData: state.classData,
    warCoins: state.warCoins,
    warCoinsSpent: state.warCoinsSpent,
    lastPokemonCenterHeal: state.lastPokemonCenterHeal || 0,
    playtime: state.playtime || 0,
    activeBattle: activeBattle as SaveDataDto['activeBattle'],
  };
}
