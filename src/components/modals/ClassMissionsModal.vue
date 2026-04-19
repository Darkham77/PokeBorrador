<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { usePlayerClassStore } from '@/stores/playerClass'
import { useGameStore } from '@/stores/game'
import { CLASS_MISSIONS } from '@/data/playerClasses'
import PokemonPickerModal from '../common/PokemonPickerModal.vue'
import BaseModal from '@/components/common/BaseModal.vue'

const uiStore = useUIStore()
const classStore = usePlayerClassStore()
const gameStore = useGameStore()

const isOpen = computed({
  get: () => uiStore.isClassMissionsOpen,
  set: (val) => { uiStore.isClassMissionsOpen = val }
})
const currentClass = computed(() => classStore.currentClassDef)
const activeMission = computed(() => classStore.activeMission)
const trainerLevel = computed(() => gameStore.state.trainerLevel || 1)

// Picker State
const isPickerOpen = ref(false)
const pickerConfig = ref({
  title: '',
  subtitle: '',
  maxSelect: 1,
  typeFilter: null,
  missionId: null
})

const now = ref(Date.now())
let timer = null

onMounted(() => {
  timer = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const close = () => { isOpen.value = false }

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

function getMissionDesc(_id) {
  const cls = classStore.playerClass
  if (cls === 'cazabichos') return 'Recolecta néctar y captura especímenes con IVs garantizados.'
  if (cls === 'rocket') return 'Exportación de especímenes al mercado negro por altos dividendos.'
  if (cls === 'entrenador') return 'Gimnasio de alto rendimiento para potenciar la experiencia.'
  if (cls === 'criador') return 'Entrenamiento genético intensivo para mejorar estadísticas base.'
  return 'Realiza tareas especiales de clase.'
}

async function startMission(missionId) {
  const m = CLASS_MISSIONS.find(x => x.id === missionId)
  if (!m) return

  const cls = classStore.playerClass
  
  if (cls === 'rocket') {
    pickerConfig.value = {
      title: '💀 SACRIFICIO ROCKET',
      subtitle: `Selecciona 1 Pokémon tipo VENENO para el mercado negro.`,
      maxSelect: 1,
      typeFilter: 'poison',
      missionId: missionId
    }
    isPickerOpen.value = true
  } else if (cls === 'cazabichos') {
    classStore.startMission(missionId)
  } else {
    pickerConfig.value = {
      title: '📍 ENVIAR POKÉMON',
      subtitle: 'Selecciona al Pokémon que realizará la misión.',
      maxSelect: 1,
      typeFilter: null,
      missionId: missionId
    }
    isPickerOpen.value = true
  }
}

function handlePickerConfirm(indices) {
  const mId = pickerConfig.value.missionId
  const cls = classStore.playerClass
  
  if (cls === 'rocket') {
    const p = gameStore.state.box[indices[0]]
    const val = 1000 + ((p.level || 1) * 100) + (Object.values(p.ivs || {}).reduce((a, b) => a + (b || 0), 0) * 25)
    classStore.startMission(mId, { 
      targetPokemonIdx: indices[0], 
      projectedReward: val 
    })
  } else {
    classStore.startMission(mId, { targetPokemonIdx: indices[0] })
  }
  
  isPickerOpen.value = false
}

function collectReward() {
  classStore.collectMission()
}
</script>

<template>
  <BaseModal
    :show="isOpen"
    :title="`MISIONES ${currentClass?.name.toUpperCase() || 'DE CLASE'}`"
    max-width="500px"
    @close="close"
  >
    <div
      class="class-missions-inner"
      :style="{ '--cls-color': currentClass?.color || '#3b82f6' }"
    >
      <!-- Active Mission Card (Premium) -->
      <section
        v-if="activeMission"
        class="active-mission-card"
      >
        <div
          class="mission-glow"
          :style="{ background: currentClass?.color }"
        />
        <div class="card-content">
          <div class="mission-header">
            <span
              class="mission-status-label"
              :class="{ done: isMissionDone }"
            >
              {{ isMissionDone ? 'OPERACIÓN FINALIZADA' : 'OPERACIÓN EN CURSO' }}
            </span>
            <span class="timer-text">{{ timeRemainingLabel }}</span>
          </div>
          
          <div class="progress-wrapper">
            <div class="progress-base">
              <div
                class="progress-fill"
                :style="{ width: missionProgress + '%', background: currentClass?.color }"
              >
                <div class="progress-pulse" />
              </div>
            </div>
          </div>

          <p class="mission-name">
            <span
              class="pulse-dot"
              :style="{ background: isMissionDone ? '#22c55e' : '#eab308' }"
            />
            {{ CLASS_MISSIONS.find(m => m.id === activeMission.id)?.name }}
          </p>

          <button 
            v-if="isMissionDone" 
            class="collect-btn"
            @click="collectReward"
          >
            RECLAMAR RECOMPENSAS
          </button>
          <div
            v-else
            class="working-indicator"
          >
            <div class="dots">
              <span /><span /><span />
            </div>
            <p>Procesando datos de campo...</p>
          </div>
        </div>
      </section>

      <!-- List Header -->
      <div class="list-label">
        DESPLIEGUES DISPONIBLES
      </div>
      
      <div class="missions-grid">
        <div 
          v-for="m in CLASS_MISSIONS" 
          :key="m.id" 
          class="mission-item"
          :class="{ locked: trainerLevel < m.reqLv, active: activeMission?.id === m.id }"
        >
          <div class="item-header">
            <span class="m-duration">{{ m.durationHs }}H</span>
            <span class="m-req">LVL {{ m.reqLv }}</span>
          </div>
          
          <h3 class="m-title">
            {{ m.name }}
          </h3>
          <p class="m-desc">
            {{ getMissionDesc(m.id) }}
          </p>

          <button 
            class="start-button"
            :disabled="trainerLevel < m.reqLv || !!activeMission"
            @click="startMission(m.id)"
          >
            {{ activeMission?.id === m.id ? 'EN CURSO' : (activeMission ? 'BLOQUEADO' : 'DESPLEGAR') }}
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <p class="footer-hint">
        Las bonificaciones de clase se aplican automáticamente tras la recolección.
      </p>
    </template>
  </BaseModal>

  <PokemonPickerModal
    v-if="isPickerOpen"
    :title="pickerConfig.title"
    :subtitle="pickerConfig.subtitle"
    :max-select="pickerConfig.maxSelect"
    :type-filter="pickerConfig.typeFilter"
    context="box"
    @confirm="handlePickerConfirm"
    @close="isPickerOpen = false"
  />
</template>

<style scoped lang="scss">
.class-missions-inner {
  padding: 8px 0;
}

.active-mission-card {
  position: relative;
  background: rgba(30, 41, 59, 0.5);
  border-radius: 20px;
  padding: 2px;
  overflow: hidden;
  margin-bottom: 32px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  .mission-glow {
    position: absolute;
    inset: -20px;
    filter: blur(40px);
    opacity: 0.15;
  }

  .card-content {
    position: relative;
    background: #1e293b;
    border-radius: 18px;
    padding: 24px;
    z-index: 1;
  }
}

.mission-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  .mission-status-label { 
    font-size: 10px; 
    font-weight: 800; 
    color: #94a3b8; 
    letter-spacing: 1px; 
    font-family: 'Press Start 2P', monospace;
  }
  .mission-status-label.done { color: #22c55e; }
  .timer-text { font-family: 'Press Start 2P', cursive; font-size: 10px; color: #fff; }
}

.progress-wrapper {
  margin-bottom: 20px;
  .progress-base { height: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; overflow: hidden; }
  .progress-fill { height: 100%; position: relative; transition: width 0.3s ease; }
  .progress-pulse { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); animation: sweep 2s infinite; }
}

.mission-name {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 24px;

  .pulse-dot { width: 8px; height: 8px; border-radius: 50%; animation: pulse 1.5s infinite; }
}

.collect-btn {
  width: 100%;
  padding: 16px;
  background: var(--cls-color);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-family: 'Press Start 2P', cursive;
  font-size: 10px;
  cursor: pointer;
  box-shadow: 0 10px 20px -5px var(--cls-color);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:hover { 
    transform: translateY(-2px); 
    filter: Brightness(1.1); 
    box-shadow: 0 15px 30px -5px var(--cls-color);
  }
}

.working-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  p { font-size: 11px; color: #64748b; margin: 0; font-family: 'Press Start 2P', monospace; }
  .dots {
    display: flex; gap: 8px;
    span { width: 8px; height: 8px; background: var(--cls-color); border-radius: 50%; animation: dots 1.4s infinite; }
    span:nth-child(2) { animation-delay: 0.2s; }
    span:nth-child(3) { animation-delay: 0.4s; }
  }
}

.list-label { 
  font-size: 10px; 
  font-weight: 800; 
  color: #64748b; 
  letter-spacing: 1.5px; 
  margin-bottom: 20px;
  font-family: 'Press Start 2P', monospace;
}

.missions-grid { display: flex; flex-direction: column; gap: 16px; }

.mission-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
  transition: all 0.2s;

  .item-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    .m-duration { font-family: 'Press Start 2P', cursive; font-size: 8px; color: #94a3b8; }
    .m-req { font-size: 10px; font-weight: 700; color: #64748b; font-family: 'Press Start 2P', monospace; }
  }

  .m-title { font-size: 15px; font-weight: 800; color: #f1f5f9; margin: 0 0 8px 0; }
  .m-desc { font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0 0 20px 0; }

  .start-button {
    width: 100%;
    padding: 12px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    color: #cbd5e1;
    font-weight: 700;
    font-size: 10px;
    font-family: 'Press Start 2P', monospace;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) { 
      background: var(--cls-color); 
      border-color: transparent; 
      color: #fff; 
      transform: translateY(-2px);
    }
    
    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  &.locked { opacity: 0.4; }
  &.active { border-color: var(--cls-color); background: rgba(var(--cls-color-rgb), 0.05); }
}

.footer-hint { font-size: 10px; color: #475569; margin: 0; text-align: center; }

@keyframes sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
@keyframes pulse { 0% { transform: Scale(0.95); opacity: 0.5; } 50% { transform: Scale(1.05); opacity: 1; } 100% { transform: Scale(0.95); opacity: 0.5; } }
@keyframes dots { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
</style>
