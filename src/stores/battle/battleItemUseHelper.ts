import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine'
import { handleItemUsage } from '@/logic/battle/battleItems'
import { gameBus } from '@/logic/events/gameBus'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleSource, BattleSide } from '@/types/battle/battle'
import { requireItemId, type ItemId } from '@/data/inventory/items'
import { requireCertifiedBattleTeamSlot, type CertifiedBattleGameAction } from '@/types/battle/certifiedBattleActions'

export interface ProcessUseItemInBattleOptions {
  eventStore: unknown
  addLog: (text: string, type?: string, source?: BattleSource | null, sideOverride?: BattleSide | null) => void
  audio: unknown
  consumeItem: (itemId: ItemId) => void
  fsm: unknown
  gs: {
    state: {
      team: (Pokemon | null)[]
      box: (Pokemon | null)[]
      playerClass?: string | null
      money: number
      inventory: Record<string, number | undefined>
    }
    addPokemon: (poke: Pokemon | null, opts?: { notify: boolean }) => void
  }
  uiStore: {
    notify: (msg: string, icon: string) => void
  }
  endBattle: (win: boolean, fled: boolean) => Promise<void>
  handleFaint: (side: BattleSide) => Promise<void>
  runEnemyAction: (ctx: BattleContext, bagAction?: CertifiedBattleGameAction) => Promise<void>
  persistBattle: () => void
  syncTeamHP: () => void
}

function hasVolatileMoveLock(activePoke: Pokemon | null | undefined): boolean {
  if (!activePoke?.volatileCounters) return false
  const volatile = activePoke.volatileCounters
  return Boolean(
    (volatile['twoturnmove'] && volatile['twoturnmove'] > 0) ||
    (volatile['lockedmove'] && volatile['lockedmove'] > 0)
  )
}

function syncActiveBattlePlayer(activePlayer: Pokemon | null | undefined, targetPoke: Pokemon) {
  if (activePlayer && targetPoke.uid === activePlayer.uid) {
    activePlayer.hp = targetPoke.hp
    activePlayer.status = targetPoke.status
    activePlayer.moves = targetPoke.moves
  }
}

async function handleCazabichosDuplication(
  cap: Pokemon,
  options: ProcessUseItemInBattleOptions
) {
  const t1 = String(cap.type || '').toLowerCase()
  const t2 = String(cap.type2 || '').toLowerCase()
  const isBug = t1 === 'bug' || t1 === 'bicho' || t2 === 'bug' || t2 === 'bicho'

  const CAZABICHOS_MASTER_NET_DUPLICATE_CHANCE = 0.20
  if (isBug && Math.random() < CAZABICHOS_MASTER_NET_DUPLICATE_CHANCE) {
    const { makePokemon } = await import('@/logic/pokemon/pokemonFactory')
    const clone = makePokemon(cap.id, cap.level || 5)
    if (clone) {
      clone.caught = true
      clone.nickname = cap.nickname
      options.gs.state.box.push(clone)
      options.addLog(`¡Red Maestra duplicó la captura! Se envió una copia de ${clone.name} a la caja.`, 'log-success', 'player')
      options.uiStore.notify(`¡Captura duplicada! Copia de ${clone.name} en la caja`, '🕸️')
    }
  }
}

interface BattleItemUsageResult {
  action: string
  pokemon?: Pokemon
}

async function handleBattleCaptureAction(
  castRes: BattleItemUsageResult,
  activeBattle: NonNullable<BattleContext['activeBattle']['value']>,
  options: ProcessUseItemInBattleOptions
) {
  activeBattle.isCapture = true
  activeBattle.capturedPokemon = castRes.pokemon
  activeBattle.over = true

  if (options.gs.state.playerClass === 'cazabichos' && castRes.pokemon) {
    await handleCazabichosDuplication(castRes.pokemon, options)
  }

  options.gs.addPokemon(castRes.pokemon || null, { notify: true })
  await options.endBattle(true, false)
}

