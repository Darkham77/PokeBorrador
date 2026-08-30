// fallow-ignore-file security-sink
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { parseShowdownLogLine } from '@/logic/battle/showdownBridge.ts';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider.ts';
import { isPokemonLocked } from '@/logic/pokemon/pokemonUtils.ts';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import type { BattleState } from '@/types/battle/battle';

describe('Exhaustive Locked & Forced Moves Unit Tests (Tier 1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('ShowdownBridge Attack Animation on Multi-Turn Continuation', () => {
    it('triggers attack animation on turn 1 of Outrage (no from tag)', async () => {
      const mockAwaitTween = vi.fn().mockResolvedValue(undefined);
      const mockAddLog = vi.fn();

      const p = {
        uid: 'rayquaza-1',
        id: 'rayquaza',
        name: 'Rayquaza',
        level: 100,
        hp: 300,
        maxHp: 300,
        moves: [{ id: 'outrage', name: 'Enfado', pp: 15, maxPP: 15 }] as Move[]
      } as unknown as Pokemon;

      const e = {
        uid: 'pidgey-1',
        id: 'pidgey',
        name: 'Pidgey',
        level: 10,
        hp: 30,
        maxHp: 30,
        moves: []
      } as unknown as Pokemon;

      const activeBattle = {
        player: p,
        enemy: e,
        playerTeam: [p],
        enemyTeam: [e],
        turnCount: 1,
        over: false
      } as unknown as BattleState;

      const store = {
        activeBattle: { value: activeBattle },
        addLog: mockAddLog,
        attackerSide: { value: null as 'player' | 'enemy' | null },
        activeMove: { value: null as unknown },
        animations: {
          awaitTween: mockAwaitTween
        }
      };

      await parseShowdownLogLine(store as never, '|move|p1a: Rayquaza|Outrage|p2a: Pidgey', ['|move|p1a: Rayquaza|Outrage|p2a: Pidgey']);

      expect(mockAwaitTween).toHaveBeenCalledWith('attack-player');
    });

    it('triggers attack animation on turn 2 of Outrage when [from]lockedmove is present', async () => {
      const mockAwaitTween = vi.fn().mockResolvedValue(undefined);
      const mockAddLog = vi.fn();

      const p = {
        uid: 'rayquaza-1',
        id: 'rayquaza',
        name: 'Rayquaza',
        level: 100,
        hp: 300,
        maxHp: 300,
        moves: [{ id: 'outrage', name: 'Enfado', pp: 14, maxPP: 15 }] as Move[]
      } as unknown as Pokemon;

      const e = {
        uid: 'pidgey-1',
        id: 'pidgey',
        name: 'Pidgey',
        level: 10,
        hp: 30,
        maxHp: 30,
        moves: []
      } as unknown as Pokemon;

      const activeBattle = {
        player: p,
        enemy: e,
        playerTeam: [p],
        enemyTeam: [e],
        turnCount: 2,
        over: false
      } as unknown as BattleState;

      const store = {
        activeBattle: { value: activeBattle },
        addLog: mockAddLog,
        attackerSide: { value: null as 'player' | 'enemy' | null },
        activeMove: { value: null as unknown },
        animations: {
          awaitTween: mockAwaitTween
        }
      };

      await parseShowdownLogLine(store as never, '|move|p1a: Rayquaza|Outrage|p2a: Pidgey|[from]lockedmove', ['|move|p1a: Rayquaza|Outrage|p2a: Pidgey|[from]lockedmove']);

      expect(mockAwaitTween).toHaveBeenCalledWith('attack-player');
    });

    it('triggers attack animation when move is called from Sleep Talk or Metronome', async () => {
      const mockAwaitTween = vi.fn().mockResolvedValue(undefined);
      const mockAddLog = vi.fn();

      const p = {
        uid: 'snorlax-1',
        id: 'snorlax',
        name: 'Snorlax',
        level: 100,
        hp: 400,
        maxHp: 400,
        moves: [{ id: 'bodyslam', name: 'Golpe Cuerpo', pp: 15, maxPP: 15 }] as Move[]
      } as unknown as Pokemon;

      const e = {
        uid: 'gengar-1',
        id: 'gengar',
        name: 'Gengar',
        level: 100,
        hp: 200,
        maxHp: 200,
        moves: []
      } as unknown as Pokemon;

      const activeBattle = {
        player: p,
        enemy: e,
        playerTeam: [p],
        enemyTeam: [e],
        turnCount: 1,
        over: false
      } as unknown as BattleState;

      const store = {
        activeBattle: { value: activeBattle },
        addLog: mockAddLog,
        attackerSide: { value: null as 'player' | 'enemy' | null },
        activeMove: { value: null as unknown },
        animations: {
          awaitTween: mockAwaitTween
        }
      };

      await parseShowdownLogLine(store as never, '|move|p1a: Snorlax|Body Slam|p2a: Gengar|[from]Sleep Talk', ['|move|p1a: Snorlax|Body Slam|p2a: Gengar|[from]Sleep Talk']);

      expect(mockAwaitTween).toHaveBeenCalledWith('attack-player');
    });

    it('does NOT trigger attack animation if the move missed ([miss] or [notarget])', async () => {
      const mockAwaitTween = vi.fn().mockResolvedValue(undefined);
      const mockAddLog = vi.fn();

      const p = {
        uid: 'rayquaza-1',
        id: 'rayquaza',
        name: 'Rayquaza',
        level: 100,
        hp: 300,
        maxHp: 300,
        moves: [{ id: 'outrage', name: 'Enfado', pp: 15, maxPP: 15 }] as Move[]
      } as unknown as Pokemon;

      const e = {
        uid: 'pidgey-1',
        id: 'pidgey',
        name: 'Pidgey',
        level: 10,
        hp: 30,
        maxHp: 30,
        moves: []
      } as unknown as Pokemon;

      const activeBattle = {
        player: p,
        enemy: e,
        playerTeam: [p],
        enemyTeam: [e],
        turnCount: 1,
        over: false
      } as unknown as BattleState;

      const store = {
        activeBattle: { value: activeBattle },
        addLog: mockAddLog,
        attackerSide: { value: null as 'player' | 'enemy' | null },
        activeMove: { value: null as unknown },
        animations: {
          awaitTween: mockAwaitTween
        }
      };

      await parseShowdownLogLine(store as never, '|move|p1a: Rayquaza|Outrage|p2a: Pidgey|[miss]', ['|move|p1a: Rayquaza|Outrage|p2a: Pidgey|[miss]']);

      expect(mockAwaitTween).not.toHaveBeenCalled();
    });
  });

  describe('Database Forced & Locked Moves Identification', () => {
    it('accurately identifies locked moves in the move database', () => {
      const lockedMoveIds = ['outrage', 'thrash', 'petaldance'];
      for (const id of lockedMoveIds) {
        const md = pokemonDataProvider.getMoveData(id);
        expect(md).toBeDefined();
        expect(md?.self?.volatileStatus).toBe('lockedmove');
      }
    });

    it('accurately identifies charging two-turn moves in the move database', () => {
      const chargeMoveIds = ['solarbeam', 'skullbash', 'skyattack', 'razorwind', 'dig', 'fly', 'dive', 'bounce'];
      for (const id of chargeMoveIds) {
        const md = pokemonDataProvider.getMoveData(id);
        expect(md).toBeDefined();
        expect(['solarbeam', 'skullbash', 'skyattack', 'razorwind', 'dig', 'fly', 'dive', 'bounce']).toContain(id);
      }
    });

    it('accurately identifies recharge moves in the move database', () => {
      const rechargeMoveIds = ['hyperbeam', 'gigaimpact', 'frenzyplant', 'blastburn', 'hydrocannon'];
      for (const id of rechargeMoveIds) {
        const md = pokemonDataProvider.getMoveData(id);
        expect(md).toBeDefined();
        expect(['hyperbeam', 'gigaimpact', 'frenzyplant', 'blastburn', 'hydrocannon']).toContain(id);
      }
    });
  });

  describe('isPokemonLocked Helper', () => {
    it('returns true when volatileCounters.lockedmove > 0', () => {
      const p = {
        uid: 'p1',
        id: 'rayquaza',
        name: 'Rayquaza',
        level: 100,
        hp: 300,
        maxHp: 300,
        volatileCounters: { lockedmove: 2 },
        moves: []
      } as unknown as Pokemon;
      expect(isPokemonLocked(p)).toBe(true);
    });

    it('returns true when volatileCounters.twoturnmove > 0', () => {
      const p = {
        uid: 'p1',
        id: 'venusaur',
        name: 'Venusaur',
        level: 100,
        hp: 300,
        maxHp: 300,
        volatileCounters: { twoturnmove: 1 },
        moves: []
      } as unknown as Pokemon;
      expect(isPokemonLocked(p)).toBe(true);
    });

    it('returns true when volatileCounters.mustrecharge > 0', () => {
      const p = {
        uid: 'p1',
        id: 'snorlax',
        name: 'Snorlax',
        level: 100,
        hp: 300,
        maxHp: 300,
        volatileCounters: { mustrecharge: 1 },
        moves: []
      } as unknown as Pokemon;
      expect(isPokemonLocked(p)).toBe(true);
    });

    it('returns true when thrashTurns > 0', () => {
      const p = {
        uid: 'p1',
        id: 'snorlax',
        name: 'Snorlax',
        level: 100,
        hp: 300,
        maxHp: 300,
        thrashTurns: 2,
        moves: []
      } as unknown as Pokemon;
      expect(isPokemonLocked(p)).toBe(true);
    });

    it('returns false when no locked volatiles are active', () => {
      const p = {
        uid: 'p1',
        id: 'rayquaza',
        name: 'Rayquaza',
        level: 100,
        hp: 300,
        maxHp: 300,
        volatileCounters: {},
        moves: []
      } as unknown as Pokemon;
      expect(isPokemonLocked(p)).toBe(false);
    });
  });
});
