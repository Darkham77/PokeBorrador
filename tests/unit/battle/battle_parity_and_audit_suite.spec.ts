import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { calculateEscapeChancePure, calculateCatchRatePure } from '@/logic/battle/battleCatchMath';
import { STAGE_MULTIPLIERS_STAT, STAGE_MULTIPLIERS_ACC } from '@/logic/battle/battleMath';
import type { PurePokemon } from '@/logic/battle/battleMathTypes';
import { PRNG, Battle, type ID } from '@pkmn/sim';
import { executeBattleTurn } from '@/logic/battle/helpers/showdownExecutor';
import { ACTIVE_SHOWDOWN_FORMAT } from '@/data/system/constants';
import { executeTurnInWorker, setShowdownWorker } from '@/logic/battle/showdownWorkerClient';
import type { ShowdownRequest } from '@/logic/battle/helpers/showdownTeamMapper';
import { canExecuteScriptedReplayAction } from '@/logic/battle/helpers/scriptedReplayReadiness';
import { buildTrainerTeam } from '@/logic/battle/trainerFactory';
import { buildRivalEncounter, buildTrainerEncounter } from '@/logic/battle/trainerSpawner';
import { isEnabledPokemonId } from '@/data/system/constants';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { Pokemon } from '@/types/pokemon/pokemon';

class ImmediateTurnWorker {
  private listeners = new Set<(event: MessageEvent) => void>();

  addEventListener(_type: 'message', listener: (event: MessageEvent) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'message', listener: (event: MessageEvent) => void): void {
    this.listeners.delete(listener);
  }

  postMessage(message: { type: string }): void {
    if (message.type !== 'EXECUTE_TURN') return;
    if (this.listeners.size === 0) {
      throw new Error('TURN_SUCCESS would be lost because no listener was registered before postMessage.');
    }
    const event = {
      data: { type: 'TURN_SUCCESS', payload: { logs: [], isOver: false, winner: null } },
    } as MessageEvent;
    this.listeners.forEach(listener => listener(event));
  }
}

