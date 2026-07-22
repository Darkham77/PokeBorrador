<script setup lang="ts">
import { useBattleStore } from '@/stores/battle/battle'
import { notifyWorkerBattleWin } from '@/logic/battle/showdownWorkerClient'

const battleStore = useBattleStore()

const defeatEnemy = async () => {
  const e = battleStore.enemy
  if (!e) return
  battleStore.addLog('DEBUG: Ejecutando Daño Máximo...', 'log-info', e)
  e.hp = 0
  notifyWorkerBattleWin('p1')
  await battleStore.handleFaint('enemy')
}

const defeatPlayer = async () => {
  const p = battleStore.player
  if (!p) return
  battleStore.addLog('DEBUG: Ejecutando Suicidio...', 'log-info', p)
  p.hp = 0
  notifyWorkerBattleWin('p2')
  await battleStore.handleFaint('player')
}

const healPlayer = () => {
  const p = battleStore.player
  if (!p) return
  p.hp = p.maxHp
  p.status = null
  battleStore.addLog('DEBUG: Jugador curado.', 'log-info', p)
}

const healEnemy = () => {
  const e = battleStore.enemy
  if (!e) return
  e.hp = e.maxHp
  e.status = null
  battleStore.addLog('DEBUG: Enemigo curado.', 'log-info', e)
}

const addExpForNextLevel = async () => {
  await battleStore.awardDebugExp()
}

const drainPP = () => {
  const p = battleStore.player
  if (!p) return
  p.moves.forEach(m => { if (m) m.pp = 1 })
  battleStore.addLog('DEBUG: PP de todos los movimientos seteados a 1.', 'log-info', p)
}
</script>

<template>
  <div>
    <div class="debug-row">
      <button
        class="debug-btn kill-btn"
        @click.stop="defeatEnemy"
      >
        KILL ENEMY
      </button>
      <button
        class="debug-btn kill-btn"
        @click.stop="defeatPlayer"
      >
        KILL ME
      </button>
      <button
        class="debug-btn heal-btn"
        @click.stop="healPlayer"
      >
        HEAL ME
      </button>
      <button
        class="debug-btn heal-btn"
        @click.stop="healEnemy"
      >
        HEAL ENEMY
      </button>
    </div>
    <div
      class="debug-row"
      style="margin-top: 2px;"
    >
      <button
        class="debug-btn exp-btn"
        @click.stop="addExpForNextLevel"
      >
        ⚡ EXP AL SIGUIENTE NIVEL
      </button>
    </div>
    <div
      class="debug-row"
      style="margin-top: 2px;"
    >
      <button
        class="debug-btn pp-drain-btn"
        @click.stop="drainPP"
      >
        🧪 PP → 1 (SOFTLOCK TEST)
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_debug-action-panel.scss"></style>
