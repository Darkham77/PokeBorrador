import type { Pokemon } from '@/types/pokemon/pokemon';
import type { ItemEffectResult } from '@/types/inventory/items';
import type { ItemId } from '@/data/inventory/items';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { MIN_VIGOR_VAL, SINGLE_VIGOR_RESTORE, SINGLE_LEVEL_GAIN } from '@/logic/constants/items';
import { DEFAULT_MAX_VIGOR } from '@/logic/pokemon/pokemonUtils';

const pokeEffect = (fn: (p: Pokemon) => ItemEffectResult) => (p: unknown) => fn(p as Pokemon);

import { buildItemResult } from './itemEffectResultHelper.ts';

export const ITEM_SPECIAL_BUFF_EFFECTS: Partial<Record<ItemId, (p: unknown) => ItemEffectResult>> =
  {
    rarecandy: pokeEffect((p) => {
      if (p.level >= MAX_POKEMON_LEVEL) return buildItemResult(false, 'Ya tiene el nivel máximo.');
      p.exp = p.expNeeded;
      return buildItemResult(true, `subió al nivel ${p.level + SINGLE_LEVEL_GAIN}`, {
        resType: 'levelup'
      });
    }),
    vigorcandy: pokeEffect((p) => {
      const maxVigor = p.maxVigor || DEFAULT_MAX_VIGOR;
      const currentVigor = Number(p.vigor || MIN_VIGOR_VAL);
      if (currentVigor >= maxVigor) return buildItemResult(false, 'Vigor al máximo.');
      p.vigor = currentVigor + SINGLE_VIGOR_RESTORE;
      return buildItemResult(
        true,
        `recuperó ${SINGLE_VIGOR_RESTORE} de vigor (${p.vigor}/${maxVigor})`
      );
    }),
    vigorrestorer: pokeEffect((p) => {
      const maxVigor = p.maxVigor || DEFAULT_MAX_VIGOR;
      const currentVigor = Number(p.vigor || MIN_VIGOR_VAL);
      if (currentVigor >= maxVigor) return buildItemResult(false, 'Vigor al máximo.');
      p.vigor = maxVigor;
      return buildItemResult(true, `recuperó todo su vigor (${p.vigor}/${maxVigor})`);
    }),
    moverelearner: pokeEffect((_p) =>
      buildItemResult(true, 'abriendo menú de movimientos', {
        resType: 'relearner',
        isDeferred: true
      })
    ),
    naturepatch: pokeEffect((_p) =>
      buildItemResult(true, 'iniciando cambio de naturaleza', {
        resType: 'nature_patch',
        isDeferred: true
      })
    ),
    abilitypill: pokeEffect((_p) =>
      buildItemResult(true, 'iniciando cambio de habilidad', {
        resType: 'ability_pill',
        isDeferred: true
      })
    ),
    ppup: pokeEffect((_p) =>
      buildItemResult(true, 'selecciona un movimiento para mejorar', {
        resType: 'pp_up',
        isDeferred: true
      })
    ),
    ppmax: pokeEffect((_p) =>
      buildItemResult(true, 'selecciona un movimiento para maximizar sus PP', {
        resType: 'ppmax',
        isDeferred: true
      })
    )
  };
