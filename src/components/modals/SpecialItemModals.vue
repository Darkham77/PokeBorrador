<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { NATURES } from '@/data/natures'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getSpriteUrl } from '@/logic/pokemonUtils'

const uiStore = useUIStore()
const gameStore = useGameStore()

// --- NATURE PATCH ---
const naturePokemon = computed(() => uiStore.activePokemonForNature)
const sortedNatures = [...NATURES].sort()

const handleApplyNature = (nature) => {
  if (!naturePokemon.value) return
  naturePokemon.value.nature = nature
  // Recalc stats is needed
  const { recalcPokemonStats } = require('@/logic/pokemonFactory')
  recalcPokemonStats(naturePokemon.value)
  
  uiStore.notify(`¡La naturaleza de ${naturePokemon.value.name} cambió a ${nature}!`, '✨')
  uiStore.isNaturePatchOpen = false
  uiStore.activePokemonForNature = null
  gameStore.save()
}

const getNatureInfo = (nature) => {
  const data = pokemonDataProvider.getNatureData(nature)
  if (!data || !data.up) return 'Sin cambios'
  return `+${data.up} / -${data.down}`
}

// --- PP UP ---
const ppPokemon = computed(() => uiStore.activePokemonForPPUp)

const handleApplyPPUp = (moveIndex) => {
  if (!ppPokemon.value) return
  const move = ppPokemon.value.moves[moveIndex]
  if (!move) return
  
  const moveData = pokemonDataProvider.getMoveData(move.name) || {}
  const basePP = moveData.pp || 35
  const maxPossible = Math.floor(basePP * 1.6) // PP Max limit
  
  if (move.maxPP >= maxPossible) {
    uiStore.notify('PP al máximo para este movimiento.', '⚠️')
    return
  }
  
  const increase = Math.floor(basePP * 0.2)
  move.maxPP = Math.min(maxPossible, move.maxPP + increase)
  move.pp = Math.min(move.maxPP, move.pp + increase)
  
  uiStore.notify(`¡Los PP de ${move.name} aumentaron!`, '📈')
  uiStore.isPPUpOpen = false
  uiStore.activePokemonForPPUp = null
  gameStore.save()
}

// --- ABILITY PILL ---
const abilityPokemon = computed(() => uiStore.activePokemonForAbility)
const availableAbilities = computed(() => {
  if (!abilityPokemon.value) return []
  return pokemonDataProvider.getSpeciesAbilities(abilityPokemon.value.id)
})

const handleApplyAbility = (ability) => {
  if (!abilityPokemon.value) return
  if (abilityPokemon.value.ability === ability) {
    uiStore.notify('Ya tiene esa habilidad.', '⚠️')
    return
  }
  
  const old = abilityPokemon.value.ability
  abilityPokemon.value.ability = ability
  uiStore.notify(`¡Habilidad cambiada: ${old} → ${ability}!`, '💊')
  uiStore.isAbilityPillOpen = false
  uiStore.activePokemonForAbility = null
  gameStore.save()
}

const closeAll = () => {
  uiStore.isNaturePatchOpen = false
  uiStore.isPPUpOpen = false
  uiStore.isAbilityPillOpen = false
}
</script>

