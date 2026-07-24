/**
 * tests/unit/battle/showdown_round11_fixes.spec.ts
 * Dedicated unit tests verifying fixes for Round 11 audit findings.
 */
import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';

describe('Showdown Round 11 Audit Fixes', () => {
  describe('CRIT-1: HP Ratio Calculation in Bridge (-damage & -heal)', () => {
    it('should preserve realMaxHp when receiving Showdown ratio condition (e.g. 48/100)', async () => {
      const { parseShowdownLogLine } = await import('@/logic/battle/showdownBridge');
      
      const victim = {
        uid: 'p-mewtwo',
        id: 'mewtwo',
        name: 'Mewtwo',
        hp: 300,
        maxHp: 300,
        volatileCounters: {}
      } as unknown as Pokemon;

      const activeBattle = ref({
        player: victim,
        enemy: { uid: 'e-pikachu', id: 'pikachu', name: 'Pikachu', hp: 100, maxHp: 100 } as unknown as Pokemon,
        playerTeam: [victim],
        enemyTeam: [{ uid: 'e-pikachu', id: 'pikachu', name: 'Pikachu', hp: 100, maxHp: 100 }]
      });

      const mockCtx = {
        activeBattle,
        addLog: vi.fn(),
        attackerSide: ref(null),
        activeMove: ref(null)
      } as unknown as BattleContext;

      // Damage: Showdown emits 50/100 ratio
      await parseShowdownLogLine(mockCtx, '|-damage|p1a: Mewtwo|50/100|[uids]p1a:Mewtwo=p-mewtwo');

      expect(victim.maxHp).toBe(300); // Must stay 300, NOT overwritten with 100
      expect(victim.hp).toBe(150);    // 50% of 300
    });
  });

  describe('HIGH-1 & HIGH-2: Volatile Cleanup in |turn| and |upkeep|', () => {
    it('should clean single-turn volatile counters (protect, flinch, endure) on turn/upkeep', async () => {
      const { parseShowdownLogLine } = await import('@/logic/battle/showdownBridge');

      const player = {
        uid: 'p-charizard',
        id: 'charizard',
        name: 'Charizard',
        hp: 200,
        maxHp: 200,
        volatileCounters: { protect: 1, flinch: 1, endure: 1, taunt: 3 }
      } as unknown as Pokemon;

      const activeBattle = ref({
        player,
        enemy: { uid: 'e-blastoise', id: 'blastoise', name: 'Blastoise', hp: 200, maxHp: 200 } as unknown as Pokemon,
        playerTeam: [player],
        enemyTeam: [{ uid: 'e-blastoise', id: 'blastoise', name: 'Blastoise', hp: 200, maxHp: 200 }],
        turnCount: 1
      });

      const mockCtx = {
        activeBattle,
        addLog: vi.fn(),
        attackerSide: ref(null),
        activeMove: ref(null)
      } as unknown as BattleContext;

      await parseShowdownLogLine(mockCtx, '|turn|2');

      expect(player.volatileCounters?.['protect']).toBeUndefined();
      expect(player.volatileCounters?.['flinch']).toBeUndefined();
      expect(player.volatileCounters?.['endure']).toBeUndefined();
      expect(player.volatileCounters?.['taunt']).toBe(3); // Multi-turn volatile persists
    });
  });

  describe('HIGH-3: |-transform| Data and Moves Copy with PP=5', () => {
    it('should copy species, types, and moves with max 5 PP when transformed', async () => {
      const { parseShowdownLogLine } = await import('@/logic/battle/showdownBridge');

      const ditto = {
        uid: 'p-ditto',
        id: 'ditto',
        name: 'Ditto',
        species: 'Ditto',
        type: 'normal',
        hp: 150,
        maxHp: 150,
        moves: [{ id: 'transform', name: 'Transform', pp: 10, maxPP: 10 }]
      } as unknown as Pokemon;

      const dragonite = {
        uid: 'e-dragonite',
        id: 'dragonite',
        name: 'Dragonite',
        species: 'Dragonite',
        type: 'dragon',
        type2: 'flying',
        hp: 250,
        maxHp: 250,
        moves: [
          { id: 'dragonclaw', name: 'Dragon Claw', pp: 15, maxPP: 15 },
          { id: 'hyperbeam', name: 'Hyper Beam', pp: 5, maxPP: 5 }
        ]
      } as unknown as Pokemon;

      const activeBattle = ref({
        player: ditto,
        enemy: dragonite,
        playerTeam: [ditto],
        enemyTeam: [dragonite]
      });

      const mockCtx = {
        activeBattle,
        addLog: vi.fn(),
        attackerSide: ref(null),
        activeMove: ref(null)
      } as unknown as BattleContext;

      await parseShowdownLogLine(mockCtx, '|-transform|p1a: Ditto|p2a: Dragonite|[uids]p1a:Ditto=p-ditto,p2a:Dragonite=e-dragonite');

      expect(ditto.species).toBe('Dragonite');
      expect(ditto.type).toBe('dragon');
      expect(ditto.type2).toBe('flying');
      expect(ditto.moves?.length).toBe(2);
      expect(ditto.moves?.[0]?.pp).toBe(5);
      expect(ditto.moves?.[0]?.maxPP).toBe(5);
    });
  });
});
