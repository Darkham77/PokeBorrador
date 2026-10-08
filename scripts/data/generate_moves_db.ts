/**
 * scripts/data/generate_moves_db.ts
 *
 * Precomputes static MoveBaseData for all moves registered in src/data/battle/moves.json.
 * Eliminates @pkmn/sim Dex overhead in browser runtime bundle for move data lookups.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { Dex } from '@pkmn/sim';
import { ACTIVE_GENERATION } from '../../src/data/system/constants.ts';
import movesJson from '../../src/data/battle/moves.json' with { type: 'json' };
import type { PokemonMoveId, MoveCategory } from '../../src/data/battle/moves.ts';

const OUTPUT_FILE = path.resolve(process.cwd(), 'src/data/battle/movesData.json');

const SHOWDOWN_BOOST_STAT_KEYS = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'] as const;
export type ShowdownBoostStatKey = (typeof SHOWDOWN_BOOST_STAT_KEYS)[number];

export interface StaticMoveEffect {
  boosts?: Partial<Record<ShowdownBoostStatKey, number>>;
  status?: string; // domain-ok: Open dynamic text or non-domain string payload
  volatileStatus?: string; // domain-ok: Open dynamic text or non-domain string payload
  sideCondition?: string; // domain-ok: Open dynamic text or non-domain string payload
  weather?: string; // domain-ok: Open dynamic text or non-domain string payload
  chance?: number;
  self?: StaticMoveEffect;
}

export interface StaticMoveEntry {
  id: string; // domain-ok: Showdown move identifier
  name: string; // domain-ok: Spanish move name
  power: number;
  acc: number;
  type: string; // domain-ok: Move elemental type
  cat: MoveCategory;
  pp: number;
  priority: number;
  boosts?: Partial<Record<ShowdownBoostStatKey, number>>;
  status?: string; // domain-ok: Open dynamic text or non-domain string payload
  volatileStatus?: string; // domain-ok: Open dynamic text or non-domain string payload
  sideCondition?: string; // domain-ok: Open dynamic text or non-domain string payload
  weather?: string; // domain-ok: Open dynamic text or non-domain string payload
  secondary?: StaticMoveEffect;
  secondaries?: (StaticMoveEffect | undefined)[];
  self?: StaticMoveEffect;
  selfKO?: boolean;
  recoil?: number;
  drain?: boolean;
  hits?: number | [number, number];
  ohko?: boolean;
  levelDmg?: boolean;
  fixedDmg?: number;
  halfHP?: boolean;
  endeavor?: boolean;
  counter?: boolean;
  sound?: boolean;
}

function cleanBoosts(boosts?: Partial<Record<ShowdownBoostStatKey, number>>): Partial<Record<ShowdownBoostStatKey, number>> | undefined {
  if (!boosts) return undefined;
  const res: Partial<Record<ShowdownBoostStatKey, number>> = {};
  for (const k of SHOWDOWN_BOOST_STAT_KEYS) {
    if (boosts[k] !== undefined) res[k] = boosts[k];
  }
  return Object.keys(res).length > 0 ? res : undefined;
}

interface RawEffect {
  boosts?: Partial<Record<ShowdownBoostStatKey, number>>;
  status?: string; // domain-ok: Open dynamic text or non-domain string payload
  volatileStatus?: string; // domain-ok: Open dynamic text or non-domain string payload
  chance?: number;
  self?: RawEffect;
}

function cleanEffect(eff?: RawEffect | null): StaticMoveEffect | undefined {
  if (!eff) return undefined;
  const res: StaticMoveEffect = {};
  const boosts = cleanBoosts(eff.boosts);
  if (boosts) res.boosts = boosts;
  if (eff.status) res.status = eff.status;
  if (eff.volatileStatus) res.volatileStatus = eff.volatileStatus;
  if (eff.chance !== undefined) res.chance = eff.chance;
  return Object.keys(res).length > 0 ? res : undefined;
}

const PERFECT_ACCURACY_FLAG = 1000;
const DRAGON_RAGE_FIXED_DAMAGE = 40;

type ShowdownMove = NonNullable<ReturnType<ReturnType<typeof Dex.forGen>['moves']['get']>>;

function applyMoveEffects(entry: StaticMoveEntry, move: ShowdownMove): void {
  const boosts = cleanBoosts(move.boosts as Partial<Record<ShowdownBoostStatKey, number>> | undefined);
  if (boosts) entry.boosts = boosts;
  if (move.status) entry.status = move.status;
  if (move.volatileStatus) entry.volatileStatus = move.volatileStatus;
  if (move.sideCondition) entry.sideCondition = move.sideCondition;
  if (move.weather) entry.weather = move.weather;

  const sec = cleanEffect(move.secondary as RawEffect | null | undefined);
  if (sec) {
    if (move.secondary?.self) {
      const selfEff = cleanEffect(move.secondary.self as RawEffect);
      if (selfEff) sec.self = selfEff;
    }
    entry.secondary = sec;
  }

  if (move.secondaries && move.secondaries.length > 0) {
    entry.secondaries = move.secondaries.map(s => cleanEffect(s as RawEffect)).filter(Boolean);
  }

  const selfHit = cleanEffect(move.self as RawEffect | null | undefined);
  if (selfHit) entry.self = selfHit;
}

function applySpecialMoveFlags(id: string, entry: StaticMoveEntry, move: ShowdownMove): void {
  if (move.selfdestruct === 'always') entry.selfKO = true;
  if (move.recoil) {
    entry.recoil = move.recoil[0] === 1 && move.recoil[1] === 4 ? 4 : 3;
  }
  if (move.drain) entry.drain = true;
  if (move.multihit) {
    entry.hits = Array.isArray(move.multihit) ? [move.multihit[0], move.multihit[1]] : move.multihit;
  }
  if (move.ohko) entry.ohko = true;
  if (move.damage === 'level') {
    entry.levelDmg = true;
  } else if (typeof move.damage === 'number') {
    entry.fixedDmg = move.damage;
  }
  if (id === 'superfang' || id === 'super_fang') entry.halfHP = true;
  if (id === 'endeavor') entry.endeavor = true;
  if (id === 'counter') entry.counter = true;
  if (id === 'dragonrage' || id === 'dragon_rage') entry.fixedDmg = DRAGON_RAGE_FIXED_DAMAGE;
  if (move.flags && move.flags.sound) entry.sound = true;
}

function resolveMoveCategory(rawCategory: string): MoveCategory {
  if (rawCategory === 'Physical') return 'physical';
  if (rawCategory === 'Special') return 'special';
  return 'status';
}

function resolveMoveAccuracy(acc: boolean | number): number {
  if (acc === true) return PERFECT_ACCURACY_FLAG;
  if (typeof acc === 'number') return acc;
  return 100;
}

function resolveMoveType(rawType: string): string {
  const normalized = (rawType || 'Normal').toLowerCase();
  return normalized;
}

function buildRechargeMoveEntry(id: string, trans: { name?: string }): StaticMoveEntry {
  return {
    id,
    name: trans.name ? trans.name : 'Recargando',
    power: 0,
    acc: PERFECT_ACCURACY_FLAG,
    type: 'normal',
    cat: 'status',
    pp: 0,
    priority: 0
  };
}

function buildFallbackMoveEntry(id: string, name: string): StaticMoveEntry {
  return {
    id,
    name,
    power: 0,
    acc: PERFECT_ACCURACY_FLAG,
    type: 'normal',
    cat: 'status',
    pp: 35,
    priority: 0
  };
}

function buildMoveEntry(id: string, trans: { name?: string }, move: ShowdownMove | undefined): StaticMoveEntry {
  const fallbackName = move?.exists ? move.name : id;
  const espName = trans.name ? trans.name : fallbackName;

  if (id === 'recharge') return buildRechargeMoveEntry(id, trans);
  if (!move || !move.exists) return buildFallbackMoveEntry(id, espName);

  const entry: StaticMoveEntry = {
    id: move.id,
    name: espName,
    power: move.basePower || 0,
    acc: resolveMoveAccuracy(move.accuracy),
    type: resolveMoveType(move.type),
    cat: resolveMoveCategory(move.category),
    pp: move.pp || 35,
    priority: move.priority || 0
  };

  applyMoveEffects(entry, move);
  applySpecialMoveFlags(id, entry, move);
  return entry;
}

export async function generateMovesDatabase(): Promise<void> {
  const result: Partial<Record<PokemonMoveId, StaticMoveEntry>> = {};

  for (const [id, trans] of Object.entries(movesJson)) {
    const move = Dex.forGen(ACTIVE_GENERATION).moves.get(id);
    const moveId = requirePokemonMoveId(id);
    result[moveId] = buildMoveEntry(id, trans, move as ShowdownMove | undefined);
  }

  const jsonContent = JSON.stringify(result, null, 2);
  await fs.writeFile(OUTPUT_FILE, jsonContent, 'utf8');
  console.log(`⚡ [MovesDB Generator] Generado ${OUTPUT_FILE} (${Object.keys(result).length} movimientos).`);
}

if (process.argv[1]?.endsWith('generate_moves_db.ts')) {
  generateMovesDatabase().catch(err => {
    console.error('❌ [MovesDB Generator] Error fatal:', err);
    process.exit(1);
  });
}
