<script setup lang="ts">
import { computed, ref } from 'vue'
import gsap from 'gsap'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBoxStore } from '@/stores/box'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { getItemById } from '@/data/inventory/items'
import BaseModal from '@/components/common/BaseModal.vue'
import UnifiedTeamSlot from '@/components/team/UnifiedTeamSlot.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'

const MAX_ADVENTURE_SLOTS = 6
const MAX_PVP_SLOTS = 3
const DEFAULT_WAR_SLOTS = 6
const TAB_TRANSITION_Y_PX = 4
const TAB_TRANSITION_DURATION_SEC = 0.3

const gameStore = useGameStore()
const uiStore = useUIStore()

const ui = useUIStore()
const isSmallScreen = computed(() => ui.isSmallScreen)

const activeTab = ref('adventure') // 'adventure', 'pvp', 'war'

const adventureTeam = computed(() => {
  const team = gameStore.state.team || []
  const slots: (Pokemon | null)[] = []
  for (let i = 0; i < MAX_ADVENTURE_SLOTS; i++) {
    slots.push(team[i] || null)
  }
  return slots
})

const pvpTeam = computed(() => {
  const pvpUids = (gameStore.state.pvpTeam || []) as string[] // no-domain
  const allPokes = [...((gameStore.state.team || []) as (Pokemon | null)[]), ...((gameStore.state.box || []) as (Pokemon | null)[])].filter((p): p is Pokemon => p !== null)
  const slots: (Pokemon | null)[] = []
  for (let i = 0; i < MAX_PVP_SLOTS; i++) {
    const uid = pvpUids[i]
    slots.push(allPokes.find(p => p.uid === uid) || null)
  }
  return slots
})

