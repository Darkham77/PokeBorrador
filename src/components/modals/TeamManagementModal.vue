<script setup>
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBoxStore } from '@/stores/box'
import BaseModal from '@/components/common/BaseModal.vue'
import UnifiedTeamSlot from '@/components/team/UnifiedTeamSlot.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()

const activeTab = ref('adventure') // 'adventure', 'pvp', 'war'

const adventureTeam = computed(() => {
  const team = gameStore.state.team || []
  const slots = []
  for (let i = 0; i < 6; i++) {
    slots.push(team[i] || null)
  }
  return slots
})

const pvpTeam = computed(() => {
  const pvpUids = gameStore.state.pvpTeam || []
  const allPokes = [...gameStore.state.team, ...(gameStore.state.box || [])]
  const slots = []
  for (let i = 0; i < 3; i++) {
    const uid = pvpUids[i]
    slots.push(allPokes.find(p => p.uid === uid) || null)
  }
  return slots
})

const warTeam = computed(() => {
  const warUids = gameStore.state.warTeam || []
  const maxSlots = gameStore.state.warSlots || 6
  const allPokes = [...gameStore.state.team, ...(gameStore.state.box || [])]
  const slots = []
  for (let i = 0; i < maxSlots; i++) {
    const uid = warUids[i]
    slots.push(allPokes.find(p => p.uid === uid) || null)
  }
  return slots
})

// Counts for tabs
const adventureCount = computed(() => gameStore.state.team.filter(Boolean).length)
const pvpCount = computed(() => (gameStore.state.pvpTeam || []).length)
const warCount = computed(() => (gameStore.state.warTeam || []).length)
const maxWarSlots = computed(() => gameStore.state.warSlots || 6)

function openDetail(pokemon) {
  if (!pokemon) return
  const idx = gameStore.state.team.findIndex(p => p.uid === pokemon.uid)
  uiStore.openPokemonDetail(pokemon, idx, idx > -1 ? 'team' : 'box')
}

function openItem(pokemon) {
  if (!pokemon) return
  // Try to find in team first
  let idx = gameStore.state.team.findIndex(p => p && p.uid === pokemon.uid)
  if (idx > -1) {
    uiStore.toggleInventory('team', idx)
    return
  }
  // Fallback to box (for PVP/WAR slots that might be in box)
  idx = gameStore.state.box.findIndex(p => p && p.uid === pokemon.uid)
  if (idx > -1) {
    uiStore.toggleInventory('box', idx)
  }
}

function sendToBox(pokemon) {
  if (!pokemon) return
  const idx = gameStore.state.team.findIndex(p => p.uid === pokemon.uid)
  if (idx > -1) {
    gameStore.sendToBox(idx)
  }
}

function selectPvp(slotIndex) {
  const pvpTeam = gameStore.state.pvpTeam || []
  const allPokes = [...gameStore.state.team, ...(gameStore.state.box || [])]
  const available = allPokes.filter(p => p && !pvpTeam.includes(p.uid))
  
  if (available.length === 0) {
    uiStore.notify('No tienes más Pokémon disponibles para asignar al equipo PVP.', '⚠️')
    return
  }

  uiStore.open('PokemonSelection', {
    title: 'SELECCIONAR POKÉMON',
    subtitle: 'Elige un Pokémon para tu equipo de combate.',
    excludeUids: pvpTeam,
    callbackConfirm: (selected) => {
      if (selected && selected.length > 0) {
        gameStore.swapPvpSlot(slotIndex, selected[0].uid)
      }
    }
  })
}

function selectWar(slotIndex) {
  const warTeam = gameStore.state.warTeam || []
  const allPokes = [...gameStore.state.team, ...(gameStore.state.box || [])]
  const available = allPokes.filter(p => p && !warTeam.includes(p.uid))
  
  if (available.length === 0) {
    uiStore.notify('No tienes más Pokémon disponibles para asignar al equipo de Guerra.', '⚠️')
    return
  }

  uiStore.open('PokemonSelection', {
    title: 'SELECCIONAR POKÉMON',
    subtitle: 'Elige un Pokémon para tu equipo de guerra.',
    excludeUids: warTeam,
    callbackConfirm: (selected) => {
      if (selected && selected.length > 0) {
        gameStore.swapWarSlot(slotIndex, selected[0].uid)
      }
    }
  })
}

function selectAdventure(_slotIndex) {
  const currentTeamUids = gameStore.state.team.map(p => p?.uid).filter(Boolean)
  
  uiStore.open('PokemonSelection', {
    title: 'SELECCIONAR POKÉMON',
    subtitle: 'Selecciona un Pokémon de tu caja para añadir al equipo.',
    excludeUids: currentTeamUids,
    includeTeam: false,
    callbackConfirm: (selected) => {
      if (selected && selected.length > 0) {
        const selectedPoke = selected[0]
        
        const boxIdx = gameStore.state.box.findIndex(p => p && p.uid === selectedPoke.uid)
        
        if (boxIdx > -1) {
          const boxStore = useBoxStore()
          const currentTeamPoke = gameStore.state.team[_slotIndex]
          
          if (currentTeamPoke) {
            boxStore.swapBoxWithTeam(boxIdx, _slotIndex)
          } else {
            boxStore.moveBoxToTeam(boxIdx)
          }
        } else {
          const teamIdx = gameStore.state.team.findIndex(p => p && p.uid === selectedPoke.uid)
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
    max-width="940px"
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
          @open-detail="openDetail(p)"
          @open-item="openItem(p)"
          @send-to-box="sendToBox(p)"
          @select="selectAdventure"
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
          is-pvp
          @open-detail="openDetail(p)"
          @open-item="openItem(p)"
          @select="selectPvp(i)"
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
          is-pvp
          @open-detail="openDetail(p)"
          @open-item="openItem(p)"
          @select="selectWar(i)"
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
  margin-left: 20px;
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
    border-color: var(--yellow);
    color: var(--yellow);
    box-shadow: 0 0 15px Rgba(255, 214, 10, 0.15);

    .tab-count {
      opacity: 1;
      color: var(--white);
      background: Rgba(255, 214, 10, 0.1);
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
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

:deep(.modal-header-premium) {
  border-bottom: none !important;
  padding-bottom: 0 !important;
}

:deep(.modal-content-premium) {
  background: Rgba(15, 23, 42, 0.95) !important;
  -webkit-backdrop-filter: Blur(25px) !important;
  backdrop-filter: Blur(25px) !important;
}

:deep(.modal-scrollable-content) {
  padding: 15px !important;
}
</style>
