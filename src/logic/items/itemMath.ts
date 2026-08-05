/**
 * src/logic/items/itemMath.ts
 *
 * Pure item-effect helper functions.
 * Zero browser, Vue, Pinia, or Supabase dependencies.
 *
 * Extracted from itemEffects.ts for testability
 * with the native Node.js 26+ test runner.
 *
 * @module itemMath
 */

import type { Pokemon } from '../../types/pokemon/pokemon.ts';
import type { ItemEffectResult } from '../../types/inventory/items.ts';

// ── Target Validation ─────────────────────────────────────────────────────────

/**
 * Returns true if using a Potion-class item on `p` would have any effect.
 * Does NOT mutate the original pokemon.
 */
export function canHeal(p: Pokemon): boolean {
  const hp = Number(p.hp ?? 0);
  const maxHp = Number(p.maxHp ?? 0);
  return hp > 0 && hp < maxHp;
}

/**
 * Returns true if a status-clearing item targets the right status.
 * Pass `'any'` to match any non-null status.
 */
export function canClearStatus(p: Pokemon, type: string): boolean {
  if (!p.status) return false;
  if (p.hp <= 0) return false;
  if (type === 'any') return true;
  return p.status === type;
}

export function canRevive(p: Pokemon): boolean {
  return Number(p.hp ?? 0) === 0;
}

export function canFullRestore(p: Pokemon): boolean {
  const hp = Number(p.hp ?? 0);
  const maxHp = Number(p.maxHp ?? 0);
  return hp > 0 && (hp < maxHp || p.status !== null);
}

export function canRestorePP(p: Pokemon): boolean {
  if (Number(p.hp ?? 0) <= 0) return false;
  return (p.moves || []).some(m => m && m.pp < (m.maxPP || 35));
}

// ── Pure Item Effect Helpers ──────────────────────────────────────────────────

/**
 * Heals `amount` HP on a clone of `p`. Returns result + new HP.
 * Does NOT mutate the original.
 */
export function healHpPure(p: Pokemon, amount: number): ItemEffectResult & { newHp: number } {
  const currentHp = Number(p.hp ?? 0);
  const maxHp = Number(p.maxHp ?? 0);

  if (currentHp >= maxHp) return { success: false, message: 'HP ya está al máximo.', newHp: currentHp };
  if (currentHp <= 0)     return { success: false, message: 'El Pokémon está debilitado.', newHp: 0 };

  const newHp = Math.min(maxHp, currentHp + amount);
  return { success: true, message: `restauró ${newHp - currentHp} HP`, newHp };
}

/**
 * Revives `p` (only works when hp = 0) with `amount` HP.
 */
export function revivePure(p: Pokemon, amount: number): ItemEffectResult & { newHp: number } {
  if (Number(p.hp ?? 0) > 0) return { success: false, message: 'El Pokémon no está debilitado.', newHp: p.hp };
  return { success: true, message: `revivió con ${amount} HP`, newHp: amount };
}

/**
 * Clears a status condition. Validates HP and status match.
 */
export function clearStatusPure(
  status: string | null,
  hp: number,
  targetType: string,
): ItemEffectResult {
  if (hp <= 0)    return { success: false, message: 'El Pokémon está debilitado.' };
  if (!status)    return { success: false, message: 'No tiene problemas de estado.' };
  if (targetType !== 'any' && status !== targetType)
                  return { success: false, message: 'No tiene ese estado.' };
  return { success: true, message: `se curó del estado ${status}` };
}

/**
 * Full heal: restores HP and clears status.
 */
export function curaTotalPure(p: Pokemon): ItemEffectResult & { newHp: number } {
  if (Number(p.hp ?? 0) <= 0)
    return { success: false, message: 'El Pokémon está debilitado.', newHp: 0 };
  if (!p.status && Number(p.hp) === Number(p.maxHp))
    return { success: false, message: 'No tiene efecto.', newHp: Number(p.hp) };
  return { success: true, message: 'se curó completamente', newHp: Number(p.maxHp) };
}

/**
 * Restores PP across all moves (up to maxPP per move).
 * Returns a list of { moveName, restored } for moves that changed.
 */
export function restorePPPure(
  moves: Array<{ name: string; pp: number; maxPP: number } | null>,
  amount: number,
): ItemEffectResult & { changes: Array<{ name: string; restored: number }> } {
  const changes: Array<{ name: string; restored: number }> = [];

  for (const m of moves) {
    if (!m) continue;
    const max = m.maxPP || 35;
    if (m.pp < max) {
      const prev = m.pp;
      const newPP = Math.min(max, (m.pp || 0) + amount);
      changes.push({ name: m.name, restored: newPP - prev });
    }
  }

  return changes.length > 0
    ? { success: true, message: 'recuperó PP', changes }
    : { success: false, message: 'Los PP ya están al máximo.', changes: [] };
}

// ── Trainer EXP Formula ───────────────────────────────────────────────────────

/**
 * Calculates total power of a Pokémon (BST + IV sum).
 * Requires passing the base stats explicitly — no provider call.
 */
export function calcTotalPower(
  base: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number },
  ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number },
): number {
  const bst = base.hp + base.atk + base.def + base.spa + base.spd + base.spe;
  const totalIvs = ivs.hp + ivs.atk + ivs.def + ivs.spa + ivs.spd + ivs.spe;
  return bst + totalIvs;
}

/**
 * Calculates the sell price to Team Rocket (Black Market).
 */
export function calcRocketSellPrice(
  level: number,
  ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number },
): number {
  const totalIvs = ivs.hp + ivs.atk + ivs.def + ivs.spa + ivs.spd + ivs.spe;
  return Math.floor((level * 50 + (totalIvs / 186) * 500) * 0.8);
}
