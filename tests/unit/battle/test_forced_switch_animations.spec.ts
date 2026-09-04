import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBattleStore } from '@/stores/battle/battle';
import { useGameStore } from '@/stores/game';
import { BATTLE_STATES, BATTLE_SUBSTATES, type BattleStateName, type BattleSubStateName } from '@/logic/battle/battleStateMachine';
import { parseShowdownLogLine } from '@/logic/battle/showdownBridge';
import { getForcedExitConfig } from '@/logic/battle/helpers/forcedSwitchRegistry';
import { gameBus } from '@/logic/events/gameBus';
import { ref } from 'vue';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';

function createMockPokemon(name: string, uid: string, hp = 100, maxHp = 100): Pokemon {
  return {
    uid,
    id: name.toLowerCase(),
    name,
    level: 40,
    hp,
    maxHp,
    types: ['normal'],
    moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, power: 40, type: 'normal' }],
    status: '',
    fainted: hp <= 0,
    stats: { hp: maxHp, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
    baseStats: { hp: maxHp, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
    ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    gender: 'M',
    nature: 'hardy',
    friendship: 70,
    exp: 0,
    nextLevelExp: 100,
    vigor: 100,
    maxVigor: 100
  } as unknown as Pokemon;
}

describe('Forced Switch & Phazing Animation Parity (|drag| & forced |switch|)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('forcedSwitchRegistry', () => {
    it('returns exact configured exit animations and localized expulsion logs', () => {
      expect(getForcedExitConfig('whirlwind')).toEqual({
        escapeType: 'whirlwind',
        getExpulsionLog: expect.any(Function)
      });
      expect(getForcedExitConfig('whirlwind').getExpulsionLog('Magneton')).toBe('¡Magneton fue expulsado por el remolino!');

      expect(getForcedExitConfig('roar').escapeType).toBe('flee');
      expect(getForcedExitConfig('roar').getExpulsionLog('Magneton')).toBe('¡Magneton huyó asustado por el rugido!');

      expect(getForcedExitConfig('dragontail').escapeType).toBe('knockback');
      expect(getForcedExitConfig('dragontail').getExpulsionLog('Magneton')).toBe('¡Magneton fue arrojado fuera por la cola dragón!');

      expect(getForcedExitConfig('circlethrow').escapeType).toBe('knockback');
      expect(getForcedExitConfig('circlethrow').getExpulsionLog('Magneton')).toBe('¡Magneton fue lanzado fuera del combate!');

      expect(getForcedExitConfig('teleport').escapeType).toBe('teleport');
      expect(getForcedExitConfig('teleport').getExpulsionLog('Abra')).toBe('¡Abra se teletransportó lejos!');

      expect(getForcedExitConfig('uturn').escapeType).toBe('withdraw');
      expect(getForcedExitConfig('redcard').escapeType).toBe('knockback');
      expect(getForcedExitConfig(undefined).escapeType).toBe('whirlwind');
    });
  });

  describe('Showdown Bridge |drag| protocol execution', () => {
    it('executes Whirlwind forced ejection on NPC enemy with full animation & FSM sequence', async () => {
      const battleStore = useBattleStore();
      const gameStore = useGameStore();

      const pidgeot = createMockPokemon('Pidgeot', 'player-pidgeot-1', 92, 92);
      const magneton = createMockPokemon('Magneton', 'enemy-magneton-1', 100, 100);
      const cubone = createMockPokemon('Cubone', 'enemy-cubone-2', 104, 104);

      gameStore.state.team = [pidgeot];

      const eventStream: string[] = [];

      const origTransition = battleStore.fsm.transition.bind(battleStore.fsm);
      battleStore.fsm.transition = async (state: BattleStateName | BattleSubStateName, subState: BattleSubStateName | null = null, delayMs: number = 0) => {
        eventStream.push(`fsm:${state}:${subState || 'none'}`);
        return origTransition(state, subState, delayMs);
      };

      const mockAnimations = {
        awaitTween: async (key: string) => {
          eventStream.push(`anim:awaitTween:${key}`);
        },
        handleReleaseRequest: async (detail: { side: string; pokemon: Pokemon }) => {
          eventStream.push(`anim:handleReleaseRequest:${detail.side}:${detail.pokemon.name}`);
        },
        handleWithdrawRequest: async (detail: { side: string; pokemon: Pokemon }) => {
          eventStream.push(`anim:handleWithdrawRequest:${detail.side}:${detail.pokemon.name}`);
        }
      };

      const escapeEvents: Array<{ side?: string; type?: string; pokemon?: Pokemon }> = [];
      const onEscape = (e: Event) => {
        escapeEvents.push((e as CustomEvent).detail);
        eventStream.push(`bus:PLAY_ESCAPE_ANIM:${(e as CustomEvent).detail?.type}`);
      };
      gameBus.on('PLAY_ESCAPE_ANIM', onEscape);

      const battleState = {
        isTrainer: true,
        trainerName: 'Brendan',
        locationId: 'route1',
        enemyTeam: [magneton, cubone],
        playerTeam: [pidgeot],
        enemy: magneton,
        player: pidgeot,
        enemyRequest: {
          side: {
            pokemon: [
              { ident: `p2: ${magneton.uid}`, details: `${magneton.name}, L40, M`, condition: `${magneton.hp}/${magneton.maxHp}`, active: true, uid: magneton.uid },
              { ident: `p2: ${cubone.uid}`, details: `${cubone.name}, L44, M`, condition: `${cubone.hp}/${cubone.maxHp}`, active: false, uid: cubone.uid }
            ]
          }
        },
        wasSearching: false
      };

      battleStore.state = battleState as any;

      const activeMoveRef = ref<{ id: string; name: string } | null>({
        id: 'whirlwind',
        name: 'Remolino'
      });

      const ctx = {
        activeBattle: ref(battleState),
        fsm: battleStore.fsm,
        BATTLE_STATES,
        BATTLE_SUBSTATES,
        gs: gameStore,
        animations: mockAnimations,
        attackerSide: ref('player'),
        activeMove: activeMoveRef,
        playerStages: ref({}),
        enemyStages: ref({}),
        faintedSides: ref(new Set<string>()),
        isIntroAnimating: ref(false),
        exitingEnemy: ref(null),
        exitingPlayer: ref(null),
        clearLogs: () => {},
        clearVolatileStatus: (p: Pokemon) => { if (p) p.status = ''; },
        addLog: (msg: string, type: string, source: unknown) => {
          const srcStr = typeof source === 'string' ? source : (source as Pokemon)?.name || 'unknown';
          eventStream.push(`log:${srcStr}:${msg}`);
          battleStore.addLog(msg, type as any, source as any);
        }
      } as unknown as BattleContext;

      // Simulate Showdown |drag| line
      const dragLine = `|drag|p2a: ${cubone.uid}|Cubone, L44, M|104/104`;
      await parseShowdownLogLine(ctx, dragLine);

      gameBus.off('PLAY_ESCAPE_ANIM', onEscape);

      // Verify Expulsion Log happened
      const expulsionLogIdx = eventStream.findIndex(e => e.includes('¡Magneton fue expulsado por el remolino!'));
      expect(expulsionLogIdx).toBeGreaterThan(-1);

      // Verify PLAY_ESCAPE_ANIM bus event was emitted with whirlwind
      const escapeAnimBusIdx = eventStream.findIndex(e => e === 'bus:PLAY_ESCAPE_ANIM:whirlwind');
      expect(escapeAnimBusIdx).toBeGreaterThan(expulsionLogIdx);
      expect(escapeEvents[0]?.type).toBe('whirlwind');
      expect(escapeEvents[0]?.side).toBe('enemy');

      // Verify awaitTween('escape-enemy') was awaited
      const awaitEscapeTweenIdx = eventStream.findIndex(e => e === 'anim:awaitTween:escape-enemy');
      expect(awaitEscapeTweenIdx).toBeGreaterThan(escapeAnimBusIdx);

      // Verify VACATE_SEAT happened after escape tween
      const vacateSeatIdx = eventStream.findIndex(e => e === 'fsm:ACTIVE_BATTLE:VACATE_SEAT');
      expect(vacateSeatIdx).toBeGreaterThan(awaitEscapeTweenIdx);

      // Verify Incoming Drag Log happened
      const dragLogIdx = eventStream.findIndex(e => e.includes('¡Cubone fue arrastrado al campo!'));
      expect(dragLogIdx).toBeGreaterThan(vacateSeatIdx);

      // Verify POKEMON_CALL -> RENDER_BALL -> OCCUPY_SEAT transitions
      const callFsmIdx = eventStream.findIndex(e => e === 'fsm:ACTIVE_BATTLE:POKEMON_CALL');
      const occupySeatIdx = eventStream.findIndex(e => e === 'fsm:ACTIVE_BATTLE:OCCUPY_SEAT');
      expect(callFsmIdx).toBeGreaterThan(vacateSeatIdx);
      expect(occupySeatIdx).toBeGreaterThan(callFsmIdx);

      // Verify handleReleaseRequest was called on Cubone
      const releaseAnimIdx = eventStream.findIndex(e => e === 'anim:handleReleaseRequest:enemy:Cubone');
      expect(releaseAnimIdx).toBeGreaterThan(occupySeatIdx);

      // Verify active enemy is now Cubone
      expect(ctx.activeBattle.value?.enemy?.uid).toBe(cubone.uid);
      expect(ctx.activeBattle.value?.enemy?.name).toBe('Cubone');
    });

    it('executes Roar forced ejection on Player Pokémon with full animation & FSM sequence', async () => {
      const battleStore = useBattleStore();
      const gameStore = useGameStore();

      const pidgeot = createMockPokemon('Pidgeot', 'player-pidgeot-1', 92, 92);
      const bulbasaur = createMockPokemon('Bulbasaur', 'player-bulbasaur-2', 24, 24);
      const arcanine = createMockPokemon('Arcanine', 'enemy-arcanine-1', 120, 120);

      gameStore.state.team = [pidgeot, bulbasaur];

      const eventStream: string[] = [];

      const origTransition = battleStore.fsm.transition.bind(battleStore.fsm);
      battleStore.fsm.transition = async (state: BattleStateName | BattleSubStateName, subState: BattleSubStateName | null = null, delayMs: number = 0) => {
        eventStream.push(`fsm:${state}:${subState || 'none'}`);
        return origTransition(state, subState, delayMs);
      };

      const mockAnimations = {
        awaitTween: async (key: string) => {
          eventStream.push(`anim:awaitTween:${key}`);
        },
        handleReleaseRequest: async (detail: { side: string; pokemon: Pokemon }) => {
          eventStream.push(`anim:handleReleaseRequest:${detail.side}:${detail.pokemon.name}`);
        },
        handleWithdrawRequest: async (detail: { side: string; pokemon: Pokemon }) => {
          eventStream.push(`anim:handleWithdrawRequest:${detail.side}:${detail.pokemon.name}`);
        }
      };

      const escapeEvents: Array<{ side?: string; type?: string; pokemon?: Pokemon }> = [];
      const onEscape = (e: Event) => {
        escapeEvents.push((e as CustomEvent).detail);
        eventStream.push(`bus:PLAY_ESCAPE_ANIM:${(e as CustomEvent).detail?.type}`);
      };
      gameBus.on('PLAY_ESCAPE_ANIM', onEscape);

      const battleState = {
        isTrainer: true,
        trainerName: 'Brendan',
        locationId: 'route1',
        enemyTeam: [arcanine],
        playerTeam: [pidgeot, bulbasaur],
        enemy: arcanine,
        player: pidgeot,
        playerRequest: {
          side: {
            pokemon: [
              { ident: `p1: ${pidgeot.uid}`, details: `${pidgeot.name}, L40, M`, condition: `${pidgeot.hp}/${pidgeot.maxHp}`, active: true, uid: pidgeot.uid },
              { ident: `p1: ${bulbasaur.uid}`, details: `${bulbasaur.name}, L7, M`, condition: `${bulbasaur.hp}/${bulbasaur.maxHp}`, active: false, uid: bulbasaur.uid }
            ]
          }
        },
        wasSearching: false
      };

      battleStore.state = battleState as any;

      const activeMoveRef = ref<{ id: string; name: string } | null>({
        id: 'roar',
        name: 'Rugido'
      });

      const ctx = {
        activeBattle: ref(battleState),
        fsm: battleStore.fsm,
        BATTLE_STATES,
        BATTLE_SUBSTATES,
        gs: gameStore,
        animations: mockAnimations,
        attackerSide: ref('enemy'),
        activeMove: activeMoveRef,
        playerStages: ref({}),
        enemyStages: ref({}),
        faintedSides: ref(new Set<string>()),
        isIntroAnimating: ref(false),
        exitingEnemy: ref(null),
        exitingPlayer: ref(null),
        clearLogs: () => {},
        clearVolatileStatus: (p: Pokemon) => { if (p) p.status = ''; },
        addLog: (msg: string, type: string, source: unknown) => {
          const srcStr = typeof source === 'string' ? source : (source as Pokemon)?.name || 'unknown';
          eventStream.push(`log:${srcStr}:${msg}`);
          battleStore.addLog(msg, type as any, source as any);
        }
      } as unknown as BattleContext;

      // Simulate Showdown |drag| on player side
      const dragLine = `|drag|p1a: ${bulbasaur.uid}|Bulbasaur, L7, M|24/24`;
      await parseShowdownLogLine(ctx, dragLine);

      gameBus.off('PLAY_ESCAPE_ANIM', onEscape);

      // Verify Expulsion Log happened for player
      const expulsionLogIdx = eventStream.findIndex(e => e.includes('¡Pidgeot huyó asustado por el rugido!'));
      expect(expulsionLogIdx).toBeGreaterThan(-1);

      // Verify PLAY_ESCAPE_ANIM bus event was emitted with flee
      const escapeAnimBusIdx = eventStream.findIndex(e => e === 'bus:PLAY_ESCAPE_ANIM:flee');
      expect(escapeAnimBusIdx).toBeGreaterThan(expulsionLogIdx);
      expect(escapeEvents[0]?.type).toBe('flee');
      expect(escapeEvents[0]?.side).toBe('player');

      // Verify awaitTween('escape-player') was awaited
      const awaitEscapeTweenIdx = eventStream.findIndex(e => e === 'anim:awaitTween:escape-player');
      expect(awaitEscapeTweenIdx).toBeGreaterThan(escapeAnimBusIdx);

      // Verify handleReleaseRequest was called on Bulbasaur
      const releaseAnimIdx = eventStream.findIndex(e => e === 'anim:handleReleaseRequest:player:Bulbasaur');
      expect(releaseAnimIdx).toBeGreaterThan(awaitEscapeTweenIdx);

      // Verify active player is now Bulbasaur
      expect(ctx.activeBattle.value?.player?.uid).toBe(bulbasaur.uid);
      expect(ctx.activeBattle.value?.player?.name).toBe('Bulbasaur');
    });
  });
});
