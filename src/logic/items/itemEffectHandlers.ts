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

export function clearStatus(p: Pokemon, type: PokemonStatus | 'any'): ItemEffectResult {
  if (p.hp <= 0) return { success: false, message: 'El Pokémon está debilitado.' };
  if (!p.status) return { success: false, message: 'No tiene problemas de estado.' };

  const isMatch = type === 'any' || p.status === type;

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
