import type { Pokemon } from '@/types/pokemon/pokemon';
import type { GameState } from '@/types/system/game';
import type {
  BattleLog,
  BattleStages,
  BattleWeather,
  BattleTimedCondition,
  PendingSlotEffect,
  BattleConditionKey,
  BattleSide,
  BattleDifficulty,
  BattleMinigame,
  BattleState
} from '@/types/battle/battle';
import type { Inventory } from '@/types/inventory/items';
import type { SaveDataDto } from '@/logic/validation/schemas';
import { requireAbilityId } from '@/data/battle/abilities';
import { requireWeatherId } from '@/logic/weather/weatherRegistry';
import { requireMapRouteId, isMapRouteId } from '@/data/world/map-assets';
import { logger } from '@/logic/utils/logger';

import type { GymId } from '@/data/world/gyms';
import type { MapRouteId } from '@/data/world/map-assets';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { ItemId } from '@/data/inventory/items';

const DEFAULT_POKEMON_FRIENDSHIP_FALLBACK = 70;

export interface ActiveBattleSerialized {
  isGym: boolean;
  gymId: GymId | null;
  isTrainer: boolean;
  trainerName: string | null;
  trainerSprite?: string | null;
  trainerArchetype?: string | null;
  quote?: string | null;
  locationId: MapRouteId | null;
  wasSearching?: boolean;
  participants?: string[];
  enemyTeamIndex?: number;
  playerTeamIndex?: number;
  turnCount?: number;
  turn?: BattleSide | null;
  escapeAttempts?: number;
  cannotEscape?: boolean;
  weather?: BattleWeather | null;
  initialMapWeather?: WeatherId | null;
  terrain?: string | null;
  fieldConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>> | null;
  playerSideConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>> | null;
  enemySideConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>> | null;
  pendingSlotEffects?: PendingSlotEffect[];
  minigame?: BattleMinigame | null;
  isCave?: boolean;
  isIndoors?: boolean;
  isCrystalCave?: boolean;
  difficulty?: BattleDifficulty | null;
  rarity?: number;
  enemyMoney?: number | null;
  enemyMaxLevel?: number | null;
  rewardTM?: ItemId | null;
  enemyInventory?: Inventory | null;
  stolenResources?: { money: number; items: Inventory } | null;
  fled?: boolean;
  isCapture?: boolean;
  lastDamage?: number;
  enemyUsedItem?: boolean;
  playerUsedItem?: boolean;
  battleLogs?: BattleLog[];
  playerStages?: BattleStages | null;
  enemyStages?: BattleStages | null;
  enemyTeam: Pokemon[] | null;
  timestamp: number;
  isPvP?: boolean;
  isRival?: boolean;
  over?: boolean;
  pvpMatchId?: string | null; // uuid-ok: Supabase battle match uuid
  pvpIsHost?: boolean | null;
  pvpOpponentId?: string | null; // uuid-ok: Supabase opponent user uuid
  pvpOpponentName?: string | null; // domain-ok: Open dynamic text or non-domain string payload
  playerTeam?: Pokemon[] | null;
}

function serializeSlotEffects(effects?: PendingSlotEffect[]): PendingSlotEffect[] {
  if (!Array.isArray(effects)) return [];
  return effects.map((effect: PendingSlotEffect) => ({
    move: effect.move,
    side: effect.side,
    targetSlot: effect.targetSlot,
    turnsLeft: effect.turnsLeft,
    damage: effect.damage,
    ...(effect.sourceName ? { sourceName: effect.sourceName } : {}),
  }));
}

function serializeEnemyTeamForSave(rawEnemyTeam: Pokemon[] | null): Pokemon[] | null {
  if (!rawEnemyTeam) return null;
  return rawEnemyTeam.map(p => ({
    ...p,
    ability: p.ability ? requireAbilityId(p.ability) : p.ability,
    friendship: p.friendship ?? DEFAULT_POKEMON_FRIENDSHIP_FALLBACK,
    exp: p.exp ?? 0,
    expNeeded: p.expNeeded ?? 1,
  }));
}

type BattleSerializeInput = BattleState & Partial<ActiveBattleSerialized> & { enemy?: Pokemon };

