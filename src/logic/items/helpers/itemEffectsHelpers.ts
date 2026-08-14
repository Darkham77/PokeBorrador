import { TM_COMPAT, GAME_TMS, type TMData } from '../../../data/pokemon/pokedex.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { ItemEffectResult } from '@/types/inventory/items';

/**
 * Resolves TM learning availability and dynamic TM item effect
 */
export const getDynamicItemEffect = (itemName: string, p: Pokemon): ItemEffectResult | null => {
  const tmMatch = itemName.match(/([Tt][Mm]|[Mm][Tt])(\d+)/);
  if (tmMatch) {
    const tmId = `TM${tmMatch[2]}`;
    const species = p.id;
    const compatList = (TM_COMPAT as Record<string, readonly string[]>)[species] || []; // open-record
    if (!compatList.includes(tmId)) {
      return { success: false, message: 'Incompatible.' };
    }
    const tmData: TMData | undefined = GAME_TMS.find(t => t.id === tmId);
    if (!tmData) return { success: false, message: 'MT inválida.' };
    
    // Check if pokemon already knows the move
    if (p.moves.some(m => m && m.name === tmData.name)) {
      return { success: false, message: 'Ya conoce este movimiento.' };
    }

    return { 
      success: true, 
      message: `aprenderá ${tmData.name}`, 
      deferred: true, 
      resultType: 'learn_move', 
      moveName: tmData.moveId 
    };
  }
  return null;
};
