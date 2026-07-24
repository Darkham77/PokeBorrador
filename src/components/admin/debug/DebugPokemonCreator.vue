<script setup lang="ts">
import { computed } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import PokemonBaseStats from './PokemonBaseStats.vue'
import PokemonIVEditor from './PokemonIVEditor.vue'
import PokemonMovePicker from './PokemonMovePicker.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import PokemonPreview from './PokemonPreview.vue'
import DebugSearchSelect from './DebugSearchSelect.vue'
import { useDebugPokemonCreator } from './useDebugPokemonCreator'
import { MAX_POKEMON_LEVEL } from '@/data/system/constants'

const {
  config,
  selectedMinigame,
  allSpecies,
  allNatures,
  allAbilities,
  filteredMaps,
  speciesMoves,
  baseStats,
  selectSpecies,
  autoFillMoves,
  randomFillMoves,
  randomizeBase,
  randomizeSpecies,
  randomizeLevel,
  randomizeNature,
  randomizeAbility,
  randomizeIVs,
  randomizeVisuals,
  randomizeExtras,
  randomizeNickname,
  randomizeMinigame,
  randomizeOrigin,
  handleRandomize
} = useDebugPokemonCreator()

async function executeAction(protocol: string) {
  if (!window.__VITE_DEBUG__) return
  
  config.value.protocol = protocol
  if (protocol === 'encounter') {
    await window.__VITE_DEBUG__.spawnEncounter?.(config.value)
  } else {
    await window.__VITE_DEBUG__.createPokemon?.(config.value)
  }
}

const currentSprite = computed(() => pokemonDataProvider.getSpriteUrl(config.value.id, config.value.isShiny))
</script>