<template>
  <div v-if="uiStore.isNaturePatchOpen || uiStore.isPPUpOpen || uiStore.isAbilityPillOpen" class="special-item-overlay" @click.self="closeAll">
    
    <!-- NATURE PATCH MODAL -->
    <div v-if="uiStore.isNaturePatchOpen && naturePokemon" class="modal-card animate-pop">
      <header>
        <h3>PARCHE DE NATURALEZA</h3>
        <p>Selecciona la nueva naturaleza para <strong>{{ naturePokemon.name }}</strong></p>
      </header>
      <div class="nature-grid scrollbar">
        <button 
          v-for="n in sortedNatures" 
          :key="n" 
          class="nature-btn"
          :class="{ active: naturePokemon.nature === n }"
          @click="handleApplyNature(n)"
        >
          <span class="n-name">{{ n }}</span>
          <span class="n-info">{{ getNatureInfo(n) }}</span>
        </button>
      </div>
      <footer>
        <button class="cancel-btn" @click="closeAll">CANCELAR</button>
      </footer>
    </div>

    <!-- PP UP MODAL -->
    <div v-if="uiStore.isPPUpOpen && ppPokemon" class="modal-card animate-pop">
      <header>
        <h3>SUBIDA DE PP</h3>
        <p>¿Qué movimiento de <strong>{{ ppPokemon.name }}</strong> quieres mejorar?</p>
      </header>
      <div class="move-list">
        <button 
          v-for="(m, i) in ppPokemon.moves" 
          :key="i" 
          class="move-btn"
          @click="handleApplyPPUp(i)"
        >
          <div class="m-main">
            <span class="m-name">{{ m.name }}</span>
            <span class="m-pp">{{ m.pp }}/{{ m.maxPP }} PP</span>
          </div>
          <div class="m-bar">
            <div class="m-fill" :style="{ width: (m.maxPP / (pokemonDataProvider.getMoveData(m.name)?.pp * 1.6 || 64) * 100) + '%' }" />
          </div>
        </button>
      </div>
      <footer>
        <button class="cancel-btn" @click="closeAll">CANCELAR</button>
      </footer>
    </div>

    <!-- ABILITY PILL MODAL -->
    <div v-if="uiStore.isAbilityPillOpen && abilityPokemon" class="modal-card animate-pop">
      <header>
        <h3>PÍLDORA DE HABILIDAD</h3>
        <p>Cambia la habilidad de <strong>{{ abilityPokemon.name }}</strong></p>
      </header>
      <div class="ability-list">
        <button 
          v-for="a in availableAbilities" 
          :key="a" 
          class="ability-btn"
          :class="{ active: abilityPokemon.ability === a }"
          @click="handleApplyAbility(a)"
        >
          <span class="a-name">{{ a }}</span>
          <span v-if="abilityPokemon.ability === a" class="a-current">(Actual)</span>
        </button>
        <p v-if="availableAbilities.length <= 1" class="no-options">
          Este Pokémon no tiene habilidades alternativas disponibles.
        </p>
      </div>
      <footer>
        <button class="cancel-btn" @click="closeAll">CANCELAR</button>
      </footer>
    </div>

  </div>
</template>

<style scoped lang="scss">
.special-item-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(8px);
  z-index: 11000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 400px;
  background: #151515;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  max-height: 80vh;

  header {
    text-align: center;
    margin-bottom: 20px;
    h3 { font-family: 'Press Start 2P', cursive; font-size: 12px; color: var(--yellow); margin-bottom: 10px; }
    p { font-size: 13px; color: var(--gray); }
  }
}

.nature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  overflow-y: auto;
  padding-right: 5px;
  margin-bottom: 20px;

  .nature-btn {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 12px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;

    &:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); }
    &.active { border-color: var(--yellow); background: rgba(255, 217, 61, 0.05); }

    .n-name { display: block; font-weight: 800; color: #fff; font-size: 14px; }
    .n-info { display: block; font-size: 10px; color: var(--gray); margin-top: 2px; }
  }
}

.move-list, .ability-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.move-btn, .ability-btn {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  color: #fff;

  &:hover { background: rgba(255,255,255,0.08); transform: translateX(4px); }
  &.active { border-color: var(--yellow); }

  .m-main { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .m-name { font-weight: 800; font-size: 15px; }
  .m-pp { font-size: 12px; color: var(--gray); }
  
  .m-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
  .m-fill { height: 100%; background: var(--blue); transition: width 0.3s; }
}

.ability-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .a-name { font-weight: 800; font-size: 15px; }
  .a-current { font-size: 10px; color: var(--yellow); font-family: 'Press Start 2P', cursive; }
}

.no-options { text-align: center; font-size: 12px; color: var(--gray); padding: 20px; }

.cancel-btn {
  width: 100%;
  padding: 14px;
  background: none;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: var(--gray);
  font-family: 'Press Start 2P', cursive;
  font-size: 9px;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.05); color: #fff; }
}

.scrollbar::-webkit-scrollbar { width: 4px; }
.scrollbar::-webkit-scrollbar-track { background: transparent; }
.scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

.animate-pop { animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
