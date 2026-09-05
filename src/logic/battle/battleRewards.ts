import type { Pokemon } from '@/types/pokemon/pokemon';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { getExpNeededPure } from '../pokemon/statsMath.ts';
import { applyEvGains, type EvGainResult } from '../pokemon/evMath.ts';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';

/**
 * battleRewards.js
 * Logic for calculating EXP and Money rewards.
 */

export function calculateBaseExp(enemyPoke: Pokemon) {
  return Math.floor(enemyPoke.level * 4)
}

export interface RewardOptions {
  isActive?: boolean;
  classMult?: number;
  totalExpMult?: number;
  participantsSet?: Set<string> | null;
  bcMult?: number;
  totalMoneyMult?: number;
  isTrainer?: boolean;
  isGym?: boolean;
}

export function processExpGain(p: Pokemon, baseExp: number, _participants: Set<string>, options: RewardOptions = {}) {
  const { 
    isActive = false, 
    classMult = 1, 
    totalExpMult = 1, 
    participantsSet = null 
  } = options

  // Strict Gen 6-9 Rule: Fainted Pokemon (0 HP) never receive Exp
  if ((p.hp !== undefined && p.hp <= 0) || p.fainted === true) {
    return null;
  }

  if (p.level >= MAX_POKEMON_LEVEL) {
    p.exp = 0;
    p.expNeeded = 0;
    return { gained: 0, levelUp: false, levelsGained: 0 };
  }

  // Active combatants or expshare holders receive 100% share; benched living members receive 50%
  const isParticipant = isActive || (participantsSet?.has(p.uid) ?? false);
  const isHoldingExpShare = p.heldItem === 'expshare';
  const share = (isParticipant || isHoldingExpShare) ? 1 : 0.5;

  const gained = Math.floor(baseExp * share * classMult * totalExpMult);
  p.exp += gained

  let levelUp = false
  let levelsGained = 0
  let tempLevel = p.level
  let tempExpNeeded = p.expNeeded

  while (tempExpNeeded > 0 && p.exp >= tempExpNeeded && tempLevel < MAX_POKEMON_LEVEL) {
    p.exp -= tempExpNeeded
    levelUp = true
    levelsGained++
    tempLevel++
    tempExpNeeded = getExpNeededPure(tempLevel)
  }

  if (levelUp) {
    p.expNeeded = tempExpNeeded
  }

  if (tempLevel >= MAX_POKEMON_LEVEL) {
    p.exp = 0;
    p.expNeeded = 0;
  }

  return { gained, levelUp, levelsGained }
}

export function calculateMoneyGain(enemyPoke: Pokemon, options: RewardOptions = {}) {
  const { bcMult = 1, totalMoneyMult = 1, isTrainer = false, isGym = false } = options
  const multiplier = (isTrainer || isGym) ? 20 : 2
  const baseMoney = enemyPoke.level * multiplier * bcMult
  return Math.floor(baseMoney * totalMoneyMult)
}

export function processEvGain(p: Pokemon, enemyPoke: Pokemon, _participantsSet?: Set<string> | null): EvGainResult | null {
  // Strict Gen 6-9 Rule: Fainted Pokemon (0 HP) never receive EVs
  if ((p.hp !== undefined && p.hp <= 0) || p.fainted === true) {
    return null;
  }

  const evYield = pokemonDataProvider.getEvYield(enemyPoke.id);
  if (!evYield || Object.keys(evYield).length === 0) return null;

  const hasPokerus = p.pokerus === 'infected';
  // In Gen 6-9, all living party members that earn Exp receive the 100% full, undivided EV yield
  const result = applyEvGains(p.evs, evYield, p.heldItem, hasPokerus);
  p.evs = result.updatedEvs;
  return result;
}



