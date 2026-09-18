import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { Battle } from '@pkmn/sim';
import { BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine';
import { BATTLE_UI_EVENTS, isBattleReadyForInputDetail } from '@/types/battle/battleEvents';
import { nextBattleReadyEventKey } from '@/logic/battle/helpers/battleReadyEventKey';
import { computeCombatantVolatiles } from '@/components/battle/combatantVolatilesHelper';
import { isVolatileStatusKey, requireVolatileStatusKey, type Pokemon, type Move } from '@/types/pokemon/pokemon';
import type { BattleStages } from '@/types/battle/battle';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';
import { processRocketStealMechanics } from '@/logic/battle/orchestratorRocketHelper';
import type { BattleContext } from '@/types/battle/battleContext';
import { executeHealingItemUsage } from '@/logic/battle/battleHealingItemProcessor';
import type { AudioStore } from '@/types/system/stores';
import { resolvePlayerForcedMoveIndex } from '@/logic/battle/helpers/turnMoveValidator';
import { getShowdownFormatId } from '@/logic/battle/showdownAdapter';
import { useRankedValidation } from '@/composables/pvp/useRankedValidation';
import { usePvPStore } from '@/stores/pvp';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { resetActiveBattleState } from '@/logic/battle/orchestratorStateHelper';

describe('Battle Volatiles, Events & State Transitions Domain Suite', () => {
  describe('battle UI event contract', () => {
    it('exposes the canonical readiness event and accepts its typed detail', () => {
      expect(BATTLE_UI_EVENTS.READY_FOR_INPUT).toBe('battle-ready-for-input');
      expect(isBattleReadyForInputDetail({
        subState: BATTLE_SUBSTATES.WAIT_INPUT,
        p1ChoiceIdx: 0,
        p2ChoiceIdx: 0,
        over: false,
        playerSwitchSlots: [],
      })).toBe(true);
    });

    it('rejects a non-canonical battle substate at the browser event boundary', () => {
      expect(isBattleReadyForInputDetail({
        subState: 'UNSAFE_TEST_STATE',
        p1ChoiceIdx: 0,
        p2ChoiceIdx: 0,
        over: false,
      })).toBe(false);
    });

    it('rejects readiness without the public Showdown switch-slot projection', () => {
      expect(isBattleReadyForInputDetail({
        subState: BATTLE_SUBSTATES.WAIT_INPUT,
        p1ChoiceIdx: 0,
        p2ChoiceIdx: 0,
        over: false,
      })).toBe(false);
    });
  });

  describe('battle ready event deduplication', () => {
    it('suppresses a repeated availability event in the same input state', () => {
      expect(nextBattleReadyEventKey('WAIT_INPUT_move_0', true, 'WAIT_INPUT_move_0')).toBeNull();
    });

    it('clears the key when battle leaves an input state so the next real input transition emits again', () => {
      const afterTurnStarts = nextBattleReadyEventKey('WAIT_INPUT_move_0', false, '');
      expect(afterTurnStarts).toBe('');
      if (afterTurnStarts === null) throw new Error('Non-input transition must clear the deduplication key.');
      expect(nextBattleReadyEventKey(afterTurnStarts, true, 'WAIT_INPUT_move_0')).toBe('WAIT_INPUT_move_0');
    });
  });

  describe('computeCombatantVolatiles Helper', () => {
    it('returns all false when pokemon is null', () => {
      const res = computeCombatantVolatiles(null, undefined);
      expect(res.isConfused).toBe(false);
      expect(res.isTaunted).toBe(false);
      expect(res.isSubstitute).toBe(false);
      expect(res.hasReflect).toBe(false);
    });

    it('computes active volatiles from volatileCounters correctly', () => {
      const mockPokemon = {
        id: 'gengar',
        name: 'Gengar',
        hp: 100,
        maxHp: 100,
        level: 50,
        confused: false,
        volatileCounters: {
          confusion: 2,
          taunt: 3,
          substitute: 1,
          flinch: 1,
          curse: 1
        }
      } as unknown as Pokemon;

      const mockStages: Partial<BattleStages> = {
        reflect: 5,
        lightScreen: 0,
        safeguard: 0,
        mist: 0
      };

      const res = computeCombatantVolatiles(mockPokemon, mockStages);
      expect(res.isConfused).toBe(true);
      expect(res.isTaunted).toBe(true);
      expect(res.isSubstitute).toBe(true);
      expect(res.isFlinched).toBe(true);
      expect(res.isCursed).toBe(true);
      expect(res.hasReflect).toBe(true);
      expect(res.hasLightScreen).toBe(false);
    });
  });

  describe('Volatile Status Keys Governance Unit Test', () => {
    it('should recognize valid volatile status keys including tarshot', () => {
      expect(isVolatileStatusKey('tarshot')).toBe(true);
      expect(requireVolatileStatusKey('tarshot')).toBe('tarshot');
    });

    it('should strip prefixes like move: before validating volatile status keys', () => {
      const rawEffect = 'move: Taunt';
      const cleanId = rawEffect.startsWith('move:') ? rawEffect.replace(/^move:\s*/, '').toLowerCase().replace(/[^a-z0-9]/g, '') : rawEffect;
      expect(isVolatileStatusKey(cleanId)).toBe(true);
      expect(requireVolatileStatusKey(cleanId)).toBe('taunt');
    });
  });

  describe('Audit Parity - Ability Trace Origin', () => {
    it('should parse ability token with Trace origin', () => {
      let capturedLog = '';
      const mockStore = {
        addLog: (msg: string) => { capturedLog = msg; }
      };
      const mockPoke = { name: 'Alakazam' };
      const ctx = {
        store: mockStore,
        type: '-ability',
        parts: ['', '-ability', 'p1a: Alakazam', 'Intimidate', '[from] ability: Trace', '[of] p2a: Gyarados'],
        line: '|-ability|p1a: Alakazam|Intimidate|[from] ability: Trace|[of] p2a: Gyarados',
        getPoke: (str: string) => str.includes('p1a') ? mockPoke : { name: 'Gyarados' }
      };
      const handled = handleMiscEvents(ctx as any);
      expect(handled).toBe(true);
      expect(capturedLog).toContain('Trace');
    });
  });

  describe('processRocketStealMechanics', () => {
    it('does nothing if player is not rocket and enemy is not rocket', async () => {
      const mockCtx = {
        gs: { state: { playerClass: 'trainer', inventory: {}, money: 1000 } },
        classStore: { classLevel: 5, addCriminality: vi.fn() },
        activeBattle: ref(null),
        addLog: vi.fn(),
        uiStore: { notify: vi.fn() },
        audio: { play: vi.fn() },
      } as unknown as BattleContext;

      await processRocketStealMechanics(mockCtx, false, false, 'Wild Pikachu', null);
      expect(mockCtx.addLog).not.toHaveBeenCalled();
    });
  });

  describe('battleHealingItemProcessor', () => {
    it('logs failure if healing item has no effect on full hp pokemon', async () => {
      const fullHpPoke = {
        id: 'pikachu',
        name: 'Pikachu',
        hp: 100,
        maxHp: 100,
        status: '',
        moves: [],
      } as unknown as Pokemon;

      const logs: string[] = [];
      const consumeItem = vi.fn();
      const mockAudio = { play: vi.fn() } as unknown as AudioStore;

      const res = await executeHealingItemUsage('potion', fullHpPoke, {
        addLog: (msg) => { logs.push(String(msg)); },
        audio: mockAudio,
        consumeItem,
      });

      expect(res.action).toBe('fail');
      expect(consumeItem).not.toHaveBeenCalled();
      expect(logs).toContain('No tuvo efecto.');
    });
  });

  describe('Reproduce Outrage / Locked Move Infinite Loop (Tier 1)', () => {
    it('should NOT force move when Showdown request provides all normal moves (not locked by Showdown)', () => {
      const moves: Move[] = [
        { id: 'agility', name: 'Agilidad', pp: 30, maxPP: 30 } as Move,
        { id: 'safeguard', name: 'Velo Sagrado', pp: 25, maxPP: 25 } as Move,
        { id: 'outrage', name: 'Enfado', pp: 16, maxPP: 16 } as Move,
        { id: 'hyperbeam', name: 'Hiperrayo', pp: 5, maxPP: 5 } as Move,
      ];

      const dragonite: Pokemon = {
        uid: 'dragonite-1',
        id: 'dragonite',
        name: 'Dragonite',
        level: 86,
        hp: 279,
        maxHp: 279,
        moves,
        lastMove: { id: 'outrage', name: 'Enfado' } as Move,
        volatileCounters: { lockedmove: 1 }
      } as unknown as Pokemon;

      const reqMoves = [
        { id: 'agility', move: 'Agility' },
        { id: 'safeguard', move: 'Safeguard' },
        { id: 'outrage', move: 'Outrage' },
        { id: 'hyperbeam', move: 'Hyper Beam' }
      ];

      const { finalMoveIndex } = resolvePlayerForcedMoveIndex(dragonite, 0, reqMoves);
      expect(finalMoveIndex).toBe(0);
    });
  });

  describe('Fly Simulator logs diagnostic', () => {
    it('should run simulator steps when using Fly', () => {
      const battle = new Battle({ formatid: getShowdownFormatId(3) });
      battle.setPlayer('p1', {
        name: 'Player',
        team: [
          {
            name: 'Rayquaza',
            species: 'Rayquaza',
            moves: ['fly'],
            ability: 'airlock',
            evs: { hp: 8, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            item: '',
            level: 100,
            nature: 'Serious',
            gender: ''
          }
        ]
      });
      battle.setPlayer('p2', {
        name: 'Enemy',
        team: [
          {
            name: 'Pikachu',
            species: 'Pikachu',
            moves: ['tackle'],
            ability: 'static',
            evs: { hp: 8, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            item: '',
            level: 100,
            nature: 'Serious',
            gender: ''
          }
        ]
      });

      battle.makeChoices('move 1', 'move 1');
      expect(battle.log.length).toBeGreaterThan(0);
      battle.makeChoices('move 1', 'move 1');
      expect(battle.log.length).toBeGreaterThan(1);
    });
  });

  describe('Ranked Migration (Pinia)', () => {
    beforeEach(() => {
      setActivePinia(createPinia());
      const rankedStore = usePvPStore();
      rankedStore.rules = {
        seasonName: 'Test Season',
        levelCap: 50,
        maxPokemon: 3,
        allowedTypes: ['fire', 'water'],
        bannedPokemonIds: ['mewtwo']
      } as unknown as typeof rankedStore.rules;
    });

    it('debe calcular el tier correctamente en el store', () => {
      const rankedStore = usePvPStore();
      expect(rankedStore.currentTier(1000).name).toBe('Bronce');
      expect(rankedStore.currentTier(2800).name).toBe('Diamante');
    });

    it('debe validar el nivel en el composable', () => {
      const { validatePokemon } = useRankedValidation();
      
      expect(validatePokemon({ name: 'Charmander', level: 10, type: 'fire' } as unknown as Pokemon).ok).toBe(true);
      expect(validatePokemon({ name: 'Charizard', level: 60, type: 'fire' } as unknown as Pokemon).ok).toBe(false);
    });

    it('debe validar los tipos permitidos', () => {
      const { validatePokemon } = useRankedValidation();
      
      expect(validatePokemon({ name: 'Squirtle', level: 10, type: 'water' } as unknown as Pokemon).ok).toBe(true);
      expect(validatePokemon({ name: 'Pikachu', level: 10, type: 'electric' } as unknown as Pokemon).ok).toBe(false);
    });

    it('debe validar el límite de pokémon en equipo', () => {
      const { validateTeam } = useRankedValidation();
      const team = [
        { name: 'P1', level: 10, type: 'fire' },
        { name: 'P2', level: 10, type: 'fire' },
        { name: 'P3', level: 10, type: 'fire' },
        { name: 'P4', level: 10, type: 'fire' }
      ] as unknown as Pokemon[];
      
      expect(validateTeam(team).ok).toBe(false);
      expect(validateTeam(team.slice(0, 3)).ok).toBe(true);
    });
  });

  describe('Wild Encounter Enemy Team Synchronization (Tier 1 RED Reproduction)', () => {
    it('resets enemyTeam to contain exclusively the wild opponent when starting a wild battle with residual enemyTeam', async () => {
      const kadabra = makePokemon('kadabra', 30, { bypassWhitelist: true }) as Pokemon;
      const magneton = makePokemon('magneton', 32, { bypassWhitelist: true }) as Pokemon;
      const playerPikachu = makePokemon('pikachu', 35, { bypassWhitelist: true }) as Pokemon;

      const mockActiveBattle = ref({
        isTrainer: false,
        isGym: false,
        isPvP: false,
        enemy: kadabra,
        enemyTeam: [magneton],
        locationId: 'route-1',
        weather: null,
        turnCount: 0
      });

      const mockCtx = {
        activeBattle: mockActiveBattle,
        playerStages: ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }),
        enemyStages: ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }),
        faintedSides: ref(new Set()),
        clearLogs: () => {}
      } as unknown as BattleContext;

      await resetActiveBattleState(mockCtx, playerPikachu, false);

      expect(mockActiveBattle.value.enemyTeam).toBeUndefined();
    });
  });
});
