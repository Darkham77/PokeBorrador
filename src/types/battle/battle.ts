import type { DisplayText } from '@francogp/auditor';
import type { SideID } from '@pkmn/sim';

import type { MoveCategory } from '@/data/battle/moves';
import type { ItemId } from '@/data/inventory/items';
import type { NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import type { GymId } from '@/data/world/gyms';
import type { MapRouteId } from '@/data/world/map-assets';
import type { NpcArchetype } from '@/logic/utils/npcSpriteRouter';
import type { DayPhase } from '@/logic/utils/timeUtils';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { Inventory } from '@/types/inventory/items';
import type { Pokemon, PokemonMoveId } from '@/types/pokemon/pokemon';
import type { PlayerClassId, GenderId } from '@/types/system/game';

/** Canonical Showdown PRNG 4-word integer seed tuple ([w, x, y, z]) */
export type NumericSeed = [number, number, number, number];

export type CoreBattleStatKey =
  | 'atk'
  | 'def'
  | 'spa'
  | 'spd'
  | 'spe'
  | 'accuracy'
  | 'evasion'
  | 'reflect'
  | 'lightScreen'
  | 'safeguard'
  | 'mist'
  | 'spikes';
export const BATTLE_SIDES = ['player', 'enemy'] as const;
export type BattleSide = (typeof BATTLE_SIDES)[number];
const BATTLE_SEATS = ['seat1', 'seat2', 'seat3', 'seat4'] as const;
export type BattleSeatId = (typeof BATTLE_SEATS)[number];
const BATTLE_SEAT_SET: ReadonlySet<string> = new Set<string>(BATTLE_SEATS);
export function isBattleSeatId(seat: unknown): seat is BattleSeatId {
  return typeof seat === 'string' && BATTLE_SEAT_SET.has(seat);
}
export const BATTLE_WINNER_RESULTS = ['player', 'enemy', 'tie'] as const;
export type BattleWinnerResult = (typeof BATTLE_WINNER_RESULTS)[number];
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

export const LIVE_PVP_MATCH_STATUSES = [
  'pending',
  'accepted',
  'declined',
  'ranked_match',
  'ranked_accepted'
] as const;
export type LivePvPMatchStatus = (typeof LIVE_PVP_MATCH_STATUSES)[number];

export const BATTLE_SEAT_SPECIAL_STATES = ['catching', 'trapped', 'releasing'] as const;
export type BattleSeatSpecialState = (typeof BATTLE_SEAT_SPECIAL_STATES)[number];

export const STAT_MODIFIER_SOURCES = [
  'stage',
  'weather',
  'ability',
  'item',
  'status',
  'field'
] as const;
export type StatModifierSource = (typeof STAT_MODIFIER_SOURCES)[number];

export const BATTLE_ITEM_EFFECT_KINDS = ['heal', 'cure', 'revive'] as const;
export type BattleItemEffectKind = (typeof BATTLE_ITEM_EFFECT_KINDS)[number];

export const SHOWDOWN_REQUEST_TYPES = ['move', 'switch', 'team', 'wait'] as const;
export type ShowdownRequestType = (typeof SHOWDOWN_REQUEST_TYPES)[number];

export const TRACKED_ACTION_SOURCES = ['move', 'ability', 'item'] as const;
export type TrackedActionSource = (typeof TRACKED_ACTION_SOURCES)[number];

export const COMBATANT_ANIM_TRIGGERS = ['attack', 'faint', 'damage'] as const;
export type CombatantAnimTrigger = (typeof COMBATANT_ANIM_TRIGGERS)[number];

export const WINNER_SIDES = ['p1', 'p2'] as const;
export type WinnerSide = (typeof WINNER_SIDES)[number];

export const COMBATANT_SPRITE_MODES = ['idle', 'variation'] as const;
export type CombatantSpriteMode = (typeof COMBATANT_SPRITE_MODES)[number];

export const BATTLE_ESCAPE_TYPES = [
  'flee',
  'teleport',
  'whirlwind',
  'knockback',
  'withdraw'
] as const;
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
  'swamp',
  'tailwind',
  'toxicspikes',
  'trickroom',
  'wish',
  'wonderroom'
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

export const BATTLE_STAGE_KEYS = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva'] as const;
export type BattleStageKey = (typeof BATTLE_STAGE_KEYS)[number];

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
  visual?: WeatherId;
  turns: number;
}

/**
 * A delayed slot-based move effect (Future Sight, Doom Desire).
 * Fires on the Pokémon occupying the target slot when turnsLeft reaches 0,
 * regardless of which Pokémon originally received the effect.
 * Canonical model: Showdown `slotCondition` on `target.side.slotConditions[position]`.
 */
export const DELAYED_SLOT_MOVES = ['futuresight', 'doomdesire'] as const;
export type DelayedSlotMove = (typeof DELAYED_SLOT_MOVES)[number];

export interface PendingSlotEffect {
  move: DelayedSlotMove;
  side: BattleSide;
  targetSlot: number; // 0-indexed position on target side
  turnsLeft: number; // fires when this reaches 0
  damage: number; // pre-computed damage
  sourceName?: string; // domain-ok: Open dynamic text or non-domain string payload — for log message only
}

