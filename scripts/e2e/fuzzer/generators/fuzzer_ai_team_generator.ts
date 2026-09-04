// scripts/e2e/fuzzer/generators/fuzzer_ai_team_generator.ts
//
// Generates batches of random Gen 9 battles for the AI vs AI fuzzer.
// Both teams are fully random: 6 Pokémon at MAX_POKEMON_LEVEL with valid
// learnset-based movesets, calculated stats, and UIDs.
//
import { Dex, toID } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import crypto from 'node:crypto';
import { getShowdownNickname } from '../../../../src/logic/battle/showdownUidMapper.ts';
import { MAX_POKEMON_LEVEL, ACTIVE_GENERATION } from '../../../../src/data/system/constants.ts';

export interface AiBattleBatch {
  id: string;
  p1Team: PokemonSet[];
  p2Team: PokemonSet[];
}

const dexGen = Dex.forGen(ACTIVE_GENERATION);

// ---------------------------------------------------------------------------
// Species pool: all non-nonstandard Gen 9 species that are not cosmetic forms
// ---------------------------------------------------------------------------
const SPECIES_POOL: string[] = dexGen.species // no-domain: Non-domain utility collection or data structure
  .all()
  .filter(s => s.exists && !s.isNonstandard && !s.forme?.includes('Totem') && !s.battleOnly)
  .map(s => s.id);

// ---------------------------------------------------------------------------
// Build a learnset-valid moveset for the given species at max level.
// Falls back to general move pool if the species has no usable learnable moves.
// ---------------------------------------------------------------------------
// Moves that cause self-faint, immediate loss, or extreme recoil that ends
// battles on turn 1 — excluded from random AI movesets.
const SELF_KO_MOVES = new Set([
  // Self-faint
  'selfdestruct', 'explosion', 'mistyexplosion',
  'healingwish', 'lunardance', 'memento',
  'perishsong', 'destinybond', 'finalgambit',
  // Extreme recoil (≥33% user HP) — KOs fragile Pokémon in 1-2 hits
  'headsmash', 'volttackle', 'flareblitz', 'woodhammer',
  'doubleedge', 'bravebird', 'takedown',
]);

/** Returns true if the move is safe for extended simulation (no self-faint or extreme recoil). */
function isSafeMove(moveId: string): boolean {
  return !SELF_KO_MOVES.has(moveId);
}

// ---------------------------------------------------------------------------
// Build a learnset-valid moveset: at least 2 damaging moves guaranteed,
// no self-KO moves.
// ---------------------------------------------------------------------------
async function buildValidMoveset(speciesId: string): Promise<string[]> {
  const learnsetData = await dexGen.learnsets.get(speciesId);

  const damaging: string[] = []; // no-domain: Non-domain utility collection or data structure
  const support: string[] = []; // no-domain: Non-domain utility collection or data structure

  if (learnsetData?.learnset) {
    for (const [moveId, sources] of Object.entries(learnsetData.learnset)) {
      const isCurrentGen = sources.some(src => src.startsWith(String(ACTIVE_GENERATION)));
      if (!isCurrentGen) continue;
      const move = dexGen.moves.get(moveId);
      if (!move.exists || move.isNonstandard || move.id === 'struggle') continue;
      if (!isSafeMove(move.id)) continue;
      // Split into damaging (bp > 0) vs support
      if ((move.basePower ?? 0) > 0) damaging.push(moveId);
      else support.push(moveId);
    }
  }

  // Guarantee at least 3 damaging moves (or all available); fill the rest with support
  const pool = damaging.length >= 3
    ? [...shuffleArray(damaging).slice(0, 3), ...shuffleArray(support).slice(0, 1)]
    : damaging.length >= 2
      ? [...shuffleArray(damaging).slice(0, 2), ...shuffleArray(support).slice(0, 2)]
      : [...shuffleArray(damaging), ...shuffleArray(support)].slice(0, 4);

  // If still < 4, pad from general fallback
  const result = pool.slice(0, 4);
  if (result.length < 4) {
    const fallback = shuffleArray(getFallbackDamagingMoves()).filter(m => !result.includes(m));
    result.push(...fallback.slice(0, 4 - result.length));
  }
  return result;
}

