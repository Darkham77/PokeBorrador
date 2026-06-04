<script setup lang="ts">
// [PureVue-Ignore-Length]
import { ref, computed, onMounted, watch } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { generateRandomIVs } from '@/logic/pokemonUtils'
import { NATURE_DATA } from '@/data/natures'
import { ABILITY_DATA } from '@/data/abilities'
import PokemonBaseStats from './PokemonBaseStats.vue'
import PokemonIVEditor from './PokemonIVEditor.vue'
import PokemonMovePicker from './PokemonMovePicker.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import PokemonPreview from './PokemonPreview.vue'
import DebugSearchSelect from './DebugSearchSelect.vue'
import type { MapLocation } from '@/types/encounters'
import type { PokemonIVs } from '@/types/pokemon'

interface PokemonConfig {
  id: string
  level: number
  isShiny: boolean
  isGuardian: boolean
  nature: string
  ability: string
  gender: 'M' | 'F'
  nickname: string
  friendship: number
  heldItem: string
  mapId: string
  ivs: PokemonIVs
  moves: (string | null)[]
  protocol: string
}

interface SpeciesOption {
  id: string
  name: string
  icon?: string
}

interface MapOption {
  id: string
  name: string
}

// --- STATE ---
const config = ref<PokemonConfig>({
  id: 'bulbasaur',
  level: 5,
  isShiny: false,
  isGuardian: false,
  nature: 'Firme',
  ability: 'Espesura',
  gender: 'M',
  nickname: '',
  friendship: 70,
  heldItem: '',
  mapId: 'route_1',
  ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  moves: [],
  protocol: 'catch'
})

const allSpecies = computed<SpeciesOption[]>(() => {
  const db = pokemonDataProvider.getPokemonDb()
  return Object.keys(db).map(id => ({ 
    id, 
    name: db[id]?.name || id,
    icon: pokemonDataProvider.getSpriteUrl(id)
  }))
})

const allNatures = Object.keys(NATURE_DATA).map(n => ({ id: n, name: n }))

const allAbilities = Object.keys(ABILITY_DATA).map(a => ({ id: a, name: a }))

const selectedMinigame = ref<'fishing' | 'archaeology'>('fishing')

const allMaps = computed<MapOption[]>(() => {
  const maps = pokemonDataProvider.getMaps() as { id: string, name?: string }[]
  return maps.map(m => ({ id: m.id, name: m.name || m.id }))
})

const filteredMaps = computed(() => {
  const maps = pokemonDataProvider.getMaps() as unknown as MapLocation[]
  return maps
    .filter(m => {
      if (selectedMinigame.value === 'fishing') {
        return !!m.fishing
      } else if (selectedMinigame.value === 'archaeology') {
        return !!m.archaeology
      }
      return true
    })
    .map(m => ({ id: m.id, name: m.name || m.id }))
})

watch(selectedMinigame, () => {
  if (filteredMaps.value.length > 0) {
    config.value.mapId = filteredMaps.value[0]?.id || ''
  }
})

const speciesMoves = computed<string[]>(() => {
  const data = pokemonDataProvider.getPokemonData(config.value.id)
  if (!data || !data.learnset) return []
  return [...new Set(data.learnset.map(m => m.name))]
})

// --- ACTIONS ---
const baseStats = computed(() => {
  const data = pokemonDataProvider.getPokemonData(config.value.id)
  if (!data) return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  return {
    hp: data.hp || 0,
    atk: data.atk || 0,
    def: data.def || 0,
    spa: data.spa || 0,
    spd: data.spd || 0,
    spe: data.spe || 0
  }
})

function selectSpecies(p: SpeciesOption) {
  config.value.id = p.id
  
  // Update default ability for species
  const abilities = pokemonDataProvider.getSpeciesAbilities(p.id)
  if (abilities.length > 0) {
    config.value.ability = abilities[0] || ''
  }
  
  autoFillMoves()
}

watch(() => config.value.level, () => {
  autoFillMoves()
})

function autoFillMoves() {
  const data = pokemonDataProvider.getPokemonData(config.value.id)
  if (!data?.learnset) return
  
  // Filter moves learned at or below current level, sort by level desc
  const learnedMoves = data.learnset
    .filter(m => m.lv <= config.value.level)
    .sort((a, b) => b.lv - a.lv)
    .map(m => m.name)
  
  // Get the 4 most recent unique moves
  const uniqueMoves = [...new Set(learnedMoves)].slice(0, 4)
  
  // Ensure we keep 4 slots
  const finalMoves: (string | null)[] = [...uniqueMoves]
  while (finalMoves.length < 4) finalMoves.push(null)
  
  config.value.moves = finalMoves as (string | null)[]
}

