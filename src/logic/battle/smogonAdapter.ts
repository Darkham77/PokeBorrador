/**
 * Shared @smogon/calc adapter for move damage tooltips.
 * Wraps calculate() with actual game stats, field conditions,
 * and a 512-entry LRU cache.
 */
import {
  Generations,
  Pokemon as SmogonPokemon,
  Move   as SmogonMove,
  Field,
  Side,
  calculate,
  type GenerationNum,
  type State,
} from '@smogon/calc';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages } from '@/types/battle/battle';
import type { Move } from '@/types/pokemon/pokemon';
import { ACTIVE_GENERATION } from '@/data/system/constants';
import { toID } from '@pkmn/sim';

const GEN = Generations.get(ACTIVE_GENERATION as GenerationNum);

// ── Public result type ────────────────────────────────────────────────────────

export interface SmogonTooltipResult {
  /** Minimum damage dealt (absolute HP). */
  minDmg: number;
  /** Maximum damage dealt (absolute HP). */
  maxDmg: number;
  /** Minimum damage as % of defender's max HP. */
  minPercent: number;
  /** Maximum damage as % of defender's max HP. */
  maxPercent: number;
  /** Critical-hit minimum damage. */
  critMinDmg: number;
  /** Critical-hit maximum damage. */
  critMaxDmg: number;
  critMinPercent: number;
  critMaxPercent: number;
  /** KO probability info from @smogon/calc. */
  koChance: { chance: number | undefined; n: number };
  /** Recovery (HP healed by attacker) as % of attacker's max HP. */
  recovery: { min: number; max: number; text: string };
  /** Recoil (HP lost by attacker) as % of attacker's max HP. */
  recoil: { min: number; max: number; text: string };
}

// ── LRU cache (512 entries) ───────────────────────────────────────────────────

const CACHE_SIZE = 512;
const cache = new Map<string, SmogonTooltipResult>();
const cacheOrder: string[] = [];

