// fallow-ignore-file security-sink
/**
 * GAMEPLAY & COMBAT CONSTANTS (SINGLE SOURCE OF TRUTH)
 * Centralized constant definitions for levels, ELO, stats, minigames, and damage variance.
 */

/** Minimum legal level for Pokémon in the engine. */
export const MINIMUM_POKEMON_LEVEL = 1;

/** Maximum legal level for Pokémon in the engine. */
export const MAXIMUM_POKEMON_LEVEL = 100;

/** Standard 2 decimal places rounding precision. */
export const DECIMAL_PLACES_PRECISION_TWO = 2;

/** Maximum number of active moves a Pokémon can carry (4 slots). */
export const MAX_LEARNED_MOVES_SLOTS = 4;

/** Default starting ELO for new competitive trainers. */
export const DEFAULT_INITIAL_ELO = 1000;

/** Default starting friendship value for newly caught Pokémon. */
export const DEFAULT_FRIENDSHIP_VALUE = 70;

/** Default fallback base stat when undefined (100). */
export const DEFAULT_FALLBACK_BASE_STAT = 100;

/** Denominator scaling factor for Rocket criminality trainer chance. */
export const CRIMINALITY_DENOMINATOR_FACTOR = 10;

/** Criminality points gained per successful Rocket item steal. */
export const CRIMINALITY_GAINED_ON_STEAL = 10;

/** Rocket sell price level multiplier factor ($50 per level). */
export const ROCKET_SELL_LEVEL_MULTIPLIER = 50;

/** Maximum possible total IV sum across all 6 stats (31 * 6 = 186). */
export const MAX_TOTAL_IVS_STAT_SUM = 186;

/** Maximum Rocket sell price IV bonus dollar amount ($500). */
export const ROCKET_SELL_IV_BONUS_CAP = 500;

/** Rocket cut fraction multiplier applied to selling price (80%). */
export const ROCKET_SELL_CUT_MULTIPLIER = 0.8;

/** Maximum number of active war zones in faction war engine (12). */
export const MAX_ACTIVE_WAR_ZONES = 12;

/** Rarity threshold for Elite Guardians. */
export const ELITE_GUARDIAN_RARITY_THRESHOLD = 85;

/** Rarity threshold for Legendary Guardians. */
export const LEGENDARY_GUARDIAN_RARITY_THRESHOLD = 95;

/** Rarity threshold for Rare Guardians. */
export const RARE_GUARDIAN_RARITY_THRESHOLD = 60;

/** Hash bitwise shift factor for seed calculations (5 bits). */
export const HASH_SHIFT_BITS = 5;

/** Modulo scale factor for random guardian generator. */
export const GUARDIAN_RANDOM_SCALE = 100;

export const BASE_GUARDIAN_POINTS = 150;
export const RARE_GUARDIAN_POINTS = 300;
export const ELITE_GUARDIAN_POINTS = 750;
export const MAX_SINGLE_STAT_IV = 31;
export const EGG_SCANNER_MIN_CLASS_LEVEL = 10;

/** Standard STAB power multiplier (1.5x). */
export const STAB_STANDARD_MULTIPLIER = 1.5;

/** Adaptability ability STAB power multiplier (2.0x). */
export const STAB_ADAPTABILITY_MULTIPLIER = 2.0;

/** Low-HP ability (Blaze, Torrent, Overgrow, Swarm) multiplier (1.5x). */
export const LOW_HP_ABILITY_MULTIPLIER = 1.5;

/** Technician ability maximum power threshold cap (60 BP). */
export const TECHNICIAN_POWER_CAP = 60;

/** Sand Force ability power multiplier (1.3x). */
export const SAND_FORCE_MULTIPLIER = 1.3;

/** Default base critical hit rate (6.25% or 1/16). */
export const DEFAULT_CRIT_RATE = 0.0625;

/** Scope Lens item critical hit rate (12%). */
export const SCOPE_LENS_CRIT_RATE = 0.12;

/** Focus Energy status critical hit rate (25%). */
export const FOCUS_ENERGY_CRIT_RATE = 0.25;

/** Standard accuracy/evasion base stat level. */
export const DEFAULT_ACCURACY_BASE_STAT = 100;

