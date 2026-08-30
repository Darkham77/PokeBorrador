import type { Pokemon } from '@/types/pokemon/pokemon'
import type { ItemEffectResult } from '@/types/inventory/items'
import { checkStoneEvolution } from '../evolution/evolutionLogic.ts'

export function healHp(p: Pokemon, amount: number): ItemEffectResult {
  const currentHp = Number(p.hp || 0)
  const maxHp = Number(p.maxHp || 0)
  const healAmount = Number(amount || 0)

  if (currentHp <= 0) return { success: false, message: 'El Pokémon está debilitado.' }
  if (currentHp >= maxHp) return { success: false, message: 'No tendrá ningún efecto.' }

  const prev = currentHp
  p.hp = Math.min(maxHp, currentHp + healAmount)
  const healed = p.hp - prev
  return { success: true, message: `restauró ${healed} HP` }
}

export function revive(p: Pokemon, amount: number): ItemEffectResult {
  if (p.hp > 0) return { success: false, message: 'No tendrá ningún efecto.' }
  p.hp = amount
  p.status = ''
  return { success: true, message: `revivió con ${p.hp} HP` }
}

import type { PokemonStatus } from '@/types/pokemon/pokemon';

export function clearStatus(p: Pokemon, type: PokemonStatus | 'any' | 'poison'): ItemEffectResult {
  if (p.hp <= 0) return { success: false, message: 'El Pokémon está debilitado.' };
  if (!p.status) return { success: false, message: 'No tiene problemas de estado.' };

  const isMatch = type === 'any'
    || p.status === type
    || (type === 'poison' && (p.status === 'psn' || p.status === 'tox'));

  if (!isMatch) return { success: false, message: 'No tiene ese estado.' };

  const old = p.status;
  p.status = '';
  if (old === 'slp') p.sleepTurns = 0;
  return { success: true, message: `se curó del estado ${old}` };
}

export function curaTotal(p: Pokemon): ItemEffectResult {
  if (p.hp <= 0) return { success: false, message: 'El Pokémon está debilitado.' };
  if (!p.status && Number(p.hp) === Number(p.maxHp)) return { success: false, message: 'No tiene efecto.' };
  p.hp = Number(p.maxHp);
  p.status = '';
  p.sleepTurns = 0;
  return { success: true, message: 'se curó completamente' };
}

export function restorePP(p: Pokemon, amount: number): ItemEffectResult {
  let changed = false;
  p.moves.forEach(m => {
    if (!m) return;
    const max = m.maxPP || 35; // Fallback
    if (m.pp < max) {
      m.pp = Math.min(max, (m.pp || 0) + amount);
      changed = true;
    }
  });
  return changed 
    ? { success: true, message: 'recuperó PP' }
    : { success: false, message: 'Los PP ya están al máximo.' };
}

export function handleStone(p: Pokemon, stoneName: string): ItemEffectResult {
  const nextId = checkStoneEvolution(p, stoneName);
  if (!nextId) return { success: false, message: 'No tiene efecto sobre este Pokémon.' };
  return { 
    success: true, 
    message: '¡Está evolucionando!', 
    resultType: 'evolution', 
    targetId: nextId 
  };
}

import { applyVitamin, applyFeather, applyEvBerry, applyMochi, resetAllEvs } from '@/logic/pokemon/evMath';
import { recalcPokemonStats } from '@/logic/pokemon/pokemonFactory';
import type { PokemonStatKey } from '@/types/pokemon/pokemon';

import { FRIENDSHIP_BOUNDS } from '@/types/pokemon/friendship.ts';

const BERRY_FRIENDSHIP_INCREASE = 10;
const VITAMIN_FRIENDSHIP_INCREASE = 5;

export function handleVitamin(p: Pokemon, stat: PokemonStatKey, statNameEs: string): ItemEffectResult {
  if (p.hp <= 0) return { success: false, message: 'El Pokémon está debilitado.' };

  const res = applyVitamin(p.evs, stat);
  if (!res.success) {
    return { success: false, message: 'No tendrá ningún efecto.' };
  }

  p.evs = res.updatedEvs;
  recalcPokemonStats(p);

  // Increase friendship with optional Soothe Bell multiplier
  const curF = p.friendship ?? FRIENDSHIP_BOUNDS.DEFAULT_BASE;
  if (curF < FRIENDSHIP_BOUNDS.MAX) {
    const boost = p.heldItem === 'soothebell' ? Math.floor(VITAMIN_FRIENDSHIP_INCREASE * 1.5) : VITAMIN_FRIENDSHIP_INCREASE;
    p.friendship = Math.min(FRIENDSHIP_BOUNDS.MAX, curF + boost);
  }

  return { success: true, message: `aumentó los EVs de ${statNameEs} (+${res.gained})` };
}

