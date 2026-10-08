import type { Pokemon } from '@/types/pokemon/pokemon';
import type { ItemEffectResult } from '@/types/inventory/items';
import {
  handleVitamin,
  handleFeather,
  handleEvBerry,
  handleMochi,
  handleFreshStartMochi
} from '../itemEffectHandlers.ts';

const pokeEffect = (fn: (p: Pokemon) => ItemEffectResult) => (p: unknown) => fn(p as Pokemon);

export const ITEM_EV_EFFECTS: Record<string, (p: unknown) => ItemEffectResult> = {
  // --- EV Berries ---
  'pomegberry': pokeEffect((p) => handleEvBerry(p, 'hp', 'HP')),
  'kelpsyberry': pokeEffect((p) => handleEvBerry(p, 'atk', 'Ataque')),
  'qualotberry': pokeEffect((p) => handleEvBerry(p, 'def', 'Defensa')),
  'hondewberry': pokeEffect((p) => handleEvBerry(p, 'spa', 'Ataque Especial')),
  'grepaberry': pokeEffect((p) => handleEvBerry(p, 'spd', 'Defensa Especial')),
  'tamatoberry': pokeEffect((p) => handleEvBerry(p, 'spe', 'Velocidad')),

  // --- Vitamins ---
  'hpup': pokeEffect((p) => handleVitamin(p, 'hp', 'HP')),
  'protein': pokeEffect((p) => handleVitamin(p, 'atk', 'Ataque')),
  'iron': pokeEffect((p) => handleVitamin(p, 'def', 'Defensa')),
  'calcium': pokeEffect((p) => handleVitamin(p, 'spa', 'Ataque Especial')),
  'zinc': pokeEffect((p) => handleVitamin(p, 'spd', 'Defensa Especial')),
  'carbos': pokeEffect((p) => handleVitamin(p, 'spe', 'Velocidad')),

  // --- Feathers ---
  'healthfeather': pokeEffect((p) => handleFeather(p, 'hp', 'HP')),
  'musclefeather': pokeEffect((p) => handleFeather(p, 'atk', 'Ataque')),
  'resistfeather': pokeEffect((p) => handleFeather(p, 'def', 'Defensa')),
  'geniusfeather': pokeEffect((p) => handleFeather(p, 'spa', 'Ataque Especial')),
  'cleverfeather': pokeEffect((p) => handleFeather(p, 'spd', 'Defensa Especial')),
  'swiftfeather': pokeEffect((p) => handleFeather(p, 'spe', 'Velocidad')),

  // --- Mochis ---
  'healthmochi': pokeEffect((p) => handleMochi(p, 'hp', 'HP')),
  'musclemochi': pokeEffect((p) => handleMochi(p, 'atk', 'Ataque')),
  'resistmochi': pokeEffect((p) => handleMochi(p, 'def', 'Defensa')),
  'geniusmochi': pokeEffect((p) => handleMochi(p, 'spa', 'Ataque Especial')),
  'clevermochi': pokeEffect((p) => handleMochi(p, 'spd', 'Defensa Especial')),
  'swiftmochi': pokeEffect((p) => handleMochi(p, 'spe', 'Velocidad')),
  'freshstartmochi': pokeEffect((p) => handleFreshStartMochi(p))
};