/** Days count in a calendar week. */
export const DAYS_PER_WEEK = 7;

/** ISO-8601 day index for Monday (1). */
export const ISO_DAY_MONDAY = 1;

/** ISO-8601 day index for Friday (5). */
export const ISO_DAY_FRIDAY = 5;

/** ISO-8601 day index for Sunday (7). */
export const ISO_DAY_SUNDAY = 7;

/** Shiny rate multiplier when controlling map dominance (1.3x). */
export const DOMINANCE_BONUS_SHINY_MULT = 1.3;

/** EXP gain multiplier when controlling map dominance (1.3x). */
export const DOMINANCE_BONUS_EXP_MULT = 1.3;

/** Guaranteed IV bonus when controlling map dominance (+1). */
export const DOMINANCE_BONUS_IV_BOOST = 1;

/** Type effectiveness multiplier thresholds. */
export const TYPE_EFFECTIVENESS_THRESHOLDS = {
  IMMUNE: 0,
  SUPER_EFFECTIVE: 2.0,
  NOT_VERY_EFFECTIVE: 0.5
} as const;

/** XP threshold table for player class level progression. */
export const CLASS_XP_THRESHOLD_RANKS: readonly number[] = [
  100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000, 8500,
  11500, 15000, 19000, 23500, 28500, 34000, 40000, 46500, 53500, 61000,
  69000, 77500, 86500, 96000, 106000, 116500, 127500, 139000, 151500
] as const;

/** Points awarded for defeating Legendary guardians. */
export const LEGENDARY_GUARDIAN_POINTS = 50;

/** Encounter chance for conflict zone guardians (1.5%). */
export const GUARDIAN_ENCOUNTER_CHANCE_PERCENT = 0.015;

/** Standard levels for conflict zone guardian tiers. */
export const GUARDIAN_LEVELS = {
  TIER_40: 40,
  TIER_41: 41,
  TIER_42: 42,
  TIER_43: 43,
  TIER_44: 44,
  TIER_45: 45,
  TIER_46: 46,
  TIER_47: 47,
  TIER_48: 48,
  TIER_50: 50,
  TIER_52: 52,
  TIER_55: 55,
  TIER_60: 60
} as const;

/** Maximum simulated points for local dominance calculation. */
export const LOCAL_DOMINANCE_MAX_POINTS = 500;

/** Default minigame rarity value. */
export const DEFAULT_MINIGAME_RARITY = 50;

/** Showdown damage variance minimum multiplier (0.85). */
export const SHOWDOWN_DAMAGE_VARIANCE_MIN = 0.85;

/** Showdown damage variance maximum multiplier exclusive (1.00). */
export const SHOWDOWN_DAMAGE_VARIANCE_MAX_EXCLUSIVE = 1.00;

/** Battle stage stat modifier multiplier lookup table (-6 to +6). */
export const BATTLE_STAGE_STAT_MULTIPLIERS: readonly number[] = [
  2 / 8, 2 / 7, 2 / 6, 2 / 5, 2 / 4, 2 / 3, 2 / 2, 3 / 2, 4 / 2, 5 / 2, 6 / 2, 7 / 2, 8 / 2
] as const;

/** Battle stage accuracy/evasion modifier multiplier lookup table (-6 to +6). */
export const BATTLE_STAGE_ACC_MULTIPLIERS: readonly number[] = [
  3 / 9, 3 / 8, 3 / 7, 3 / 6, 3 / 5, 3 / 4, 3 / 3, 4 / 3, 5 / 3, 6 / 3, 7 / 3, 8 / 3, 9 / 3
] as const;

/** Maximum stat stage offset (+6 / -6). */
export const BATTLE_MAX_STAGE_OFFSET = 6;

/** Total stat stage count (13 stages from -6 to +6). */
export const BATTLE_TOTAL_STAGES_COUNT = 13;

// --- Auth / Network constants ---
/** Delay in milliseconds between auth retry attempts. */
export const AUTH_RETRY_DELAY_MS = 1500;

/** HTTP 401 Unauthorized status code. */
export const HTTP_STATUS_UNAUTHORIZED = 401;

