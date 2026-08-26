import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine'
import { handleItemUsage } from '@/logic/battle/battleItems'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleSource, BattleSide } from '@/types/battle/battle'
import { requireItemId, type ItemId } from '@/data/inventory/items'
import { requireCertifiedBattleTeamSlot, type CertifiedBattleGameAction } from '@/types/battle/certifiedBattleActions'

export async function processUseItemInBattle(
  ctx: BattleContext,
  itemId: ItemId,
  targetIndex: number | null = null,
  options: {
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
) {
  const activeBattle = ctx.activeBattle.value
  if (!activeBattle) return

  const activePoke = activeBattle.player
  if (activePoke) {
    const volatile = activePoke.volatileCounters
    if (volatile) {
      if ((volatile['twoturnmove'] && volatile['twoturnmove'] > 0) ||
          (volatile['lockedmove'] && volatile['lockedmove'] > 0)) {
        return
      }
    }
  }

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

  // Sincronizar de vuelta si el Pokémon modificado es el activo en el combate
  if (activeBattle.player && targetPoke.uid === activeBattle.player.uid) {
    activeBattle.player.hp = targetPoke.hp
    activeBattle.player.status = targetPoke.status
    activeBattle.player.moves = targetPoke.moves
  }

  ctx.attackerSide.value = null
  ctx.activeMove.value = null

  const castRes = res as { action: string, pokemon?: Pokemon }
  if (castRes.action === 'capture') {
    activeBattle.isCapture = true
    activeBattle.over = true

    // Cazabichos: Red Maestra (20% chance to duplicate captured bug Pokemon)
    if (options.gs.state.playerClass === 'cazabichos' && castRes.pokemon) {
      const cap = castRes.pokemon
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

    options.gs.addPokemon(castRes.pokemon || null, { notify: true })
    await options.endBattle(true, false)
    return
  } else if (castRes.action !== 'fail') {
    if (activeBattle) {
      activeBattle.playerUsedItem = true
    }
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
        await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM)
        if (ctx.animations?.awaitTween) {
          await ctx.animations.awaitTween('escape-enemy')
        } else {
          const { gsapSleep } = await import('@/logic/utils/gsapHelpers')
          const PLAY_ESCAPE_ANIMATION_FALLBACK_MS = 800
          await gsapSleep(PLAY_ESCAPE_ANIMATION_FALLBACK_MS)
        }
        await options.endBattle(false, true)
      }
      return
    }

    await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

    if (activeBattle.player && activeBattle.player.hp <= 0) {
      await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
      await options.handleFaint('player')
      return
    }
    if (activeBattle.enemy && activeBattle.enemy.hp <= 0) {
      await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
      await options.handleFaint('enemy')
      return
    }
  }

  if (activeBattle && !activeBattle.over && ctx.fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE) {
    ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
  }
}
