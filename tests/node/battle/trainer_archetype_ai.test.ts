import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { getTrainerAIPreset, TRAINER_TYPE_KEYS } from '../../../src/data/player/trainerTypes.ts';
import { AI_CONFIG_PRESETS } from '../../../src/logic/battle/ai/heuristic/types.ts';
import { HeuristicAI } from '../../../src/logic/battle/ai/heuristicAI.ts';
import type { BattleContext } from '../../../src/types/battle/battleContext.ts';

describe('Trainer Archetype AI Presets & PvP Passive Defense', () => {
  describe('Archetype to AI Preset Mapping', () => {
    it('should correctly map novice archetypes to novice preset', () => {
      const novices = ['caza_bichos', 'pescador', 'default', 'pokefan'] as const;
      for (const arch of novices) {
        assert.strictEqual(getTrainerAIPreset(arch), 'novice', `Failed for ${arch}`);
      }
    });

    it('should correctly map intermediate archetypes to intermediate preset', () => {
      const intermediates = ['ornitologo', 'nadador', 'montanero', 'motorista', 'artista', 'criador'] as const;
      for (const arch of intermediates) {
        assert.strictEqual(getTrainerAIPreset(arch), 'intermediate', `Failed for ${arch}`);
      }
    });

    it('should correctly map tactical archetypes to tactical preset', () => {
      const tacticals = ['cientifico', 'medium', 'luchador', 'domador', 'ranger'] as const;
      for (const arch of tacticals) {
        assert.strictEqual(getTrainerAIPreset(arch), 'tactical', `Failed for ${arch}`);
      }
    });

    it('should correctly map elite archetypes to elite preset', () => {
      const elites = ['policeman', 'rocket', 'aristocrata'] as const;
      for (const arch of elites) {
        assert.strictEqual(getTrainerAIPreset(arch), 'elite', `Failed for ${arch}`);
      }
    });

    it('should correctly map rival to rival preset', () => {
      assert.strictEqual(getTrainerAIPreset('rival'), 'rival');
    });

    it('should cover all 19 canonical trainer type keys without omissions', () => {
      for (const key of TRAINER_TYPE_KEYS) {
        const preset = getTrainerAIPreset(key);
        assert.ok(preset in AI_CONFIG_PRESETS, `Key ${key} mapped to unknown preset ${preset}`);
      }
    });
  });

  describe('AI Config Resolution in HeuristicAI', () => {
    const ai = new HeuristicAI();

    it('should resolve rival preset for PvP passive defense battles (isPvP && isAsynchronous)', () => {
      const mockStore = {
        activeBattle: {
          value: {
            isPvP: true,
            isAsynchronous: true,
            isTrainer: true,
            trainerArchetype: 'default',
          }
        }
      } as unknown as BattleContext;

      const config = (ai as unknown as { getConfig(store?: BattleContext): typeof AI_CONFIG_PRESETS['rival'] }).getConfig(mockStore);
      assert.strictEqual(config.errorRate, 0);
      assert.strictEqual(config.switchCooldownTurns, 1);
    });

    it('should resolve novice preset with 0 switch aggressiveness for caza_bichos', () => {
      const mockStore = {
        activeBattle: {
          value: {
            isTrainer: true,
            trainerArchetype: 'caza_bichos',
          }
        }
      } as unknown as BattleContext;

      const config = (ai as unknown as { getConfig(store?: BattleContext): typeof AI_CONFIG_PRESETS['novice'] }).getConfig(mockStore);
      assert.strictEqual(config.switchAggressiveness, 0);
      assert.strictEqual(config.errorRate, 0.25);
    });

    it('should resolve apex rival tier with 0 error and 1 cooldown turn for rival', () => {
      const mockStore = {
        activeBattle: {
          value: {
            isTrainer: true,
            trainerArchetype: 'rival',
          }
        }
      } as unknown as BattleContext;

      const config = (ai as unknown as { getConfig(store?: BattleContext): typeof AI_CONFIG_PRESETS['rival'] }).getConfig(mockStore);
      assert.strictEqual(config.errorRate, 0);
      assert.strictEqual(config.switchCooldownTurns, 1);
      assert.strictEqual(config.switchAggressiveness, 0.85);
    });
  });
});
