import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBattleStore } from '@/stores/battle/battle'
import { useGameStore } from '@/stores/game'
import { useMapStore } from '@/stores/map'
import { initBattleSequence } from '@/logic/battle/helpers/battleLifecycleInitializer'
import { processEnemyFaintSequence, processPlayerFaintSequence } from '@/logic/battle/battleFaintSequence'
import { processSwitchSwapAnimations } from '@/logic/battle/actions/switchSequenceHelper'
import { useBattleCombatants } from '@/composables/battle/useBattleCombatants'
import { BATTLE_STATES, BATTLE_SUBSTATES, type BattleStateName, type BattleSubStateName } from '@/logic/battle/battleStateMachine'
import { computed, ref } from 'vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleContext } from '@/types/battle/battleContext'

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
  } as unknown as Pokemon
}

describe('Battle Animation & FSM Sequence Parity Verification', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('verifies exact chronological order of trainer intro: Challenge Log -> Retreat -> Sendout Log -> Release Anim -> Combatants Visible', async () => {
    const battleStore = useBattleStore()
    const gameStore = useGameStore()
    const mapStore = useMapStore()

    const playerPoke = createMockPokemon('Pikachu', 'player-pika-1')
    const enemyPoke1 = createMockPokemon('Goldeen', 'enemy-goldeen-1')
    const enemyPoke2 = createMockPokemon('Poliwag', 'enemy-poliwag-2')

    gameStore.state.team = [playerPoke]
    mapStore.currentMap = 'route1'

    const eventStream: string[] = []

    // Setup FSM transition listener
    const origTransition = battleStore.fsm.transition.bind(battleStore.fsm)
    battleStore.fsm.transition = async (state: BattleStateName | BattleSubStateName, subState: BattleSubStateName | null = null, delayMs: number = 0) => {
      eventStream.push(`fsm:${state}:${subState || 'none'}`)
      return origTransition(state, subState, delayMs)
    }

    const mockAnimations = {
      triggerTrainerEntry: async () => { eventStream.push('anim:triggerTrainerEntry') },
      triggerTrainerDialogs: async () => { eventStream.push('anim:triggerTrainerDialogs') },
      triggerTrainerRetreat: async () => { eventStream.push('anim:triggerTrainerRetreat') },
      handleReleaseRequest: async (detail: { side: string; pokemon: Pokemon }) => {
        eventStream.push(`anim:handleReleaseRequest:${detail.side}:${detail.pokemon.name}`)
      },
      handleWithdrawRequest: async (detail: { side: string; pokemon: Pokemon }) => {
        eventStream.push(`anim:handleWithdrawRequest:${detail.side}:${detail.pokemon.name}`)
      },
      resetAll: () => {}
    }

    const battleState = {
      isTrainer: true,
      trainerName: 'Pescador Jaime',
      locationId: 'route1',
      enemyTeam: [enemyPoke1, enemyPoke2],
      enemy: null,
      player: null,
      wasSearching: false
    }

    battleStore.state = battleState as any

    const ctx = {
      activeBattle: ref(battleState),
      fsm: battleStore.fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      gs: gameStore,
      animations: mockAnimations,
      attackerSide: ref(null),
      activeMove: ref(null),
      playerStages: ref({}),
      enemyStages: ref({}),
      faintedSides: ref(new Set<string>()),
      isIntroAnimating: ref(false),
      exitingEnemy: ref(null),
      exitingPlayer: ref(null),
      clearLogs: () => {},
      clearVolatileStatus: (p: Pokemon) => { if (p) p.status = '' },
      addLog: (msg: string, type: string, source: unknown) => {
        const srcStr = typeof source === 'string' ? source : (source as Pokemon)?.name || 'unknown'
        eventStream.push(`log:${srcStr}:${msg}`)
        battleStore.addLog(msg, type as any, source as any)
      },
      audio: { play: () => {} }
    } as unknown as BattleContext

    // Test combatants visibility computed during intro
    const playerRef = computed(() => ctx.activeBattle.value?.player)
    const enemyRef = computed(() => ctx.activeBattle.value?.enemy)
    const { enemyCombatants } = useBattleCombatants(battleStore, playerRef, enemyRef)

    // Execute trainer intro
    await initBattleSequence(ctx, {
      initialPlayer: playerPoke,
      initialEnemy: enemyPoke1,
      wasSearching: false
    })

    // Assert Challenge Log happened BEFORE Sendout Log
    const challengeLogIdx = eventStream.findIndex(e => e.includes('¡Pescador Jaime te desafía!'))
    const retreatAnimIdx = eventStream.findIndex(e => e === 'anim:triggerTrainerRetreat')
    const sendoutLogIdx = eventStream.findIndex(e => e.includes('¡Pescador Jaime envía a Goldeen!'))
    const releaseAnimIdx = eventStream.findIndex(e => e.includes('anim:handleReleaseRequest:enemy:Goldeen'))

    expect(challengeLogIdx).toBeGreaterThan(-1)
    expect(retreatAnimIdx).toBeGreaterThan(challengeLogIdx)
    expect(sendoutLogIdx).toBeGreaterThan(retreatAnimIdx)
    expect(releaseAnimIdx).toBeGreaterThan(sendoutLogIdx)

    // Verify final combatants state
    expect(enemyCombatants.value.length).toBe(1)
    expect(enemyCombatants.value[0]?.name).toBe('Goldeen')
    expect(enemyCombatants.value[0]?.uid).toBe('enemy-goldeen-1')
  })

  it('verifies 6-Pokémon full team chain of faint, recall, and sendout without missing frames or logs', async () => {
    const battleStore = useBattleStore()
    const gameStore = useGameStore()

    const playerPoke = createMockPokemon('Lapras', 'player-lapras-1')

    const teamNames = ['Goldeen', 'Poliwag', 'Magikarp', 'Tentacool', 'Staryu', 'Gyarados']
    const enemyTeam = teamNames.map((name, i) => createMockPokemon(name, `enemy-${name.toLowerCase()}-${i + 1}`, 100))

    const eventStream: string[] = []

    const origTransition = battleStore.fsm.transition.bind(battleStore.fsm)
    battleStore.fsm.transition = async (state: BattleStateName | BattleSubStateName, subState: BattleSubStateName | null = null, delayMs: number = 0) => {
      eventStream.push(`fsm:${state}:${subState || 'none'}`)
      return origTransition(state, subState, delayMs)
    }

    const mockAnimations = {
      handleWithdrawRequest: async (detail: { side: string; pokemon: Pokemon }) => {
        eventStream.push(`anim:handleWithdrawRequest:${detail.side}:${detail.pokemon.name}`)
      },
      handleReleaseRequest: async (detail: { side: string; pokemon: Pokemon }) => {
        eventStream.push(`anim:handleReleaseRequest:${detail.side}:${detail.pokemon.name}`)
      },
      playBallFadeOut: async () => {}
    }

    await battleStore.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)

    const battleState = {
      isTrainer: true,
      trainerName: 'Pescador Jaime',
      locationId: 'route1',
      enemyTeam: [...enemyTeam],
      enemy: enemyTeam[0],
      player: playerPoke,
      enemyRequest: {
        side: {
          pokemon: enemyTeam.map(p => ({ ident: `p2: ${p.uid}`, details: `${p.name}, L10, M`, condition: `${p.hp}/${p.maxHp}`, active: p.uid === enemyTeam[0]?.uid, uid: p.uid }))
        }
      },
      wasSearching: false
    }

    battleStore.state = battleState as any

    const ctx = {
      activeBattle: ref(battleState),
      fsm: battleStore.fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      gs: gameStore,
      animations: mockAnimations,
      attackerSide: ref(null),
      activeMove: ref(null),
      playerStages: ref({}),
      enemyStages: ref({}),
      faintedSides: ref(new Set<string>()),
      isIntroAnimating: ref(false),
      exitingEnemy: ref(null),
      exitingPlayer: ref(null),
      clearLogs: () => {},
      clearVolatileStatus: (p: Pokemon) => { if (p) p.status = '' },
      addLog: (msg: string, type: string, source: unknown) => {
        const srcStr = typeof source === 'string' ? source : (source as Pokemon)?.name || 'unknown'
        eventStream.push(`log:${srcStr}:${msg}`)
        battleStore.addLog(msg, type as any, source as any)
      }
    } as unknown as BattleContext

    let battleTerminated = false
    const actions = {
      processFaint: async () => {},
      terminateBattle: async () => { battleTerminated = true }
    }

    // Simulate knocking out all 6 Pokémon sequentially
    for (let i = 0; i < 5; i++) {
      const currentEnemy = enemyTeam[i]!
      const nextExpectedEnemy = enemyTeam[i + 1]!

      currentEnemy.hp = 0
      currentEnemy.fainted = true

      const streamLenBefore = eventStream.length

      await processEnemyFaintSequence(ctx, currentEnemy, actions)

      const slice = eventStream.slice(streamLenBefore)

      // Verify Faint Log
      expect(slice.some(e => e.includes(`${currentEnemy.name} fue derrotado!`))).toBe(true)

      // Verify Withdraw animation
      expect(slice.some(e => e.includes(`anim:handleWithdrawRequest:enemy:${currentEnemy.name}`))).toBe(true)

      // Verify Sendout Log for NEXT Pokémon
      expect(slice.some(e => e.includes(`¡Pescador Jaime envía a ${nextExpectedEnemy.name}!`))).toBe(true)

      // Verify Release animation for NEXT Pokémon
      expect(slice.some(e => e.includes(`anim:handleReleaseRequest:enemy:${nextExpectedEnemy.name}`))).toBe(true)

      // Verify active enemy is exactly the next Pokémon
      expect(ctx.activeBattle.value?.enemy?.uid).toBe(nextExpectedEnemy.uid)
      expect(ctx.activeBattle.value?.enemy?.name).toBe(nextExpectedEnemy.name)
    }

    // Final 6th Pokémon defeat
    const finalEnemy = enemyTeam[5]!
    finalEnemy.hp = 0
    finalEnemy.fainted = true
    await processEnemyFaintSequence(ctx, finalEnemy, actions)

    expect(battleTerminated).toBe(true)
  })

  it('verifies manual player switch executes withdraw and release animations without losing state', async () => {
    const battleStore = useBattleStore()
    const gameStore = useGameStore()

    const oldPoke = createMockPokemon('Pikachu', 'player-pika-1')
    const newPoke = createMockPokemon('Charizard', 'player-chari-2')
    const enemyPoke = createMockPokemon('Blastoise', 'enemy-blast-1')

    gameStore.state.team = [oldPoke, newPoke]

    const eventStream: string[] = []

    const mockAnimations = {
      handleWithdrawRequest: async (detail: { side: string; pokemon: Pokemon }) => {
        eventStream.push(`anim:handleWithdrawRequest:${detail.side}:${detail.pokemon.name}`)
      },
      handleReleaseRequest: async (detail: { side: string; pokemon: Pokemon }) => {
        eventStream.push(`anim:handleReleaseRequest:${detail.side}:${detail.pokemon.name}`)
      }
    }

    const battleState = {
      isTrainer: true,
      trainerName: 'Rival Azul',
      locationId: 'route1',
      enemyTeam: [enemyPoke],
      enemy: enemyPoke,
      player: oldPoke,
      playerTeamIndex: 0,
      wasSearching: false
    }

    battleStore.state = battleState as any

    const ctx = {
      activeBattle: ref(battleState),
      fsm: battleStore.fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      gs: gameStore,
      animations: mockAnimations,
      attackerSide: ref(null),
      activeMove: ref(null),
      playerStages: ref({}),
      enemyStages: ref({}),
      faintedSides: ref(new Set<string>()),
      isIntroAnimating: ref(false),
      exitingEnemy: ref(null),
      exitingPlayer: ref(null),
      clearLogs: () => {},
      clearVolatileStatus: (p: Pokemon) => { if (p) p.status = '' },
      addLog: (msg: string, type: string, source: unknown) => {
        const srcStr = typeof source === 'string' ? source : (source as Pokemon)?.name || 'unknown'
        eventStream.push(`log:${srcStr}:${msg}`)
        battleStore.addLog(msg, type as any, source as any)
      }
    } as unknown as BattleContext

    await processSwitchSwapAnimations(ctx, oldPoke, newPoke, 1)

    // Verify Withdraw of Pikachu happened before Release of Charizard
    const withdrawIdx = eventStream.findIndex(e => e.includes('anim:handleWithdrawRequest:player:Pikachu'))
    const returnLogIdx = eventStream.findIndex(e => e.includes('¡Bien hecho, Pikachu! ¡Regresa!'))
    const releaseIdx = eventStream.findIndex(e => e.includes('anim:handleReleaseRequest:player:Charizard'))

    expect(returnLogIdx).toBeGreaterThan(-1)
    expect(withdrawIdx).toBeGreaterThan(returnLogIdx)
    expect(releaseIdx).toBeGreaterThan(withdrawIdx)

    // Verify player is now Charizard
    expect(ctx.activeBattle.value?.player?.name).toBe('Charizard')
    expect(ctx.activeBattle.value?.player?.uid).toBe('player-chari-2')
  })

  it('verifies player faint and forced switch flow', async () => {
    const battleStore = useBattleStore()
    const gameStore = useGameStore()

    const faintedPoke = createMockPokemon('Pikachu', 'player-pika-1', 0)
    const backupPoke = createMockPokemon('Snorlax', 'player-snor-2', 100)
    const enemyPoke = createMockPokemon('Gengar', 'enemy-gengar-1')

    gameStore.state.team = [faintedPoke, backupPoke]

    const eventStream: string[] = []

    const mockAnimations = {
      handleFaintAnim: async (detail: { side: string }) => {
        eventStream.push(`anim:handleFaintAnim:${detail.side}`)
      },
      playBallFadeOut: async (side: string) => {
        eventStream.push(`anim:playBallFadeOut:${side}`)
      }
    }

    const battleState = {
      isTrainer: true,
      trainerName: 'Líder Sabrina',
      locationId: 'route1',
      enemyTeam: [enemyPoke],
      enemy: enemyPoke,
      player: faintedPoke,
      wasSearching: false
    }

    battleStore.state = battleState as any

    const ctx = {
      activeBattle: ref(battleState),
      fsm: battleStore.fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      gs: gameStore,
      animations: mockAnimations,
      attackerSide: ref(null),
      activeMove: ref(null),
      playerStages: ref({}),
      enemyStages: ref({}),
      faintedSides: ref(new Set<string>()),
      isIntroAnimating: ref(false),
      isProcessing: ref(false),
      exitingEnemy: ref(null),
      exitingPlayer: ref(null),
      uiStore: { isBattleSwitchForced: false },
      clearLogs: () => {},
      clearVolatileStatus: (p: Pokemon) => { if (p) p.status = '' },
      addLog: (msg: string, type: string, source: unknown) => {
        const srcStr = typeof source === 'string' ? source : (source as Pokemon)?.name || 'unknown'
        eventStream.push(`log:${srcStr}:${msg}`)
        battleStore.addLog(msg, type as any, source as any)
      }
    } as unknown as BattleContext

    const actions = {
      terminateBattle: async () => {}
    }

    await processPlayerFaintSequence(ctx, faintedPoke, actions)

    // Verify faint log and animation
    expect(eventStream.some(e => e.includes('¡Pikachu se ha debilitado!'))).toBe(true)
    expect(eventStream.some(e => e.includes('anim:handleFaintAnim:player'))).toBe(true)
    expect(eventStream.some(e => e.includes('¡Elige a tu próximo Pokémon!'))).toBe(true)
    expect(ctx.uiStore.isBattleSwitchForced).toBe(true)
  })

  it('verifies clock freeze capability for deterministic simulations', () => {
    const mapStore = useMapStore()

    mapStore.setFreezeClock(true)
    expect(mapStore.isTimeTickerFrozen).toBe(true)

    mapStore.setFreezeClock(false)
    expect(mapStore.isTimeTickerFrozen).toBe(false)
  })
})
