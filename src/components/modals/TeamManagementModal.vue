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
  const allPokes = [...gameStore.state.team, ...(gameStore.state.box || [])]
  const available = allPokes.filter(p => p && !gameStore.state.pvpTeam.includes(p.uid))
  
  if (available.length === 0) {
    uiStore.notify('No tienes más Pokémon disponibles para asignar al equipo PVP.', '⚠️')
    return
  }

  uiStore.open('PokemonSelection', {
    title: 'SELECCIONAR PARA PVP',
    subtitle: 'Elige un Pokémon para tu equipo de combate.',
    excludeUids: gameStore.state.pvpTeam,
    callbackConfirm: (selected) => {
      if (selected && selected.length > 0) {
        gameStore.swapPvpSlot(slotIndex, selected[0].uid)
      }
    }
  })
}

function selectAdventure(_slotIndex) {
  uiStore.open('PokemonSelection', {
    title: 'RETIRAR POKÉMON',
    subtitle: 'Selecciona un Pokémon de tu caja para añadir al equipo.',
    callbackConfirm: (selected) => {
      if (selected && selected.length > 0) {
        const boxIdx = gameStore.state.box.findIndex(p => p && p.uid === selected[0].uid)
        if (boxIdx > -1) {
          const boxStore = useBoxStore()
          boxStore.moveBoxToTeam(boxIdx)
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
    max-width="1000px"
    padding="raw"
    @close="uiStore.toggleTeamManagement"
  >
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
            EQUIPO PVP / GUERRA
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
          * Tu equipo PVP se autocompleta con tus mejores Pokémon si hay espacios vacíos.
        </p>
      </section>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
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
      font-family: 'Press Start 2P', monospace;
      font-size: 12px;
      color: #fff;
      margin: 0;
    }

    .count, .badge {
      font-family: 'Press Start 2P', monospace;
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

.pvp-grid {
  grid-template-columns: repeat(3, 1fr);
  max-width: 800px;
  margin: 0 auto;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
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
    background: linear-gradient(90deg, transparent, #fff, transparent);
  }

  .diamond {
    width: 10px;
    height: 10px;
    background: #fff;
    transform: rotate(45deg);
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
</style>
