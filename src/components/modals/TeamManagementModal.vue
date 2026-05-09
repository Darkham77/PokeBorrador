<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWindowListener } from '@/composables/useWindowListener'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBoxStore } from '@/stores/box'
import BaseModal from '@/components/common/BaseModal.vue'
import UnifiedTeamSlot from '@/components/team/UnifiedTeamSlot.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import type { Pokemon } from '@/types/pokemon'

const gameStore = useGameStore()
const uiStore = useUIStore()

const isSmallScreen = ref(window.innerWidth <= 950)
const handleResize = () => { isSmallScreen.value = window.innerWidth <= 950 }
useWindowListener('resize', handleResize)

const activeTab = ref('adventure') // 'adventure', 'pvp', 'war'

const adventureTeam = computed(() => {
  const team = gameStore.state.team || []
  const slots: (Pokemon | null)[] = []
  for (let i = 0; i < 6; i++) {
    slots.push(team[i] || null)
  }
  return slots
})

const pvpTeam = computed(() => {
  const pvpUids = (gameStore.state.pvpTeam || []) as string[]
  const allPokes = [...((gameStore.state.team || []) as (Pokemon | null)[]), ...((gameStore.state.box || []) as (Pokemon | null)[])].filter((p): p is Pokemon => p !== null)
  const slots: (Pokemon | null)[] = []
  for (let i = 0; i < 3; i++) {
    const uid = pvpUids[i]
    slots.push(allPokes.find(p => p.uid === uid) || null)
  }
  return slots
})

const warTeam = computed(() => {
  const warUids = (gameStore.state.warTeam || []) as string[]
  const maxSlots = gameStore.state.warSlots || 6
  const allPokes = [...((gameStore.state.team || []) as (Pokemon | null)[]), ...((gameStore.state.box || []) as (Pokemon | null)[])].filter((p): p is Pokemon => p !== null)
  const slots: (Pokemon | null)[] = []
  for (let i = 0; i < maxSlots; i++) {
    const uid = warUids[i]
    slots.push(allPokes.find(p => p.uid === uid) || null)
  }
  return slots
})

const adventureCount = computed(() => (gameStore.state.team || []).filter(Boolean).length)
const pvpCount = computed(() => (gameStore.state.pvpTeam || []).length)
const warCount = computed(() => (gameStore.state.warTeam || []).length)
const maxWarSlots = computed(() => gameStore.state.warSlots || 6)

// Drag and Drop Logic
const draggedIndex = ref<number | null>(null)
const touchOverIndex = ref<number | null>(null)
const isDragging = ref(false)

function handleDragStart(index: number) {
  draggedIndex.value = index
  isDragging.value = true
  
  // Set global listener for drag end (safety)
  window.addEventListener('dragend', handleDragEnd, { once: true })
}

function handleDragEnd() {
  isDragging.value = false
  draggedIndex.value = null
  touchOverIndex.value = null
}

function handleDrop(targetIndex: number) {
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) return
  
  if (activeTab.value === 'adventure') {
    // Only reorder if there's a pokemon at the dragged source
    if (gameStore.state.team[draggedIndex.value]) {
      gameStore.reorderTeam(draggedIndex.value, targetIndex)
    }
  } else if (activeTab.value === 'pvp') {
    gameStore.reorderPvpTeam(draggedIndex.value, targetIndex)
  } else if (activeTab.value === 'war') {
    gameStore.reorderWarTeam(draggedIndex.value, targetIndex)
  }
  
  handleDragEnd()
}

function openDetail(pokemon: Pokemon | null) {
  if (!pokemon) return
  const team = (gameStore.state.team || []) as (Pokemon | null)[]
  const idx = team.findIndex((p) => p && p.uid === pokemon.uid)
  uiStore.openPokemonDetail(pokemon, idx, idx > -1 ? 'team' : 'box')
}

function openItem(pokemon: Pokemon | null) {
  if (!pokemon) return
  const team = (gameStore.state.team || []) as (Pokemon | null)[]
  let idx = team.findIndex((p) => p && p.uid === pokemon.uid)
  if (idx > -1) {
    uiStore.toggleInventory('team', idx)
    return
  }
  const box = (gameStore.state.box || []) as (Pokemon | null)[]
  idx = box.findIndex((p) => p && p.uid === pokemon.uid)
  if (idx > -1) {
    uiStore.toggleInventory('box', idx)
  }
}

function sendToBox(pokemon: Pokemon | null) {
  if (!pokemon) return
  const team = (gameStore.state.team || []) as (Pokemon | null)[]
  const idx = team.findIndex((p) => p && p.uid === pokemon.uid)
  if (idx > -1) {
    gameStore.sendToBox(idx)
  }
}

