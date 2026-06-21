import { describe, it, expect } from 'vitest';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { dispatchMoveEffect } from '@/logic/battle/actions/actionRegistry';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages } from '@/types/battle/battle';
import type { BattleContext } from '@/types/battle/battleContext';


describe('ActionRegistry & Move Effect Mapping Coverage', () => {
  it('debería mapear correctamente efectos de movimientos comunes a acciones sin lanzar error', async () => {
    // 1. Obtener datos reales de movimientos comunes con efectos secundarios
    const movesToTest = [
      'growl',
      'tail_whip',
      'thunder_wave',
      'recover',
      'aurora_beam',
      'acid_armor',
      'sunny_day'
    ];

    const logs: string[] = [];
    const dummySrc = { name: 'Bulbasaur' } as Pokemon;
    const dummyTgt = { name: 'Pikachu' } as Pokemon;
    const srcStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } as BattleStages;
    const tgtStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } as BattleStages;
    const addLogFn = (msg: string) => { logs.push(msg); };
    const dummyCtx = {} as BattleContext;

    for (const moveId of movesToTest) {
      const moveData = pokemonDataProvider.getMoveData(moveId);
      expect(moveData).not.toBeNull();
      expect(moveData?.effect).toBeDefined();

      // Despachar el efecto y comprobar que no explote
      await expect(
        dispatchMoveEffect(moveData?.effect || null, dummySrc, dummyTgt, srcStages, tgtStages, addLogFn, dummyCtx)
      ).resolves.not.toThrow();
    }
  });

  it('no debería asignar efecto a movimientos de daño simple como tackle o scratch', () => {
    const tackle = pokemonDataProvider.getMoveData('tackle');
    expect(tackle).not.toBeNull();
    expect(tackle?.effect).toBeUndefined();

    const scratch = pokemonDataProvider.getMoveData('scratch');
    expect(scratch).not.toBeNull();
    expect(scratch?.effect).toBeUndefined();
  });

  it('debería tener un manejador de acción registrado para cada movimiento con efecto especial en los learnsets', async () => {
    const { ALL_ACTIONS } = await import('@/logic/battle/actions/actionRegistry');
    const { POKEMON_DB } = await import('@/data/pokemon/pokemonDB');
    const { toID } = await import('@pkmn/sim');

    const learnsetMoves = new Set<string>();
    for (const poke of Object.values(POKEMON_DB)) {
      if (poke.learnset && Array.isArray(poke.learnset)) {
        poke.learnset.forEach((m: { id: string }) => {
          if (m.id && m.id !== 'Unknown') {
            learnsetMoves.add(toID(m.id));
          }
        });
      }
    }

    const missingHandlers: string[] = [];

    learnsetMoves.forEach(moveId => {
      const moveData = pokemonDataProvider.getMoveData(moveId);
      if (!moveData) return;

      const effect = moveData.effect;
      if (!effect) return;

      // Desglosar la base del efecto (ej: burn_10 -> burn, stat_up_self_atk_2_10 -> stat_up_self_atk_2)
      let effectBase = effect;
      if (/_(\d+)$/.test(effect) && !effect.startsWith('heal_') && !effect.includes('self_atk_2')) {
        effectBase = effect.replace(/_\d+$/, '');
      }

      // Buscar si el efecto o el efecto base está en el registro de acciones central
      const hasHandler = !!(ALL_ACTIONS[effect] || ALL_ACTIONS[effectBase]);

      if (!hasHandler) {
        missingHandlers.push(`Movimiento: ${moveData.name} (${moveId}) -> Efecto esperado: '${effect}'`);
      }
    });

    expect(missingHandlers).toEqual([]);
  });
});
