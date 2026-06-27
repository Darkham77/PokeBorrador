import { describe, it, expect } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mapToShowdownSet, getShowdownSlot, getShowdownFormatId } from '@/logic/battle/showdownAdapter';
import { parseShowdownLogLine } from '@/logic/battle/showdownBridge';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages } from '@/types/battle/battle';
import type { BattleContext } from '@/types/battle/battleContext';
import { ref } from 'vue';
import { Battle } from '@pkmn/sim';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';

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

      await parseShowdownLogLine(mockContext, '|-unboost|p2a: Pikachu|atk|1');
      expect(enemyStages.value.atk).toBe(-1);
    });

    it('debería registrar lastMove y manejar twoturnmove en -prepare y move', async () => {
      const playerPoke = { uid: 'p1', name: 'Bulbasaur', volatileCounters: {} } as Pokemon;
      const enemyPoke = { uid: 'e1', name: 'Pikachu' } as Pokemon;

      const mockContext = {
        activeBattle: ref({
          player: playerPoke,
          enemy: enemyPoke,
          weather: { type: 'clear', visual: 'clear', turns: -1 }
        }),
        attackerSide: ref(null),
        activeMove: ref(null),
        playerStages: ref({} as unknown as BattleStages),
        enemyStages: ref({} as unknown as BattleStages),
        addLog: () => {}
      } as unknown as BattleContext;

      // 1. Simular -prepare para el ataque Vuelo (Fly)
      await parseShowdownLogLine(mockContext, '|-prepare|p1a: Bulbasaur|Fly');
      expect(playerPoke.volatileCounters?.['twoturnmove']).toBe(1);
      expect(playerPoke.lastMove?.id).toBe('fly');

      // 2. Simular ejecución del ataque en el siguiente turno
      await parseShowdownLogLine(mockContext, '|move|p1a: Bulbasaur|Fly|p2a: Pikachu');
      expect(playerPoke.volatileCounters?.['twoturnmove']).toBeUndefined();
      expect(playerPoke.lastMove?.id).toBe('fly');
    });

    it('debería mantener twoturnmove si move y -prepare están en el mismo turno', async () => {
      const playerPoke = { uid: 'p1', name: 'Bulbasaur', volatileCounters: {} } as Pokemon;
      const enemyPoke = { uid: 'e1', name: 'Pikachu' } as Pokemon;

      const mockContext = {
        activeBattle: ref({
          player: playerPoke,
          enemy: enemyPoke,
          weather: { type: 'clear', visual: 'clear', turns: -1 }
        }),
        attackerSide: ref(null),
        activeMove: ref(null),
        playerStages: ref({} as unknown as BattleStages),
        enemyStages: ref({} as unknown as BattleStages),
        addLog: () => {}
      } as unknown as BattleContext;

      const turnLogs = [
        '|move|p1a: Bulbasaur|Fly||[still]',
        '|-prepare|p1a: Bulbasaur|Fly'
      ];

      for (const line of turnLogs) {
        await parseShowdownLogLine(mockContext, line, turnLogs);
      }

      expect(playerPoke.volatileCounters?.['twoturnmove']).toBe(1);
    });
  });

  describe('Player team order sorting', () => {
    it('debería reordenar el equipo poniendo al Pokémon inicial activo primero', () => {
      const initialPlayer = { uid: 'vaporeon-uid' } as Pokemon;
      const team = [
        { uid: 'poliwhirl-uid', name: 'Poliwhirl' } as Pokemon,
        { uid: 'vaporeon-uid', name: 'Vaporeon' } as Pokemon,
        { uid: 'chispa-uid', name: 'Chispa' } as Pokemon
      ];
      
      const playerTeamList = [...team];
      const initialPlayerIdx = playerTeamList.findIndex(p => p.uid === initialPlayer.uid);
      if (initialPlayerIdx > 0) {
        const [p] = playerTeamList.splice(initialPlayerIdx, 1);
        if (p) playerTeamList.unshift(p);
      }

      const [slot0, slot1, slot2] = playerTeamList;
      expect(slot0?.uid).toBe('vaporeon-uid');
      expect(slot1?.uid).toBe('poliwhirl-uid');
      expect(slot2?.uid).toBe('chispa-uid');
    });

    it('debería mapear correctamente los HP en el orden de showdownPlayerTeamOrder', () => {
      const showdownPlayerTeamOrder = ['vaporeon-uid', 'poliwhirl-uid', 'chispa-uid'];
      const team = [
        { uid: 'poliwhirl-uid', hp: 30 } as Pokemon,
        { uid: 'vaporeon-uid', hp: 120 } as Pokemon,
        { uid: 'chispa-uid', hp: 0 } as Pokemon
      ];

      const p1Hps = showdownPlayerTeamOrder.map(uid => team.find(p => p?.uid === uid)?.hp ?? 0);
      expect(p1Hps).toEqual([120, 30, 0]);
    });
  });

  describe('Battle simulation choose move test', () => {
    it('should allow rocktomb choice', () => {
      const playerPoke = makePokemon('bulbasaur', 15)!;
      const enemyPoke = makePokemon('onix', 14)!;

      const p1Team = [mapToShowdownSet(playerPoke)];
      const p2Team = [mapToShowdownSet(enemyPoke)];

      const battle = new Battle({ 
        formatid: getShowdownFormatId()
      });

      battle.setPlayer('p1', { name: 'Player', team: p1Team });
      battle.setPlayer('p2', { name: 'Brock', team: p2Team });

      battle.choose('p1', 'move 1');
      const res2 = battle.choose('p2', 'move rocktomb');
      expect(res2).toBe(true);
    });
  });
});
