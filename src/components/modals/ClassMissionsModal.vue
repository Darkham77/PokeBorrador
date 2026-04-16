<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { usePlayerClassStore } from '@/stores/playerClass'
import { useGameStore } from '@/stores/game'
import { CLASS_MISSIONS } from '@/data/playerClasses'

const uiStore = useUIStore()
const classStore = usePlayerClassStore()
const gameStore = useGameStore()

const isOpen = computed(() => uiStore.isClassMissionsOpen)
const currentClass = computed(() => classStore.currentClassDef)
const activeMission = computed(() => classStore.activeMission)
const trainerLevel = computed(() => gameStore.state.level || 1)

const now = ref(Date.now())
let timer = null

onMounted(() => {
  timer = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const close = () => { uiStore.isClassMissionsOpen = false }

const missionProgress = computed(() => {
  if (!activeMission.value) return 0
  const total = activeMission.value.endsAt - activeMission.value.startedAt
  const elapsed = now.value - activeMission.value.startedAt
  return Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)))
})

const isMissionDone = computed(() => {
  if (!activeMission.value) return false
  return now.value >= activeMission.value.endsAt
})

const timeRemainingLabel = computed(() => {
  if (!activeMission.value) return ''
  if (isMissionDone.value) return '¡LISTA!'
  const ms = activeMission.value.endsAt - now.value
  const h = Math.floor(ms / 3600000)
  const min = Math.floor((ms % 3600000) / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return h > 0 ? `${h}h ${min}m` : `${min}m ${sec}s`
})

function getMissionDesc(id) {
  const cls = classStore.playerClass
  if (cls === 'cazabichos') return 'Captura 3 Pokémon Bicho con IVs garantizados y mayor probabilidad de Shiny.'
  if (cls === 'rocket') {
    const mults = { mission_6h: '1.0', mission_12h: '1.3', mission_24h: '1.8' }
    return `Vende Pokémon Veneno con multiplicador de ₽ x${mults[id] || '1'}.`
  }
  if (cls === 'entrenador') return `Entrena un Pokémon para que gane mucha EXP${id === 'mission_24h' ? ' y un +1 nivel extra' : ''}.`
  if (cls === 'criador') return 'Aumenta IVs aleatorios del Pokémon enviado a cambio de Vigor.'
  return 'Realiza tareas especiales de clase.'
}

async function startMission(missionId) {
  const m = CLASS_MISSIONS.find(x => x.id === missionId)
  if (!m) return

  const cls = classStore.playerClass
  
  if (cls === 'rocket') {
    window._openPokemonSelectionModal({
      title: '💀 SACRIFICIO ROCKET',
      subtitle: `Selecciona 1 Pokémon tipo VENENO para el mercado negro.`,
      maxSelect: 1,
      typeFilter: 'poison',
      context: 'rocket',
      onConfirm: (indices) => {
        const p = gameStore.state.box[indices[0]]
        const val = 1000 + ((p.level || 1) * 100) + (Object.values(p.ivs || {}).reduce((a, b) => a + (b || 0), 0) * 25)
        
        // Ejecutar sacrificio (esto debería estar en una acción en classStore)
        classStore.startMission(missionId, { 
          targetPokemonIdx: indices[0], 
          projectedReward: val 
        })
      }
    })
  } else if (cls === 'cazabichos') {
    // Cazabichos no requiere sacrificar ni seleccionar (es captura salvaje)
    classStore.startMission(missionId)
  } else {
    window._openPokemonSelectionModal({
      title: '📍 ENVIAR POKÉMON',
      subtitle: 'Selecciona al Pokémon que realizará la misión.',
      maxSelect: 1,
      context: cls,
      onConfirm: (indices) => {
        classStore.startMission(missionId, { targetPokemonIdx: indices[0] })
      }
    })
  }
}

function collectReward() {
  classStore.collectMission()
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="modal-overlay"
      @click.self="close"
    >
      <div
        class="modal-container"
        :style="{ '--cls-color': currentClass?.color || '#3b82f6' }"
      >
        <header class="modal-header">
          <div class="header-title">
            <span class="class-icon">{{ currentClass?.icon }}</span>
            <h2 class="press-start">
              MISIONES {{ currentClass?.name.toUpperCase() }}
            </h2>
          </div>
          <button
            class="close-btn"
            @click="close"
          >
            ✕
          </button>
        </header>

        <main class="modal-body">
          <!-- Active Mission Section -->
          <section
            v-if="activeMission"
            class="active-mission-card"
          >
            <div class="mission-header">
              <span
                class="mission-status-label"
                :class="{ done: isMissionDone }"
              >
                {{ isMissionDone ? 'Misión Completada' : 'Misión en Curso' }}
              </span>
              <span class="timer-text">{{ timeRemainingLabel }}</span>
            </div>
            
            <div class="progress-container">
              <div 
                class="progress-bar" 
                :style="{ width: missionProgress + '%', background: currentClass?.color }"
              />
            </div>

            <p class="mission-name">
              📍 {{ CLASS_MISSIONS.find(m => m.id === activeMission.id)?.name }}
            </p>

            <button 
              v-if="isMissionDone" 
              class="collect-btn" 
              :style="{ background: currentClass?.color, boxShadow: `0 4px 0 ${currentClass?.colorDark}` }"
              @click="collectReward"
            >
              RECOLECTAR RECOMPENSA
            </button>
            <p
              v-else
              class="working-msg"
            >
              Tus Pokémon están trabajando arduamente...
            </p>
          </section>

          <!-- Available Missions List -->
          <div class="list-label">
            DISPONIBLES
          </div>
          <div class="missions-list">
            <div 
              v-for="m in CLASS_MISSIONS" 
              :key="m.id" 
              class="mission-row"
              :class="{ locked: trainerLevel < m.reqLv, active: activeMission?.id === m.id }"
            >
              <div class="row-header">
                <div class="name-group">
                  <span class="clock-icon">⏳</span>
                  <span
                    class="row-name"
                    :style="{ color: trainerLevel >= m.reqLv ? m.color : '#6b7280' }"
                  >
                    {{ m.name }}
                  </span>
                </div>
                <span class="level-badge">Lv.{{ m.reqLv }}</span>
              </div>
              
              <p class="row-desc">
                {{ getMissionDesc(m.id) }}
              </p>

              <button 
                class="start-btn"
                :disabled="trainerLevel < m.reqLv || !!activeMission"
                @click="startMission(m.id)"
              >
                {{ activeMission?.id === m.id ? 'EN CURSO' : (activeMission ? 'OCUPADO' : (trainerLevel >= m.reqLv ? 'INICIAR' : 'BLOQUEADO')) }}
              </button>
            </div>
          </div>
        </main>

        <footer class="modal-footer">
          <p class="footer-warning">
            <span class="warning-tag">⚠️ ATENCIÓN:</span> Solo puedes tener 1 misión activa a la vez.
          </p>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.press-start {
  font-family: 'Press Start 2P', cursive;
  font-size: 11px;
  color: var(--cls-color);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 20px;
  cursor: pointer;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.active-mission-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.mission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.mission-status-label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
}

.mission-status-label.done {
  color: #4ade80;
}

.timer-text {
  font-family: 'Press Start 2P', cursive;
  font-size: 9px;
  color: #fff;
}

.progress-container {
  height: 8px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.mission-name {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
}

.collect-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-family: 'Press Start 2P', cursive;
  font-size: 9px;
  cursor: pointer;
  transition: transform 0.1s;
}

.collect-btn:active { transform: translateY(2px); }

.working-msg {
  text-align: center;
  font-size: 11px;
  color: #64748b;
  margin: 0;
}

.list-label {
  font-size: 10px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.missions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mission-row {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  transition: opacity 0.3s;
}

.mission-row.locked { opacity: 0.5; }
.mission-row.active { border-color: var(--cls-color); }

.row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.name-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.row-name {
  font-size: 12px;
  font-weight: 700;
}

.level-badge {
  font-size: 9px;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  color: #94a3b8;
}

.row-desc {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
  margin-bottom: 12px;
}

.start-btn {
  width: 100%;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.start-btn:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.1);
}

.start-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.modal-footer {
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.footer-warning {
  font-size: 10px;
  color: #fca5a5;
  line-height: 1.4;
  margin: 0;
}

.warning-tag {
  color: #ef4444;
  font-weight: 800;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
