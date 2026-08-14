import { Pokemon, type PokemonMoveId } from '@/types/pokemon/pokemon';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { NpcArchetype } from '@/logic/utils/npcSpriteRouter';
import type { Inventory } from '@/types/inventory/items';
import type { ItemId } from '@/data/inventory/items';
import type { GymId } from '@/data/world/gyms';
import type { NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import type { MapRouteId } from '@/data/world/map-assets';
import type { MoveCategory } from '@/data/battle/moves';


export type CoreBattleStatKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'accuracy' | 'evasion' | 'reflect' | 'lightScreen' | 'safeguard' | 'mist' | 'spikes';
export const BATTLE_SIDES = ['player', 'enemy'] as const;
export type BattleSide = (typeof BATTLE_SIDES)[number];
export type BattleDifficulty = 'easy' | 'normal' | 'hard';
export type BattleActionType = 'move' | 'switch';
export type PartySlotStatus = 'active' | 'fainted' | 'empty';
export type BattleEscapeType = 'flee' | 'teleport';
export type BattleParticipantUid = Pokemon['uid'];
export const BATTLE_CONDITION_KEYS = [
  'auroraveil',
  'desolatedterrain',
  'electricterrain',
  'gravity',
  'grassyterrain',
  'hail',
  'lightscreen',
  'magicroom',
  'mist',
  'mistyterrain',
  'psychicterrain',
  'raindance',
  'reflect',
  'safeguard',
  'sandstorm',
  'spikes',
  'stealthrock',
  'stickyweb',
  'sunnyday',
  'tailwind',
  'toxicspikes',
  'trickroom',
  'wish',
  'wonderroom',
] as const;
export type BattleConditionKey = (typeof BATTLE_CONDITION_KEYS)[number];

function isBattleConditionKey(value: string): value is BattleConditionKey {
  return BATTLE_CONDITION_KEYS.includes(value as BattleConditionKey);
}

export function requireBattleConditionKey(value: string): BattleConditionKey {
  if (isBattleConditionKey(value)) return value;
  throw new Error(`Invalid battle condition key: ${value}`);
}

export type BattleConditionMetaKey = 'count' | 'duration' | 'layers' | 'source';

export interface BattleTimedCondition {
  turns: number;
  meta?: Partial<Record<BattleConditionMetaKey, unknown>>;
}

export type BattleStages = Partial<Record<CoreBattleStatKey, number>> & {
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  accuracy: number;
  evasion: number;
  reflect: number;
  lightScreen: number;
  safeguard: number;
  mist: number;
  spikes: number;
  stealthrock?: number;
  toxicspikes?: number;
  acc?: number;
  eva?: number;
};

export interface BattleWeather {
  type: WeatherId;
  visual?: string; // domain-ok
  turns: number;
}

/**
 * A delayed slot-based move effect (Future Sight, Doom Desire).
 * Fires on the Pokémon occupying the target slot when turnsLeft reaches 0,
 * regardless of which Pokémon originally received the effect.
 * Canonical model: Showdown `slotCondition` on `target.side.slotConditions[position]`.
 */
export interface PendingSlotEffect {
  move: 'futuresight' | 'doomdesire';
  side: BattleSide;
  targetSlot: number; // 0-indexed position on target side
  turnsLeft: number;  // fires when this reaches 0
  damage: number;     // pre-computed damage
  sourceName?: string; // domain-ok — for log message only
}

export interface BattleState {
  player: Pokemon | null;
  enemy: Pokemon | null;
  playerTeamIndex: number;
  enemyTeamIndex: number;
  participants: BattleParticipantUid[];
  locationId: MapRouteId;
  isCave?: boolean;
  isIndoors?: boolean;
  isCrystalCave?: boolean;
  isTrainer: boolean;
  trainerName?: string; // domain-ok
  trainerSprite?: NpcSpriteId;
  trainerArchetype?: NpcArchetype;
  isGym?: boolean;
  gymId?: GymId;
  weather: BattleWeather;
  turnCount: number;
  over: boolean;
  fled?: boolean;
  turn?: BattleSide | null;
  isCapture?: boolean;
  isRival?: boolean;
  escapeAttempts: number;
  initialMapWeather?: WeatherId | null;
  rarity?: number;
  terrain?: string | null; // domain-ok
  fieldConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>>;
  pendingSlotEffects?: PendingSlotEffect[];
  playerSideConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>>;
  enemySideConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>>;
  playerTeam?: Pokemon[];
  enemyTeam?: Pokemon[];
  _initialEnemy?: Pokemon | null;
  _rewardCombatants?: Pokemon[];
  isFishing?: boolean;
  isArchaeology?: boolean;
  isExecutingSwitch?: boolean;
  lastDamage?: number;
  enemyUsedItem?: boolean;
  playerUsedItem?: boolean;
  enemyInventory?: Inventory;
  enemyMoney?: number;
  enemyMaxLevel?: number;
  rewardTM?: ItemId;
  playerStages?: BattleStages;
  enemyStages?: BattleStages;
  playerNames?: Partial<Record<BattleParticipantUid, BattleSide>>;
  playerRequest?: ShowdownPlayerRequest;
  enemyRequest?: ShowdownPlayerRequest;
  battleLogs?: BattleLog[];
  rewardsProcessed?: boolean;
  persistenceMode?: 'local' | 'remote';
  winnerResult?: BattleSide | 'tie';
  learnQueue?: unknown[];
  isPvP?: boolean;
  difficulty?: BattleDifficulty;
  _lastActivePlayer?: Pokemon | null;
  seed?: number[];
  battleHistory?: Array<{
    turnCount: number;
    p1Choice: string; // domain-ok
    p2Choice: string; // domain-ok
    p1Hps?: Partial<Record<BattleParticipantUid, number>> | number[];
    p2Hps?: Partial<Record<BattleParticipantUid, number>> | number[];
  }>;
  playerFled?: boolean;
  quote?: string; // domain-ok
  wasSearching?: boolean;
  cannotEscape?: boolean;
  stolenResources?: {
    money: number;
    items: Inventory;
  };
  p1SlotOrder?: string[]; // domain-ok
  p2SlotOrder?: string[]; // domain-ok
  switchingToEnemy?: Pokemon | null;
}

export type BattleSource = Pokemon | string;

export interface BattleLog {
  id: string; // domain-ok
  msg: string; // domain-ok
  type: string; // domain-ok
  side: BattleSide | null;
  icon?: string | null; // domain-ok
  iconType?: string | null; // domain-ok
  source?: BattleSource;
}

import type { BattleContext } from '@/types/battle/battleContext';

export type LogFn = (msg: string, type?: string, actor?: Pokemon | string | null, side?: BattleSide | null) => void;

export type MoveAction = (
  src: Pokemon, 
  tgt: Pokemon, 
  srcStages: BattleStages, 
  tgtStages: BattleStages, 
  addLogFn: LogFn, 
  battleCtx?: BattleContext
) => void;

export interface SparkleData {
  id: string | number; // domain-ok
  tx: number;
  ty: number;
  tf: number;
  scale: number;
  delay: string; // domain-ok
}

export type StyleZIndex = number | string; // string-ok

export interface BattleCombatantProps {
  side: BattleSide;
  pokemon?: Pokemon | null;
  position: { x: number; y: number };
  targetPosition?: { x: number; y: number } | null;
  baseSize: number;
  groundY?: string; // domain-ok
  shadowKey?: string | null; // domain-ok
  animState?: 'catching' | 'trapped' | 'releasing' | null;
  ballId?: ItemId;
  isShaking?: boolean;
  isBlinking?: boolean;
  isHealing?: boolean;
  isSilhouette?: boolean;
  isAttacking?: boolean;
  activeMove?: {
    id?: PokemonMoveId;
    side: BattleSide;
    cat: MoveCategory | 'selfKO';
    name: string; // domain-ok
    selfKO?: boolean;
    recoil?: boolean | number;
  } | null;
  showGuides?: boolean;
  isCaptureSuccess?: boolean;
  sparkles?: SparkleData[];
  isFainting?: boolean;
  isEmerging?: boolean;
  suppressFX?: boolean;
  hidden?: boolean;
  hasSeat?: boolean;
  stages?: Partial<BattleStages>;
  zIndex?: StyleZIndex;
}

export interface ShowdownPlayerRequest {
  active?: {
    moves?: {
      id?: PokemonMoveId;
      move?: string; // domain-ok
      disabled?: boolean | 'pp';
      pp?: number;
      maxpp?: number;
    }[];
    trapped?: boolean;
    maybeTrapped?: boolean;
  }[];
  forceSwitch?: boolean[];
  side?: {
    pokemon: {
      ident: string; // domain-ok
      details: string; // domain-ok
      condition: string; // domain-ok
      active: boolean;
      uid?: string; // domain-ok
    }[];
  };
  wait?: boolean;
  teamPreview?: boolean;
}
