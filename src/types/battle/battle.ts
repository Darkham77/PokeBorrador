import { Pokemon, type PokemonMoveId } from '@/types/pokemon/pokemon';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { NpcArchetype } from '@/logic/utils/npcSpriteRouter';
import type { Inventory } from '@/types/inventory/items';
import type { ItemId } from '@/data/inventory/items';
import type { GymId } from '@/data/world/gyms';
import type { NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import type { MapRouteId } from '@/data/world/map-assets';
import type { MoveCategory } from '@/data/battle/moves';
import type { DayPhase } from '@/logic/utils/timeUtils';

/** Canonical Showdown PRNG 4-word integer seed tuple ([w, x, y, z]) */
export type NumericSeed = [number, number, number, number];

export type CoreBattleStatKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'accuracy' | 'evasion' | 'reflect' | 'lightScreen' | 'safeguard' | 'mist' | 'spikes';
export const BATTLE_SIDES = ['player', 'enemy'] as const;
export type BattleSide = (typeof BATTLE_SIDES)[number];
export const BATTLE_MINIGAMES = ['fishing', 'archaeology'] as const;
export type BattleMinigame = (typeof BATTLE_MINIGAMES)[number];

export const MINIGAME_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const;
export type MinigameDifficulty = (typeof MINIGAME_DIFFICULTIES)[number];

export const MINIGAME_DIFFICULTY_SELECTIONS = ['auto', ...MINIGAME_DIFFICULTIES] as const;
export type MinigameDifficultySelection = (typeof MINIGAME_DIFFICULTY_SELECTIONS)[number];

export const BATTLE_DIFFICULTIES = ['easy', 'normal', 'hard'] as const;
export type BattleDifficulty = (typeof BATTLE_DIFFICULTIES)[number];

export const BATTLE_ACTION_TYPES = ['move', 'switch'] as const;
export type BattleActionType = (typeof BATTLE_ACTION_TYPES)[number];

export const PARTY_SLOT_STATUSES = ['active', 'fainted', 'empty'] as const;
export type PartySlotStatus = (typeof PARTY_SLOT_STATUSES)[number];

export const LIVE_PVP_MATCH_STATUSES = ['pending', 'accepted', 'declined', 'ranked_match', 'ranked_accepted'] as const;
export type LivePvPMatchStatus = (typeof LIVE_PVP_MATCH_STATUSES)[number];

export const BATTLE_SEAT_SPECIAL_STATES = ['catching', 'trapped', 'releasing'] as const;
export type BattleSeatSpecialState = (typeof BATTLE_SEAT_SPECIAL_STATES)[number];

export const STAT_MODIFIER_SOURCES = ['stage', 'weather', 'ability', 'item', 'status', 'field'] as const;
export type StatModifierSource = (typeof STAT_MODIFIER_SOURCES)[number];

export const BATTLE_ITEM_EFFECT_KINDS = ['heal', 'cure', 'revive'] as const;
export type BattleItemEffectKind = (typeof BATTLE_ITEM_EFFECT_KINDS)[number];

export const SHOWDOWN_REQUEST_TYPES = ['move', 'switch', 'team', 'wait'] as const;
export type ShowdownRequestType = (typeof SHOWDOWN_REQUEST_TYPES)[number];

export const TRACKED_ACTION_SOURCES = ['move', 'ability', 'item'] as const;
export type TrackedActionSource = (typeof TRACKED_ACTION_SOURCES)[number];

export const COMBATANT_ANIM_TRIGGERS = ['attack', 'faint', 'damage'] as const;
export type CombatantAnimTrigger = (typeof COMBATANT_ANIM_TRIGGERS)[number];

export const BATTLE_ESCAPE_TYPES = ['flee', 'teleport', 'whirlwind', 'knockback', 'withdraw'] as const;
export type BattleEscapeType = (typeof BATTLE_ESCAPE_TYPES)[number];
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
  visual?: string; // domain-ok: Open dynamic text or non-domain string payload
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
  sourceName?: string; // domain-ok: Open dynamic text or non-domain string payload — for log message only
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
  trainerName?: string; // domain-ok: Open dynamic text or non-domain string payload
  trainerSprite?: NpcSpriteId;
  trainerArchetype?: NpcArchetype;
  isGym?: boolean;
  gymId?: GymId;
  fixedCycle?: DayPhase;
  fixedWeather?: WeatherId;
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
  terrain?: string | null; // domain-ok: Open dynamic text or non-domain string payload
  fieldConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>>;
  pendingSlotEffects?: PendingSlotEffect[];
  playerSideConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>>;
  enemySideConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>>;
  playerTeam?: Pokemon[];
  enemyTeam?: Pokemon[];
  _initialEnemy?: Pokemon | null;
  _rewardCombatants?: Pokemon[];
  minigame?: BattleMinigame | null;
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
  inSearchPhase?: boolean;
  difficulty?: BattleDifficulty;
  _lastActivePlayer?: Pokemon | null;
  seed?: number[];
  battleHistory?: Array<{
    turnCount: number;
    p1Choice: string; // domain-ok: Open dynamic text or non-domain string payload
    p2Choice: string; // domain-ok: Open dynamic text or non-domain string payload
    p1Hps?: Partial<Record<BattleParticipantUid, number>> | number[];
    p2Hps?: Partial<Record<BattleParticipantUid, number>> | number[];
  }>;
  playerFled?: boolean;
  quote?: string; // domain-ok: Open dynamic text or non-domain string payload
  wasSearching?: boolean;
  cannotEscape?: boolean;
  stolenResources?: {
    money: number;
    items: Inventory;
  };
  p1SlotOrder?: string[]; // domain-ok: Open dynamic text or non-domain string payload
  p2SlotOrder?: string[]; // domain-ok: Open dynamic text or non-domain string payload
  switchingToEnemy?: Pokemon | null;
}

export type BattleSource = Pokemon | string;

export interface BattleLog {
  id: string; // domain-ok: Open dynamic text or non-domain string payload
  msg: string; // domain-ok: Open dynamic text or non-domain string payload
  type: string; // domain-ok: Open dynamic text or non-domain string payload
  side: BattleSide | null;
  icon?: string | null; // domain-ok: Open dynamic text or non-domain string payload
  iconType?: string | null; // domain-ok: Open dynamic text or non-domain string payload
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
  id: string | number; // domain-ok: Open dynamic text or non-domain string payload
  tx: number;
  ty: number;
  tf: number;
  scale: number;
  delay: string; // domain-ok: Open dynamic text or non-domain string payload
}

export type StyleZIndex = number | string; // string-ok: Internal string formatting or DOM token identifier

export interface BattleCombatantProps {
  side: BattleSide;
  pokemon?: Pokemon | null;
  position: { x: number; y: number };
  targetPosition?: { x: number; y: number } | null;
  baseSize: number;
  groundY?: string; // domain-ok: Open dynamic text or non-domain string payload
  shadowKey?: string | null; // domain-ok: Open dynamic text or non-domain string payload
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
    cat: MoveCategory;
    name: string; // domain-ok: Open dynamic text or non-domain string payload
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
      move?: string; // domain-ok: Open dynamic text or non-domain string payload
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
      ident: string; // domain-ok: Open dynamic text or non-domain string payload
      details: string; // domain-ok: Open dynamic text or non-domain string payload
      condition: string; // domain-ok: Open dynamic text or non-domain string payload
      active: boolean;
      uid?: string; // domain-ok: Open dynamic text or non-domain string payload
    }[];
  };
  wait?: boolean;
  teamPreview?: boolean;
}