function randomFillMoves() {
  const data = pokemonDataProvider.getPokemonData(config.value.id)
  if (!data?.learnset || data.learnset.length === 0) return

  // Get all unique move names from learnset
  const allLearnsetMoves = [...new Set(data.learnset.map(m => m.name))]
  
  // Shuffle and pick 4
  const shuffled = allLearnsetMoves.sort(() => 0.5 - Math.random())
  const selected = shuffled.slice(0, 4)
  
  // Pad with nulls
  const finalMoves: (string | null)[] = [...selected]
  while (finalMoves.length < 4) finalMoves.push(null)
  
  config.value.moves = finalMoves
}

// --- ACTIONS ---
async function executeAction(protocol: string) {
  if (!window.__VITE_DEBUG__) return
  
  config.value.protocol = protocol
  if (protocol === 'encounter') {
    // Note: User flagged encounter logic as potentially non-migrated. 
    // Manual testing only for now.
    await window.__VITE_DEBUG__.spawnEncounter?.(config.value)
  } else {
    await window.__VITE_DEBUG__.createPokemon?.(config.value)
  }
}

function randomizeSpecies() {
  const speciesList = allSpecies.value
  if (speciesList.length === 0) return
  const randomSpecies = speciesList[Math.floor(Math.random() * speciesList.length)]
  if (randomSpecies) {
    selectSpecies(randomSpecies)
  }
}

function randomizeLevel() {
  config.value.level = Math.floor(Math.random() * 100) + 1
}

function randomizeIVs() {
  config.value.ivs = generateRandomIVs()
}

function randomizeNature() {
  const natures = allNatures
  const randomNature = natures[Math.floor(Math.random() * natures.length)]
  if (randomNature) {
    config.value.nature = randomNature.id
  }
}

function randomizeAbility() {
  const abilities = pokemonDataProvider.getSpeciesAbilities(config.value.id)
  if (abilities.length > 0) {
    const randomAbility = abilities[Math.floor(Math.random() * abilities.length)]
    if (randomAbility) {
      config.value.ability = randomAbility
    }
  }
}

function randomizeNickname() {
  const names = ['POKI', 'CRACK', 'VICIADO', 'RAYO', 'TITAN', 'FURIA', 'CHISPA', 'GOKU', 'PEPE']
  config.value.nickname = Math.random() > 0.3 ? names[Math.floor(Math.random() * names.length)] || '' : ''
}

function randomizeMinigame() {
  selectedMinigame.value = Math.random() > 0.5 ? 'fishing' : 'archaeology'
}

function randomizeOrigin() {
  const maps = filteredMaps.value.length > 0 ? filteredMaps.value : allMaps.value
  if (maps.length > 0) {
    const randomMap = maps[Math.floor(Math.random() * maps.length)]
    if (randomMap) {
      config.value.mapId = randomMap.id
    }
  }
}

function randomizeBase() {
  randomizeSpecies()
  randomizeLevel()
  randomizeNature()
  randomizeAbility()
  randomizeIVs()
}

function randomizeVisuals() {
  config.value.isShiny = Math.random() < 0.05 // 5% shiny
  config.value.isGuardian = Math.random() < 0.01 // 1% guardian
  config.value.gender = Math.random() > 0.5 ? 'M' : 'F'
}

function randomizeExtras() {
  randomizeNickname()
  randomizeMinigame()
  randomizeOrigin()
  config.value.friendship = Math.floor(Math.random() * 256)
}

function handleRandomize() {
  randomizeBase()
  randomizeVisuals()
  randomizeExtras()
  randomFillMoves()
}

// --- HELPERS ---
const currentSprite = computed(() => pokemonDataProvider.getSpriteUrl(config.value.id, config.value.isShiny))

onMounted(() => {
  if (allMaps.value.length > 0) {
    const firstMap = allMaps.value[0]
    if (firstMap) {
      config.value.mapId = firstMap.id
    }
  }
})
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
            <label>NIVEL (1-100)</label>
            <PVTooltip
              title="Nivel al azar"
              description="Asigna un nivel aleatorio entre 1 y 100."
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
            description="Ajusta el nivel del Pokémon (entre 1 y 100)."
          >
            <input
              v-model.number="config.level"
              type="number"
              min="1"
              max="100"
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
          title="Añadir huevo al inventario"
          description="Genera un huevo (sin eclosionar) en tu mochila con los stats configurados."
        >
          <button
            class="btn-vicio-primary secondary"
            @click.stop="executeAction('egg_silent')"
          >
            AÑADIR HUEVO
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
          title="Iniciar encuentro"
          description="Genera un encuentro salvaje con este Pokémon."
        >
          <button
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
