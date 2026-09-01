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
import { requireMapRouteId } from '@/data/world/map-assets';
import { logger } from '@/logic/utils/logger';

const DEFAULT_POKEMON_FRIENDSHIP_FALLBACK = 70;

export interface ActiveBattleSerialized {
  isGym: boolean;
  gymId: string | null;
  isTrainer: boolean;
  trainerName: string | null;
  trainerSprite?: string | null;
  trainerArchetype?: string | null;
  quote?: string | null;
  locationId: string | null;
  wasSearching?: boolean;
  participants?: string[];
  enemyTeamIndex?: number;
  playerTeamIndex?: number;
  turnCount?: number;
  turn?: BattleSide | null;
  escapeAttempts?: number;
  cannotEscape?: boolean;
  weather?: BattleWeather | null;
  initialMapWeather?: string | null;
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
  rewardTM?: string | null;
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

function serializeCombatBattle(
  battle: BattleState & Partial<ActiveBattleSerialized> & { enemy?: Pokemon }
): ActiveBattleSerialized | null {
  try {
    const rawEnemyTeam = battle.enemyTeam && battle.enemyTeam.length > 0
      ? battle.enemyTeam
      : (battle.enemy ? [battle.enemy] : null);

    return {
      isGym: battle.isGym || false,
      gymId: battle.gymId || null,
      isTrainer: battle.isTrainer || false,
      isRival: Boolean((battle as { isRival?: boolean }).isRival || (battle as { trainerArchetype?: string }).trainerArchetype === 'rival'),
      trainerName: battle.trainerName || null,
      trainerSprite: battle.trainerSprite || null,
      trainerArchetype: battle.trainerArchetype || null,
      quote: battle.quote || null,
      locationId: battle.locationId || null,
      wasSearching: Boolean(battle.wasSearching),
      participants: Array.isArray(battle.participants) ? battle.participants : [],
      enemyTeamIndex: typeof battle.enemyTeamIndex === 'number' ? battle.enemyTeamIndex : 0,
      playerTeamIndex: typeof battle.playerTeamIndex === 'number' ? battle.playerTeamIndex : 0,
      turnCount: typeof battle.turnCount === 'number' ? battle.turnCount : 1,
      turn: battle.turn || null,
      escapeAttempts: typeof battle.escapeAttempts === 'number' ? battle.escapeAttempts : 0,
      cannotEscape: Boolean(battle.cannotEscape),
      weather: battle.weather ? { type: requireWeatherId(battle.weather.type), visual: battle.weather.visual || undefined, turns: battle.weather.turns } : null,
      initialMapWeather: battle.initialMapWeather || null,
      terrain: battle.terrain || null,
      fieldConditions: battle.fieldConditions || null,
      playerSideConditions: battle.playerSideConditions || null,
      enemySideConditions: battle.enemySideConditions || null,
      pendingSlotEffects: serializeSlotEffects(battle.pendingSlotEffects),
      minigame: null,
      isCave: Boolean(battle.isCave),
      isIndoors: Boolean(battle.isIndoors),
      isCrystalCave: Boolean(battle.isCrystalCave),
      difficulty: battle.difficulty || null,
      rarity: typeof battle.rarity === 'number' ? battle.rarity : undefined,
      enemyMoney: typeof battle.enemyMoney === 'number' ? battle.enemyMoney : null,
      enemyMaxLevel: typeof battle.enemyMaxLevel === 'number' ? battle.enemyMaxLevel : null,
      rewardTM: battle.rewardTM || null,
      enemyInventory: battle.enemyInventory || null,
      stolenResources: battle.stolenResources ? { money: battle.stolenResources.money, items: { ...battle.stolenResources.items } } : null,
      fled: Boolean(battle.fled),
      over: Boolean(battle.over),
      isCapture: Boolean(battle.isCapture),
      lastDamage: typeof battle.lastDamage === 'number' ? battle.lastDamage : undefined,
      enemyUsedItem: Boolean(battle.enemyUsedItem),
      playerUsedItem: Boolean(battle.playerUsedItem),
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

function serializePvPBattle(battle?: (BattleState & Partial<ActiveBattleSerialized>) | null): ActiveBattleSerialized {
  return {
    isGym: Boolean(battle?.isGym),
    gymId: battle?.gymId || null,
    isTrainer: Boolean(battle?.isTrainer),
    trainerName: battle?.trainerName || null,
    locationId: battle?.locationId || null,
    enemyTeam: null,
    timestamp: Temporal.Now.instant().epochMilliseconds,
    isPvP: true
  };
}

function serializeSearchingBattle(
  battle: BattleState & Partial<ActiveBattleSerialized>,
  fallbackMapId?: string | null
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

  if (battle.isPvP) {
    return serializePvPBattle(state.activeBattle as (BattleState & Partial<ActiveBattleSerialized>) | null);
  }

  if (battle.wasSearching || (!battle.isTrainer && !battle.isGym)) {
    return serializeSearchingBattle(battle, state.map?.currentMap);
  }

  return null;
}
