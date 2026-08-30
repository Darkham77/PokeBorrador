import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleState } from '@/types/battle/battle';
import { eggFactory } from '@/logic/breeding/eggFactory';
import { generateRandomIVs } from '@/logic/pokemon/pokemonUtils';
import { NATURES } from '@/data/battle/natures';
import {
  BASE_SHINY_DENOMINATOR,
  NPC_NORMAL_BABY_EGG_DROP_CHANCE,
  RIVAL_BABY_EGG_DROP_CHANCE,
  NPC_BABY_POKEMON_POOL,
  MAX_NPC_CARRIED_EGGS,
  MAX_TOTAL_CARRIED_EGGS
} from '@/logic/constants/gameplay';

/**
 * Handles the chance for NPC trainers (2%) or Rivals (5%) to reward a mysterious baby Pokémon egg upon defeat.
 * Note: Gym battles and PvP battles NEVER award eggs (0%).
 * If all incubator slots are full (7 total) or the NPC egg slot is already filled (1 max), no egg is awarded.
 *
 * @param ctx BattleContext instance containing game store and UI accessors.
 * @param active Active battle state.
 * @returns boolean True if an NPC baby egg was awarded, false otherwise.
 */
export function handleNpcBabyEggReward(ctx: BattleContext, active: BattleState): boolean {
  // Only valid NPC trainer encounters qualify (Gym battles, PvP and wild encounters are strictly excluded)
  if (!active.isTrainer || active.isGym || active.isPvP) return false;

  const currentEggs = ctx.gs.state.eggs || [];
  const currentNpcEggs = currentEggs.filter(e => e.isNpc);

  // If incubator is completely full (7 total) or already carrying the maximum allowed NPC eggs (1), no egg can be received
  if (currentEggs.length >= MAX_TOTAL_CARRIED_EGGS || currentNpcEggs.length >= MAX_NPC_CARRIED_EGGS) {
    return false;
  }

  const dropChance = active.isRival ? RIVAL_BABY_EGG_DROP_CHANCE : NPC_NORMAL_BABY_EGG_DROP_CHANCE;
  const roll = Math.random();
  if (roll >= dropChance) return false;

  const randomIndex = Math.floor(Math.random() * NPC_BABY_POKEMON_POOL.length);
  const species = NPC_BABY_POKEMON_POOL[randomIndex] || 'pichu';

  const globalMultipliers = ctx.eventStore?.globalMultipliers as { shiny?: number } | undefined;
  const shinyMultiplier = globalMultipliers?.shiny || 1;
  const isShiny = Math.random() < ((1 / BASE_SHINY_DENOMINATOR) * shinyMultiplier);

  const randomNatureIndex = Math.floor(Math.random() * NATURES.length);
  const nature = NATURES[randomNatureIndex] || 'serious';

  const egg = eggFactory.createPokemonEgg({
    species,
    isNpc: true,
    isShiny,
    nature,
    ivs: generateRandomIVs()
  });

  if (!ctx.gs.state.eggs) {
    ctx.gs.state.eggs = [];
  }
  ctx.gs.state.eggs.push(egg);

  const giverLabel = active.isRival ? '¡El Rival' : '¡El Entrenador';
  ctx.addLog(`${giverLabel} te ha regalado un misterioso Huevo Pokémon!`, 'log-catch', 'egg');
  ctx.uiStore.notify(`¡Recibiste un Huevo Pokémon (${active.isRival ? 'Rival' : 'NPC'})! 🥚`, '🥚');

  return true;
}
