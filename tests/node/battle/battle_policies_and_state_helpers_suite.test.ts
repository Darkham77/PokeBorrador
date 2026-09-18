import assert from 'node:assert/strict';
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Locator } from '@playwright/test';

import { BATTLE_STATES, isBattleCompletionReady } from '@/logic/battle/helpers/battleCompletionReadiness';
import { BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine';
import { applyStatusCheatToSide, type CheatSide } from '@/logic/battle/cheats';
import { isNaturalWeatherAllowedInLocation, resolveEffectiveCycleForLocation } from '@/logic/battle/battleTeamCoordinator';
import { ScriptedAI } from '@/logic/battle/ai/scriptedAI';
import { abilityTriggeredInLog, runStandaloneBatch } from '../../../scripts/e2e/fuzzer/core/fuzzer_engine.ts';
import { generateTestBatches } from '../../../scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts';
import type { AbilityId } from '@/data/battle/abilities';
import { selectNaturalFinishingMoveIndex } from '../../../scripts/e2e/fuzzer/core/fuzzer_agent.ts';
import { resolveValidMoveChoice, type ActiveRequestMove } from '@/logic/battle/helpers/showdownMoveChoiceHelper';
import { clickResilient } from '../../../scripts/e2e/helpers/e2eLogger.ts';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { canExecuteScriptedReplayAction, isReplaySwitchRequired } from '@/logic/battle/helpers/scriptedReplayReadiness';
import { isTrainerTransitionActive } from '@/composables/battle/useBattleTrainerAnimations';
import { getTrainerIdleConfig } from '@/components/battle/helpers/trainerIdleAnims';
import {
  TRAINER_IDLE_BASE_SCALE_X,
  TRAINER_IDLE_VAR_SCALE_X,
  TRAINER_IDLE_BASE_SCALE_Y,
  TRAINER_IDLE_VAR_SCALE_Y,
  TRAINER_IDLE_BASE_ROTATION_DEG,
  TRAINER_IDLE_VAR_ROTATION_DEG,
  TRAINER_IDLE_BASE_DURATION_SEC,
  TRAINER_IDLE_VAR_DURATION_SEC,
} from '@/logic/constants/animations';

const PLAYER_UID = 'player-uid';
const OTHER_UID = 'other-uid';
const POISON_STATUS = 'psn';
const TARGET_ABILITY_IDS = ['lingeringaroma', 'moldbreaker', 'perishbody'] as const satisfies readonly AbilityId[];

describe('Battle Policies, Fuzzer & State Helpers Suite', () => {
  describe('battleCompletionReadiness', () => {
    it('does not expose a Showdown-ended battle as closable until its FSM reaches a terminal phase', () => {
      assert.equal(isBattleCompletionReady({
        hasActiveBattle: true,
        isOver: true,
        fsmState: BATTLE_STATES.ACTIVE_BATTLE,
        fsmSubState: null,
      }), false);
    });

    it('does not expose a battle as closable while rewards are still being distributed', () => {
      assert.equal(isBattleCompletionReady({
        hasActiveBattle: true,
        isOver: true,
        fsmState: BATTLE_STATES.REWARDS_PHASE,
        fsmSubState: BATTLE_SUBSTATES.DISTRIBUTE_XP,
      }), false);
    });

    it('exposes the battle as closable after rewards reach the exit-ready substate', () => {
      assert.equal(isBattleCompletionReady({
        hasActiveBattle: true,
        isOver: true,
        fsmState: BATTLE_STATES.REWARDS_PHASE,
        fsmSubState: BATTLE_SUBSTATES.EMPTY_WAIT,
      }), true);
    });
  });

  describe('applyStatusCheatToSide', () => {
    it('updates only the UID-selected simulator Pokémon so a legal switch retains its status', () => {
      const side: CheatSide = {
        pokemon: [
          { uid: PLAYER_UID, hp: 10, status: '' },
          { uid: OTHER_UID, hp: 10, status: '' },
        ],
      };

      applyStatusCheatToSide(side, OTHER_UID, POISON_STATUS);

      expect(side.pokemon[0]?.status).toBe('');
      expect(side.pokemon[1]?.status).toBe(POISON_STATUS);
    });

    it('fails instead of silently desynchronizing when the selected UID is absent', () => {
      const side: CheatSide = { pokemon: [{ uid: PLAYER_UID, hp: 10, status: '' }] };

      expect(() => applyStatusCheatToSide(side, OTHER_UID, POISON_STATUS)).toThrow(OTHER_UID);
    });
  });

  describe('Battle Weather & Lighting Isolation', () => {
    it('strictly blocks natural weather in gyms regardless of whether it is PvP, PvE, or Trainer battle', () => {
      expect(isNaturalWeatherAllowedInLocation('gym', null, { isGym: true }, { isGym: true })).toBe(false);
      expect(isNaturalWeatherAllowedInLocation('gym', null, null, { isPvP: true, locationId: 'gym' } as any)).toBe(false);
      expect(isNaturalWeatherAllowedInLocation('gym', { isGym: true }, null, null)).toBe(false);
    });

    it('strictly blocks natural weather in caves, crystal caves, and interior buildings', () => {
      expect(isNaturalWeatherAllowedInLocation('rock_tunnel', { isCave: true }, null, null)).toBe(false);
      expect(isNaturalWeatherAllowedInLocation('cerulean_cave', { isCave: true }, null, { isCave: true } as any)).toBe(false);
      expect(isNaturalWeatherAllowedInLocation('seafoam_islands', { isCrystalCave: true }, null, null)).toBe(false);
      expect(isNaturalWeatherAllowedInLocation('pokemon_tower', { isIndoors: true }, null, null)).toBe(false);
    });

    it('permits natural weather and dynamic day/night cycles on outdoor routes', () => {
      expect(isNaturalWeatherAllowedInLocation('route1', { isIndoors: false, weatherEnabled: true }, null, null)).toBe(true);
      expect(isNaturalWeatherAllowedInLocation('route23', { isIndoors: false, weatherEnabled: true }, null, { isPvP: true } as any)).toBe(true);
    });

    it('ensures fixed lighting cycle for caves (night) and indoors/gyms (day)', () => {
      expect(resolveEffectiveCycleForLocation('gym', null, null, { isGym: true } as any, 'night')).toBe('day');
      expect(resolveEffectiveCycleForLocation('diglett_cave', { isCave: true }, null, null, 'day')).toBe('night');
      expect(resolveEffectiveCycleForLocation('route1', { isIndoors: false }, null, null, 'night')).toBe('night');
      expect(resolveEffectiveCycleForLocation('route1', { isIndoors: false }, null, null, 'day')).toBe('day');
    });
  });

  describe('CombatAI - ScriptedAI Logic', () => {
    const originalWindow = (globalThis as any).window;

    afterEach(() => {
      if (originalWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = originalWindow;
      }
    });

    it('ScriptedAI decideMove should replay moves from the mock choices', () => {
      (globalThis as any).window = {
        __VITE_DEBUG__: {
          mockEnemyChoices: ['move 1', 'switch 2'],
          enemyChoiceIndex: 0
        }
      };

      const ai = new ScriptedAI();
      const fakePokemon = {
        moves: [{ id: 'tackle', name: 'Tackle' }]
      } as any;

      const move = ai.decideMove(fakePokemon, {} as any, {} as any, false);
      assert.ok(move);
      assert.strictEqual(move.id, 'tackle');
    });

    it('ScriptedAI shouldSwitch should return true if mock choice is switch', () => {
      (globalThis as any).window = {
        __VITE_DEBUG__: {
          mockEnemyChoices: ['move 1', 'switch 2'],
          enemyChoiceIndex: 1
        }
      };

      const ai = new ScriptedAI();
      const result = ai.shouldSwitch({} as any, {} as any, []);
      assert.strictEqual(result, true);
    });

    it('ScriptedAI evaluateAndUseItem should always return false', async () => {
      const ai = new ScriptedAI();
      const result = await ai.evaluateAndUseItem({} as any, {} as any);
      assert.strictEqual(result, false);
    });
  });

  describe('abilityTriggeredInLog', () => {
    it.each([
      [TARGET_ABILITY_IDS[0], '|-activate|p1a: Mew|ability: Lingering Aroma|p2a: Blissey'],
      [TARGET_ABILITY_IDS[1], '|-ability|p1a: Mew|Mold Breaker'],
      [TARGET_ABILITY_IDS[2], '|-ability|p1a: Mew|Perish Body'],
    ])('recognizes the Showdown event for %s', (abilityId, line) => {
      expect(abilityTriggeredInLog(line, abilityId)).toBe(true);
    });
  });

  describe('dynamic ability coverage', () => {
    it('records ability coverage from a generated test batch', async () => {
      const batches = generateTestBatches();
      const batch = batches.find(candidate => candidate.abilitiesToTest.length > 0);
      expect(batch).toBeDefined();
      const targetAbility = batch!.abilitiesToTest[0];
      expect(targetAbility).toBeDefined();
      const result = await runStandaloneBatch(batch!, 1, 1);
      expect(result.abilityCoverage[targetAbility!]?.status).toBe('PASS');
    });
  });

  describe('selectNaturalFinishingMoveIndex', () => {
    it('prefers the strongest legal damaging move after the objective is covered', () => {
      expect(selectNaturalFinishingMoveIndex([
        { id: 'protect', pp: 10 },
        { id: 'flamethrower', pp: 10 },
        { id: 'tackle', pp: 10 },
      ])).toBe(1);
    });
  });

  describe('Bug Reproduction: case-4c5959822dc7 (Single-slot move lock / out of bounds move slot)', () => {
    it('should redirect move 3 to move 1 when Pokemon is locked into a single move (Shadow Force)', () => {
      const shadowForceReq: ActiveRequestMove[] = [
        { id: 'shadowforce', move: 'Shadow Force', disabled: false }
      ];

      const result = resolveValidMoveChoice('move 3', shadowForceReq);
      expect(result).toBe('move 1');
    });

    it('should redirect any out-of-bounds move slot to the first valid move slot', () => {
      const moves: ActiveRequestMove[] = [
        { id: 'thunderbolt', move: 'Thunderbolt', pp: 24, disabled: false },
        { id: 'surf', move: 'Surf', pp: 15, disabled: false }
      ];

      const result = resolveValidMoveChoice('move 4', moves);
      expect(result).toBe('move 1');
    });

    it('should preserve modifiers when redirecting out-of-bounds or single-slot moves', () => {
      const shadowForceReq: ActiveRequestMove[] = [
        { id: 'shadowforce', move: 'Shadow Force', disabled: false }
      ];

      const result = resolveValidMoveChoice('move 3 terastallize', shadowForceReq);
      expect(result).toBe('move 1 terastallize');
    });
  });

  describe('clickResilient timeout resilience reproduction', () => {
    it('should pass explicit timeout options to locator.evaluate and allow adequate initial click budget', async () => {
      const capturedOptions: { click: { timeout?: number; force?: boolean }[]; evaluate?: { timeout?: number } } = {
        click: []
      };

      const mockLocator = {
        click: vi.fn().mockImplementation(async (opts: { timeout?: number; force?: boolean }) => {
          capturedOptions.click.push(opts);
          throw new Error('TimeoutError: locator.click: Timeout exceeded.');
        }),
        evaluate: vi.fn().mockImplementation(async (_fn: unknown, _arg: unknown, opts: { timeout?: number }) => {
          capturedOptions.evaluate = opts;
          return undefined;
        })
      } as unknown as Locator;

      await clickResilient(mockLocator, { timeout: 5000 });

      expect(capturedOptions.click[0]?.timeout).toBeGreaterThanOrEqual(2000);
      expect(capturedOptions.evaluate).toBeDefined();
      expect(capturedOptions.evaluate?.timeout).toBeGreaterThan(0);
      expect((capturedOptions.evaluate?.timeout ?? 0)).toBeLessThanOrEqual(5000);
    });
  });

  describe('pokemonDataProvider in the Node fuzzer runtime', () => {
    it('resolves a form-change species without relying on Vite import.meta.env', () => {
      Reflect.set(globalThis, '__E2E__', true);
      expect(() => pokemonDataProvider.getPokemonData('eiscue')).not.toThrow();
    });
  });

  describe('scriptedReplayReadiness', () => {
    it('a certified replacement remains actionable while SWITCH_MENU records its pending switch', () => {
      assert.equal(canExecuteScriptedReplayAction({
        isActiveBattle: true,
        subState: 'SWITCH_MENU',
        isProcessing: false,
        isIntroAnimating: false,
        hasPendingSwitch: true,
      }), true);
    });

    it('pending switches remain blocked outside the switch-selection state', () => {
      assert.equal(canExecuteScriptedReplayAction({
        isActiveBattle: true,
        subState: 'WAIT_INPUT',
        isProcessing: false,
        isIntroAnimating: false,
        hasPendingSwitch: true,
      }), false);
    });

    it('a switch-selection state remains actionable when an unrelated intro marker is stale', () => {
      assert.equal(canExecuteScriptedReplayAction({
        isActiveBattle: true,
        subState: 'SWITCH_MENU',
        isProcessing: false,
        isIntroAnimating: true,
        hasPendingSwitch: false,
      }), true);
    });

    it('detects replay switch requirement when in SWITCH_MENU, on forced switch, or vacated seat', () => {
      assert.equal(isReplaySwitchRequired({ subState: 'SWITCH_MENU' }), true);
      assert.equal(isReplaySwitchRequired({ hasPendingForceSwitch: true }), true);
      assert.equal(isReplaySwitchRequired({ isBattleActive: true, isOver: false, hasPlayer: false, hasEnemy: true }), true);
      assert.equal(isReplaySwitchRequired({ isBattleActive: true, isOver: false, hasPlayer: true, hasEnemy: true, subState: 'WAIT_INPUT' }), false);
      assert.equal(isReplaySwitchRequired({ isOver: true, subState: 'SWITCH_MENU' }), false);
    });
  });

  describe('trainerAnimationState', () => {
    it('only trainer entry and retreat block scripted battle input', () => {
      assert.equal(isTrainerTransitionActive('entering'), true);
      assert.equal(isTrainerTransitionActive('retreating'), true);
      assert.equal(isTrainerTransitionActive('idle'), false);
      assert.equal(isTrainerTransitionActive(null), false);
    });
  });

  describe('trainerIdleAnims', () => {
    it('generates valid GSAP tween config for subtle idle breathing', () => {
      const config = getTrainerIdleConfig();

      assert.equal(config.repeat, -1);
      assert.equal(config.yoyo, true);
      assert.equal(config.repeatRefresh, true);
      assert.equal(config.ease, 'sine.inOut');

      const scaleXFn = config.scaleX as () => number;
      const scaleYFn = config.scaleY as () => number;
      const rotationFn = config.rotation as () => number;
      const durationFn = config.duration as () => number;

      const ITERATIONS = 20;
      for (let i = 0; i < ITERATIONS; i++) {
        const scaleX = scaleXFn();
        assert.ok(scaleX >= TRAINER_IDLE_BASE_SCALE_X && scaleX <= TRAINER_IDLE_BASE_SCALE_X + TRAINER_IDLE_VAR_SCALE_X);

        const scaleY = scaleYFn();
        assert.ok(scaleY >= TRAINER_IDLE_BASE_SCALE_Y && scaleY <= TRAINER_IDLE_BASE_SCALE_Y + TRAINER_IDLE_VAR_SCALE_Y);

        const rotation = rotationFn();
        assert.ok(
          Math.abs(rotation) >= TRAINER_IDLE_BASE_ROTATION_DEG &&
          Math.abs(rotation) <= TRAINER_IDLE_BASE_ROTATION_DEG + TRAINER_IDLE_VAR_ROTATION_DEG
        );

        const duration = durationFn();
        assert.ok(duration >= TRAINER_IDLE_BASE_DURATION_SEC && duration <= TRAINER_IDLE_BASE_DURATION_SEC + TRAINER_IDLE_VAR_DURATION_SEC);
      }
    });
  });
});