// --- Box store constants ---
/** Criminality points added per Pokémon sold in black-market mode. */
export const BLACK_MARKET_CRIMINALITY_PER_SALE = 10;

/** Base cost in Pokédollars to purchase the first box slot. */
export const BOX_BASE_BUY_COST = 500_000;

/** Cost in Pokédollars to purchase a box slot at count ≥ 5. */
export const BOX_ADVANCED_BUY_COST = 1_000_000;

// --- Breeding constants ---
/** Base shiny rate denominator (1/4096 without chain/charm). */
export const BASE_SHINY_DENOMINATOR = 4096;

// --- Travel Buff Durations in Seconds ---
/** Repel buff duration in seconds (5 minutes = 300s). */
export const TRAVEL_BUFF_REPEL_DURATION_SEC = 300;

/** Super Repel / Incense buff duration in seconds (15 minutes = 900s). */
export const TRAVEL_BUFF_SUPER_REPEL_DURATION_SEC = 900;

/** Max Repel / Lucky Egg / Incense buff duration in seconds (30 minutes = 1800s). */
export const TRAVEL_BUFF_MAX_REPEL_DURATION_SEC = 1800;

/** Amulet Coin / Ticket Shiny buff duration in seconds (60 minutes = 3600s). */
export const TRAVEL_BUFF_LONG_DURATION_SEC = 3600;

// --- Breeding cost tiers ---
/** Max perfect IVs to qualify for the cheapest breeding tier. */
export const BREEDING_TIER_1_MAX_PERFECT_IVS = 2;
/** Breeding cost for tier 1 (lowest IV count). */
export const BREEDING_COST_LOWEST_TIER = 2_000;
/** Max perfect IVs to qualify for the mid-low breeding tier. */
export const BREEDING_TIER_2_MAX_PERFECT_IVS = 5;
/** Breeding cost for tier 2. */
export const BREEDING_COST_MID_LOW_TIER = 5_000;
/** Max perfect IVs to qualify for the mid-high breeding tier. */
export const BREEDING_TIER_3_MAX_PERFECT_IVS = 8;
/** Breeding cost for tier 3. */
export const BREEDING_COST_MID_HIGH_TIER = 12_000;
/** Breeding cost for tier 4 (max perfect IVs). */
export const BREEDING_COST_MAXIMUM_TIER = 25_000;

/** GTS max active price filter (1,000,000 pokédollars). */
export const GTS_MAX_PRICE_FILTER = 1_000_000;

/** Online presence window in milliseconds (5 minutes). */
export const ONLINE_PRESENCE_WINDOW_MS = 300_000;

/** PvP invite expiry window in milliseconds (60 seconds). */
export const PVP_INVITE_EXPIRY_MS = 60_000;

/** Navigate throttle delay in milliseconds (400ms). */
export const NAVIGATE_THROTTLE_MS = 400;

/** Pity timer elapsed threshold for trainer chance increment in milliseconds (2 minutes = 120s). */
export const PITY_TIMER_INCREMENT_THRESHOLD_MS = 120_000;

/** Maximum trainer encounter chance percent cap. */
export const TRAINER_CHANCE_MAX_PERCENT = 20;

/** Trainer encounter chance increment step per pity interval. */
export const TRAINER_CHANCE_INCREMENT_STEP = 5;

/** Default trainer encounter chance percent on map load. */
export const TRAINER_CHANCE_DEFAULT_PERCENT = 5;

/** Modals opening animation fallback duration in seconds (0.45s). */
export const MODAL_OPENING_FALLBACK_DURATION_SEC = 0.45;

/** Modals closing animation fallback duration in seconds (0.5s). */
export const MODAL_CLOSING_FALLBACK_DURATION_SEC = 0.5;

/** EggWarehouse max eggs per slot batch poll interval in seconds (10s). */
export const EGG_POLLER_INTERVAL_SEC = 10;

/** Max eggs in warehouse before blocking more fossil cloning. */
export const EGG_WAREHOUSE_MAX_CAPACITY = 30;

/** Max eggs a trainer can carry simultaneously in inventory (6). */
export const MAX_CARRIED_EGGS = 6;

