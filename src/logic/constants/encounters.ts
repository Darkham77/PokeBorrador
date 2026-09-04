/**
 * ENCOUNTER & FISHING CONSTANTS (SINGLE SOURCE OF TRUTH)
 * Centralized constant definitions for wild encounter rates, repel modifiers, and fishing budgets.
 */

/** Encounter rate modifier applied when a standard Repel item is active (-50%). */
export const REPEL_ENCOUNTER_RATE_MODIFIER = -50;

/** Encounter rate modifier applied when a Super Repel item is active (-80%). */
export const SUPER_REPEL_ENCOUNTER_RATE_MODIFIER = -80;

/** Encounter rate modifier applied when a Max Repel item is active (-100%). */
export const MAX_REPEL_ENCOUNTER_RATE_MODIFIER = -100;

/** Standard map biome keys array for environmental lookups. */
export const MAP_BIOME_KEYS = [
  'isArctic', 'isIndoors', 'isUrban', 'isVolcanic', 'isCrystalCave', 'isCave',
  'isDesert', 'isSwamp', 'isMountain',
  'isCoastal', 'isForest', 'isPlains'
] as const;
export type MapBiomeKey = (typeof MAP_BIOME_KEYS)[number];

/** Weather map normalization dictionary for Showdown weather IDs. */
export const WEATHER_MAP: Record<string, string> = {
  sunnyday: 'Sun',
  desolateland: 'Desolate Land',
  raindance: 'Rain',
  primordialsea: 'Primordial Sea',
  sandstorm: 'Sandstorm',
  hail: 'Hail',
  snow: 'Snow',
  deltastream: 'Delta Stream',
};

/** Spawn budget weight for fishing with a Super Rod. */
export const SUPER_ROD_SPAWN_BUDGET = 20;

/** Spawn budget weight for fishing with a Standard/Good Rod. */
export const STANDARD_ROD_SPAWN_BUDGET = 10;

/** Default fishing spawn rate weight multiplier. */
export const DEFAULT_FISHING_RATE_WEIGHT = 10;

/** Default spawn weight for exclusive weather wild species. */
export const DEFAULT_EXCLUSIVE_SPAWN_WEIGHT = 5;

export const DEFAULT_VISITOR_SPAWN_WEIGHT = 10;

/** Setup boost move IDs for Heuristic AI evaluation. */
const SETUP_MOVES_LIST = [
  'swordsdance', 'nastyplot', 'dragondance', 'calmmind', 'quiverdance',
  'shellsmash', 'bulkup', 'bellydrum', 'coil', 'shiftgear', 'workup',
] as const;
export const SETUP_MOVES: ReadonlySet<string> = new Set<string>(SETUP_MOVES_LIST); // runtime-set: Fast O(1) membership lookup set

/** Priority move IDs for Heuristic AI threat calculation. */
const PRIORITY_MOVES_LIST = [
  'extremespeed', 'suckerpunch', 'machpunch', 'bulletpunch', 'iceshard',
  'shadowsneak', 'aquajet', 'accelerock', 'watershuriken', 'firstimpression',
  'grassyglide', 'thunderclap', 'jetpunch',
] as const;
export const PRIORITY_MOVES: ReadonlySet<string> = new Set<string>(PRIORITY_MOVES_LIST); // runtime-set: Fast O(1) membership lookup set

/** Heuristic AI threat calculation weight for speed. */
export const THREAT_WEIGHT_SPEED = 0.35;

/** Heuristic AI threat calculation weight for damage. */
export const THREAT_WEIGHT_DAMAGE = 0.35;

/** Heuristic AI threat calculation weight for setup moves. */
export const THREAT_WEIGHT_SETUP = 0.15;

/** Heuristic AI threat calculation weight for defensive walls. */
export const THREAT_WEIGHT_DEFENSIVE_WALL = 0.15;

/** Debug 50% trainer encounter override probability. */
export const DEBUG_TRAINER_OVERRIDE_CHANCE = 0.50;

/** Debug 80% guardian encounter override probability. */
export const DEBUG_GUARDIAN_OVERRIDE_CHANCE = 0.80;


/** Maximum attempts for repellent level-filtered wild encounter selection. */
export const REPELLENT_MAX_ATTEMPTS = 10;

/** Fallback minimum level for wild encounters. */
export const DEFAULT_WILD_MIN_LEVEL = 2;

/** Fallback maximum level for wild encounters. */
export const DEFAULT_WILD_MAX_LEVEL = 5;

/** Fallback minimum level for archaeology encounters. */
export const DEFAULT_ARCHAEOLOGY_MIN_LEVEL = 15;

/** Fallback maximum level for archaeology encounters. */
export const DEFAULT_ARCHAEOLOGY_MAX_LEVEL = 25;

/** Fishing weight multiplier applied during rainy weather conditions. */
export const RAINY_WEATHER_FISHING_MULTIPLIER = 1.20;

/** Base weight for ground encounters. */
export const GROUND_ENCOUNTER_BASE_WEIGHT = 100;

/** Weight multiplier scale for fishing encounters. */
export const FISHING_WEIGHT_SCALE = 100;

/** Additional encounter weight granted when appropriate tool (rod/pickaxe/brush) is active. */
export const EQUIPPED_TOOL_ENCOUNTER_BONUS_WEIGHT = 600;

/** Base archaeology encounter weight in cave locations. */
export const CAVE_ARCHAEOLOGY_WEIGHT = 10;

/** Base archaeology encounter weight in mountain locations. */
export const MOUNTAIN_ARCHAEOLOGY_WEIGHT = 5;

/** Denominator divisor used to calculate legendary rate probability cap. */
export const LEGENDARY_RATE_CAP_DENOMINATOR = 99;

/** Replacement weight for visitor species assigned weight -1. */
export const VISITOR_WEIGHT_REPLACEMENT_VALUE = 5;

/** Standard 100 multiplier for converting fraction to percentage. */
export const PERCENTAGE_SCALE_FACTOR = 100;

/** Default spawn rate weight when omitted. */
export const DEFAULT_SPAWN_RATE_WEIGHT = 10;

/** Default neutral weather multiplier (1.0). */
export const DEFAULT_WEATHER_MULTIPLIER_NORMAL = 1.0;

/** Debug trainer encounter chance percentage (50%). */
export const DEBUG_TRAINER_CHANCE_PERCENT = 50;

/** Percentage multiplier factor (100). */
export const PERCENTAGE_MULTIPLIER_FACTOR = 100;

/** Debug move base power (40). */
export const DEBUG_MOVE_BASE_POWER = 40;
