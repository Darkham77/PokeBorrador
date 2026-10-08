import type { Pokemon } from '@/types/pokemon/pokemon';
import type { ItemEffectResult } from '@/types/inventory/items';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import {
  MIN_VIGOR_VAL,
  SINGLE_VIGOR_RESTORE,
  SINGLE_LEVEL_GAIN
} from '@/logic/constants/items';
import { DEFAULT_MAX_VIGOR } from '@/logic/pokemon/pokemonUtils';

const pokeEffect = (fn: (p: Pokemon) => ItemEffectResult) => (p: unknown) => fn(p as Pokemon);

export const ITEM_SPECIAL_BUFF_EFFECTS: Record<string, (p: unknown) => ItemEffectResult> = {
  'rarecandy': pokeEffect((p) => {
    if (p.level >= MAX_POKEMON_LEVEL) return { success: false, message: 'Ya tiene el nivel máximo.' };
    p.exp = p.expNeeded;
    return { success: true, message: `subió al nivel ${p.level + SINGLE_LEVEL_GAIN}`, resultType: 'levelup' };
  }),
  'vigorcandy': pokeEffect((p) => {
    const maxVigor = p.maxVigor || DEFAULT_MAX_VIGOR;
    const currentVigor = Number(p.vigor || MIN_VIGOR_VAL);
    if (currentVigor >= maxVigor) return { success: false, message: 'Vigor al máximo.' };
    p.vigor = currentVigor + SINGLE_VIGOR_RESTORE;
    return { success: true, message: `recuperó ${SINGLE_VIGOR_RESTORE} de vigor (${p.vigor}/${maxVigor})` };
  }),
  'vigorrestorer': pokeEffect((p) => {
    const maxVigor = p.maxVigor || DEFAULT_MAX_VIGOR;
    const currentVigor = Number(p.vigor || MIN_VIGOR_VAL);
    if (currentVigor >= maxVigor) return { success: false, message: 'Vigor al máximo.' };
    p.vigor = maxVigor;
    return { success: true, message: `recuperó todo su vigor (${p.vigor}/${maxVigor})` };
  }),
  'moverelearner': pokeEffect((_p) => {
    return { success: true, message: 'abriendo menú de movimientos', resultType: 'relearner', deferred: true };
  }),
  'naturepatch': pokeEffect((_p) => {
    return { success: true, message: 'iniciando cambio de naturaleza', deferred: true, resultType: 'nature_patch' };
  }),
  'abilitypill': pokeEffect((_p) => {
    return { success: true, message: 'iniciando cambio de habilidad', deferred: true, resultType: 'ability_pill' };
  }),
  'ppup': pokeEffect((_p) => {
    return { success: true, message: 'selecciona un movimiento para mejorar', deferred: true, resultType: 'pp_up' };
  }),
  'ppmax': pokeEffect((_p) => {
    return { success: true, message: 'selecciona un movimiento para maximizar sus PP', deferred: true, resultType: 'ppmax' };
  })
};
