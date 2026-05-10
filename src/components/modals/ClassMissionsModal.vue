<script setup lang="ts">



import { ref, computed, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useWindowListener } from '@/composables/useWindowListener'
import { useUIStore } from '@/stores/ui'
import { usePlayerClassStore } from '@/stores/playerClass'
import { useGameStore } from '@/stores/game'
import { CLASS_MISSIONS } from '@/data/playerClasses'
import PokemonPickerModal from '../common/PokemonPickerModal.vue'
import { getEloTier } from '@/logic/pvp/rankedEngine'
import BaseModal from '@/components/common/BaseModal.vue'

// Sub-components
import ClassDashboard from './class/ClassDashboard.vue'
import ClassMissionsList from './class/ClassMissionsList.vue'

interface Props {
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

defineOptions({ inheritAttrs: false })
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'submit'): void
}>()

const uiStore = useUIStore()
const classStore = usePlayerClassStore()
const gameStore = useGameStore()

const isSmallScreen = ref(window.innerWidth <= 950)
const handleResize = () => { isSmallScreen.value = window.innerWidth <= 950 }
useWindowListener('resize', handleResize)

// Removed isOpen computed as we now use 'show' prop from host

const currentClass = computed(() => classStore.currentClassDef)
const activeMission = computed(() => classStore.activeMission)
const trainerLevel = computed(() => gameStore.state.trainerLevel || 1)
const trainerRank = computed(() => getEloTier(gameStore.state.eloRating).name)

// View State
const viewMode = ref('dashboard') // 'dashboard' or 'missions'
const now = ref(Temporal.Now.instant().epochMilliseconds)
let timer: gsap.core.Tween | null = null

onMounted(() => {
  const updateTime = () => {
    now.value = Temporal.Now.instant().epochMilliseconds
    timer = gsap.delayedCall(1, updateTime)
  }
  timer = gsap.delayedCall(1, updateTime)
})

onUnmounted(() => {
  if (timer) timer.kill()
})

const close = () => { emit('close') }

const handleSelect = () => {
  uiStore.open('ClassSelection')
  close()
}

// Picker State
const isPickerOpen = ref(false)
const pickerConfig = ref({
  title: '',
  subtitle: '',
  maxSelect: 1,
  typeFilter: null as string | null,
  missionId: null as string | null
})

async function startMission(missionId: string) {
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

function handlePickerConfirm(indices: number[]) {
  const mId = pickerConfig.value.missionId
  if (mId) {
    classStore.startMission(mId, { targetPokemonIdx: indices[0] })
  }
  isPickerOpen.value = false
}

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
</script>

<template>
  <BaseModal
    :show="show"
    title="GESTIÓN DE CLASE"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :title-color="currentClass?.color || 'var(--yellow)'"
    :header-background="currentClass ? (currentClass.color + '1A') : 'Rgba(15, 23, 42, 0.8)'"
    :max-width="isSmallScreen ? '100dvw' : '1000px'"
    :show-close-button="true"
    padding="raw"
    @close="close"
  >
    <div 
      class="class-modal-shell"
      :style="{ '--cls-color': currentClass?.color || '#3b82f6' }"
    >
      <Transition
        name="fade-quick"
        mode="out-in"
      >
        <ClassDashboard
          v-if="viewMode === 'dashboard'"
          :current-class="currentClass"
          :trainer-level="trainerLevel"
          :trainer-rank="trainerRank"
          @open-missions="viewMode = 'missions'"
          @change-class="handleSelect"
          @close="close"
        />
        <ClassMissionsList
          v-else
          :current-class="currentClass"
          :active-mission="activeMission"
          :missions="CLASS_MISSIONS"
          :trainer-level="trainerLevel"
          :mission-progress="missionProgress"
          :is-mission-done="isMissionDone"
          @back="viewMode = 'dashboard'"
          @start-mission="startMission"
          @collect-reward="classStore.collectMission"
        />
      </Transition>
    </div>
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
.class-modal-shell {
  min-height: 400px;
  height: 100%;
  background: transparent;
  color: $white;
  display: flex;
  flex-direction: column;

  @media (max-width: 950px) {
    min-height: auto;
  }
}

.fade-quick-enter-active, .fade-quick-leave-active {
  transition: opacity 0.2s ease;
}
.fade-quick-enter-from, .fade-quick-leave-to {
  opacity: 0;
}
</style>