function selectPvp(slotIndex: number) {
  const pvpTeam = (gameStore.state.pvpTeam || []) as string[]
  const allPokes = [...((gameStore.state.team || []) as (Pokemon | null)[]), ...((gameStore.state.box || []) as (Pokemon | null)[])]
  const available = allPokes.filter((p): p is Pokemon => p !== null && !pvpTeam.includes(p.uid))
  
  if (available.length === 0) {
    uiStore.notify('No tienes más Pokémon disponibles para asignar al equipo PVP.', '⚠️')
    return
  }

  uiStore.open('PokemonSelection', {
    title: 'SELECCIONAR POKÉMON',
    subtitle: 'Elige un Pokémon para tu equipo de combate.',
    excludeUids: pvpTeam,
    callbackConfirm: (selected: Pokemon[]) => {
      if (selected && selected.length > 0 && selected[0]) {
        gameStore.swapPvpSlot(slotIndex, selected[0].uid)
      }
    }
  })
}

function selectWar(slotIndex: number) {
  const warTeam = (gameStore.state.warTeam || []) as string[]
  const allPokes = [...((gameStore.state.team || []) as (Pokemon | null)[]), ...((gameStore.state.box || []) as (Pokemon | null)[])]
  const available = allPokes.filter((p): p is Pokemon => p !== null && !warTeam.includes(p.uid))
  
  if (available.length === 0) {
    uiStore.notify('No tienes más Pokémon disponibles para asignar al equipo de Guerra.', '⚠️')
    return
  }

  uiStore.open('PokemonSelection', {
    title: 'SELECCIONAR POKÉMON',
    subtitle: 'Elige un Pokémon para tu equipo de guerra.',
    excludeUids: warTeam,
    callbackConfirm: (selected: Pokemon[]) => {
      if (selected && selected.length > 0 && selected[0]) {
        gameStore.swapWarSlot(slotIndex, selected[0].uid)
      }
    }
  })
}

function selectAdventure(_slotIndex: number) {
  const currentTeamUids = (gameStore.state.team || []).map((p: Pokemon | null) => p?.uid).filter(Boolean) as string[]
  
  uiStore.open('PokemonSelection', {
    title: 'SELECCIONAR POKÉMON',
    subtitle: 'Selecciona un Pokémon de tu caja para añadir al equipo.',
    excludeUids: currentTeamUids,
    includeTeam: false,
    callbackConfirm: (selected: Pokemon[]) => {
      if (selected && selected.length > 0) {
        const selectedPoke = selected[0]
        if (!selectedPoke) return
        
        const box = (gameStore.state.box || []) as (Pokemon | null)[]
        const boxIdx = box.findIndex((p) => p && p.uid === selectedPoke.uid)
        
        if (boxIdx > -1) {
          const boxStore = useBoxStore()
          const team = (gameStore.state.team || []) as (Pokemon | null)[]
          const currentTeamPoke = team[_slotIndex]
          
          if (currentTeamPoke) {
            boxStore.swapBoxWithTeam(boxIdx, _slotIndex)
          } else {
            boxStore.moveBoxToTeam(boxIdx)
          }
        } else {
          const team = (gameStore.state.team || []) as (Pokemon | null)[]
          const teamIdx = team.findIndex((p) => p && p.uid === selectedPoke.uid)
          if (teamIdx > -1) {
            uiStore.notify('Este Pokémon ya está en tu equipo.', '⚠️')
          }
        }
      }
    }
  })
}
</script>