function addToCache(key: string, result: SmogonTooltipResult): void {
  if (cache.size >= CACHE_SIZE) {
    const toEvict = cacheOrder.splice(0, Math.floor(CACHE_SIZE * 0.25));
    for (const k of toEvict) cache.delete(k);
  }
  cache.set(key, result);
  cacheOrder.push(key);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map special-case species IDs. Same as AI's damageCalculator. */
function resolveSpecies(id: string): string {
  const map: Record<string, string> = {
    nidoranf: 'Nidoran-F', nidoranm: 'Nidoran-M',
    farfetchd: "Farfetch'd", mrmime: 'Mr. Mime',
    hooh: 'Ho-Oh', jangmoo: 'Jangmo-o',
  };
  const normalized = toID(id);
  return map[normalized] ?? (id.charAt(0).toUpperCase() + id.slice(1));
}

function toSmogonStatus(
  status: string | null | undefined
): '' | 'par' | 'brn' | 'psn' | 'slp' | 'frz' | 'tox' {
  if (!status) return '';
  const s = status.toLowerCase();
  if (s === 'par' || s === 'brn' || s === 'psn' || s === 'slp' || s === 'frz' || s === 'tox') {
    return s as 'par' | 'brn' | 'psn' | 'slp' | 'frz' | 'tox';
  }
  return '';
}

/**
 * Build a SmogonPokemon from a game Pokemon, injecting the actual computed
 * stats into rawStats to bypass @smogon/calc's EV/IV formula. This ensures
 * tooltip damage matches the adventure-mode custom stat spreads.
 */
function buildSmogonPokemon(
  p: Pokemon,
  stages: Partial<BattleStages>,
  isCrit = false
): SmogonPokemon {
  const speciesName = resolveSpecies(p.id);
  let pkmn: SmogonPokemon;
  try {
    pkmn = new SmogonPokemon(GEN, speciesName, {
      level: p.level,
      ability: GEN.abilities.get(toID(p.ability ?? ''))?.name,
      item: GEN.items.get(toID(p.heldItem ?? p.item ?? ''))?.name,
      status: toSmogonStatus(p.status),
      boosts: {
        atk: stages.atk ?? 0,
        def: stages.def ?? 0,
        spa: stages.spa ?? 0,
        spd: stages.spd ?? 0,
        spe: stages.spe ?? 0,
        hp: 0,
      },
      curHP: p.hp,
      // Pass isCrit via boosts is not possible directly; handled in Move
    });
  } catch {
    pkmn = new SmogonPokemon(GEN, 'Bulbasaur', { level: p.level });
  }

  // Inject actual game stats, bypassing the base-stat + EV/IV formula.
  // rawStats is a public mutable property on SmogonPokemon.
  pkmn.rawStats.hp  = p.maxHp;
  pkmn.rawStats.atk = p.atk;
  pkmn.rawStats.def = p.def;
  pkmn.rawStats.spa = p.spa;
  pkmn.rawStats.spd = p.spd;
  pkmn.rawStats.spe = p.spe;

  // Inject into stats as well since the Smogon calculator evaluates this directly.
  pkmn.stats.hp  = p.maxHp;
  pkmn.stats.atk = p.atk;
  pkmn.stats.def = p.def;
  pkmn.stats.spa = p.spa;
  pkmn.stats.spd = p.spd;
  pkmn.stats.spe = p.spe;

  pkmn.originalCurHP = Math.min(p.hp, p.maxHp);

  // Override clone() to ensure custom stats are not reset when cloned by the calculator.
  pkmn.clone = function() {
    const c = SmogonPokemon.prototype.clone.call(this);
    c.rawStats = { ...this.rawStats };
    c.stats = { ...this.stats };
    c.originalCurHP = this.originalCurHP;
    c.clone = this.clone;
    return c;
  };

  void isCrit; // crit is handled on the Move object
  return pkmn;
}

const WEATHER_MAP: Record<string, State.Field['weather']> = {
  sun:           'Sun',
  rain:          'Rain',
  sandstorm:     'Sand',
  hail:          'Hail',
  snow:          'Snow',
  intense_sun:   'Harsh Sunshine',
  heavy_rain:    'Heavy Rain',
  strong_winds:  'Strong Winds',
};

const TERRAIN_MAP: Record<string, State.Field['terrain']> = {
  'Electric Terrain': 'Electric',
  'Grassy Terrain':   'Grassy',
  'Misty Terrain':    'Misty',
  'Psychic Terrain':  'Psychic',
};

function buildField(state: TooltipStateCtx): Field {
  const sc = state.playerSideConditions ?? {};
  const ec = state.enemySideConditions ?? {};

  const attackerSide = new Side({
    isReflect:     !!sc['reflect'],
    isLightScreen: !!sc['lightscreen'],
    isAuroraVeil:  !!sc['auroraveil'],
    isTailwind:    !!sc['tailwind'],
    isSR:          !!sc['stealthrock'],
    spikes:        Math.min(3, sc['spikes']?.turns ?? 0),
  });
  const defenderSide = new Side({
    isReflect:     !!ec['reflect'],
    isLightScreen: !!ec['lightscreen'],
    isAuroraVeil:  !!ec['auroraveil'],
    isTailwind:    !!ec['tailwind'],
    isSR:          !!ec['stealthrock'],
    spikes:        Math.min(3, ec['spikes']?.turns ?? 0),
  });

  const weather = state.isGym
    ? undefined
    : WEATHER_MAP[state.weather?.type ?? ''];

  const terrain = state.terrain
    ? TERRAIN_MAP[state.terrain]
    : undefined;

  return new Field({ weather, terrain, attackerSide, defenderSide });
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface TooltipStateCtx {
  weather?: { type: string; turns: number } | null;
  terrain?: string | null;
  playerSideConditions?: Record<string, { turns: number; [key: string]: unknown }>;
  enemySideConditions?: Record<string, { turns: number; [key: string]: unknown }>;
  isGym?: boolean;
}

/**
 * Calculate tooltip damage for a move, including normal and crit ranges,
 * KO chance, recovery, and recoil. Returns null if calculation fails.
 *
 * Cached with a 512-entry LRU per (attacker, defender, move, field) key.
 */
export function calculateDamageForTooltip(
  attacker:     Pokemon,
  defender:     Pokemon,
  move:         Move,
  state:        TooltipStateCtx,
  playerStages: Partial<BattleStages>,
  enemyStages:  Partial<BattleStages>
): SmogonTooltipResult | null {
  const moveId = toID(move.id ?? move.name ?? '');
  if (!moveId) return null;

  const cacheKey = [
    attacker.uid, attacker.hp, attacker.status ?? '',
    JSON.stringify(playerStages),
    defender.uid, defender.hp, defender.status ?? '',
    JSON.stringify(enemyStages),
    moveId,
    state.weather?.type ?? '', state.terrain ?? '',
    state.isGym ? '1' : '0',
    JSON.stringify(state.playerSideConditions ?? {}),
    JSON.stringify(state.enemySideConditions ?? {}),
  ].join('|');

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const atkPkmn  = buildSmogonPokemon(attacker, playerStages);
    const defPkmn  = buildSmogonPokemon(defender,  enemyStages);
    const field    = buildField(state);
    const smMove   = new SmogonMove(GEN, moveId);
    const smMoveCrit = new SmogonMove(GEN, moveId, { isCrit: true });

    const result     = calculate(GEN, atkPkmn, defPkmn, smMove, field);

    // For crit we rebuild the Pokemon objects to get fresh rawStats
    const atkPkmnC = buildSmogonPokemon(attacker, playerStages);
    const defPkmnC = buildSmogonPokemon(defender,  enemyStages);
    const resultCrit = calculate(GEN, atkPkmnC, defPkmnC, smMoveCrit, field);

    const [minDmg, maxDmg]         = result.range();
    const [critMinDmg, critMaxDmg] = resultCrit.range();
    const defMaxHp = defender.maxHp;

    const pct = (v: number) => defMaxHp > 0 ? (v / defMaxHp) * 100 : 0;

    const koChance = result.kochance(false);
    const recovery = result.recovery();
    const recoil   = result.recoil();

    const atkMaxHp = attacker.maxHp;
    const recMin = typeof recovery.recovery[0] === 'number' ? recovery.recovery[0] : 0;
    const recMax = typeof recovery.recovery[1] === 'number' ? recovery.recovery[1] : 0;
    // recoil.recoil can be a number (%) or [min%, max%]; normalize to HP values
    const rcl = recoil.recoil;
    const rclMin = Array.isArray(rcl) ? (atkMaxHp * Number(rcl[0])) / 100 : (atkMaxHp * Number(rcl)) / 100;
    const rclMax = Array.isArray(rcl) ? (atkMaxHp * Number(rcl[1])) / 100 : (atkMaxHp * Number(rcl)) / 100;

    const out: SmogonTooltipResult = {
      minDmg,
      maxDmg,
      minPercent: pct(minDmg),
      maxPercent: pct(maxDmg),
      critMinDmg,
      critMaxDmg,
      critMinPercent: pct(critMinDmg),
      critMaxPercent: pct(critMaxDmg),
      koChance: { chance: koChance.chance, n: koChance.n },
      recovery: { min: recMin, max: recMax, text: recovery.text },
      recoil:   { min: rclMin, max: rclMax, text: recoil.text },
    };

    addToCache(cacheKey, out);
    return out;
  } catch {
    return null;
  }
}
