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
import { decideEnemyMove } from '@/logic/battle/ai/battleAI';

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

    it('debería mapear correctamente los movimientos oficiales de Showdown sin guiones bajos', () => {
      const mockPoke: Pokemon = {
        uid: 'p1',
        id: 'rhyhorn',
        name: 'Rhyhorn',
        level: 50,
        ability: 'lightningrod',
        nature: 'hardy',
        moves: [
          { id: 'stoneedge', name: 'Roca Afilada', pp: 5, maxPp: 5, power: 100, type: 'rock', cat: 'physical' }
        ]
      } as unknown as Pokemon;

      const set = mapToShowdownSet(mockPoke);
      expect(set.moves).toContain('stoneedge');
    });
  });

  describe('getShowdownSlot', () => {
    it('debería retornar 1 para el pokemon activo', () => {
      const slotOrder = ['a', 'b'];
      expect(getShowdownSlot(slotOrder, 'a')).toBe(1);
    });

    it('debería retornar el slot correcto para pokemon en reserva', () => {
      const slotOrder = ['a', 'b', 'c'];
      expect(getShowdownSlot(slotOrder, 'b')).toBe(2);
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

    it('debería mapear correctamente los HP en el orden inicial del equipo (initialPlayerTeamOrder)', () => {
      const initialPlayerTeamOrder = ['vaporeon-uid', 'poliwhirl-uid', 'chispa-uid'];
      const team = [
        { uid: 'poliwhirl-uid', hp: 30 } as Pokemon,
        { uid: 'vaporeon-uid', hp: 120 } as Pokemon,
        { uid: 'chispa-uid', hp: 0 } as Pokemon
      ];

      const p1Hps = initialPlayerTeamOrder.map(uid => team.find(p => p?.uid === uid)?.hp ?? 0);
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

    it('debería reproducir el error de elección inválida cuando los HP están desincronizados por el orden de cambio (Dugtrio/Rhydon) y verificar que con el orden inicial funciona', () => {
      const rhydon = makePokemon('rhydon', 50)!;
      const dugtrio = makePokemon('dugtrio', 42)!;
      
      const p1Team = [mapToShowdownSet(makePokemon('magikarp', 1)!)];
      const p2Team = [mapToShowdownSet(rhydon), mapToShowdownSet(dugtrio)];

      // Caso 1: Desincronizado (Bug)
      {
        const battle = new Battle({ 
          formatid: getShowdownFormatId()
        });
        battle.setPlayer('p1', { name: 'Player', team: p1Team });
        battle.setPlayer('p2', { name: 'Giovanni', team: p2Team });
        
        // Registrar el primer turno y hacer que p2 cambie a Dugtrio
        battle.choose('p1', 'move 1');
        battle.choose('p2', 'switch 2');

        const p2Hps = [0, 136]; // El bug: enviar HPs en orden inicial [Rhydon=0, Dugtrio=136] cuando mons está en orden cambiado
        const mons = battle.p2.pokemon;
        p2Hps.forEach((hp, index) => {
          const pokemon = mons[index] as unknown as { hp: number; fainted: boolean; status: string } | undefined;
          if (pokemon) {
            pokemon.hp = hp;
            if (hp <= 0) {
              pokemon.fainted = true;
              pokemon.status = 'fnt';
            } else {
              pokemon.fainted = false;
              if (pokemon.status === 'fnt') pokemon.status = '';
            }
          }
        });
        const res = battle.choose('p2', 'move earthpower');
        expect(res).toBe(false);
      }

      // Caso 2: Sincronizado en orden inicial (Solución)
      {
        const battle = new Battle({ 
          formatid: getShowdownFormatId()
        });
        battle.setPlayer('p1', { name: 'Player', team: p1Team });
        battle.setPlayer('p2', { name: 'Giovanni', team: p2Team });

        // Registrar el primer turno y hacer que p2 cambie a Dugtrio
        battle.choose('p1', 'move 1');
        battle.choose('p2', 'switch 2');

        const p2Hps = [136, 0]; // La solución: enviar HPs en el orden actual/cambiado [Dugtrio=136, Rhydon=0]
        const mons = battle.p2.pokemon;
        p2Hps.forEach((hp, index) => {
          const pokemon = mons[index] as unknown as { hp: number; fainted: boolean; status: string } | undefined;
          if (pokemon) {
            pokemon.hp = hp;
            if (hp <= 0) {
              pokemon.fainted = true;
              pokemon.status = 'fnt';
            } else {
              pokemon.fainted = false;
              if (pokemon.status === 'fnt') pokemon.status = '';
            }
          }
        });
        console.log("MONS IN CASO 2:", battle.p2.pokemon.map(p => ({ name: p.name, hp: p.hp, fainted: p.fainted, status: p.status })));
        battle.choose('p1', 'move 1');
        const res = battle.choose('p2', 'move earthpower');
        expect(res).toBe(true);
      }
    });

    it('debería verificar si un Dugtrio nivel 42 puede elegir Terremoto (earthquake) en Showdown', () => {
      const dugtrio = makePokemon('dugtrio', 42)!;
      // Forzar que tenga terremoto (si es que no lo tiene)
      dugtrio.moves = [
        { id: 'earthquake', name: 'Terremoto', pp: 10, maxPp: 10, power: 100, type: 'ground', cat: 'physical' }
      ] as unknown as import('@/types/pokemon/pokemon').Move[];

      const p1Team = [mapToShowdownSet(makePokemon('vaporeon', 50)!)];
      const p2Team = [mapToShowdownSet(dugtrio)];

      const battle = new Battle({ 
        formatid: getShowdownFormatId()
      });

      battle.setPlayer('p1', { name: 'Player', team: p1Team });
      battle.setPlayer('p2', { name: 'Giovanni', team: p2Team });

      battle.choose('p1', 'move 1');
      const res = battle.choose('p2', 'move earthquake');
      // Verificamos si Showdown lo acepta
      expect(res).toBe(true);
    });

    it('debería ignorar los movimientos desactivados (disabledMove) en la lógica de decisión de la IA del enemigo', () => {
      const enemy = makePokemon('gengar', 50)!;
      enemy.moves = [
        { id: 'shadowball', name: 'Bola Sombra', pp: 15, maxPp: 15, power: 80, type: 'ghost', cat: 'special' },
        { id: 'sludgebomb', name: 'Bomba Lodo', pp: 10, maxPp: 10, power: 120, type: 'poison', cat: 'special' }
      ] as unknown as import('@/types/pokemon/pokemon').Move[];

      const player = makePokemon('vaporeon', 50)!;
      const stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 } as BattleStages;

      // Caso 1: Sin desactivar, puede elegir Bomba Lodo (potencia 90 > Bola Sombra 80)
      const move1 = decideEnemyMove(enemy, player, stages, false);
      expect(move1?.id).toBe('sludgebomb'); 

      // Caso 2: Bomba Lodo desactivada, debe elegir Bola Sombra
      enemy.disabledMove = { id: 'sludgebomb' } as unknown as import('@/types/pokemon/pokemon').Move;
      const move2 = decideEnemyMove(enemy, player, stages, false);
      expect(move2?.id).toBe('shadowball');
    });
  });
});