<template>
  <BaseModal
    show
    header-background="transparent"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '940px'"
    padding="standard"
    @close="uiStore.toggleTeamManagement"
  >
    <template #header>
      <div class="team-header-tabs">
        <PVTooltip 
          title="EQUIPO DE AVENTURA"
          description="Tu equipo principal para viajar por el mapa y enfrentarte a gimnasios."
          position="top"
        >
          <button 
            class="tm-tab" 
            :class="{ active: activeTab === 'adventure' }"
            @click.stop="activeTab = 'adventure'"
          >
            <span class="icon">🎒</span>
            AVENTURA
            <span class="tab-count">{{ adventureCount }}/6</span>
          </button>
        </PVTooltip>

        <PVTooltip 
          title="EQUIPO COMPETITIVO (PVP)"
          description="El equipo que utilizas en la Arena para subir de rango y ganar recompensas."
          position="top"
        >
          <button 
            class="tm-tab" 
            :class="{ active: activeTab === 'pvp' }"
            @click.stop="activeTab = 'pvp'"
          >
            <span class="icon">⚔️</span>
            PVP
            <span class="tab-count">{{ pvpCount }}/3</span>
          </button>
        </PVTooltip>

        <PVTooltip 
          title="EQUIPO DE GUERRA"
          description="Pokémon asignados para defender y atacar en eventos de Facciones."
          position="top"
        >
          <button 
            class="tm-tab" 
            :class="{ active: activeTab === 'war' }"
            @click.stop="activeTab = 'war'"
          >
            <span class="icon">🛡️</span>
            GUERRA
            <span class="tab-count">{{ warCount }}/{{ maxWarSlots }}</span>
          </button>
        </PVTooltip>
      </div>
    </template>

    <!-- ADVENTURE SECTION -->
    <section
      v-if="activeTab === 'adventure'"
      class="tm-section-container"
    >
      <div class="slots-grid">
        <UnifiedTeamSlot
          v-for="(p, i) in adventureTeam"
          :key="'adv-' + i"
          :pokemon="p"
          :index="i"
          :is-dragging-any="isDragging"
          :is-touch-over="touchOverIndex === i"
          @open-detail="openDetail(p)"
          @open-item="openItem(p)"
          @send-to-box="sendToBox(p)"
          @select="selectAdventure"
          @drag-start="handleDragStart"
          @drag-over="(idx) => touchOverIndex = idx"
          @drag-end="handleDragEnd"
          @drop-pokemon="handleDrop"
        />
      </div>
    </section>

    <!-- PVP SECTION -->
    <section
      v-if="activeTab === 'pvp'"
      class="tm-section-container"
    >
      <div class="slots-grid">
        <UnifiedTeamSlot
          v-for="(p, i) in pvpTeam"
          :key="'pvp-' + i"
          :pokemon="p"
          :index="i"
          :is-dragging-any="isDragging"
          :is-touch-over="touchOverIndex === i"
          is-pvp
          @open-detail="openDetail(p)"
          @open-item="openItem(p)"
          @select="selectPvp(i)"
          @drag-start="handleDragStart"
          @drag-over="(idx) => touchOverIndex = idx"
          @drag-end="handleDragEnd"
          @drop-pokemon="handleDrop"
        />
      </div>
    </section>

    <!-- WAR SECTION -->
    <section
      v-if="activeTab === 'war'"
      class="tm-section-container"
    >
      <div class="slots-grid">
        <UnifiedTeamSlot
          v-for="(p, i) in warTeam"
          :key="'war-' + i"
          :pokemon="p"
          :index="i"
          :is-dragging-any="isDragging"
          :is-touch-over="touchOverIndex === i"
          is-pvp
          @open-detail="openDetail(p)"
          @open-item="openItem(p)"
          @select="selectWar(i)"
          @drag-start="handleDragStart"
          @drag-over="(idx) => touchOverIndex = idx"
          @drag-end="handleDragEnd"
          @drop-pokemon="handleDrop"
        />
      </div>
    </section>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.team-header-tabs {
  display: flex;
  gap: 12px;
  margin-left: 0;
  padding: 4px 0;
  overflow-x: auto;
  flex: 1;
  min-width: 0;
  -webkit-overflow-scrolling: touch;
  

  @media (max-width: 600px) {
    gap: 8px;
    padding-right: 40px; // Space for close button
  }
}

.tm-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: var(--gray);
  cursor: pointer;
  @include pixelated;
  font-size: 8px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all .2s;
  letter-spacing: 1px;
  position: relative;

  .icon { font-size: 14px; }

  .tab-count {
    margin-left: 4px;
    font-size: 7px;
    opacity: 0.6;
    background: Rgba(0, 0, 0, 0.2);
    padding: 2px 4px;
    border-radius: 4px;
  }

  &.active {
    background: Rgba(255, 255, 255, 0.08);
    border-color: var(--blue);
    color: var(--blue);
    box-shadow: 0 0 15px Rgba(10, 132, 255, 0.15);

    .tab-count {
      opacity: 1;
      color: var(--white);
      background: Rgba(10, 132, 255, 0.1);
    }
  }

  &:hover:not(.active) {
    background: Rgba(255, 255, 255, 0.1);
    color: var(--white);
  }
}

.tm-section-container {
  animation: fadeIn 0.3s ease-out;
  background: none !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

.slots-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, 1fr);
  
  @media (max-width: 850px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: Translatey(4px); }
  to { opacity: 1; transform: Translatey(0); }
}

:deep(.modal-header-premium) {
  border-bottom: none !important;
  padding: 12px 16px !important;
}

:deep(.modal-content-premium) {
  background: Rgba(15, 23, 42, 0.95) !important;
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(25px);
  backdrop-filter: Blur(25px);
  @include gpu-layer;
}

:deep(.modal-scrollable-content) {
  padding: 15px !important;
}
</style>