describe('Battle Parity & Audit Domain Suite', () => {
  describe('Audit Candidates 1:1 Showdown Parity Tests', () => {
    it('Suspect 1: battleCatchMath uses regex replacement on IDs', () => {
      const poke: PurePokemon = {
        id: 'pikachu',
        hp: 10,
        maxHp: 10,
        level: 50,
        type: 'electric',
        ability: 'static',
        heldItem: 'smokeball'
      };
      const wild: PurePokemon = {
        id: 'pidgey',
        hp: 10,
        maxHp: 10,
        level: 50,
        type: 'normal',
        ability: 'runaway'
      };
      const result = calculateEscapeChancePure(poke, wild, 1, null);
      expect(result).toBe(true);
    });

    it('Suspect 2: STAGE_MULTIPLIERS_STAT -1 value accuracy', () => {
      const expected = 2 / 3;
      const actual = STAGE_MULTIPLIERS_STAT['-1'];
      expect(actual).toBeCloseTo(expected, 4);
    });

    it('Suspect 3: STAGE_MULTIPLIERS_ACC negative stage accuracy', () => {
      expect(STAGE_MULTIPLIERS_ACC['-1']).toBe(0.75);
      expect(STAGE_MULTIPLIERS_ACC['-2']).toBe(0.60);
    });

    it('Suspect 21: STAGE_MULTIPLIERS_STAT -5 value accuracy', () => {
      const expected = 2 / 7;
      const actual = STAGE_MULTIPLIERS_STAT['-5'];
      expect(actual).toBeCloseTo(expected, 4);
    });
  });

  describe('Audit Round 2 Candidates Parity Tests', () => {
    it('Suspect 1: STAGE_MULTIPLIERS_ACC accuracy stage -6 and +6 bounds', () => {
      expect(STAGE_MULTIPLIERS_ACC['-6']).toBeCloseTo(0.33, 2);
      expect(STAGE_MULTIPLIERS_ACC['6']).toBe(3.0);
    });

    it('Suspect 2: STAGE_MULTIPLIERS_STAT positive and negative symmetry', () => {
      expect(STAGE_MULTIPLIERS_STAT['0']).toBe(1.0);
      expect(STAGE_MULTIPLIERS_STAT['1']).toBe(1.5);
      expect(STAGE_MULTIPLIERS_STAT['-1']).toBe(2 / 3);
    });

    it('Suspect 13: Catch rate status multiplier for Sleep/Freeze vs Poison/Burn', () => {
      const slpMon: PurePokemon = { id: 'pikachu', hp: 10, maxHp: 10, level: 50, type: 'electric', catchRate: 45, status: 'slp' };
      const psnMon: PurePokemon = { id: 'pikachu', hp: 10, maxHp: 10, level: 50, type: 'electric', catchRate: 45, status: 'psn' };
      
      const slpRes = calculateCatchRatePure(slpMon, 'pokeball', 1, {});
      const psnRes = calculateCatchRatePure(psnMon, 'pokeball', 1, {});
      
      expect(slpRes.statusMultiplierApplied).toBe(true);
      expect(psnRes.statusMultiplierApplied).toBe(true);
    });
  });

  describe('Audit Reproduction Test - Showdown Parity Bugs', () => {
    it('reproduces statusBonus missing in catch rate formula', () => {
      const pNormal = { hp: 10, maxHp: 100, status: '' };
      const pSleep = { hp: 10, maxHp: 100, status: 'slp' };

      const resNormal = calculateCatchRatePure(pNormal as any, 'pokeball');
      const resSleep = calculateCatchRatePure(pSleep as any, 'pokeball');

      expect((resNormal as any).statusMultiplierApplied).toBe(false);
      expect((resSleep as any).statusMultiplierApplied).toBe(true);
    });
  });

  describe('PRNG Seed Parity unit tests', () => {
    const seedNums = [12345, 6789, 24680, 13579] as [number, number, number, number];
    const seedString = '12345,6789,24680,13579';

    it('debería generar la misma secuencia aleatoria usando array vs string en la clase PRNG', () => {
      const prngFromArray = new PRNG(seedNums as unknown as `${number},${string}`);
      const prngFromString = new PRNG(seedString as unknown as `${number},${string}`);

      for (let i = 0; i < 50; i++) {
        const valArray = prngFromArray.random();
        const valString = prngFromString.random();
        expect(valArray).toBe(valString);
      }
    });

    it('debería inicializar combates de @pkmn/sim con resultados idénticos usando semilla string vs array', () => {
      const battleFromArray = new Battle({
        formatid: 'gen9customgame' as ID,
        seed: seedNums as unknown as `${number},${string}`
      });

      const battleFromString = new Battle({
        formatid: 'gen9customgame' as ID,
        seed: seedString as unknown as `${number},${string}`
      });

      for (let i = 0; i < 10; i++) {
        expect(battleFromArray.prng.random()).toBe(battleFromString.prng.random());
      }
    });
  });

  describe('showdownExecutor - Invalid Choice / Obsolete Turn Safeguard', () => {
    let battle: Battle;

    beforeEach(() => {
      battle = new Battle({ formatid: ACTIVE_SHOWDOWN_FORMAT as import('@pkmn/sim').ID });
      battle.setPlayer('p1', {
        name: 'Player 1',
        team: [
          { name: 'Rayquaza', species: 'Rayquaza', level: 55, moves: ['outrage', 'fly'], item: '', ability: 'Air Lock', nature: 'Hardy', gender: 'M', ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 } },
          { name: 'Charmander', species: 'Charmander', level: 5, moves: ['ember'], item: '', ability: 'Blaze', nature: 'Hardy', gender: 'F', ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }
        ]
      });
      battle.setPlayer('p2', {
        name: 'Player 2',
        team: [
          { name: 'Dragonite', species: 'Dragonite', level: 23, moves: ['blizzard'], item: '', ability: 'Inner Focus', nature: 'Hardy', gender: 'M', ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } },
          { name: 'Nidoking', species: 'Nidoking', level: 23, moves: ['earthquake'], item: '', ability: 'Poison Point', nature: 'Hardy', gender: 'M', ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }
        ]
      });
      if (battle.p1.activeRequest && 'teamPreview' in battle.p1.activeRequest && battle.p1.activeRequest.teamPreview) {
        battle.choose('p1', 'default');
        battle.choose('p2', 'default');
      }
    });

    it('should safely ignore obsolete p2Choice when p1 action resolves the turn without throwing an error', () => {
      expect(() => {
        executeBattleTurn({
          battle,
          p1Choice: 'move outrage',
          p2Choice: 'switch 2'
        });
      }).not.toThrow();
    });
  });

  describe('Showdown worker turn delivery', () => {
    beforeEach(() => {
      setActivePinia(createPinia());
    });

    it('registers the turn listener before posting a synchronous certified response', async () => {
      setShowdownWorker(new ImmediateTurnWorker() as unknown as Worker);

      await expect(executeTurnInWorker('switch 2', '', false, true)).resolves.toMatchObject({
        isOver: false,
        winner: null,
      });
    });
  });

  describe('Audit Parity - Interface Duplication & Missing Request Flags', () => {
    it('should verify ShowdownRequest interface includes reviving and commanding optional flags from canonical Showdown side.ts', () => {
      const mockRequest: ShowdownRequest = {
        side: {
          pokemon: [
            {
              ident: 'p1: Pikachu',
              reviving: true,
              commanding: false
            }
          ]
        }
      };

      const poke = mockRequest.side?.pokemon[0];
      const isReviving = poke?.reviving;
      expect(isReviving).toBe(true);
    });
  });

  describe('battleDebug - Scripted Replay Readiness', () => {
    it('should return true when in WAIT_INPUT subState and ready', () => {
      const ready = canExecuteScriptedReplayAction({
        isActiveBattle: true,
        subState: 'WAIT_INPUT',
        isProcessing: false,
        isIntroAnimating: false,
        hasPendingSwitch: false,
      });
      expect(ready).toBe(true);
    });

    it('should return true when in SWITCH_MENU even during intro or pending switch', () => {
      const ready = canExecuteScriptedReplayAction({
        isActiveBattle: true,
        subState: 'SWITCH_MENU',
        isProcessing: false,
        isIntroAnimating: true,
        hasPendingSwitch: true,
      });
      expect(ready).toBe(true);
    });

    it('should return false when isProcessing is true', () => {
      const ready = canExecuteScriptedReplayAction({
        isActiveBattle: true,
        subState: 'WAIT_INPUT',
        isProcessing: true,
        isIntroAnimating: false,
        hasPendingSwitch: false,
      });
      expect(ready).toBe(false);
    });

    it('should return false when subState is invalid or intro animating during WAIT_INPUT', () => {
      const notReadySubState = canExecuteScriptedReplayAction({
        isActiveBattle: true,
        subState: 'FIRST_INTRO',
        isProcessing: false,
        isIntroAnimating: false,
        hasPendingSwitch: false,
      });
      expect(notReadySubState).toBe(false);

      const notReadyIntro = canExecuteScriptedReplayAction({
        isActiveBattle: true,
        subState: 'WAIT_INPUT',
        isProcessing: false,
        isIntroAnimating: true,
        hasPendingSwitch: false,
      });
      expect(notReadyIntro).toBe(false);
    });
  });

  describe('NPC & Rival Team Generation - Enabled Species Enforcement', () => {
    it('buildTrainerTeam produces strictly enabled Pokémon', async () => {
      const pool: PokemonSpeciesId[] = ['caterpie', 'weedle', 'pidgey', 'rattata'];
      const team = await buildTrainerTeam(pool, 25, 4);

      expect(team.length).toBe(4);
      for (const p of team) {
        expect(isEnabledPokemonId(p.id)).toBe(true);
      }
    });

    it('buildTrainerTeam throws loud error when non-enabled species is in pool', async () => {
      const illegalPool = ['lucario' as unknown as PokemonSpeciesId];
      await expect(buildTrainerTeam(illegalPool, 30, 1)).rejects.toThrowError(
        /Cannot create trainer pokemon for non-enabled species/
      );
    });

    it('buildRivalEncounter produces strictly enabled Pokémon for all slots with level +5 and Ace at slot 0', async () => {
      const mockPlayerTeam = [
        { id: 'pikachu', level: 30 } as unknown as Pokemon,
        { id: 'charizard', level: 32 } as unknown as Pokemon,
        { id: 'blastoise', level: 31 } as unknown as Pokemon
      ];

      const rival = await buildRivalEncounter(mockPlayerTeam);
      expect(rival.enemyTeam.length).toBeGreaterThanOrEqual(3);

      for (const p of rival.enemyTeam) {
        expect(p.level).toBe(36);
        expect(isEnabledPokemonId(p.id)).toBe(true);
      }
    });

    it('buildTrainerEncounter produces strictly enabled Pokémon across route locations', async () => {
      const gsState = {
        playerClass: 'entrenador' as const,
        classData: {},
        trainerChance: 5
      };

      const encounter = await buildTrainerEncounter(gsState, 'route1');
      expect(encounter.enemyTeam.length).toBeGreaterThanOrEqual(1);

      for (const p of encounter.enemyTeam) {
        expect(isEnabledPokemonId(p.id)).toBe(true);
      }
    });
  });
});
