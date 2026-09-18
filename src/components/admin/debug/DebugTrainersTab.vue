<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { POKEMON_SPRITE_IDS } from '@/logic/services/assetService'
import IndividualPokemonEditor from './IndividualPokemonEditor.vue'
import DebugIllegalModal from './DebugIllegalModal.vue'
import DebugTrainerGenSettings from './DebugTrainerGenSettings.vue'
import DebugTrainerMetaCard from './DebugTrainerMetaCard.vue'
import DebugTrainerBattleLauncher from './DebugTrainerBattleLauncher.vue'
import { useDebugTrainers } from './useDebugTrainers.ts'

const emit = defineEmits<{
  close: []
}>()

const showIllegalModal = ref(false)
const illegalIssues = ref<string[]>([])

const {
  trainerName,
  trainerSprite,
  enemyTeam,
  selectedPokeIndex,
  selectedPreset,
  combatLocationType,
  selectedMapId,
  selectedGymId,
  gymDifficulty,
  genTeamSize,
  genMinLevel,
  genMaxLevel,
  genForceShiny,
  genGuardianProb,
  isRocketClass,
  criminality,
  allMapsList,
  gymList,
  activePoke,
  randomizeTrainer,
  randomizeTrainerName,
  randomizeTrainerSprite,
  generateRandomTeam,
  loadPolicePreset,
  addPokemonToTeam,
  removePokemonFromTeam,
  startCombat: startDebugCombat,
  validateTeamLegality,
  availableSpriteList
} = useDebugTrainers()

async function startCombat() {
  const validation = validateTeamLegality()
  if (!validation.valid) {
    illegalIssues.value = validation.issues
    showIllegalModal.value = true
    return
  }
  emit('close')
  await startDebugCombat()
}

function handleSpriteError(e: Event, id: string, isShiny = false) {
  const target = e.target as HTMLImageElement
  const num = (POKEMON_SPRITE_IDS as Record<string, number | string>)[id.toLowerCase()] || 1 // open-record: Generic key-value data dictionary container
  const folder = isShiny ? 'shiny/' : ''
  target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${folder}${num}.png`
}

function getPokeSpriteUrl(id: string, isShiny?: boolean) {
  return pokemonDataProvider.getSpriteUrl(id, isShiny)
}

onMounted(() => {
  generateRandomTeam()
})
</script>

<template>
  <div class="pokemon-debug-creator debug-grid trainer-debug-tab scrollbar">
    <!-- Acceso Rápido para Iniciar Combate -->
    <div
      class="debug-card"
      style="margin-bottom: -6px;"
    >
      <button 
        id="debug-battle-start-btn"
        class="battle-start-btn-debug"
        style="width: 100%; height: 36px; font-weight: bold;"
        @click.stop="startCombat"
      >
        <span class="emoji">⚔️</span> INICIAR COMBATE
      </button>
    </div>

    <!-- Section 1: Generation Settings -->
    <DebugTrainerGenSettings
      v-model:team-size="genTeamSize"
      v-model:force-shiny="genForceShiny"
      v-model:guardian-prob="genGuardianProb"
      v-model:min-level="genMinLevel"
      v-model:max-level="genMaxLevel"
      v-model:selected-preset="selectedPreset"
      @generate="generateRandomTeam"
    />

    <div class="debug-divider" />

    <!-- Section 2: Trainer Meta -->
    <DebugTrainerMetaCard
      v-model:trainer-name="trainerName"
      v-model:trainer-sprite="trainerSprite"
      v-model:criminality="criminality"
      :is-rocket-class="isRocketClass"
      :available-sprite-list="availableSpriteList"
      @randomize-trainer="randomizeTrainer"
      @randomize-name="randomizeTrainerName"
      @randomize-sprite="randomizeTrainerSprite"
      @load-police="loadPolicePreset"
    />

    <div class="debug-divider" />

    <!-- Section 3: Trainer Team Grid -->
    <div class="debug-card">
      <div class="section-header-row flex-between">
        <label>EQUIPO DEL ENTRENADOR ({{ enemyTeam.length }}/6)</label>
        <button 
          v-if="enemyTeam.length < 6" 
          class="btn-vicio-primary sm"
          @click.stop="addPokemonToTeam"
        >
          + AÑADIR POKÉMON
        </button>
      </div>

      <div class="team-grid-layout">
        <div 
          v-for="(p, index) in enemyTeam" 
          :key="index"
          class="team-poke-card"
          :class="{ active: selectedPokeIndex === index }"
          @click.stop="selectedPokeIndex = index"
        >
          <div class="card-top">
            <img 
              :src="getPokeSpriteUrl(p.id, p.isShiny)" 
              :alt="p.name || p.id"
              class="poke-sprite"
              @error="(e) => handleSpriteError(e, p.id, p.isShiny)"
            >
            <button 
              class="btn-delete-poke" 
              @click.stop="removePokemonFromTeam(index)"
            >
              ×
            </button>
          </div>
          <div class="card-info">
            <span class="name truncate">{{ p.name }}</span>
            <span class="level">Lv. {{ p.level }}</span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="activePoke && selectedPokeIndex !== null"
      class="debug-divider"
    />

    <!-- Section 4: Individual Pokemon Editor (Subcomponent) -->
    <IndividualPokemonEditor
      v-if="activePoke && selectedPokeIndex !== null"
      :pokemon="activePoke"
      :index="selectedPokeIndex"
    />

    <div class="debug-divider" />

    <!-- Section 5: Battle Launcher -->
    <DebugTrainerBattleLauncher
      v-model:combat-location-type="combatLocationType"
      v-model:selected-map-id="selectedMapId"
      v-model:selected-gym-id="selectedGymId"
      v-model:gym-difficulty="gymDifficulty"
      :all-maps-list="allMapsList"
      :gym-list="gymList"
      @start-combat="startCombat"
    />

    <!-- Modal de Advertencia de Ilegalidad -->
    <DebugIllegalModal
      v-if="showIllegalModal"
      emoji="⚠️"
      title="EQUIPO ILEGAL DETECTADO"
      description="No se puede iniciar el combate porque uno o más Pokémon del equipo incumplen las normas de legalidad del juego:"
      :issues="illegalIssues"
      @close="showIllegalModal = false"
    />
  </div>
</template>

<style src="./DebugTrainersTab.styles.scss" scoped lang="scss"></style>