async function handleActiveBattleFled(
  ctx: BattleContext,
  activeBattle: NonNullable<BattleContext['activeBattle']['value']>,
  options: ProcessUseItemInBattleOptions
) {
  await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ESCAPE_PROCESS)
  await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL)

  const p = activeBattle.player
  const e = activeBattle.enemy
  const playerRecallPromise = ctx.animations?.handleWithdrawRequest && p
    ? ctx.animations.handleWithdrawRequest({ side: 'player', pokemon: p })
    : Promise.resolve()

  const isWild = !activeBattle.isTrainer && !activeBattle.isGym
  let enemyEscapePromise: Promise<void> | Promise<unknown> = Promise.resolve()

  if (isWild && e) {
    gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'enemy', type: 'flee', pokemon: e })
    if (ctx.animations?.awaitTween) {
      enemyEscapePromise = ctx.animations.awaitTween('escape-enemy')
    } else {
      const { gsapSleep } = await import('@/logic/utils/gsapHelpers')
      const PLAY_ESCAPE_ANIMATION_FALLBACK_MS = 800
      enemyEscapePromise = gsapSleep(PLAY_ESCAPE_ANIMATION_FALLBACK_MS)
    }
  }

  await Promise.all([playerRecallPromise, enemyEscapePromise])
  await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
  await options.endBattle(false, true)
}

async function handleBattleItemFaintSequence(
  ctx: BattleContext,
  activeBattle: NonNullable<BattleContext['activeBattle']['value']>,
  options: ProcessUseItemInBattleOptions
): Promise<boolean> {
  if (activeBattle.player && activeBattle.player.hp <= 0) {
    await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
    await options.handleFaint('player')
    return true
  }
  if (activeBattle.enemy && activeBattle.enemy.hp <= 0) {
    await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
    await options.handleFaint('enemy')
    return true
  }
  return false
}

function applyPostItemTeamUpdates(
  castRes: BattleItemUsageResult,
  targetIndex: number | null,
  activeBattle: NonNullable<BattleContext['activeBattle']['value']>,
  options: ProcessUseItemInBattleOptions
) {
  activeBattle.playerUsedItem = true
  if (castRes.pokemon) {
    if (targetIndex !== null && options.gs.state.team[targetIndex]) {
      options.gs.state.team[targetIndex] = castRes.pokemon
    }
    const isTargetActive = (targetIndex === null || targetIndex === activeBattle.playerTeamIndex)
    if (isTargetActive && activeBattle.player) {
      activeBattle.player = castRes.pokemon
    }
    options.syncTeamHP()
  }
  options.persistBattle()
}

async function executeBattleItemTurnResolution(
  ctx: BattleContext,
  itemId: ItemId,
  targetIndex: number | null,
  activeBattle: NonNullable<BattleContext['activeBattle']['value']>,
  options: ProcessUseItemInBattleOptions
) {
  await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)
  const targetSlotIndex = targetIndex ?? activeBattle.playerTeamIndex
  const bagAction: CertifiedBattleGameAction = {
    kind: 'bag-item',
    itemId: requireItemId(itemId),
    targetSlot: requireCertifiedBattleTeamSlot(targetSlotIndex + 1),
  }
  await options.runEnemyAction(ctx, bagAction)

  if (activeBattle.over) {
    if (activeBattle.fled) {
      await handleActiveBattleFled(ctx, activeBattle, options)
    }
    return
  }

  await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)
  await handleBattleItemFaintSequence(ctx, activeBattle, options)
}

export async function processUseItemInBattle(
  ctx: BattleContext,
  itemId: ItemId,
  targetIndex: number | null = null,
  options: ProcessUseItemInBattleOptions
) {
  const activeBattle = ctx.activeBattle.value
  if (!activeBattle) return

  if (hasVolatileMoveLock(activeBattle.player)) return

  const targetPoke = (targetIndex !== null) ? options.gs.state.team[targetIndex] : activeBattle.player
  if (!targetPoke || !activeBattle.enemy) return

  ctx.attackerSide.value = 'player'

  const res = await handleItemUsage(itemId, targetPoke, activeBattle.enemy, {
    eventStore: options.eventStore as never,
    addLog: options.addLog as never,
    audio: options.audio as never,
    consumeItem: options.consumeItem,
    ctx,
    fsm: options.fsm as never,
    itemId
  })

  syncActiveBattlePlayer(activeBattle.player, targetPoke)

  ctx.attackerSide.value = null
  ctx.activeMove.value = null

  const castRes = res as BattleItemUsageResult
  if (castRes.action === 'capture') {
    await handleBattleCaptureAction(castRes, activeBattle, options)
    return
  }

  if (castRes.action !== 'fail') {
    applyPostItemTeamUpdates(castRes, targetIndex, activeBattle, options)
    await executeBattleItemTurnResolution(ctx, itemId, targetIndex, activeBattle, options)
  }

  if (activeBattle && !activeBattle.over && ctx.fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE) {
    ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
  }
}
