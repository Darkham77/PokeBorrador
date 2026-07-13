import { describe, it, vi, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { HeuristicAI } from '../../../src/logic/battle/ai/heuristicAI.ts';
import type { Pokemon, Move } from '../../../src/types/pokemon/pokemon.ts';
import type { BattleStages } from '../../../src/types/battle/battle.ts';
import type { BattleContext } from '../../../src/types/battle/battleContext.ts';

// Mocks para evitar efectos secundarios
vi.mock('@/stores/audio', () => ({
  useAudioStore: () => ({
    play: vi.fn()
  })
}));

vi.mock('@/stores/battle/battle', () => ({
  useBattleStore: () => ({
    state: {
      enemyRequest: null
    }
  })
}));

describe('HeuristicAI - Path Coverage Tests', () => {
  let ai: HeuristicAI;
  let attacker: Pokemon;
  let defender: Pokemon;
  let defStages: BattleStages;

  beforeEach(() => {
    ai = new HeuristicAI();
    defStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

    attacker = {
      uid: 'att-123',
      name: 'Pikachu',
      hp: 100,
      maxHp: 100,
      type: 'electric',
      spe: 90,
      moves: [
        { id: 'thunderbolt', name: 'Thunderbolt', power: 90, type: 'electric', cat: 'special', pp: 15, maxPp: 15 },
        { id: 'quickattack', name: 'Quick Attack', power: 40, type: 'normal', cat: 'physical', pp: 30, maxPp: 30, priority: 1 },
        { id: 'growl', name: 'Growl', power: 0, type: 'normal', cat: 'status', pp: 40, maxPp: 40 }
      ]
    } as unknown as Pokemon;

    defender = {
      uid: 'def-456',
      name: 'Squirtle',
      hp: 100,
      maxHp: 100,
      type: 'water',
      spe: 50,
      moves: []
    } as unknown as Pokemon;
  });

  describe('decideMove - Fallback Paths', () => {
    it('should select highest power non-disabled move when buildSnapshot fails (graceful degradation)', () => {
      // Mock Math.random para evitar la aleatoriedad de la IA NPC
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(1.0);
      
      // Sin store context, buildSnapshot fallará y se usará pickBestMoveByPower
      const move = ai.decideMove(attacker, defender, defStages, false);
      assert.ok(move);
      assert.strictEqual(move.id, 'thunderbolt'); // 90 power vs 40 vs 0
      
      randomSpy.mockRestore();
    });

    it('should select highest power non-disabled move when isWild = false but no store is provided', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(1.0);
      
      const move = ai.decideMove(attacker, defender, defStages, false, undefined);
      assert.ok(move);
      assert.strictEqual(move.id, 'thunderbolt');

      randomSpy.mockRestore();
    });

    it('should respect disabledMove during fallback pick', () => {
      attacker.disabledMove = { id: 'thunderbolt' } as Move;
      const move = ai.decideMove(attacker, defender, defStages, false);
      assert.ok(move);
      assert.strictEqual(move.id, 'quickattack'); // Thunderbolt deshabilitado, elige Quick Attack (40 power)
    });
  });

  describe('shouldSwitch', () => {
    it('should return false if enemyTeam has only 1 viable member', () => {
      const result = ai.shouldSwitch(attacker, defender, [attacker]);
      assert.strictEqual(result, false);
    });

    it('should return false for wild battles', () => {
      const fakeStore = {
        activeBattle: {
          value: {
            isWild: true,
            enemyTeam: [attacker, { ...attacker, uid: 'att-2' }]
          }
        }
      } as unknown as BattleContext;
      const result = ai.shouldSwitch(attacker, defender, [attacker, { ...attacker, uid: 'att-2' } as Pokemon], fakeStore);
      assert.strictEqual(result, false);
    });
  });

  describe('findBestSwitchIndex - Fallback', () => {
    it('should fall back to the first alive non-active member when snapshot building fails', () => {
      const ally = { uid: 'ally-1', hp: 50 } as unknown as Pokemon;
      const team = [attacker, ally];
      const result = ai.findBestSwitchIndex(team, defender, attacker.uid);
      assert.strictEqual(result, 1); // Elige al aliado
    });
  });

  describe('evaluateAndUseItem - Path Coverage', () => {
    let mockContext: BattleContext;

    beforeEach(() => {
      mockContext = {
        activeBattle: {
          value: {
            isGym: false,
            trainerName: 'Gary',
            enemyInventory: {},
            enemyTeam: []
          }
        },
        addLog: vi.fn(),
        animations: {
          handleHealRequest: vi.fn()
        }
      } as unknown as BattleContext;
    });

    it('should return false if enemyInventory is empty', async () => {
      const itemUsed = await ai.evaluateAndUseItem(mockContext, attacker);
      assert.strictEqual(itemUsed, false);
    });

    it('should use Revive on a fainted teammate if active pokemon is healthy', async () => {
      const activePoke = { ...attacker, hp: 90 };
      const faintedPoke = { name: 'Teammate', hp: 0, maxHp: 100, status: 'psn' } as unknown as Pokemon;
      
      mockContext.activeBattle.value!.enemyTeam = [activePoke, faintedPoke];
      mockContext.activeBattle.value!.enemyInventory = { revive: 1 };

      const itemUsed = await ai.evaluateAndUseItem(mockContext, activePoke);
      
      assert.strictEqual(itemUsed, true);
      assert.strictEqual(faintedPoke.hp, 50); // Revive cura el 50%
      assert.strictEqual(faintedPoke.status, undefined); // Limpia estado
      assert.strictEqual(mockContext.activeBattle.value!.enemyInventory['revive'], undefined); // Consumido
    });

    it('should cure status conditions (e.g. psn) using specific items', async () => {
      const activePoke = { ...attacker, hp: 100, maxHp: 100, status: 'psn' };
      mockContext.activeBattle.value!.enemyInventory = { antidote: 1 };

      const itemUsed = await ai.evaluateAndUseItem(mockContext, activePoke);
      
      assert.strictEqual(itemUsed, true);
      assert.strictEqual(activePoke.status, undefined);
      assert.strictEqual(mockContext.activeBattle.value!.enemyInventory['antidote'], undefined);
    });

    it('should heal HP with Potion if active HP is below 25%', async () => {
      const activePoke = { ...attacker, hp: 10, maxHp: 100, status: undefined };
      mockContext.activeBattle.value!.enemyInventory = { potion: 1 };

      const itemUsed = await ai.evaluateAndUseItem(mockContext, activePoke);
      
      assert.strictEqual(itemUsed, true);
      assert.strictEqual(activePoke.hp, 30); // Pocion cura 20 HP
      assert.strictEqual(mockContext.activeBattle.value!.enemyInventory['potion'], undefined);
    });

    it('should prioritize using Full Restore if HP is low and has a status condition', async () => {
      const activePoke = { ...attacker, hp: 10, maxHp: 100, status: 'brn' };
      mockContext.activeBattle.value!.enemyInventory = { fullrestore: 1 };

      const itemUsed = await ai.evaluateAndUseItem(mockContext, activePoke);
      
      assert.strictEqual(itemUsed, true);
      assert.strictEqual(activePoke.hp, 100);
      assert.strictEqual(activePoke.status, undefined);
    });
  });
});
