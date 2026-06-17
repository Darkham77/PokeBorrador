import type { Pokemon } from '@/types/pokemon/pokemon';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { getExpNeededPure } from '../pokemon/statsMath.ts';

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

  if (!participantsSet?.has(p.uid) && p.heldItem !== 'exp_share') return null

  if (p.level >= MAX_POKEMON_LEVEL) {
    p.exp = 0;
    p.expNeeded = Infinity;
    return { gained: 0, levelUp: false, levelsGained: 0 };
  }

  const share = isActive ? 1 : 0.5
  const gained = Math.floor(baseExp * share * classMult * totalExpMult);
  p.exp += gained

  let levelUp = false
  let levelsGained = 0
  let tempLevel = p.level
  let tempExpNeeded = p.expNeeded

  while (p.exp >= tempExpNeeded && tempLevel < MAX_POKEMON_LEVEL) {
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
    p.expNeeded = Infinity;
  }

  return { gained, levelUp, levelsGained }
}

export function calculateMoneyGain(enemyPoke: Pokemon, options: RewardOptions = {}) {
  const { bcMult = 1, totalMoneyMult = 1, isTrainer = false, isGym = false } = options
  const multiplier = (isTrainer || isGym) ? 20 : 2
  const baseMoney = enemyPoke.level * multiplier * bcMult
  return Math.floor(baseMoney * totalMoneyMult)
}


