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
  p.status = null
  return { success: true, message: `revivió con ${p.hp} HP` }
}

export function clearStatus(p: Pokemon, type: string): ItemEffectResult {
  if (p.hp <= 0) return { success: false, message: 'El Pokémon está debilitado.' };
  if (!p.status) return { success: false, message: 'No tiene problemas de estado.' };

  const normTarget = type.toLowerCase();
  const normStatus = p.status.toLowerCase();

  const isMatch = normTarget === 'any' || 
                  normStatus === normTarget ||
                  (normTarget === 'psn' && normStatus === 'poison') ||
                  (normTarget === 'poison' && normStatus === 'psn') ||
                  (normTarget === 'par' && normStatus === 'paralyze') ||
                  (normTarget === 'paralyze' && normStatus === 'par') ||
                  (normTarget === 'brn' && normStatus === 'burn') ||
                  (normTarget === 'burn' && normStatus === 'brn') ||
                  (normTarget === 'slp' && normStatus === 'sleep') ||
                  (normTarget === 'sleep' && normStatus === 'slp') ||
                  (normTarget === 'frz' && normStatus === 'freeze') ||
                  (normTarget === 'freeze' && normStatus === 'frz');

  if (!isMatch) return { success: false, message: 'No tiene ese estado.' };

  const old = p.status;
  p.status = null;
  if ((old as string) === 'slp' || (old as string) === 'sleep') p.sleepTurns = 0;
  return { success: true, message: `se curó del estado ${old}` };
}

export function curaTotal(p: Pokemon): ItemEffectResult {
  if (p.hp <= 0) return { success: false, message: 'El Pokémon está debilitado.' };
  if (!p.status && Number(p.hp) === Number(p.maxHp)) return { success: false, message: 'No tiene efecto.' };
  p.hp = Number(p.maxHp);
  p.status = null;
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