<template>
  <div
    ref="creatorRef"
    class="pokemon-debug-creator"
  >
    <div class="debug-header-row">
      <h3 class="debug-section-title">
        LABORATORIO POKÉMON (ADMIN)
      </h3>
      <button 
        class="btn-vicio-secondary sm" 
        @click.stop="handleRandomize"
      >
        🎲 ALEATORIO
      </button>
    </div>
    
    <div class="creator-grid">
      <!-- Left: Species & Stats -->
      <div class="creator-section">
        <div class="section-header-row">
          <h4>BASE & ATRIBUTOS</h4>
          <div class="header-actions">
            <PVTooltip
              title="Aleatorizar Base y Atributos"
              description="Selecciona especie, nivel, IVs, naturaleza y habilidad al azar."
            >
              <button
                class="btn-magic-fill btn-random-fill lg"
                @click.stop="randomizeBase"
              >
                🎲
              </button>
            </PVTooltip>
          </div>
        </div>
        
        <!-- Species Search -->
        <DebugSearchSelect
          v-model="config.id"
          label="ESPECIE"
          :options="allSpecies"
          tooltip-title="Buscador de especies"
          tooltip-desc="Busca y selecciona la especie base del Pokémon."
          @select="selectSpecies"
        >
          <template #label-action>
            <PVTooltip
              title="Especie al azar"
              description="Selecciona una especie Pokémon aleatoria."
            >
              <button
                class="btn-magic-fill btn-random-fill"
                @click.stop="randomizeSpecies"
              >
                🎲
              </button>
            </PVTooltip>
          </template>
        </DebugSearchSelect>

        <div class="debug-input-group">
          <div
            class="label-row"
            style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
          >
            <label>NIVEL (1-{{ MAX_POKEMON_LEVEL }})</label>
            <PVTooltip
              title="Nivel al azar"
              :description="`Asigna un nivel aleatorio entre 1 y ${MAX_POKEMON_LEVEL}.`"
            >
              <button
                class="btn-magic-fill btn-random-fill"
                @click.stop="randomizeLevel"
              >
                🎲
              </button>
            </PVTooltip>
          </div>
          <PVTooltip
            title="Nivel del Pokémon"
            :description="`Ajusta el nivel del Pokémon (entre 1 y ${MAX_POKEMON_LEVEL}).`"
          >
            <input
              id="debug-input-level"
              v-model.number="config.level"
              type="number"
              min="1"
              :max="MAX_POKEMON_LEVEL"
            >
          </PVTooltip>
        </div>

        <PokemonBaseStats :stats="baseStats" />
          
        <div class="debug-input-group">
          <div
            class="label-row"
            style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
          >
            <label>VALORES INDIVIDUALES (IVS)</label>
            <PVTooltip
              title="IVs al azar"
              description="Genera valores de genética individuales (0-31) al azar para cada estadística."
            >
              <button
                class="btn-magic-fill btn-random-fill"
                @click.stop="randomizeIVs"
              >
                🎲
              </button>
            </PVTooltip>
          </div>
          <PokemonIVEditor 
            :ivs="config.ivs as unknown as Record<string, number>" 
            @update:iv="(stat: string, val: number) => (config.ivs)[stat] = val" 
          />
        </div>

        <!-- Nature & Ability -->
        <DebugSearchSelect
          v-model="config.nature"
          label="NATURALEZA"
          :options="allNatures"
          tooltip-title="Naturaleza"
          tooltip-desc="Modificadores de estadísticas basados en la personalidad."
        >
          <template #label-action>
            <PVTooltip
              title="Naturaleza al azar"
              description="Asigna una personalidad/naturaleza aleatoria."
            >
              <button
                class="btn-magic-fill btn-random-fill"
                @click.stop="randomizeNature"
              >
                🎲
              </button>
            </PVTooltip>
          </template>
        </DebugSearchSelect>

        <DebugSearchSelect
          v-model="config.ability"
          label="HABILIDAD"
          :options="allAbilities"
          tooltip-title="Habilidad"
          tooltip-desc="Capacidad especial pasiva de esta especie."
        >
          <template #label-action>
            <PVTooltip
              title="Habilidad al azar"
              description="Asigna una habilidad aleatoria disponible para esta especie."
            >
              <button
                class="btn-magic-fill btn-random-fill"
                @click.stop="randomizeAbility"
              >
                🎲
              </button>
            </PVTooltip>
          </template>
        </DebugSearchSelect>
      </div>

      <!-- Right: Preview & Moves -->
      <div class="creator-section">
        <div class="section-header-row">
          <h4>VISUALIZACIÓN & ATAQUES</h4>
          <div class="header-actions">
            <PVTooltip
              title="Aleatorizar Aspecto Visual"
              description="Aleatoriza género, variocolor (shiny) y estado guardián."
            >
              <button
                class="btn-magic-fill btn-random-fill lg"
                @click.stop="randomizeVisuals"
              >
                🎲
              </button>
            </PVTooltip>
          </div>
        </div>
        
        <PokemonPreview
          :sprite-url="currentSprite"
          :is-shiny="config.isShiny"
          :is-guardian="config.isGuardian"
          :gender="config.gender"
          @toggle-shiny="config.isShiny = !config.isShiny"
          @toggle-guardian="config.isGuardian = !config.isGuardian"
          @toggle-gender="config.gender = config.gender === 'M' ? 'F' : 'M'"
        />

        <PokemonMovePicker 
          v-model="config.moves"
          :species-moves="speciesMoves"
          @auto-fill="autoFillMoves"
          @random-fill="randomFillMoves"
        />

        <button 
          class="btn-vicio-secondary sm"
          style="margin-top: 12px; margin-bottom: 4px;"
          @click.stop="handleRandomize"
        >
          🎲 ALEATORIO
        </button>
      </div>

      <!-- Bottom/Right: Extras & Action -->
      <div class="creator-section">
        <div class="section-header-row">
          <h4>EXTRAS & ACCIONES</h4>
          <div class="header-actions">
            <PVTooltip
              title="Aleatorizar Extras"
              description="Genera origen de ruta y amistad al azar, y limpia el apodo."
            >
              <button
                class="btn-magic-fill btn-random-fill lg"
                @click.stop="randomizeExtras"
              >
                🎲
              </button>
            </PVTooltip>
          </div>
        </div>
      
        <div class="debug-input-group">
          <div
            class="label-row"
            style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
          >
            <label>APODO (NICKNAME)</label>
            <PVTooltip
              title="Apodo al azar"
              description="Asigna un apodo aleatorio o limpia el campo."
            >
              <button
                class="btn-magic-fill btn-random-fill"
                @click.stop="randomizeNickname"
              >
                🎲
              </button>
            </PVTooltip>
          </div>
          <PVTooltip
            title="Apodo"
            description="Asigna un nombre personalizado al Pokémon."
          >
            <input
              id="debug-input-nickname"
              v-model="config.nickname"
              type="text"
              placeholder="SIN APODO"
            >
          </PVTooltip>
        </div>
      
        <div class="debug-input-group">
          <div
            class="label-row"
            style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
          >
            <label>MINIJUEGO</label>
            <PVTooltip
              title="Minijuego al azar"
              description="Selecciona de forma aleatoria el minijuego de captura."
            >
              <button
                class="btn-magic-fill btn-random-fill"
                @click.stop="randomizeMinigame"
              >
                🎲
              </button>
            </PVTooltip>
          </div>
          <PVTooltip
            title="Minijuego"
            description="Selecciona el minijuego de captura para testear."
          >
            <select
              v-model="selectedMinigame"
              class="debug-select-standard"
            >
              <option value="fishing">
                🎣 PESCA
              </option>
              <option value="archaeology">
                ⛏️ ARQUEOLOGÍA
              </option>
            </select>
          </PVTooltip>
        </div>
      
        <!-- Origin Route Dropdown -->
        <DebugSearchSelect
          v-model="config.mapId"
          label="ORIGEN"
          :options="filteredMaps"
          tooltip-title="Ruta de origen"
          tooltip-desc="Lugar donde se registrará que fue encontrado el Pokémon."
        >
          <template #label-action>
            <PVTooltip
              title="Origen al azar"
              description="Asigna una ruta de origen aleatoria."
            >
              <button
                class="btn-magic-fill btn-random-fill"
                @click.stop="randomizeOrigin"
              >
                🎲
              </button>
            </PVTooltip>
          </template>
        </DebugSearchSelect>
      </div>
    </div>

    <!-- Footer: Protocols -->
    <div class="creator-footer">
      <div class="action-buttons">
        <PVTooltip
          title="Atrapar ahora"
          description="Añade el Pokémon directamente a tu equipo o PC."
        >
          <button
            id="debug-btn-catch"
            class="btn-vicio-primary"
            @click.stop="executeAction('catch')"
          >
            ATRAPAR
          </button>
        </PVTooltip>
          
        <PVTooltip
          title="Iniciar minijuego de captura"
          description="Inicia la secuencia y el minijuego de captura seleccionado."
        >
          <button
            class="btn-vicio-success"
            @click.stop="executeAction(selectedMinigame + '_minigame')"
          >
            MINIJUEGO
          </button>
        </PVTooltip>
          
        <PVTooltip
          title="Añadir huevo listo (1 paso)"
          description="Genera un huevo en tu mochila que eclosionará al dar el siguiente paso."
        >
          <button
            class="btn-vicio-primary secondary"
            @click.stop="executeAction('egg_silent')"
          >
            CAMINAR HUEVO
          </button>
        </PVTooltip>
          
        <PVTooltip
          title="Añadir huevo con animación"
          description="Genera un huevo que iniciará la secuencia de eclosión."
        >
          <button
            class="btn-vicio-primary secondary"
            @click.stop="executeAction('egg_anim')"
          >
            HUEVO ANIM.
          </button>
        </PVTooltip>

        <PVTooltip
          title="Añadir huevo al almacén"
          description="Genera un huevo directamente en el almacén de la guardería (sin tener que caminar)."
        >
          <button
            class="btn-vicio-primary secondary"
            @click.stop="executeAction('egg_warehouse')"
          >
            HUEVO ALMACÉN
          </button>
        </PVTooltip>
          
        <PVTooltip
          title="Iniciar encuentro"
          description="Genera un encuentro salvaje con este Pokémon."
        >
          <button
            id="debug-btn-encounter"
            class="btn-vicio-danger"
            @click.stop="executeAction('encounter')"
          >
            ENCONTRAR
          </button>
        </PVTooltip>
      </div>
    </div>
  </div>
</template>
