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

const OUTPUT_FILE = path.resolve(process.cwd(), 'src/data/battle/movesData.json');

const SHOWDOWN_BOOST_STAT_KEYS = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'] as const;

function cleanBoosts(boosts?: Partial<Record<string, number>>) { // open-record: Generic key-value data dictionary container
  if (!boosts) return undefined;
  const res: Record<string, number> = {}; // open-record: Generic key-value data dictionary container
  for (const k of SHOWDOWN_BOOST_STAT_KEYS) {
    if (boosts[k] !== undefined) res[k] = boosts[k]!;
  }
  return Object.keys(res).length > 0 ? res : undefined;
}

interface RawEffect {
  boosts?: Partial<Record<string, number>>; // open-record: Generic key-value data dictionary container
  status?: string; // domain-ok: Open dynamic text or non-domain string payload
  volatileStatus?: string; // domain-ok: Open dynamic text or non-domain string payload
  chance?: number;
  self?: RawEffect;
}

function cleanEffect(eff?: RawEffect | null) {
  if (!eff) return undefined;
  const res: Record<string, unknown> = {}; // open-record: Generic key-value data dictionary container
  const boosts = cleanBoosts(eff.boosts);
  if (boosts) res.boosts = boosts;
  if (eff.status) res.status = eff.status;
  if (eff.volatileStatus) res.volatileStatus = eff.volatileStatus;
  if (eff.chance !== undefined) res.chance = eff.chance;
  return Object.keys(res).length > 0 ? res : undefined;
}

export async function generateMovesDatabase(): Promise<void> {
  const result: Record<string, unknown> = {}; // open-record: Generic key-value data dictionary container
  const PERFECT_ACCURACY_FLAG = 1000;
  const DRAGON_RAGE_FIXED_DAMAGE = 40;

  for (const [id, trans] of Object.entries(movesJson)) {
    const move = Dex.forGen(ACTIVE_GENERATION).moves.get(id) || Dex.moves.get(id);
    const espName = trans.name || (move?.exists ? move.name : id);

    if (id === 'recharge') {
      result[id] = {
        id,
        name: espName || 'Recargando',
        power: 0,
        acc: PERFECT_ACCURACY_FLAG,
        type: 'normal',
        cat: 'status',
        pp: 0,
        priority: 0
      };
      continue;
    }

    if (!move || !move.exists) {
      result[id] = {
        id,
        name: espName,
        power: 0,
        acc: PERFECT_ACCURACY_FLAG,
        type: 'normal',
        cat: 'status',
        pp: 35,
        priority: 0
      };
      continue;
    }

    const cat = move.category === 'Physical' ? 'physical' : move.category === 'Special' ? 'special' : 'status';
    const entry: Record<string, unknown> = { // open-record: Generic key-value data dictionary container
      id: move.id,
      name: espName,
      power: move.basePower || 0,
      acc: move.accuracy === true ? PERFECT_ACCURACY_FLAG : (typeof move.accuracy === 'number' ? move.accuracy : 100),
      type: move.type === 'Grass' ? 'grass' : move.type === 'Fire' ? 'fire' : move.type === 'Water' ? 'water' : (move.type || 'Normal').toLowerCase(), // domain-ok: Open dynamic text or non-domain string payload
      cat,
      pp: move.pp || 35,
      priority: move.priority || 0
    };

    const boosts = cleanBoosts(move.boosts);
    if (boosts) entry.boosts = boosts;
    if (move.status) entry.status = move.status;
    if (move.volatileStatus) entry.volatileStatus = move.volatileStatus;
    if (move.sideCondition) entry.sideCondition = move.sideCondition;
    if (move.weather) entry.weather = move.weather;

    const sec = cleanEffect(move.secondary);
    if (sec) {
      if (move.secondary?.self) {
        const selfEff = cleanEffect(move.secondary.self);
        if (selfEff) (sec as Record<string, unknown>).self = selfEff; // open-record: Generic key-value data dictionary container
      }
      entry.secondary = sec;
    }

    if (move.secondaries && move.secondaries.length > 0) {
      entry.secondaries = move.secondaries.map(cleanEffect).filter(Boolean);
    }

    const selfHit = cleanEffect(move.self);
    if (selfHit) entry.self = selfHit;

    if (move.selfdestruct === 'always') entry.selfKO = true;
    if (move.recoil) {
      entry.recoil = move.recoil[0] === 1 && move.recoil[1] === 4 ? 4 : 3;
    }
    if (move.drain) entry.drain = true;
    if (move.multihit) {
      if (Array.isArray(move.multihit)) {
        entry.hits = [move.multihit[0], move.multihit[1]];
      } else {
        entry.hits = move.multihit;
      }
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

    result[id] = entry;

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