export function handleMochi(p: Pokemon, stat: PokemonStatKey, statNameEs: string): ItemEffectResult {
  if (p.hp <= 0) return { success: false, message: 'El Pokémon está debilitado.' };

  const res = applyMochi(p.evs, stat);
  if (!res.success) {
    return { success: false, message: 'No tendrá ningún efecto.' };
  }

  p.evs = res.updatedEvs;
  recalcPokemonStats(p);

  const curF = p.friendship ?? FRIENDSHIP_BOUNDS.DEFAULT_BASE;
  if (curF < FRIENDSHIP_BOUNDS.MAX) {
    const boost = p.heldItem === 'soothebell' ? Math.floor(VITAMIN_FRIENDSHIP_INCREASE * 1.5) : VITAMIN_FRIENDSHIP_INCREASE;
    p.friendship = Math.min(FRIENDSHIP_BOUNDS.MAX, curF + boost);
  }

  return { success: true, message: `aumentó los EVs de ${statNameEs} (+${res.gained})` };
}

export function handleFreshStartMochi(p: Pokemon): ItemEffectResult {
  if (p.hp <= 0) return { success: false, message: 'El Pokémon está debilitado.' };

  const res = resetAllEvs(p.evs);
  if (!res.success) {
    return { success: false, message: 'No tendrá ningún efecto.' };
  }

  p.evs = res.updatedEvs;
  recalcPokemonStats(p);
  return { success: true, message: `reseteó todos sus EVs a 0 (se eliminaron ${res.totalCleared} EVs)` };
}

export function handleFeather(p: Pokemon, stat: PokemonStatKey, statNameEs: string): ItemEffectResult {
  if (p.hp <= 0) return { success: false, message: 'El Pokémon está debilitado.' };

  const res = applyFeather(p.evs, stat);
  if (!res.success) {
    return { success: false, message: 'No tendrá ningún efecto.' };
  }

  p.evs = res.updatedEvs;
  recalcPokemonStats(p);

  const curF = p.friendship ?? FRIENDSHIP_BOUNDS.DEFAULT_BASE;
  if (curF < FRIENDSHIP_BOUNDS.MAX) {
    p.friendship = Math.min(FRIENDSHIP_BOUNDS.MAX, curF + 1);
  }

  return { success: true, message: `aumentó los EVs de ${statNameEs} (+${res.gained})` };
}

export function handleEvBerry(p: Pokemon, stat: PokemonStatKey, statNameEs: string): ItemEffectResult {
  if (p.hp <= 0) return { success: false, message: 'El Pokémon está debilitado.' };

  const evRes = applyEvBerry(p.evs, stat);
  let friendshipGained = false;

  const currentFriendship = p.friendship ?? FRIENDSHIP_BOUNDS.DEFAULT_BASE;
  if (currentFriendship < FRIENDSHIP_BOUNDS.MAX) {
    const boost = p.heldItem === 'soothebell' ? Math.floor(BERRY_FRIENDSHIP_INCREASE * 1.5) : BERRY_FRIENDSHIP_INCREASE;
    p.friendship = Math.min(FRIENDSHIP_BOUNDS.MAX, currentFriendship + boost);
    friendshipGained = true;
  }

  if (!evRes.success && !friendshipGained) {
    return { success: false, message: 'No tendrá ningún efecto.' };
  }

  if (evRes.success) {
    p.evs = evRes.updatedEvs;
    recalcPokemonStats(p);
  }

  if (evRes.success && friendshipGained) {
    return { success: true, message: `se volvió más amigable y sus EVs de ${statNameEs} disminuyeron` };
  } else if (evRes.success) {
    return { success: true, message: `sus EVs de ${statNameEs} disminuyeron` };
  } else {
    return { success: true, message: 'se volvió más amigable' };
  }
}


