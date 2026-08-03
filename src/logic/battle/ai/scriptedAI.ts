import type { Pokemon, Move } from '../../../types/pokemon/pokemon.ts'
import type { BattleStages } from '../../../types/battle/battle.ts'
import type { BattleContext } from '../../../types/battle/battleContext.ts'
import type { CombatAI } from './combatAI.ts'
import { ShowdownTeamResolver } from '../showdownTeamResolver.ts'
import { ShowdownBattleRunner } from '../helpers/showdownBattleRunner.ts'
import { isRevivingForceSwitchRequest } from '../helpers/requestHelper.ts'


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
      const slotNum = parseInt(splitPart, 10)
      const active = store?.activeBattle?.value
      const enemyRequest = active?.enemyRequest
      const targetPoke = ShowdownTeamResolver.getPokemonByShowdownSlot(enemyTeam, enemyRequest, slotNum)
      if (targetPoke) {
        const teamIdx = enemyTeam.findIndex(p => p && p.uid === targetPoke.uid)
        if (teamIdx !== -1) {
          console.debug(`[DEBUG-AI] [E2E-MOCK] ScriptedAI findBestSwitchIndex replaying choice #${idx}: ${choiceStr} -> UID ${targetPoke.uid} at idx ${teamIdx}`)
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

export async function executeScriptedPlayerAction(_ctx: BattleContext): Promise<boolean> {
  if (typeof window === 'undefined' || !window.__VITE_DEBUG__?.isScriptedReplayMode) return false

  const debugObj = window.__VITE_DEBUG__

  const { useBattleStore } = await import('../../../stores/battle/battle')
  const battleStore = useBattleStore()
  const active = battleStore.state
  if (!active) return false

  const p1HistoryChoice = ShowdownBattleRunner.requireHistoryChoice(debugObj, 'p1')
  const p2HistoryChoice = ShowdownBattleRunner.requireHistoryChoice(debugObj, 'p2')
  if (p1HistoryChoice === '' && p2HistoryChoice !== '') {

    const { executeTurnInWorker, syncTeamsFromLastWorkerState } = await import('../showdownWorkerClient.ts')
    const { filterShowdownLogs, parseShowdownLogLine } = await import('../showdownBridge.ts')
    const result = await executeTurnInWorker('', p2HistoryChoice, true, false)
    active.playerRequest = result.p1Request
    active.enemyRequest = result.p2Request
    const logs = filterShowdownLogs(result.logs)
    for (const log of logs) await parseShowdownLogLine(_ctx, log, logs)
    await syncTeamsFromLastWorkerState()
    ShowdownBattleRunner.advanceHistoryAfterAcceptedTurn(debugObj)
    console.debug(`[E2E-SCRIPTED-AI] Executed certified P2-only history step "${p2HistoryChoice}".`)
    return true
  }

  const choiceStr = p1HistoryChoice

  if (choiceStr === 'pass') {
    console.debug(`[E2E-SCRIPTED-AI] Choice is 'pass' (noop). Replay completed or player requires no action.`);
    return true;
  }

  const clean = choiceStr.trim().toLowerCase()

  console.debug(`[E2E-SCRIPTED-AI] Resolved certified player history choice: "${choiceStr}"`)

  if (clean === 'struggle') {
    await battleStore.executeStruggle()
    return true
  }

  if (clean.startsWith('move ')) {
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
    const isRevivingTarget = isRevivingForceSwitchRequest(req)
    const isForced = !!(
      !isRevivingTarget && (
        (req && req.forceSwitch && ((req.forceSwitch as unknown) === true || (Array.isArray(req.forceSwitch) && req.forceSwitch.some(x => !!x)))) ||
        battleStore.currentSubState === 'SWITCH_MENU' ||
        battleStore.currentSubState === 'PLAYER_FAINT_SEQ' ||
        (active.player && active.player.hp <= 0)
      )
    )

    console.debug(`[E2E-SCRIPTED-AI] Switching to ${targetPoke.name} (teamIndex: ${teamIndex}, isForced: ${isForced})`)
    await battleStore.executeSwitch(teamIndex, isForced)
    return true
  }

  throw new Error(`[E2E-SCRIPTED-AI] Unknown choice format: "${choiceStr}"`)
}
