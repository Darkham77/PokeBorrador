import { describe, it, expect } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mapToShowdownSet, getShowdownSlot } from '@/logic/battle/showdownAdapter';
import { parseShowdownLogLine } from '@/logic/battle/showdownBridge';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages } from '@/types/battle/battle';
import type { BattleContext } from '@/types/battle/battleContext';
import { ref } from 'vue';

describe('Showdown Integration & Adapters', () => {
  setActivePinia(createPinia());

  describe('mapToShowdownSet', () => {
    it('debería mapear correctamente un Pokemon a Showdown set', () => {
      const mockPoke: Pokemon = {
        uid: 'p1',
        id: 'bulbasaur',
        name: 'Bulbasaur',
        level: 5,
        hp: 20,
        maxHp: 20,
        gender: 'M',
        ability: 'overgrow',
        nature: 'adamant',
        isShiny: false,
        moves: [
          { id: 'tackle', name: 'Placaje', pp: 35, maxPp: 35, power: 40, type: 'normal', cat: 'physical' },
          { id: 'growl', name: 'Gruñido', pp: 40, maxPp: 40, power: 0, type: 'normal', cat: 'status' }
        ],
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
      } as unknown as Pokemon;

      const set = mapToShowdownSet(mockPoke);
      expect(set.species).toBe('bulbasaur');
      expect(set.level).toBe(5);
      expect(set.ability).toBe('overgrow');
      expect(set.nature).toBe('adamant');
      expect(set.moves).toContain('tackle');
      expect(set.moves).toContain('growl');
    });
  });

  describe('getShowdownSlot', () => {
    it('debería retornar 1 para el pokemon activo', () => {
      const active = { uid: 'a' } as Pokemon;
      const team = [active, { uid: 'b' } as Pokemon];
      expect(getShowdownSlot(team, active, active)).toBe(1);
    });

    it('debería retornar el slot correcto para pokemon en reserva', () => {
      const active = { uid: 'a' } as Pokemon;
      const reserve = { uid: 'b' } as Pokemon;
      const team = [active, reserve, { uid: 'c' } as Pokemon];
      expect(getShowdownSlot(team, active, reserve)).toBe(2);
    });
  });

  describe('parseShowdownLogLine', () => {
    it('debería actualizar la vida del Pokémon al parsear -damage', async () => {
      const playerPoke = { uid: 'p1', name: 'Bulbasaur', hp: 100, maxHp: 100 } as Pokemon;
      const enemyPoke = { uid: 'e1', name: 'Pikachu', hp: 80, maxHp: 80 } as Pokemon;

      const logs: string[] = [];
      const mockContext = {
        activeBattle: ref({
          player: playerPoke,
          enemy: enemyPoke,
          weather: { type: 'clear', visual: 'clear', turns: -1 }
        }),
        playerStages: ref({ atk: 0 } as unknown as BattleStages),
        enemyStages: ref({ atk: 0 } as unknown as BattleStages),
        addLog: (msg: string) => logs.push(msg)
      } as unknown as BattleContext;

      await parseShowdownLogLine(mockContext, '|-damage|p1a: Bulbasaur|40/100');
      expect(playerPoke.hp).toBe(40);
      expect(playerPoke.maxHp).toBe(100);
      expect(logs[0]).toContain('recibió daño');

      await parseShowdownLogLine(mockContext, '|-damage|p2a: Pikachu|10/80');
      expect(enemyPoke.hp).toBe(10);
      expect(logs[1]).toContain('recibió daño');
    });

    it('debería actualizar los aumentos de estadísticas al parsear -boost y -unboost', async () => {
      const playerPoke = { uid: 'p1', name: 'Bulbasaur' } as Pokemon;
      const enemyPoke = { uid: 'e1', name: 'Pikachu' } as Pokemon;

      const playerStages = ref({ atk: 0 } as unknown as BattleStages);
      const enemyStages = ref({ atk: 0 } as unknown as BattleStages);

      const mockContext = {
        activeBattle: ref({
          player: playerPoke,
          enemy: enemyPoke,
          weather: { type: 'clear', visual: 'clear', turns: -1 }
        }),
        playerStages,
        enemyStages,
        addLog: () => {}
      } as unknown as BattleContext;

      await parseShowdownLogLine(mockContext, '|-boost|p1a: Bulbasaur|atk|2');
      expect(playerStages.value.atk).toBe(2);

      await parseShowdownLogLine(mockContext, '|-unboost|p1a: Bulbasaur|atk|1');
      expect(playerStages.value.atk).toBe(1);
    });
  });
});