function serializeBattleTrainerMeta(battle: BattleSerializeInput) {
  const isRival = Boolean((battle as { isRival?: boolean }).isRival || (battle as { trainerArchetype?: string }).trainerArchetype === 'rival');
  return {
    isGym: battle.isGym || false,
    gymId: battle.gymId || null,
    isTrainer: battle.isTrainer || false,
    isRival,
    trainerName: battle.trainerName || null,
    trainerSprite: battle.trainerSprite || null,
    trainerArchetype: battle.trainerArchetype || null,
    quote: battle.quote || null,
    locationId: battle.locationId || null,
  };
}

function serializeBattleTurnAndEscape(battle: BattleSerializeInput) {
  return {
    turnCount: typeof battle.turnCount === 'number' ? battle.turnCount : 1,
    turn: battle.turn || null,
    escapeAttempts: typeof battle.escapeAttempts === 'number' ? battle.escapeAttempts : 0,
    cannotEscape: Boolean(battle.cannotEscape),
    fled: Boolean(battle.fled),
    over: Boolean(battle.over),
    isCapture: Boolean(battle.isCapture),
    lastDamage: typeof battle.lastDamage === 'number' ? battle.lastDamage : undefined,
    enemyUsedItem: Boolean(battle.enemyUsedItem),
    playerUsedItem: Boolean(battle.playerUsedItem),
  };
}

function serializeBattleWeatherAndField(battle: BattleSerializeInput) {
  const weather = battle.weather
    ? { type: requireWeatherId(battle.weather.type), visual: battle.weather.visual || undefined, turns: battle.weather.turns }
    : null;
  return {
    weather,
    initialMapWeather: battle.initialMapWeather || null,
    terrain: battle.terrain || null,
    fieldConditions: battle.fieldConditions || null,
    playerSideConditions: battle.playerSideConditions || null,
    enemySideConditions: battle.enemySideConditions || null,
    pendingSlotEffects: serializeSlotEffects(battle.pendingSlotEffects),
  };
}

function serializeBattleRewardsAndEconomy(battle: BattleSerializeInput) {
  const stolenResources = battle.stolenResources
    ? { money: battle.stolenResources.money, items: { ...battle.stolenResources.items } }
    : null;
  return {
    difficulty: battle.difficulty || null,
    rarity: typeof battle.rarity === 'number' ? battle.rarity : undefined,
    enemyMoney: typeof battle.enemyMoney === 'number' ? battle.enemyMoney : null,
    enemyMaxLevel: typeof battle.enemyMaxLevel === 'number' ? battle.enemyMaxLevel : null,
    rewardTM: battle.rewardTM || null,
    enemyInventory: battle.enemyInventory || null,
    stolenResources,
  };
}

function serializeCombatBattle(
  battle: BattleSerializeInput
): ActiveBattleSerialized | null {
  try {
    const rawEnemyTeam = battle.enemyTeam && battle.enemyTeam.length > 0
      ? battle.enemyTeam
      : (battle.enemy ? [battle.enemy] : null);

    return {
      ...serializeBattleTrainerMeta(battle),
      ...serializeBattleTurnAndEscape(battle),
      ...serializeBattleWeatherAndField(battle),
      ...serializeBattleRewardsAndEconomy(battle),
      wasSearching: Boolean(battle.wasSearching),
      participants: Array.isArray(battle.participants) ? battle.participants : [],
      enemyTeamIndex: typeof battle.enemyTeamIndex === 'number' ? battle.enemyTeamIndex : 0,
      playerTeamIndex: typeof battle.playerTeamIndex === 'number' ? battle.playerTeamIndex : 0,
      minigame: null,
      isCave: Boolean(battle.isCave),
      isIndoors: Boolean(battle.isIndoors),
      isCrystalCave: Boolean(battle.isCrystalCave),
      battleLogs: Array.isArray(battle.battleLogs) ? battle.battleLogs : [],
      playerStages: battle.playerStages || null,
      enemyStages: battle.enemyStages || null,
      enemyTeam: serializeEnemyTeamForSave(rawEnemyTeam as Pokemon[] | null),
      timestamp: Temporal.Now.instant().epochMilliseconds,
    };
  } catch (e) {
    logger.warn('SAVE', `Error serializando batalla activa: ${(e as Error).message}`);
    return null;
  }
}

