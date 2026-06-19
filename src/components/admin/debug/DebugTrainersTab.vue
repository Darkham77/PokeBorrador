<script setup lang="ts">
import { onMounted } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getAssetUrl, ASSET_TYPES, POKEMON_SPRITE_IDS } from '@/logic/services/assetService'
import IndividualPokemonEditor from './IndividualPokemonEditor.vue'
import { useDebugTrainers, ARCHETYPE_PRESETS } from './useDebugTrainers'

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
  startCombat,
  availableSpriteList
} = useDebugTrainers()

function handleSpriteError(e: Event, id: string, isShiny = false) {
  const target = e.target as HTMLImageElement
  const num = (POKEMON_SPRITE_IDS as Record<string, number | string>)[id.toLowerCase()] || 1
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
        class="battle-start-btn-debug"
        style="width: 100%; height: 36px; font-weight: bold;"
        @click.stop="startCombat"
      >
        ⚔️ INICIAR COMBATE
      </button>
    </div>



    <!-- Section 1: Generation Settings -->
    <div class="debug-card">
      <label>GENERACIÓN RÁPIDA DE EQUIPO</label>

      <div class="gen-params-grid">
        <div class="input-group vertical">
          <span class="field-label">Cant. Pokes</span>
          <input 
            v-model.number="genTeamSize" 
            type="number" 
            min="1" 
            max="6"
          >
        </div>

        <div class="input-group vertical">
          <span class="field-label">¿Forzar Shiny?</span>
          <select v-model="genForceShiny">
            <option :value="false">
              No (5% azar)
            </option>
            <option :value="true">
              Sí (100% Shiny)
            </option>
          </select>
        </div>

        <div class="input-group vertical">
          <span class="field-label">¿Forzar Guardián?</span>
          <select v-model="genGuardianProb">
            <option :value="0.01">
              No (1% azar)
            </option>
            <option :value="0.1">
              10% azar
            </option>
            <option :value="0.25">
              25% azar
            </option>
            <option :value="0.5">
              50% azar
            </option>
            <option :value="1">
              Sí (100% Guardián)
            </option>
          </select>
        </div>

        <div class="input-group vertical">
          <span class="field-label">Nivel Mínimo</span>
          <input 
            v-model.number="genMinLevel" 
            type="number" 
            min="1" 
            max="100"
          >
        </div>

        <div class="input-group vertical">
          <span class="field-label">Nivel Máximo</span>
          <input 
            v-model.number="genMaxLevel" 
            type="number" 
            min="1" 
            max="100"
          >
        </div>

        <div
          class="input-group vertical"
          style="grid-column: span 2;"
        >
          <span class="field-label">Tema / Arquetipo (Preset)</span>
          <select v-model="selectedPreset">
            <option 
              v-for="p in ARCHETYPE_PRESETS" 
              :key="p.id" 
              :value="p.id"
            >
              {{ p.name }}
            </option>
          </select>
        </div>
      </div>

      <div
        class="button-row"
        style="margin-top: 12px;"
      >
        <button 
          class="btn-vicio-success sm"
          style="width: 100%; height: 32px;"
          @click.stop="generateRandomTeam"
        >
          🎲 GENERAR NUEVO EQUIPO AL AZAR
        </button>
      </div>
    </div>

    <div class="debug-divider" />

    <!-- Section 2: Trainer Meta -->
    <div class="debug-card">
      <div class="section-header-row flex-between">
        <label>DATOS DEL ENTRENADOR</label>
        <button 
          class="btn-vicio-secondary sm"
          @click.stop="randomizeTrainer"
        >
          🎲 ALEATORIO
        </button>
      </div>
      
      <div style="display: flex; gap: 12px; align-items: center; margin-top: 8px;">
        <div class="trainer-sprite-preview">
          <img 
            :src="getAssetUrl(ASSET_TYPES.TRAINER, trainerSprite)" 
            class="trainer-sprite-img"
            @error="(e: Event) => (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador')"
          >
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
          <div class="input-group vertical">
            <div
              class="label-row"
              style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
            >
              <span
                class="field-label"
                style="margin-bottom: 0;"
              >Nombre del Entrenador</span>
              <button
                class="btn-magic-fill btn-random-fill"
                @click.stop="randomizeTrainerName"
              >
                🎲
              </button>
            </div>
            <input 
              v-model="trainerName" 
              type="text" 
              placeholder="Nombre..."
            >
          </div>

          <div class="input-group vertical">
            <div
              class="label-row"
              style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
            >
              <span
                class="field-label"
                style="margin-bottom: 0;"
              >Sprite del Entrenador</span>
              <button
                class="btn-magic-fill btn-random-fill"
                @click.stop="randomizeTrainerSprite"
              >
                🎲
              </button>
            </div>
            <select v-model="trainerSprite">
              <option 
                v-for="s in availableSpriteList" 
                :key="s.id" 
                :value="s.id"
              >
                {{ s.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div
        class="input-group vertical"
        style="margin-top: 12px;"
      >
        <div class="label-row flex-between">
          <span class="field-label">Criminalidad (Team Rocket)</span>
          <span class="crime-pct danger-text">{{ criminality }}%</span>
        </div>
        <div
          v-if="isRocketClass"
          class="crime-sim-slider-row"
        >
          <input 
            v-model.number="criminality" 
            type="range" 
            min="0" 
            max="100"
            class="slider-crime"
          >
        </div>
        <div
          v-else
          class="crime-info-fallback"
        >
          <span>Requiere clase TEAM ROCKET activa para testear criminalidad.</span>
        </div>
      </div>

      <div
        class="button-row"
        style="margin-top: 12px;"
      >
        <button 
          class="btn-vicio-secondary sm"
          style="background: rgba(59, 139, 255, 0.15); border-color: rgba(59, 139, 255, 0.3); color: #5ea2ff;"
          @click.stop="loadPolicePreset"
        >
          🚨 CARGAR OFICIAL DE POLICÍA
        </button>
      </div>
    </div>

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
    <div class="debug-card">
      <label>INICIAR COMBATE</label>

      <div class="input-group vertical">
        <span class="field-label">Tipo de Encuentro</span>
        <div
          class="button-row"
          style="width: 100%; display: flex;"
        >
          <button 
            style="flex: 1;"
            :class="{ active: combatLocationType === 'map' }"
            @click.stop="combatLocationType = 'map'"
          >
            🗺️ RUTA / MAPA
          </button>
          <button 
            style="flex: 1;"
            :class="{ active: combatLocationType === 'gym' }"
            @click.stop="combatLocationType = 'gym'"
          >
            🏆 GIMNASIO
          </button>
        </div>
      </div>

      <div
        v-if="combatLocationType === 'map'"
        class="input-group vertical"
        style="margin-top: 10px;"
      >
        <span class="field-label">Seleccionar Ruta/Mapa</span>
        <select v-model="selectedMapId">
          <option 
            v-for="m in allMapsList" 
            :key="m.id" 
            :value="m.id"
          >
            {{ m.name }}
          </option>
        </select>
      </div>

      <div
        v-else
        class="gym-fields-flex"
        style="margin-top: 10px; display: flex; flex-direction: column; gap: 10px;"
      >
        <div class="input-group vertical">
          <span class="field-label">Líder / Gimnasio</span>
          <select v-model="selectedGymId">
            <option 
              v-for="g in gymList" 
              :key="g.id" 
              :value="g.id"
            >
              {{ g.name }} ({{ g.leader }})
            </option>
          </select>
        </div>

        <div class="input-group vertical">
          <span class="field-label">Dificultad</span>
          <div
            class="button-row"
            style="width: 100%; display: flex;"
          >
            <button 
              v-for="d in (['easy', 'normal', 'hard'] as const)" 
              :key="d"
              class="sim-diff-btn"
              style="flex: 1;"
              :class="{ active: gymDifficulty === d, [d]: true }"
              @click.stop="gymDifficulty = d"
            >
              {{ d.toUpperCase() }}
            </button>
          </div>
        </div>
      </div>

      <div
        style="margin-top: 16px;"
      >
        <button 
          class="battle-start-btn-debug"
          style="width: 100%; height: 34px; font-weight: bold;"
          @click.stop="startCombat"
        >
          ⚔️ INICIAR COMBATE
        </button>
      </div>
    </div>
  </div>
</template>

<style src="./DebugTrainersTab.styles.scss" scoped lang="scss"></style>

