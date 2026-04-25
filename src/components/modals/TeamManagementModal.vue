<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBoxStore } from '@/stores/box'
import BaseModal from '@/components/common/BaseModal.vue'
import UnifiedTeamSlot from '@/components/team/UnifiedTeamSlot.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()

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

function openDetail(pokemon) {
  if (!pokemon) return
  const idx = gameStore.state.team.findIndex(p => p.uid === pokemon.uid)
  uiStore.openPokemonDetail(pokemon, idx, idx > -1 ? 'team' : 'box')
}

function openItem(pokemon) {
  if (!pokemon) return
  const idx = gameStore.state.team.findIndex(p => p.uid === pokemon.uid)
  if (idx > -1 && typeof window.openTeamItemMenu === 'function') {
    window.openTeamItemMenu(idx)
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
    title="GESTIÓN DE EQUIPO"
    title-color="var(--yellow)"
    header-background="rgba(15, 23, 42, 0.8)"
    max-width="1000px"
    padding="raw"
    @close="uiStore.toggleTeamManagement"
  >
    <template #header-icon>
      <span class="header-team-icon">👥</span>
    </template>
    <div class="team-modal-content glass scrollbar">
      <!-- SUBTITLE (Optional inside if desired, or just remove header) -->

      <!-- ADVENTURE SECTION -->
      <section class="team-section adventure-section">
        <div class="section-header">
          <span class="section-icon">🎒</span>
          <h2 class="section-title">
            EQUIPO DE AVENTURA
          </h2>
          <span class="count">{{ gameStore.state.team.length }}/6</span>
        </div>
        
        <div class="slots-grid adventure-grid">
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

      <!-- DIVIDER -->
      <div class="panel-divider">
        <div class="line" />
        <div class="diamond" />
        <div class="line" />
      </div>

      <!-- PVP SECTION -->
      <section class="team-section pvp-section">
        <div class="section-header">
          <span class="section-icon">⚔️</span>
          <h2 class="section-title">
            EQUIPO COMPETITIVO
          </h2>
          <span class="badge">RANKED</span>
        </div>

        <div class="slots-grid pvp-grid">
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
        
        <p class="pvp-hint">
          * Tu equipo PVP/Ranked se autocompleta con tus mejores Pokémon.
        </p>
      </section>

      <!-- DIVIDER -->
      <div class="panel-divider">
        <div class="line" />
        <div class="diamond" />
        <div class="line" />
      </div>

      <!-- WAR SECTION -->
      <section class="team-section war-section">
        <div class="section-header">
          <span class="section-icon">🛡️</span>
          <h2 class="section-title">
            EQUIPO DE GUERRA
          </h2>
          <span class="badge war-badge">EVENTO</span>
        </div>

        <div class="slots-grid war-grid">
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
        
        <p class="pvp-hint">
          * Este equipo se utiliza exclusivamente en eventos de Guerra de Facciones.
        </p>
      </section>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.header-team-icon {
  font-size: 20px;
}

.team-modal-content {
  padding: 40px;
  max-height: 85vh;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.8);
}

.panel-intro {
  text-align: center;
  margin-bottom: 30px;

  .panel-subtitle {
    font-size: 13px;
    color: var(--gray);
    opacity: 0.8;
  }
}

.team-section {
  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;

    .section-icon { font-size: 24px; }
    
    .section-title {
      @include pixelated;
      font-size: 12px;
      color: $white;
      margin: 0;
    }

    .count, .badge {
      @include pixelated;
      font-size: 8px;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      color: var(--gray);
    }

    .badge {
      background: rgba(168, 85, 247, 0.1);
      color: var(--purple-light);
      border: 1px solid rgba(168, 85, 247, 0.2);
    }
  }
}

.slots-grid {
  display: grid;
  gap: 20px;
}

.adventure-grid {
  grid-template-columns: repeat(3, 1fr);
  
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.pvp-grid, .war-grid {
  grid-template-columns: repeat(3, 1fr);
  max-width: 800px;
  margin: 0 auto;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
}

.war-grid {
  // Can be adjusted if more than 6 slots are ever needed
  grid-template-columns: repeat(3, 1fr);
  
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.panel-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin: 50px 0;
  opacity: 0.3;

  .line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, $white, transparent);
  }

  .diamond {
    width: 10px;
    height: 10px;
    background: $white;
    transform: Rotate(45deg);
  }
}

.pvp-hint {
  text-align: center;
  margin-top: 24px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.2);
  font-style: italic;
}

.pvp-section {
  .section-title {
    color: var(--purple-light) !important;
  }
}

.war-section {
  .section-title {
    color: var(--red) !important;
  }
  
  .war-badge {
    background: rgba(239, 68, 68, 0.1);
    color: var(--red);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
}
</style>