/** Base success chance per fossil consumed during fossil cloning (5%). */
export const FOSSIL_CLONE_BASE_SUCCESS_CHANCE = 0.05;

// --- Initial game state values ---
/** Starting number of Pokéballs given to a new trainer. */
export const INITIAL_BALLS_COUNT = 10;

/** Starting money (Pokédollars) for a new trainer. */
export const INITIAL_MONEY = 3_000;

/** Starting Pokéball count in the inventory for a new trainer. */
export const INITIAL_POKEBALL_COUNT = 10;

// --- Screen Breakpoints ---
/** Small screen breakpoint in pixels for responsive UI layout (950px). */
export const SMALL_SCREEN_BREAKPOINT_PX = 950;

/** Mobile screen breakpoint in pixels for low power mode auto trigger (768px). */
export const MOBILE_SCREEN_BREAKPOINT_PX = 768;

/** Default season duration in months (3 months). */
export const SEASON_DURATION_MONTHS = 3;

// --- Social & Presence Constants ---

/** Seconds interval between presence heartbeat pings (60s). */
export const ONLINE_PRESENCE_PING_INTERVAL_SEC = 60;

/** Maximum outgoing friend requests allowed per minute. */
export const MAX_FRIEND_REQUESTS_PER_MINUTE = 10;

/** Maximum search results returned by player search (10). */
export const PLAYER_SEARCH_MAX_RESULTS = 10;

/** Maximum notifications retained in trainer profile history (10). */
export const MAX_NOTIFICATION_HISTORY_ITEMS = 10;

/** Maximum players fetched in leaderboard (100). */
export const LEADERBOARD_LIMIT = 100;

/** Maximum quantity allowed for a single shop purchase item entry (999). */
export const MAX_ITEM_PURCHASE_QTY = 999;

/** Shop price penalty multiplier applied to Team Rocket class members (1.20x). */
export const ROCKET_SHOP_PRICE_PENALTY_MULTIPLIER = 1.20;

/** Great Ball inventory count bonus multiplier (1.5x). */
export const GREAT_BALL_INVENTORY_COUNT_MULT = 1.5;

/** Ultra Ball inventory count bonus multiplier (2.0x). */
export const ULTRA_BALL_INVENTORY_COUNT_MULT = 2.0;

/** Maximum vigor points for a Pokémon (20). */
export const MAX_POKEMON_VIGOR = 20;

/** Criador class passive chance to restore vigor upon egg hatching (15%). */
export const CRIADOR_VIGOR_RESTORE_CHANCE = 0.15;

/** Default fallback PP for move initialization (20 PP). */
export const DEFAULT_MOVE_PP = 20;

/** Obey level caps mapped by number of defeated gym badges (0..8). */
export const OBEY_LEVEL_BY_BADGES: Record<number, number> = {
  0: 20,
  1: 25,
  2: 30,
  3: 35,
  4: 45,
  5: 55,
  6: 65,
  7: 75,
  8: 100
};

/** Expiry time in seconds for battle invitations (60s). */
export const BATTLE_INVITE_EXPIRY_SECONDS = 60;

// --- Chat System Constants ---
/** Max messages retained in global chat history buffer. */
export const CHAT_MAX_MESSAGES_HISTORY = 50;

/** Max messages retained in private chat history buffer per friend. */
export const PRIVATE_CHAT_MAX_MESSAGES = 25;

/** Maximum character length allowed for global chat messages. */
export const CHAT_MAX_MESSAGE_LENGTH = 180;

/** Maximum character length allowed for private chat messages. */
export const PRIVATE_CHAT_MAX_MESSAGE_LENGTH = 250;

/** Deduplication time window in ms for optimistic global messages (3000ms). */
export const CHAT_OPTIMISTIC_DEDUP_WINDOW_MS = 3000;

/** Minimum milliseconds between sending global/private chat messages (1000ms). */
export const CHAT_THROTTLE_INTERVAL_MS = 1000;

/** Time window in ms for deduplicating private chat history loading (2000ms). */
export const CHAT_DEDUP_TIME_WINDOW_MS = 2000;

/** Limit of recent messages checked when pruning old private chat DB entries. */
export const CHAT_PRUNE_MESSAGES_LIMIT = 1000;

