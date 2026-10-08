import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { NATURES, toNatureId } from '@/data/battle/natures';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { DEFAULT_FALLBACK_BASE_STAT, DEFAULT_FRIENDSHIP_VALUE } from '@/logic/constants/gameplay';
import { getMovesAtLevel, initializePokemonVigor } from '@/logic/pokemon/pokemonUtils';
import { getActivePinia } from 'pinia';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { getExpNeededPure, calcStatsPure } from './statsMath.ts';
import { createDefaultEvs } from './evMath.ts';
import type { ItemId } from '@/data/inventory/items';
import { toID } from '@/logic/utils/strings.ts';
import { requireAbilityId } from '@/data/battle/abilities';
import { assignGender } from './pokemonGender.ts';
import { getWildHeldItem } from './pokemonWildHeldItems.ts';
import { getPokemonPhysicalHeight, getPokemonPhysicalWeight } from './physicalDimensionsMath.ts';
import { getServerInstant } from '@/logic/utils/timeUtils';
import { validatePokemon } from './pokemonValidator.ts';
import {
  computeCreationIVs,
  computeCreationShiny,
  type PokemonCreationOptions
} from './pokemonCreationHelper.ts';
import { levelUpPokemon as executeLevelUpPokemon } from './pokemonLevelUpHelper.ts';

export { assignGender, ensurePokemonGender, isGenderlessSpeciesId } from './pokemonGender.ts';
export { canLearnMove, getLegalSpeciesMoves, getRandomLegalMoves, getMaxAllowedMoves } from './pokemonLearnset.ts';
export { getWildHeldItem, WILD_HELD_ITEMS } from './pokemonWildHeldItems.ts';
export { validatePokemon } from './pokemonValidator.ts';
export type { PokemonCreationOptions } from './pokemonCreationHelper.ts';

export function getExpNeeded(level: number): number {
  return getExpNeededPure(level);
}

export function recalcPokemonStats(p: Pokemon, bypassWhitelist = false): void {
  if (!p) return;

  const base = pokemonDataProvider.getPokemonData(p.id, bypassWhitelist);
  if (!base) return;

  const natureDef = p.nature ? pokemonDataProvider.getNatureData(p.nature) : null;
  const natureData = natureDef ? { up: natureDef.up, down: natureDef.down } : { up: null, down: null };
  const isDittoMetalPowder = p.heldItem === 'metalpowder' && p.id === 'ditto';
  const isDittoQuickPowder = p.heldItem === 'quickpowder' && p.id === 'ditto';

  const calculated = calcStatsPure(
    p.level,
    {
      hp: p.ivs.hp,
      atk: p.ivs.atk,
      def: p.ivs.def,
      spa: p.ivs.spa,
      spd: p.ivs.spd,
      spe: p.ivs.spe
    },
    {
      hp: base.hp || DEFAULT_FALLBACK_BASE_STAT,
      atk: base.atk || DEFAULT_FALLBACK_BASE_STAT,
      def: base.def || DEFAULT_FALLBACK_BASE_STAT,
      spa: base.spa,
      spd: base.spd,
      spe: base.spe
    },
    natureData,
    isDittoMetalPowder,
    p.evs,
    isDittoQuickPowder
  );

  p.maxHp = calculated.maxHp;
  p.atk = calculated.atk;
  p.def = calculated.def;
  p.spa = calculated.spa;
  p.spd = calculated.spd;
  p.spe = calculated.spe;

  const stats: (keyof Pokemon)[] = ['maxHp', 'atk', 'def', 'spa', 'spd', 'spe'];
  stats.forEach(s => {
    const val = p[s] as number;
    if (isNaN(val) || val === undefined) {
      Reflect.set(p, s, DEFAULT_FALLBACK_BASE_STAT);
    }
  });

  if (p.hp !== undefined && p.hp !== null) {
    p.hp = Math.min(p.hp, p.maxHp);
  }

  validatePokemon(p, bypassWhitelist);
}

/**
 * Factory creating consistent, legal Pokemon objects with strict typed IDs
 */
export function makePokemon(idVal: PokemonSpeciesId | number | string, level: number, options: PokemonCreationOptions = {}): Pokemon | null {
  if (idVal === undefined || idVal === null || idVal === '') return null;
  const id = requirePokemonSpeciesId(toID(String(idVal)));

  if (level > MAX_POKEMON_LEVEL) level = MAX_POKEMON_LEVEL;
  const bypass = options.bypassWhitelist || false;
  const base = pokemonDataProvider.getPokemonData(id, bypass);
  if (!base) {
    throw new Error(`[pokemonFactory] Missing Pokémon in DB: ${id}`);
  }

  const piniaActive = getActivePinia();
  const ivs = computeCreationIVs(options, piniaActive);

  const nature = options.nature ? toNatureId(toID(options.nature)) : NATURES[Math.floor(Math.random() * NATURES.length)] || 'serious';
  const abilityList = pokemonDataProvider.getSpeciesAbilities(id);
  const selectedAbility = options.ability ? toID(options.ability) : abilityList[Math.floor(Math.random() * abilityList.length)];
  if (!selectedAbility) throw new Error(`[pokemonFactory] No ability available for species ${id}`);
  const ability = requireAbilityId(selectedAbility);
  const gender = options.gender !== undefined ? options.gender : assignGender(id);
  const isShiny = computeCreationShiny(id, options, piniaActive);

  let heldItem: ItemId | null = options.heldItem || null;
  if (!heldItem) {
    heldItem = getWildHeldItem(id, options.heldItemRates);
  }

  const p: Pokemon = {
    uid: crypto.randomUUID(),
    id, name: base.name, type: base.type, type2: base.type2,
    isFloating: base.isFloating,
    catchRate: base.catchRate,
    level, exp: 0, expNeeded: getExpNeeded(level),
    ivs, nature, ability, gender, isShiny,
    moves: getMovesAtLevel(id, level, bypass) as Move[],
    status: '', sleepTurns: 0, friendship: DEFAULT_FRIENDSHIP_VALUE,
    friendshipSteps: 0,
    vigor: 0, maxVigor: 0,
    heldItem,
    nickname: null,
    tags: ['ball:pokeball'],
    obtainedAt: getServerInstant().epochMilliseconds,
    obtainedMethod: options.obtainedMethod ?? 'wild',
    evs: createDefaultEvs(),
    hp: 0, maxHp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0
  };

  p.height = Number(getPokemonPhysicalHeight(p).toFixed(1));
  p.weight = Number(getPokemonPhysicalWeight(p).toFixed(1));

  initializePokemonVigor(p, options.obtainedMethod, options.isNpcEgg);
  recalcPokemonStats(p, bypass);
  p.hp = p.maxHp;
  validatePokemon(p, bypass);
  return p;
}

export function levelUpPokemon(p: Pokemon): Move[] | null {
  return executeLevelUpPokemon(p, recalcPokemonStats);
}
