import type { Pokemon } from '@/types/pokemon/pokemon';
import type { ItemEffectResult } from '@/types/inventory/items';
import { handleStone } from '../itemEffectHandlers.ts';

const pokeEffect = (fn: (p: Pokemon) => ItemEffectResult) => (p: unknown) => fn(p as Pokemon);

export const ITEM_EVOLUTION_EFFECTS: Record<string, (p: unknown) => ItemEffectResult> = {
  // --- Evolutions ---
  'firestone': pokeEffect((p) => handleStone(p, 'firestone')),
  'thunderstone': pokeEffect((p) => handleStone(p, 'thunderstone')),
  'waterstone': pokeEffect((p) => handleStone(p, 'waterstone')),
  'leafstone': pokeEffect((p) => handleStone(p, 'leafstone')),
  'moonstone': pokeEffect((p) => handleStone(p, 'moonstone')),
  'sunstone': pokeEffect((p) => handleStone(p, 'sunstone')),
  'dawnstone': pokeEffect((p) => handleStone(p, 'dawnstone')),
  'duskstone': pokeEffect((p) => handleStone(p, 'duskstone')),
  'icestone': pokeEffect((p) => handleStone(p, 'icestone')),
  'shinystone': pokeEffect((p) => handleStone(p, 'shinystone')),
  'ovalstone': pokeEffect((p) => handleStone(p, 'ovalstone')),

  // --- New Stones & Evolutionary Usables ---
  'linkcable': pokeEffect((p) => handleStone(p, 'linkcable')),
  'whippeddream': pokeEffect((p) => handleStone(p, 'whippeddream')),
  'sachet': pokeEffect((p) => handleStone(p, 'sachet')),
  'deepseascale': pokeEffect((p) => handleStone(p, 'deepseascale')),
  'deepseatooth': pokeEffect((p) => handleStone(p, 'deepseatooth'))
};
