import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBattleStore } from '@/stores/battle/battle';
import { useGameStore } from '@/stores/game';
import { useBattleCombatants } from '@/composables/battle/useBattleCombatants';
import { parseShowdownLogLine } from '@/logic/battle/showdownBridge';
import { BATTLE_STATES, BATTLE_SUBSTATES, type BattleStateName, type BattleSubStateName } from '@/logic/battle/battleStateMachine';
import { computed, ref } from 'vue';
import { gameBus } from '@/logic/events/gameBus';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';

function createMockPokemon(name: string, uid: string, hp = 100, maxHp = 100): Pokemon {
  return {
    uid,
    id: name.toLowerCase(),
    name,
    level: 10,
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

describe('Forced Switch Animation & Sequence Parity (Whirlwind, Dragon Tail, Roar)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('executes full sequence on NPC Whirlwind: Move Log -> Expulsion Log -> Escape Anim -> Await Tween -> Vacate Seat -> Drag Log -> Release Anim -> Seat Occupied', async () => {
    const battleStore = useBattleStore();
    const gameStore = useGameStore();

    const playerPoke = createMockPokemon('Pidgeot', 'player-pidgeot-1');
    const machop = createMockPokemon('Machop', 'enemy-machop-1');
    const mankey = createMockPokemon('Mankey', 'enemy-mankey-2');

    gameStore.state.team = [playerPoke];

    const eventStream: string[] = [];

    // Initialize FSM to ACTIVE_BATTLE
    await battleStore.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT);

    // Track FSM transitions
    const origTransition = battleStore.fsm.transition.bind(battleStore.fsm);
    battleStore.fsm.transition = async (state: BattleStateName | BattleSubStateName, subState: BattleSubStateName | null = null, delayMs: number = 0) => {
      eventStream.push(`fsm:${state}:${subState || 'none'}`);
      return origTransition(state, subState, delayMs);
    };

    // Track GSAP Animations
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

    // Listen to bus events
    const escapeListener = (e: Event) => {
      const detail = (e as CustomEvent).detail as { side?: string; type?: string; pokemon?: Pokemon };
      eventStream.push(`bus:PLAY_ESCAPE_ANIM:${detail.side}:${detail.type}:${detail.pokemon?.name}`);
    };
    gameBus.on('PLAY_ESCAPE_ANIM', escapeListener);

    const battleState = {
      isTrainer: true,
      trainerName: 'Luchador David',
      locationId: 'route1',
      playerTeam: [playerPoke],
      enemyTeam: [machop, mankey],
      enemy: machop,
      player: playerPoke,
      enemyRequest: {
        side: {
          pokemon: [
            { ident: 'p2: enemy-machop-1', details: 'Machop, L10, M', condition: '100/100', active: true, uid: machop.uid },
            { ident: 'p2: enemy-mankey-2', details: 'Mankey, L10, M', condition: '100/100', active: false, uid: mankey.uid }
          ]
        }
      },
      wasSearching: false
    };

    battleStore.state = battleState as any;
    const activeBattleRef = ref(battleState);

    const playerRef = computed(() => activeBattleRef.value?.player);
    const enemyRef = computed(() => activeBattleRef.value?.enemy);
    const { enemyCombatants } = useBattleCombatants(battleStore, playerRef, enemyRef);

    // Verify initial combatants state
    expect(enemyCombatants.value.length).toBe(1);
    expect(enemyCombatants.value[0]?.name).toBe('Machop');
    expect(enemyCombatants.value[0]?.uid).toBe('enemy-machop-1');

    const ctx = {
      activeBattle: activeBattleRef,
      fsm: battleStore.fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      gs: gameStore,
      animations: mockAnimations,
      attackerSide: ref('player'),
      activeMove: ref({ id: 'whirlwind', name: 'Remolino' }),
      playerStages: ref({}),
      enemyStages: ref({}),
      faintedSides: ref(new Set<string>()),
      exitingEnemy: battleStore.exitingEnemy,
      exitingPlayer: battleStore.exitingPlayer,
      clearLogs: () => {},
      addLog: (msg: string, type: string, source: unknown) => {
        const srcStr = typeof source === 'string' ? source : (source as Pokemon)?.name || 'unknown';
        eventStream.push(`log:${srcStr}:${msg}`);
        battleStore.addLog(msg, type as any, source as any);
      }
    } as unknown as BattleContext;

    // Simulate Showdown turn logs
    await parseShowdownLogLine(ctx, '|move|p1a: player-pidgeot-1|Whirlwind|p2a: enemy-machop-1|[uids]p1a:player-pidgeot-1=player-pidgeot-1,p2a:enemy-machop-1=enemy-machop-1');
    await parseShowdownLogLine(ctx, '|drag|p2a: enemy-mankey-2|Mankey, L10, M|100/100|[uids]p2a:enemy-mankey-2=enemy-mankey-2');

    gameBus.off('PLAY_ESCAPE_ANIM', escapeListener);

    // Verify exact event ordering
    const moveLogIdx = eventStream.findIndex(e => e.includes('¡Pidgeot usó Remolino!'));
    const expulsionLogIdx = eventStream.findIndex(e => e.includes('¡Machop fue expulsado por el remolino!'));
    const fsmEscapeIdx = eventStream.findIndex(e => e === 'fsm:ACTIVE_BATTLE:PLAY_ESCAPE_ANIM');
    const busEscapeIdx = eventStream.findIndex(e => e === 'bus:PLAY_ESCAPE_ANIM:enemy:whirlwind:Machop');
    const awaitEscapeIdx = eventStream.findIndex(e => e === 'anim:awaitTween:escape-enemy');
    const fsmVacateIdx = eventStream.findIndex(e => e === 'fsm:ACTIVE_BATTLE:VACATE_SEAT');
    const dragLogIdx = eventStream.findIndex(e => e.includes('¡Mankey fue arrastrado al campo!'));
    const fsmCallIdx = eventStream.findIndex(e => e === 'fsm:ACTIVE_BATTLE:POKEMON_CALL');
    const releaseAnimIdx = eventStream.findIndex(e => e === 'anim:handleReleaseRequest:enemy:Mankey');

    expect(moveLogIdx).toBeGreaterThan(-1);
    expect(expulsionLogIdx).toBeGreaterThan(moveLogIdx);
    expect(fsmEscapeIdx).toBeGreaterThan(expulsionLogIdx);
    expect(busEscapeIdx).toBeGreaterThan(expulsionLogIdx);
    expect(awaitEscapeIdx).toBeGreaterThan(busEscapeIdx);
    expect(fsmVacateIdx).toBeGreaterThan(awaitEscapeIdx);
    expect(fsmCallIdx).toBeGreaterThan(fsmVacateIdx);
    expect(dragLogIdx).toBeGreaterThan(fsmCallIdx);
    expect(releaseAnimIdx).toBeGreaterThan(dragLogIdx);

    // Final verification: active combatant is now Mankey
    expect(enemyCombatants.value.length).toBe(1);
    expect(enemyCombatants.value[0]?.name).toBe('Mankey');
    expect(enemyCombatants.value[0]?.uid).toBe('enemy-mankey-2');
    expect(activeBattleRef.value?.enemy?.uid).toBe('enemy-mankey-2');
  });

  it('executes knockback expulsion when Dragon Tail is used', async () => {
    const battleStore = useBattleStore();
    const gameStore = useGameStore();

    const playerPoke = createMockPokemon('Dragonite', 'player-dragonite-1');
    const machop = createMockPokemon('Machop', 'enemy-machop-1');
    const mankey = createMockPokemon('Mankey', 'enemy-mankey-2');

    gameStore.state.team = [playerPoke];

    const eventStream: string[] = [];

    await battleStore.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT);

    const mockAnimations = {
      awaitTween: async (key: string) => {
        eventStream.push(`anim:awaitTween:${key}`);
      },
      handleReleaseRequest: async (detail: { side: string; pokemon: Pokemon }) => {
        eventStream.push(`anim:handleReleaseRequest:${detail.side}:${detail.pokemon.name}`);
      }
    };

    const escapeListener = (e: Event) => {
      const detail = (e as CustomEvent).detail as { side?: string; type?: string; pokemon?: Pokemon };
      eventStream.push(`bus:PLAY_ESCAPE_ANIM:${detail.side}:${detail.type}:${detail.pokemon?.name}`);
    };
    gameBus.on('PLAY_ESCAPE_ANIM', escapeListener);

    const battleState = {
      isTrainer: true,
      trainerName: 'Luchador David',
      locationId: 'route1',
      playerTeam: [playerPoke],
      enemyTeam: [machop, mankey],
      enemy: machop,
      player: playerPoke,
      wasSearching: false
    };

    battleStore.state = battleState as any;
    const activeBattleRef = ref(battleState);

    const ctx = {
      activeBattle: activeBattleRef,
      fsm: battleStore.fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      gs: gameStore,
      animations: mockAnimations,
      attackerSide: ref('player'),
      activeMove: ref({ id: 'dragontail', name: 'Cola Dragón' }),
      playerStages: ref({}),
      enemyStages: ref({}),
      faintedSides: ref(new Set<string>()),
      exitingEnemy: battleStore.exitingEnemy,
      exitingPlayer: battleStore.exitingPlayer,
      clearLogs: () => {},
      addLog: (msg: string, type: string, source: unknown) => {
        const srcStr = typeof source === 'string' ? source : (source as Pokemon)?.name || 'unknown';
        eventStream.push(`log:${srcStr}:${msg}`);
        battleStore.addLog(msg, type as any, source as any);
      }
    } as unknown as BattleContext;

    await parseShowdownLogLine(ctx, '|move|p1a: player-dragonite-1|Dragon Tail|p2a: enemy-machop-1|[uids]p1a:player-dragonite-1=player-dragonite-1,p2a:enemy-machop-1=enemy-machop-1');
    await parseShowdownLogLine(ctx, '|drag|p2a: enemy-mankey-2|Mankey, L10, M|100/100|[uids]p2a:enemy-mankey-2=enemy-mankey-2');

    gameBus.off('PLAY_ESCAPE_ANIM', escapeListener);

    // Verify Knockback type and log
    expect(eventStream.some(e => e.includes('¡Machop fue arrojado fuera por la cola dragón!'))).toBe(true);
    expect(eventStream.some(e => e === 'bus:PLAY_ESCAPE_ANIM:enemy:knockback:Machop')).toBe(true);
    expect(eventStream.some(e => e === 'anim:awaitTween:escape-enemy')).toBe(true);
    expect(eventStream.some(e => e === 'anim:handleReleaseRequest:enemy:Mankey')).toBe(true);
  });

  it('executes player flee expulsion and automatic recall when Roar is used on player', async () => {
    const battleStore = useBattleStore();
    const gameStore = useGameStore();

    const pikachu = createMockPokemon('Pikachu', 'player-pika-1');
    const lapras = createMockPokemon('Lapras', 'player-lapras-2');
    const enemyHoundoom = createMockPokemon('Houndoom', 'enemy-houndoom-1');

    gameStore.state.team = [pikachu, lapras];

    const eventStream: string[] = [];

    await battleStore.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT);

    const mockAnimations = {
      awaitTween: async (key: string) => {
        eventStream.push(`anim:awaitTween:${key}`);
      },
      handleReleaseRequest: async (detail: { side: string; pokemon: Pokemon }) => {
        eventStream.push(`anim:handleReleaseRequest:${detail.side}:${detail.pokemon.name}`);
      }
    };

    const escapeListener = (e: Event) => {
      const detail = (e as CustomEvent).detail as { side?: string; type?: string; pokemon?: Pokemon };
      eventStream.push(`bus:PLAY_ESCAPE_ANIM:${detail.side}:${detail.type}:${detail.pokemon?.name}`);
    };
    gameBus.on('PLAY_ESCAPE_ANIM', escapeListener);

    const battleState = {
      isTrainer: true,
      trainerName: 'Entrenador Rival',
      locationId: 'route1',
      playerTeam: [pikachu, lapras],
      enemyTeam: [enemyHoundoom],
      enemy: enemyHoundoom,
      player: pikachu,
      wasSearching: false
    };

    battleStore.state = battleState as any;
    const activeBattleRef = ref(battleState);

    const ctx = {
      activeBattle: activeBattleRef,
      fsm: battleStore.fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      gs: gameStore,
      animations: mockAnimations,
      attackerSide: ref('enemy'),
      activeMove: ref({ id: 'roar', name: 'Rugido' }),
      playerStages: ref({}),
      enemyStages: ref({}),
      faintedSides: ref(new Set<string>()),
      exitingEnemy: battleStore.exitingEnemy,
      exitingPlayer: battleStore.exitingPlayer,
      clearLogs: () => {},
      addLog: (msg: string, type: string, source: unknown) => {
        const srcStr = typeof source === 'string' ? source : (source as Pokemon)?.name || 'unknown';
        eventStream.push(`log:${srcStr}:${msg}`);
        battleStore.addLog(msg, type as any, source as any);
      }
    } as unknown as BattleContext;

    await parseShowdownLogLine(ctx, '|move|p2a: enemy-houndoom-1|Roar|p1a: player-pika-1|[uids]p2a:enemy-houndoom-1=enemy-houndoom-1,p1a:player-pika-1=player-pika-1');
    await parseShowdownLogLine(ctx, '|drag|p1a: player-lapras-2|Lapras, L10, F|100/100|[uids]p1a:player-lapras-2=player-lapras-2');

    gameBus.off('PLAY_ESCAPE_ANIM', escapeListener);

    // Verify Player Flee escape and Lapras send out
    expect(eventStream.some(e => e.includes('¡Pikachu huyó asustado por el rugido!'))).toBe(true);
    expect(eventStream.some(e => e === 'bus:PLAY_ESCAPE_ANIM:player:flee:Pikachu')).toBe(true);
    expect(eventStream.some(e => e === 'anim:awaitTween:escape-player')).toBe(true);
    expect(eventStream.some(e => e.includes('¡Lapras fue arrastrado al campo!'))).toBe(true);
    expect(eventStream.some(e => e === 'anim:handleReleaseRequest:player:Lapras')).toBe(true);
    expect(activeBattleRef.value?.player?.uid).toBe('player-lapras-2');
  });

  it('does not trigger escape or release animations when Whirlwind fails due to empty bench', async () => {
    const battleStore = useBattleStore();
    const gameStore = useGameStore();

    const playerPoke = createMockPokemon('Pidgeot', 'player-pidgeot-1');
    const machop = createMockPokemon('Machop', 'enemy-machop-1');

    gameStore.state.team = [playerPoke];

    const eventStream: string[] = [];

    await battleStore.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT);

    const mockAnimations = {
      awaitTween: async (key: string) => {
        eventStream.push(`anim:awaitTween:${key}`);
      },
      handleReleaseRequest: async (detail: { side: string; pokemon: Pokemon }) => {
        eventStream.push(`anim:handleReleaseRequest:${detail.side}:${detail.pokemon.name}`);
      }
    };

    const escapeListener = (e: Event) => {
      const detail = (e as CustomEvent).detail as { side?: string; type?: string; pokemon?: Pokemon };
      eventStream.push(`bus:PLAY_ESCAPE_ANIM:${detail.side}:${detail.type}:${detail.pokemon?.name}`);
    };
    gameBus.on('PLAY_ESCAPE_ANIM', escapeListener);

    const battleState = {
      isTrainer: true,
      trainerName: 'Luchador David',
      locationId: 'route1',
      playerTeam: [playerPoke],
      enemyTeam: [machop],
      enemy: machop,
      player: playerPoke,
      wasSearching: false
    };

    battleStore.state = battleState as any;
    const activeBattleRef = ref(battleState);

    const ctx = {
      activeBattle: activeBattleRef,
      fsm: battleStore.fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      gs: gameStore,
      animations: mockAnimations,
      attackerSide: ref('player'),
      activeMove: ref({ id: 'whirlwind', name: 'Remolino' }),
      playerStages: ref({}),
      enemyStages: ref({}),
      faintedSides: ref(new Set<string>()),
      exitingEnemy: battleStore.exitingEnemy,
      exitingPlayer: battleStore.exitingPlayer,
      clearLogs: () => {},
      addLog: (msg: string, type: string, source: unknown) => {
        const srcStr = typeof source === 'string' ? source : (source as Pokemon)?.name || 'unknown';
        eventStream.push(`log:${srcStr}:${msg}`);
        battleStore.addLog(msg, type as any, source as any);
      }
    } as unknown as BattleContext;

    // Move is executed, but Showdown returns -fail (no bench)
    await parseShowdownLogLine(ctx, '|move|p1a: player-pidgeot-1|Whirlwind|p2a: enemy-machop-1|[uids]p1a:player-pidgeot-1=player-pidgeot-1,p2a:enemy-machop-1=enemy-machop-1');
    await parseShowdownLogLine(ctx, '|-fail|p1a: player-pidgeot-1');

    gameBus.off('PLAY_ESCAPE_ANIM', escapeListener);

    // Verify move logged, fail logged with explicit reason, but NO escape or release animation
    expect(eventStream.some(e => e.includes('¡Pidgeot usó Remolino!'))).toBe(true);
    expect(eventStream.some(e => e.includes('¡El movimiento de Pidgeot falló porque no hay ningún Pokémon en la banca para cambiar!'))).toBe(true);
    expect(eventStream.some(e => e.startsWith('bus:PLAY_ESCAPE_ANIM'))).toBe(false);
    expect(eventStream.some(e => e.startsWith('anim:awaitTween:escape'))).toBe(false);
    expect(eventStream.some(e => e.startsWith('anim:handleReleaseRequest'))).toBe(false);
    expect(activeBattleRef.value?.enemy?.uid).toBe('enemy-machop-1');
  });
});
