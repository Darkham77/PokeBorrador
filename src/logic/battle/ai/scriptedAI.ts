import type { Pokemon, Move } from '../../../types/pokemon/pokemon.ts'
import type { BattleStages } from '../../../types/battle/battle.ts'
import type { BattleContext } from '../../../types/battle/battleContext.ts'
import type { CombatAI } from './combatAI.ts'

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