const DEFAULT_PVP_TRAINER_NAME = 'Rival' as const;
const DEFAULT_PVP_TURN_COUNT = 1 as const;

function extractPvPEnemyTeam(battle: BattleState & Partial<ActiveBattleSerialized> & { enemy?: Pokemon }): Pokemon[] | null {
  if (battle.enemyTeam) return battle.enemyTeam as Pokemon[];
  if (battle.enemy) return [battle.enemy];
  return null;
}

function serializePvPBattle(battle: BattleState & Partial<ActiveBattleSerialized> & { enemy?: Pokemon }): ActiveBattleSerialized {
  const rawEnemyTeam = extractPvPEnemyTeam(battle);
  const rawPlayerTeam = (battle.playerTeam as Pokemon[] | null) ?? null;
  const trainerName = battle.trainerName || battle.pvpOpponentName || DEFAULT_PVP_TRAINER_NAME;
  const locationId = battle.locationId ? requireMapRouteId(battle.locationId) : null;
  const turnCount = typeof battle.turnCount === 'number' ? battle.turnCount : DEFAULT_PVP_TURN_COUNT;
  const battleLogs = Array.isArray(battle.battleLogs) ? battle.battleLogs : [];

  return {
    isGym: Boolean(battle.isGym),
    gymId: battle.gymId ?? null,
    isTrainer: true,
    trainerName,
    locationId,
    enemyTeam: serializeEnemyTeamForSave(rawEnemyTeam),
    playerTeam: serializeEnemyTeamForSave(rawPlayerTeam),
    timestamp: Temporal.Now.instant().epochMilliseconds,
    isPvP: true,
    pvpMatchId: battle.pvpMatchId ?? null,
    pvpIsHost: battle.pvpIsHost ?? null,
    pvpOpponentId: battle.pvpOpponentId ?? null,
    pvpOpponentName: battle.pvpOpponentName ?? null,
    turnCount,
    battleLogs,
    weather: battle.weather ?? null,
    over: Boolean(battle.over),
  };
}

function serializeSearchingBattle(
  battle: BattleState & Partial<ActiveBattleSerialized>,
  fallbackMapId?: MapRouteId | null
): ActiveBattleSerialized {
  return {
    isGym: false,
    gymId: null,
    isTrainer: false,
    isRival: false,
    trainerName: null,
    trainerSprite: null,
    trainerArchetype: null,
    quote: null,
    locationId: battle.locationId ? requireMapRouteId(battle.locationId) : (fallbackMapId ? requireMapRouteId(fallbackMapId) : null),
    wasSearching: true,
    minigame: null,
    isCave: Boolean(battle.isCave),
    isIndoors: Boolean(battle.isIndoors),
    isCrystalCave: Boolean(battle.isCrystalCave),
    enemyTeam: null,
    timestamp: Temporal.Now.instant().epochMilliseconds,
  };
}

export function serializeActiveBattle(state: GameState | SaveDataDto): ActiveBattleSerialized | null {
  const battle = state.activeBattle as (BattleState & Partial<ActiveBattleSerialized> & { enemy?: Pokemon }) | null;
  if (!battle || battle.over) return null;

  if (battle.isPvP) {
    return serializePvPBattle(battle);
  }

  const hasActiveEnemy = Boolean(battle.enemy || (battle.enemyTeam && battle.enemyTeam.length > 0));
  const isActualCombat = Boolean(
    (battle.turnCount && battle.turnCount > 0) ||
    battle.isTrainer ||
    battle.isGym ||
    (hasActiveEnemy && !(battle as { inSearchPhase?: boolean }).inSearchPhase)
  );

  if ((battle.isTrainer || battle.isGym || hasActiveEnemy) && isActualCombat) {
    return serializeCombatBattle(battle);
  }

  if (battle.wasSearching || (!battle.isTrainer && !battle.isGym)) {
    const rawMap = state.map?.currentMap;
    const currentMap = typeof rawMap === 'string' && isMapRouteId(rawMap) ? rawMap : null;
    return serializeSearchingBattle(battle, currentMap);
  }

  return null;
}
