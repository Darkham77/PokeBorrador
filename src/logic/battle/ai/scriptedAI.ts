import type { Pokemon, Move } from '../../../types/pokemon/pokemon.ts'
import type { BattleStages } from '../../../types/battle/battle.ts'
import type { BattleContext } from '../../../types/battle/battleContext.ts'
import type { CombatAI } from './combatAI.ts'
import { ShowdownTeamResolver } from '../showdownTeamResolver.ts'


export class ScriptedAI implements CombatAI {
  private getDebugChoices(): { mockChoices: string[]; idx: number } | null {
    if (typeof window === 'undefined' || !window.__VITE_DEBUG__?.mockEnemyChoices) return null
    const debugObj = window.__VITE_DEBUG__
    const mockChoices = debugObj.mockEnemyChoices
    const idx = debugObj.p2ChoiceIdx !== undefined ? debugObj.p2ChoiceIdx : (debugObj.enemyChoiceIndex ?? 0)
    if (!mockChoices) return null
    return { mockChoices, idx }
  }
  decideMove(enemy: Pokemon, _player: Pokemon, _playerStages: BattleStages, _isWild = false, _store?: BattleContext): Move | null {
    const state = this.getDebugChoices()
    if (!state) return null
    const { mockChoices, idx } = state
    const choiceStr = mockChoices[idx]
    if (choiceStr && choiceStr.startsWith('move ')) {
      const splitPart = choiceStr.split(' ')[1] || '0'
      const moveIdx = parseInt(splitPart, 10) - 1
      const targetMove = enemy.moves[moveIdx]
      if (targetMove) {
        console.debug(`[DEBUG-AI] [E2E-MOCK] ScriptedAI decideMove replaying choice #${idx}: ${choiceStr} -> ${targetMove.id}`)
        return targetMove
      }
    }
    return null
  }

  shouldSwitch(_enemy: Pokemon, _player: Pokemon, _enemyTeam: Pokemon[] | undefined, _store?: BattleContext): boolean {
    const state = this.getDebugChoices()
    if (!state) return false
    const { mockChoices, idx } = state
    const choiceStr = mockChoices[idx]
    if (choiceStr && choiceStr.startsWith('switch ')) {
      console.debug(`[DEBUG-AI] [E2E-MOCK] ScriptedAI shouldSwitch replaying choice #${idx}: true (choice is ${choiceStr})`)
      return true
    }
    return false
  }

  findBestSwitchIndex(enemyTeam: Pokemon[], _player: Pokemon, _currentEnemyUid: string, store?: BattleContext): number {
    const state = this.getDebugChoices()
    if (!state) return -1
    const { mockChoices, idx } = state
    const choiceStr = mockChoices[idx]
    if (choiceStr && choiceStr.startsWith('switch ')) {
      const splitPart = choiceStr.split(' ')[1] || '0'
      const switchSlot = parseInt(splitPart, 10) - 1 // 0-indexed Showdown slot
      const active = store?.activeBattle?.value
      const enemyRequest = active?.enemyRequest
      const reqMon = (enemyRequest?.side?.pokemon as unknown as Array<{ uid?: string } | null | undefined>)?.[switchSlot]
      let targetUid = reqMon?.uid || null
      if (!targetUid) {
        const p2SlotOrder = active?.p2SlotOrder
        if (p2SlotOrder && p2SlotOrder[switchSlot]) {
          targetUid = p2SlotOrder[switchSlot]
        }
      }
      if (!targetUid && enemyTeam[switchSlot]) {
        targetUid = enemyTeam[switchSlot]?.uid || null;
      }
      if (targetUid) {
        const teamIdx = enemyTeam.findIndex(p => p && p.uid === targetUid)
        if (teamIdx !== -1) {
          console.debug(`[DEBUG-AI] [E2E-MOCK] ScriptedAI findBestSwitchIndex replaying choice #${idx}: ${choiceStr} -> UID ${targetUid} at idx ${teamIdx}`)
          return teamIdx
        }
      }
    }
    return -1
  }

  // Las simulaciones deterministas siguen estrictamente el guion y no utilizan objetos automáticamente
  async evaluateAndUseItem(_ctx: BattleContext, _e: Pokemon): Promise<boolean> {
    console.debug('[DEBUG-AI] [E2E-MOCK] ScriptedAI evaluateAndUseItem returning false (items disabled during E2E simulation)')
    return false
  }
}