const warTeam = computed(() => {
  const warUids = (gameStore.state.warTeam || []) as string[] // no-domain
  const maxSlots = gameStore.state.warSlots || DEFAULT_WAR_SLOTS
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
const maxWarSlots = computed(() => gameStore.state.warSlots || DEFAULT_WAR_SLOTS)

// Drag and Drop Logic
const draggedIndex = ref<number | null>(null)
const touchOverIndex = ref<number | null>(null)
const isDragging = ref(false)

function handleDragStart(index: number) {
  draggedIndex.value = index
  isDragging.value = true
}

function handleDragEnd() {
  isDragging.value = false
  draggedIndex.value = null
  touchOverIndex.value = null
}

function handleDrop(targetIndex: number) {
  const from = draggedIndex.value
  handleDragEnd()
  if (from === null || from === targetIndex) return
  handleDropDirect(from, targetIndex)
}

function handleDropDirect(fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return
  if (activeTab.value === 'adventure') {
    if (gameStore.state.team[fromIndex]) {
      gameStore.reorderTeam(fromIndex, toIndex)
    }
  } else if (activeTab.value === 'pvp') {
    gameStore.reorderPvpTeam(fromIndex, toIndex)
  } else if (activeTab.value === 'war') {
    gameStore.reorderWarTeam(fromIndex, toIndex)
  }
}

function handleSlotSelect(index: number) {
  if (activeTab.value === 'adventure') {
    if (!adventureTeam.value[index]) {
      selectAdventure(index)
    }
  } else if (activeTab.value === 'pvp') {
    if (!pvpTeam.value[index]) {
      selectPvp(index)
    }
  } else if (activeTab.value === 'war') {
    if (!warTeam.value[index]) {
      selectWar(index)
    }
  }
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

function unequipItem(pokemon: Pokemon | null) {
  if (!pokemon) return
  const inventoryStore = useInventoryStore()
  const team = (gameStore.state.team || []) as (Pokemon | null)[]
  let idx = team.findIndex((p) => p && p.uid === pokemon.uid)
  if (idx > -1) {
    const unequipped = inventoryStore.unequipItem('team', idx)
    if (unequipped) {
      const itemData = getItemById(unequipped)
      const displayName = itemData ? itemData.name : unequipped.toUpperCase().replace(/_/g, ' ')
      uiStore.notify(`¡Se ha quitado el objeto: ${displayName}!`, '🎒')
    }
    return
  }
  const box = (gameStore.state.box || []) as (Pokemon | null)[]
  idx = box.findIndex((p) => p && p.uid === pokemon.uid)
  if (idx > -1) {
    const unequipped = inventoryStore.unequipItem('box', idx)
    if (unequipped) {
      const itemData = getItemById(unequipped)
      const displayName = itemData ? itemData.name : unequipped.toUpperCase().replace(/_/g, ' ')
      uiStore.notify(`¡Se ha quitado el objeto: ${displayName}!`, '🎒')
    }
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
  const pvpTeam = (gameStore.state.pvpTeam || []) as string[] // no-domain
  const allPokes = [...((gameStore.state.team || []) as (Pokemon | null)[]), ...((gameStore.state.box || []) as (Pokemon | null)[])]
  const available = allPokes.filter((p): p is Pokemon => p !== null && !pvpTeam.includes(p.uid))
  
  if (available.length === 0) {
    uiStore.notify('No tienes más Pokémon disponibles para asignar al equipo PVP.', '⚠️')
    return
  }

  uiStore.open('PokemonSelection', {
    title: '⚡ SELECCIONAR POKÉMON',
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
  const warTeam = (gameStore.state.warTeam || []) as string[] // no-domain
  const allPokes = [...((gameStore.state.team || []) as (Pokemon | null)[]), ...((gameStore.state.box || []) as (Pokemon | null)[])]
  const available = allPokes.filter((p): p is Pokemon => p !== null && !warTeam.includes(p.uid))
  
  if (available.length === 0) {
    uiStore.notify('No tienes más Pokémon disponibles para asignar al equipo de Guerra.', '⚠️')
    return
  }

  uiStore.open('PokemonSelection', {
    title: '⚡ SELECCIONAR POKÉMON',
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
  const currentTeamUids = (gameStore.state.team || []).map((p: Pokemon | null) => p?.uid).filter(Boolean) as string[] // no-domain
  
  uiStore.open('PokemonSelection', {
    title: '⚡ SELECCIONAR POKÉMON',
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
            id="team-management-tab-adventure-btn"
            class="tm-tab" 
            :class="{ active: activeTab === 'adventure' }"
            @click="activeTab = 'adventure'"
          >
            <span class="emoji">🎒</span>
            <span>AVENTURA</span>
            <span class="tab-count">{{ adventureCount }}/6</span>
          </button>
        </PVTooltip>

        <PVTooltip 
          title="EQUIPO PVP"
          description="Selecciona tus 3 Pokémon para combates online contra otros jugadores."
          position="top"
        >
          <button 
            id="team-management-tab-pvp-btn"
            class="tm-tab" 
            :class="{ active: activeTab === 'pvp' }"
            @click="activeTab = 'pvp'"
          >
            <span class="emoji">⚔️</span>
            <span>PVP</span>
            <span class="tab-count">{{ pvpCount }}/3</span>
          </button>
        </PVTooltip>

        <PVTooltip 
          title="EQUIPO DE GUERRA"
          description="Tus Pokémon asignados para defender y atacar en Guerras de Clanes."
          position="top"
        >
          <button 
            id="team-management-tab-war-btn"
            class="tm-tab" 
            :class="{ active: activeTab === 'war' }"
            @click="activeTab = 'war'"
          >
            <span class="emoji">🛡️</span>
            <span>GUERRA</span>
            <span class="tab-count">{{ warCount }}/{{ maxWarSlots }}</span>
          </button>
        </PVTooltip>
      </div>
    </template>

    <!-- ADVENTURE SECTION -->
    <Transition
      :css="false"
      @enter="(el, done) => gsap.fromTo(el, { opacity: 0, y: TAB_TRANSITION_Y_PX }, { opacity: 1, y: 0, duration: TAB_TRANSITION_DURATION_SEC, ease: 'power2.out', onComplete: done })"
    >
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
            @unequip-item="unequipItem(p)"
            @send-to-box="sendToBox(p)"
            @select="handleSlotSelect"
            @drag-start="handleDragStart"
            @drag-over="(idx) => touchOverIndex = idx"
            @drag-end="handleDragEnd"
            @drop-pokemon="handleDrop"
          />
        </div>
      </section>
    </Transition>

    <!-- PVP SECTION -->
    <Transition
      :css="false"
      @enter="(el, done) => gsap.fromTo(el, { opacity: 0, y: TAB_TRANSITION_Y_PX }, { opacity: 1, y: 0, duration: TAB_TRANSITION_DURATION_SEC, ease: 'power2.out', onComplete: done })"
    >
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
            @unequip-item="unequipItem(p)"
            @select="handleSlotSelect"
            @drag-start="handleDragStart"
            @drag-over="(idx) => touchOverIndex = idx"
            @drag-end="handleDragEnd"
            @drop-pokemon="handleDrop"
          />
        </div>
      </section>
    </Transition>

    <!-- WAR SECTION -->
    <Transition
      :css="false"
      @enter="(el, done) => gsap.fromTo(el, { opacity: 0, y: TAB_TRANSITION_Y_PX }, { opacity: 1, y: 0, duration: TAB_TRANSITION_DURATION_SEC, ease: 'power2.out', onComplete: done })"
    >
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
            @unequip-item="unequipItem(p)"
            @select="handleSlotSelect"
            @drag-start="handleDragStart"
            @drag-over="(idx) => touchOverIndex = idx"
            @drag-end="handleDragEnd"
            @drop-pokemon="handleDrop"
          />
        </div>
      </section>
    </Transition>
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
  background: none !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 !important;
  overscroll-behavior: contain;
  overscroll-behavior-x: none;
}

.slots-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, 1fr);
  
  @media (max-width: 650px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 580px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
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
  @include gpu-layer;
  overscroll-behavior: contain;
  overscroll-behavior-x: none;
}

:deep(.modal-scrollable-content) {
  padding: 15px !important;
  overscroll-behavior: contain;
  overscroll-behavior-x: none;
}
</style>
