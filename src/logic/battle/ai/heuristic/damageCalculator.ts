// ============================================================
// Damage Calculator — wraps @smogon/calc
// Adapted from external/pokemon-showdown-ai/src/calculator/damage.ts
// ============================================================

import { Generations, Pokemon, Move, Field, calculate, type Result, type GenerationNum } from '@smogon/calc';
import { toID } from '@pkmn/sim';
import { requireItemId } from '../../../../data/inventory/items.ts';
import { requireAbilityId } from '../../../../data/battle/abilities.ts';
import type { HeuristicPokemonState, HeuristicFieldState, DamageResult, DamageMatchup, HeuristicMoveInfo, HeuristicBattleSnapshot } from './types.ts';

// Priority moves (positive = priority, negative = delayed, protection = high positive)
const PRIORITY_MAP: Record<string, number> = {
  // High Priority Status / Protection
  protect: 4, detect: 4, spikyshield: 4, kingsshield: 4, banefulbunker: 4, obstruct: 4,
  fakeout: 3, upperhand: 3,
  extremespeed: 2, firstimpression: 2, feint: 2, allyswitch: 2,
  accelerock: 1, aquajet: 1, bulletpunch: 1, iceshard: 1,
  machpunch: 1, quickattack: 1, shadowsneak: 1, suckerpunch: 1,
  jetpunch: 1, thunderclap: 1, watershuriken: 1, vacuumwave: 1,
  bide: 1,
  // Negative Priority
  vitalthrow: -1, trick: -1,
  focuspunch: -3,
  avalanche: -4, revenge: -4,
  roar: -6, whirlwind: -6, dragontail: -6, circlethrow: -6,
  trickroom: -7,
};

const CACHE_MAX_SIZE = 2048;

import { ACTIVE_GENERATION } from '../../../../data/system/constants.ts';

export class HeuristicDamageCalculator {
  private readonly gen;
  private readonly cache = new Map<string, DamageResult>();
  private readonly cacheOrder: string[] = [];

  constructor(generation: GenerationNum = ACTIVE_GENERATION as GenerationNum) {
    this.gen = Generations.get(generation);
  }

  calcDamage(
    attacker: HeuristicPokemonState,
    defender: HeuristicPokemonState,
    moveId: string,
    field: HeuristicFieldState,
  ): DamageResult {
    const key = this.cacheKey(attacker, defender, moveId, field);
    const cached = this.cache.get(key);
    if (cached) return cached;

    try {
      const result = calculate(
        this.gen,
        this.toPokemon(attacker),
        this.toPokemon(defender),
        new Move(this.gen, moveId),
        this.toField(field),
      );
      const dmg = this.parseResult(result, moveId, attacker.name, defender.name);
      this.addToCache(key, dmg);
      return dmg;
    } catch {
      return this.fallback(moveId, attacker.name, defender.name);
    }
  }

  calcMatchup(
    snapshot: HeuristicBattleSnapshot,
    availableMoves: HeuristicMoveInfo[],
    inferredOpponentMoves?: Map<string, number>,
  ): DamageMatchup {
    const my = snapshot.mySide.activePokemon;
    const opp = snapshot.opponentSide.activePokemon;
    if (!my || !opp) return { myAttacking: [], oppAttacking: [] };

    const myAttacking: DamageResult[] = [];
    for (const m of availableMoves) {
      if (m.disabled || m.pp <= 0) continue;
      myAttacking.push(this.calcDamage(my, opp, m.id, snapshot.field));
    }

    const oppMoves = new Set<string>(opp.knownMoves);
    if (inferredOpponentMoves) {
      for (const [mv, prob] of inferredOpponentMoves) {
        if (prob >= 0.3) oppMoves.add(mv);
      }
    }

    const oppAttacking: DamageResult[] = [];
    for (const mv of oppMoves) {
      try { oppAttacking.push(this.calcDamage(opp, my, mv, snapshot.field)); } catch { /* skip */ }
    }

    myAttacking.sort((a, b) => b.maxPercent - a.maxPercent);
    oppAttacking.sort((a, b) => b.maxPercent - a.maxPercent);
    return { myAttacking, oppAttacking };
  }

  getEffectiveSpeed(pokemon: HeuristicPokemonState, field: HeuristicFieldState, side: 'p1' | 'p2'): number {
    let spd = pokemon.stats.spe || 100;
    const boost = pokemon.boosts.spe;
    if (boost > 0) spd = Math.floor(spd * (2 + boost) / 2);
    else if (boost < 0) spd = Math.floor(spd * 2 / (2 - boost));
    if (pokemon.status === 'par') spd = Math.floor(spd * 0.5);
    if (field.tailwind[side] > 0) spd *= 2;
    if (field.trickRoom) spd = -spd;
    return spd;
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheOrder.length = 0;
  }

  // ──────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────