// Lazily computed fallback move pools
let _fallbackDamaging: string[] | null = null; // no-domain: Non-domain utility collection or data structure
function getFallbackDamagingMoves(): string[] {
  if (!_fallbackDamaging) {
    _fallbackDamaging = dexGen.moves
      .all()
      .filter(m => m.exists && !m.isNonstandard && m.id !== 'struggle' && (m.basePower ?? 0) > 0 && isSafeMove(m.id))
      .map(m => m.id);
  }
  return _fallbackDamaging;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Build a single random Pokémon set
// ---------------------------------------------------------------------------
async function buildRandomPokemonSet(): Promise<PokemonSet> {
  const speciesId = SPECIES_POOL[Math.floor(Math.random() * SPECIES_POOL.length)]!;
  const speciesData = dexGen.species.get(speciesId);

  const moveset = await buildValidMoveset(speciesId);
  const ability = toID(speciesData.abilities[0]);

  const uid = crypto.randomUUID();
  const nickname = getShowdownNickname(uid);

  const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
  // Balanced EVs: 252 HP for longevity + 128 offensive + 64 def/spd + 64 spe
  // Enough bulk to survive several hits across a 6v6 battle.
  const baseStats = dexGen.species.get(speciesId).baseStats;
  const goPhysical = (baseStats.atk ?? 0) >= (baseStats.spa ?? 0);
  const evs = goPhysical
    ? { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 }
    : { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 };

  let gender = 'M';
  if (speciesData.gender === 'N' || speciesData.gender === 'M' || speciesData.gender === 'F') {
    gender = speciesData.gender;
  } else if (speciesData.genderRatio?.F === 1) {
    gender = 'F';
  } else if (speciesData.genderRatio?.M === 1) {
    gender = 'M';
  } else if (speciesData.genderRatio?.M === 0 && speciesData.genderRatio?.F === 0) {
    gender = 'N';
  }

  const set: PokemonSet = {
    name: nickname,
    species: toID(speciesData.name),
    level: MAX_POKEMON_LEVEL,
    gender,
    item: '',
    ability,
    nature: goPhysical ? 'adamant' : 'modest',
    evs,
    ivs,
    moves: moveset,
  };
  Reflect.set(set, 'uid', uid);
  return set;
}

// ---------------------------------------------------------------------------
// Build a full team of 3 random Pokémon (standard Poké Vicio 3v3 format)
// ---------------------------------------------------------------------------
async function buildRandomTeam(): Promise<PokemonSet[]> {
  const sets = await Promise.all(
    Array.from({ length: 3 }, () => buildRandomPokemonSet())
  );
  return sets;
}

// ---------------------------------------------------------------------------
// Public: generate N battle batches
// ---------------------------------------------------------------------------
export async function generateAiBattles(count: number = 100): Promise<AiBattleBatch[]> {
  const batches: AiBattleBatch[] = [];

  for (let i = 0; i < count; i++) {
    const [p1Team, p2Team] = await Promise.all([buildRandomTeam(), buildRandomTeam()]);
    const { PokemonLegalityValidator } = await import('../../../../src/logic/battle/helpers/pokemonLegalityValidator.ts');
    PokemonLegalityValidator.assertTeamLegality(p1Team, `AI Battle ${i + 1} P1 Team`);
    PokemonLegalityValidator.assertTeamLegality(p2Team, `AI Battle ${i + 1} P2 Team`);
    const id = `ai-${crypto.randomBytes(6).toString('hex')}`;
    batches.push({ id, p1Team, p2Team });
  }

  return batches;
}