export const PERSISTENCE_MODES = ['local', 'remote'] as const;
export type PersistenceMode = (typeof PERSISTENCE_MODES)[number];

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
  trainerSprite?: NpcSpriteId | PlayerClassId;
  trainerGender?: GenderId;
  trainerArchetype?: NpcArchetype;
  isGym?: boolean;
  isRematch?: boolean;
  gymId?: GymId;
  fixedCycle?: DayPhase;
  fixedWeather?: WeatherId;
  returnTab?: DisplayText;
  weather: BattleWeather;
  turnCount: number;
  over: boolean;
  fled?: boolean;
  turn?: BattleSide | null;
  isCapture?: boolean;
  capturedPokemon?: Pokemon;
  isRival?: boolean;
  escapeAttempts: number;
  initialMapWeather?: WeatherId | null;
  rarity?: number;
  terrain?: DisplayText | null;
  fieldConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>>;
  pendingSlotEffects?: PendingSlotEffect[];
  playerSideConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>>;
  enemySideConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>>;
  playerTeam?: Pokemon[];
  enemyTeam?: Pokemon[];
  _initialEnemy?: Pokemon | null;
  _initialEnemies?: Partial<Record<BattleParticipantUid, Pokemon>>;
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
  persistenceMode?: PersistenceMode;
  winnerResult?: BattleWinnerResult;
  learnQueue?: unknown[];
  isPvP?: boolean;
  isRanked?: boolean;
  pvpMatchId?: DisplayText;
  pvpIsHost?: boolean;
  pvpOpponentId?: DisplayText;
  pvpOpponentName?: DisplayText;
  inSearchPhase?: boolean;
  difficulty?: BattleDifficulty;
  _lastActivePlayer?: Pokemon | null;
  seed?: number[];
  battleHistory?: Array<{
    turnCount: number;
    p1Choice: DisplayText;
    p2Choice: DisplayText;
    p1Hps?: Partial<Record<BattleParticipantUid, number>> | number[];
    p2Hps?: Partial<Record<BattleParticipantUid, number>> | number[];
  }>;
  playerFled?: boolean;
  quote?: DisplayText;
  wasSearching?: boolean;
  cannotEscape?: boolean;
  isGuardian?: boolean;
  stolenResources?: {
    money: number;
    items: Inventory;
  };
  initialFriendships?: Partial<Record<BattleParticipantUid, number>>;
  p1SlotOrder?: DisplayText[];
  p2SlotOrder?: DisplayText[];
  switchingToEnemy?: Pokemon | null;
  rawShowdownLogs?: DisplayText[];
}

export type BattleSource = Pokemon | DisplayText;

export interface BattleLog {
  id: DisplayText;
  msg: DisplayText;
  type: DisplayText;
  side: BattleSide | null;
  icon?: DisplayText | null;
  iconType?: DisplayText | null;
  source?: BattleSource;
}

import type { BattleContext } from '@/types/battle/battleContext';

export type LogFn = (
  msg: DisplayText,
  type?: DisplayText,
  actor?: BattleSource | null,
  side?: BattleSide | null
) => void;

export type MoveAction = (
  src: Pokemon,
  tgt: Pokemon,
  srcStages: BattleStages,
  tgtStages: BattleStages,
  addLogFn: LogFn,
  battleCtx?: BattleContext
) => void;

export interface SparkleData {
  id: DisplayText | number;
  tx: number;
  ty: number;
  tf: number;
  scale: number;
  delay: DisplayText;
}

export type StyleZIndex = number | DisplayText;

export interface BattleCombatantProps {
  side: BattleSide;
  pokemon?: Pokemon | null;
  position: { x: number; y: number };
  targetPosition?: { x: number; y: number } | null;
  baseSize: number;
  groundY?: DisplayText;
  shadowKey?: DisplayText | null;
  animState?: BattleSeatSpecialState | null;
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
    name: DisplayText;
    selfKO?: boolean;
    recoil?: boolean | number;
  } | null;
  showGuides?: boolean;
  isCaptureSuccess?: boolean;
  isCriticalCapture?: boolean;
  sparkles?: SparkleData[];
  isFainting?: boolean;
  isEmerging?: boolean;
  suppressFX?: boolean;
  hidden?: boolean;
  hasSeat?: boolean;
  stages?: Partial<BattleStages>;
  zIndex?: StyleZIndex;
  hideStatusOverlay?: boolean;
}

export interface ShowdownPlayerRequest {
  active?: {
    moves?: {
      id?: PokemonMoveId;
      move?: DisplayText;
      target?: DisplayText;
      disabled?: boolean | 'pp';
      pp?: number;
      maxpp?: number;
    }[];
    trapped?: boolean;
    maybeTrapped?: boolean;
  }[];
  forceSwitch?: boolean[];
  side?: {
    name?: DisplayText;
    id?: SideID;
    pokemon: {
      ident: DisplayText;
      details: DisplayText;
      condition: DisplayText;
      active: boolean;
      stats?: {
        hp?: number;
        atk?: number;
        def?: number;
        spa?: number;
        spd?: number;
        spe?: number;
      };
      moves?: DisplayText[];
      baseAbility?: DisplayText;
      item?: DisplayText;
      pokeball?: DisplayText;
      uid?: DisplayText;
    }[];
  };
  wait?: boolean;
  teamPreview?: boolean;
  rqid?: number;
}

/** Terminal battle outcome flags shared by resolution and reward phases. */
export interface BattleOutcomeFlags {
  win: boolean;
  fled: boolean;
}