  private toPokemon(p: HeuristicPokemonState): Pokemon {
    const species = this.resolveSpecies(p.species);

    const opts: Record<string, unknown> = {
      level: p.level || 50,
      curHP: p.hp > 0 ? p.hp : Math.max(1, Math.round(p.hpPercent * 3)),
      boosts: { atk: p.boosts.atk, def: p.boosts.def, spa: p.boosts.spa, spd: p.boosts.spd, spe: p.boosts.spe },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    };

    // Held item — validate strictly with requireItemId if present and map to Smogon name
    if (!p.itemConsumed) {
      const rawItem = p.knownItem || p.item;
      if (rawItem) {
        const canonicalId = requireItemId(rawItem);
        opts['item'] = this.gen.items.get(toID(canonicalId))?.name;
      }
    }

    const rawAbility = p.knownAbility || p.ability;
    if (rawAbility) {
      const canonicalId = requireAbilityId(rawAbility);
      opts['ability'] = this.gen.abilities.get(toID(canonicalId))?.name;
    }

    if (p.status) opts['status'] = p.status;

    try {
      return new Pokemon(this.gen, species, opts);
    } catch {
      return new Pokemon(this.gen, species, { level: p.level || 50 });
    }
  }

  private toField(f: HeuristicFieldState): Field {
    const opts: Record<string, unknown> = {};
    if (f.weather) {
      const wmap: Record<string, string> = {
        sunnyday: 'Sun', desolateland: 'Harsh Sunshine',
        raindance: 'Rain', primordialsea: 'Heavy Rain',
        sandstorm: 'Sand', snowscape: 'Snow', hail: 'Hail',
      };
      const mapped = wmap[f.weather];
      if (mapped) opts['weather'] = mapped;
    }
    if (f.terrain) {
      const tmap: Record<string, string> = {
        electricterrain: 'Electric', grassyterrain: 'Grassy',
        mistyterrain: 'Misty', psychicterrain: 'Psychic',
      };
      const mapped = tmap[f.terrain];
      if (mapped) opts['terrain'] = mapped;
    }
    return new Field(opts);
  }

  private resolveSpecies(species: string): string {
    const map: Record<string, string> = {
      nidoranf: 'Nidoran-F', nidoranm: 'Nidoran-M',
      farfetchd: "Farfetch'd", mrmime: 'Mr. Mime',
      hooh: 'Ho-Oh', jangmoo: 'Jangmo-o',
    };
    return map[toID(species)] ?? (species.charAt(0).toUpperCase() + species.slice(1));
  }

  private parseResult(result: Result, moveId: string, attacker: string, defender: string): DamageResult {
    const damage = result.damage;
    let min = 0, max = 0;

    if (typeof damage === 'number') {
      min = max = damage;
    } else if (Array.isArray(damage)) {
      if (Array.isArray(damage[0])) {
        const hits = damage as number[][];
        min = hits.reduce((s, h) => s + Math.min(...h), 0);
        max = hits.reduce((s, h) => s + Math.max(...h), 0);
      } else {
        const nums = damage as number[];
        min = Math.min(...nums);
        max = Math.max(...nums);
      }
    }

    const defMaxHp = result.defender.originalCurHP || result.defender.maxHP();
    const minPct = defMaxHp > 0 ? (min / defMaxHp) * 100 : 0;
    const maxPct = defMaxHp > 0 ? (max / defMaxHp) * 100 : 0;
    const curPct = defMaxHp > 0 ? (result.defender.curHP() / defMaxHp) * 100 : 100;

    return {
      move: moveId,
      attacker,
      defender,
      minPercent: minPct,
      maxPercent: maxPct,
      isOHKO: minPct >= curPct,
      is2HKO: minPct * 2 >= curPct,
      priority: PRIORITY_MAP[toID(moveId)] ?? 0,
    };
  }

  private fallback(moveId: string, attacker: string, defender: string): DamageResult {
    return { move: moveId, attacker, defender, minPercent: 0, maxPercent: 0, isOHKO: false, is2HKO: false, priority: PRIORITY_MAP[toID(moveId)] ?? 0 };
  }

  private cacheKey(a: HeuristicPokemonState, d: HeuristicPokemonState, mv: string, f: HeuristicFieldState): string {
    return `${a.species}:${a.ability}:${a.item}:${a.status}:${JSON.stringify(a.boosts)}|` +
      `${d.species}:${d.ability}:${d.item}:${d.status}:${d.hpPercent.toFixed(0)}:${JSON.stringify(d.boosts)}|` +
      `${mv}|${f.weather ?? ''}:${f.terrain ?? ''}:${f.trickRoom}`;
  }

  private addToCache(key: string, result: DamageResult): void {
    if (this.cache.size >= CACHE_MAX_SIZE) {
      const toRemove = this.cacheOrder.splice(0, Math.floor(CACHE_MAX_SIZE * 0.25));
      for (const k of toRemove) this.cache.delete(k);
    }
    this.cache.set(key, result);
    this.cacheOrder.push(key);
  }
}