export async function executeScriptedPlayerAction(ctx: BattleContext): Promise<boolean> {
  if (typeof window === 'undefined' || !window.__VITE_DEBUG__?.isScriptedReplayMode) return false

  const debugObj = window.__VITE_DEBUG__
  const p1ChoiceIdx = debugObj.p1ChoiceIdx ?? 0
  const playerChoices = debugObj.playerChoices as string[] | undefined

  if (!playerChoices || playerChoices.length === 0) {
    console.warn(`[E2E-SCRIPTED-AI] No playerChoices array in window.__VITE_DEBUG__. Falling back to default action.`);
    const { useBattleStore } = await import('../../../stores/battle/battle');
    const battleStore = useBattleStore();
    const active = battleStore.state;
    if (!active) return false;

    const subState = battleStore.currentSubState;
    const activePoke = active.player;

    if (subState === 'SWITCH_MENU' || subState === 'PLAYER_FAINT_SEQ' || !activePoke || activePoke.hp <= 0) {
      const { useGameStore } = await import('../../../stores/game');
      const gameStore = useGameStore();
      const team = gameStore.state.team;
      const targetIdx = team.findIndex(p => p && p.hp > 0 && p.uid !== activePoke?.uid);
      if (targetIdx !== -1) {
        console.debug(`[E2E-SCRIPTED-AI-FALLBACK] Auto-switching to pokemon at index ${targetIdx}`);
        await battleStore.executeSwitch(targetIdx, true);
        return true;
      }
      return false;
    }

    console.debug(`[E2E-SCRIPTED-AI-FALLBACK] Auto-executing first move`);
    await battleStore.executeMove(0);
    return true;
  }

  const choiceStr = playerChoices[p1ChoiceIdx]
  console.debug(`[E2E-SCRIPTED-AI] Executing scripted player choice #${p1ChoiceIdx}: "${choiceStr}"`)

  if (choiceStr === '' || choiceStr === undefined || choiceStr.trim() === '') {
    console.debug(`[E2E-SCRIPTED-AI] Empty choice. Skipping.`)
    debugObj.p1ChoiceIdx = p1ChoiceIdx + 1
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('battle-ready-for-input', {
          detail: {
            subState: ctx.fsm.currentSubState.value,
            p1ChoiceIdx: debugObj.p1ChoiceIdx,
            p2ChoiceIdx: debugObj.p2ChoiceIdx ?? 0,
            over: ctx.activeBattle.value?.over ?? false
          }
        })
      )
    }
    return true
  }

  const { useBattleStore } = await import('../../../stores/battle/battle')
  const battleStore = useBattleStore()
  const active = battleStore.state
  if (!active) {
    console.warn(`[E2E-SCRIPTED-AI] activeBattle state is null`)
    return false
  }

  const clean = choiceStr.trim().toLowerCase()

  if (clean === 'struggle') {
    await battleStore.executeStruggle()
    return true
  }

  if (clean.startsWith('move ')) {
    const subState = battleStore.currentSubState;
    const activePoke = active.player;
    if (subState === 'SWITCH_MENU' || subState === 'PLAYER_FAINT_SEQ' || !activePoke || activePoke.hp <= 0) {
      throw new Error(`[E2E-SCRIPTED-AI] Attempted to execute move choice "${clean}" but a switch is required (subState: ${subState}, activePoke: ${activePoke ? activePoke.name + ' (HP: ' + activePoke.hp + ')' : 'null'}). Simulation has desynced.`);
    }
    const splitPart = clean.split(' ')[1] || '1'
    const moveIdx = parseInt(splitPart, 10) - 1
    await battleStore.executeMove(moveIdx)
    return true
  }

  if (clean.startsWith('switch ')) {
    const splitPart = clean.split(' ')[1] || '2'
    const slotNum = parseInt(splitPart, 10)
    const { useGameStore } = await import('../../../stores/game')
    const gameStore = useGameStore()

    const targetPoke = ShowdownTeamResolver.getPokemonByShowdownSlot(
      gameStore.state.team,
      active.playerRequest,
      slotNum
    )
    if (!targetPoke) {
      throw new Error(`[E2E-SCRIPTED-AI] Pokémon target for slot ${slotNum} not resolved.`)
    }

    const teamIndex = gameStore.state.team.findIndex(p => p && p.uid === targetPoke.uid)
    if (teamIndex === -1) {
      throw new Error(`[E2E-SCRIPTED-AI] Pokémon ${targetPoke.name} not found in player team.`)
    }

    const req = active.playerRequest
    const isForced = !!(
      (req && req.forceSwitch && ((req.forceSwitch as unknown) === true || (Array.isArray(req.forceSwitch) && req.forceSwitch.some(x => !!x)))) ||
      battleStore.currentSubState === 'SWITCH_MENU' ||
      (active.player && active.player.hp <= 0)
    )

    console.debug(`[E2E-SCRIPTED-AI] Switching to ${targetPoke.name} (teamIndex: ${teamIndex}, isForced: ${isForced})`)
    await battleStore.executeSwitch(teamIndex, isForced)
    return true
  }

  throw new Error(`[E2E-SCRIPTED-AI] Unknown choice format: "${choiceStr}"`)
}
