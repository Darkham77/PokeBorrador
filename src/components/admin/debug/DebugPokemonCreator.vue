<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { NATURE_DATA } from '@/data/natures'
import { ABILITY_DATA } from '@/data/abilities'
import { MOVE_DATA } from '@/data/moves'
import PVTooltip from '@/components/common/PVTooltip.vue'
import PokemonIVEditor from './PokemonIVEditor.vue'
import PokemonBaseStats from './PokemonBaseStats.vue'
import PokemonPreview from './PokemonPreview.vue'
import PokemonMovePicker from './PokemonMovePicker.vue'


const creatorRef = ref(null)

// --- STATE ---
const config = ref({
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

// --- SEARCH & FILTERING ---
const speciesSearch = ref('')
const natureSearch = ref('')
const abilitySearch = ref('')
const mapSearch = ref('')
const moveSearch = ref('')

const showSpeciesDropdown = ref(false)
const showNatureDropdown = ref(false)
const showAbilityDropdown = ref(false)
const showMapDropdown = ref(false)
const activeMoveSlot = ref(null)

const allSpecies = computed(() => {
  const db = pokemonDataProvider.getPokemonDb()
  return Object.keys(db).map(id => ({ id, name: db[id].name }))
})

const filteredSpecies = computed(() => {
  const s = speciesSearch.value.toLowerCase()
  return allSpecies.value.filter(p => p.id.includes(s) || p.name.toLowerCase().includes(s)).slice(0, 50)
})

const allNatures = Object.keys(NATURE_DATA)
const filteredNatures = computed(() => {
  const s = natureSearch.value.toLowerCase()
  return allNatures.filter(n => n.toLowerCase().includes(s))
})

const allAbilities = Object.keys(ABILITY_DATA)
const filteredAbilities = computed(() => {
  const s = abilitySearch.value.toLowerCase()
  return allAbilities.filter(a => a.toLowerCase().includes(s))
})

const allMaps = computed(() => {
  const maps = pokemonDataProvider.getMaps()
  return Object.keys(maps).map(id => ({ id, name: maps[id].name || id }))
})

const filteredMaps = computed(() => {
  const s = mapSearch.value.toLowerCase()
  return allMaps.value.filter(m => m.id.includes(s) || m.name.toLowerCase().includes(s))
})

const speciesMoves = computed(() => {
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

function selectSpecies(p) {
  config.value.id = p.id
  speciesSearch.value = p.name.toUpperCase()
  showSpeciesDropdown.value = false
  
  // Update default ability for species
  const abilities = pokemonDataProvider.getSpeciesAbilities(p.id)
  if (abilities.length > 0) {
    config.value.ability = abilities[0]
    abilitySearch.value = config.value.ability.toUpperCase()
  }
  
  autoFillMoves()
}

watch(() => config.value.level, () => {
  autoFillMoves()
})

function selectNature(n) {
  config.value.nature = n
  natureSearch.value = n.toUpperCase()
  showNatureDropdown.value = false
}

function selectAbility(a) {
  config.value.ability = a
  abilitySearch.value = a.toUpperCase()
  showAbilityDropdown.value = false
}

function selectMap(m) {
  config.value.mapId = m.id
  mapSearch.value = m.name.toUpperCase()
  showMapDropdown.value = false
}


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
  const finalMoves = [...uniqueMoves]
  while (finalMoves.length < 4) finalMoves.push(null)
  
  config.value.moves = finalMoves
}

// --- ACTIONS ---
async function executeAction(protocol) {
  if (!window.__VITE_DEBUG__) return
  
  config.value.protocol = protocol
  if (protocol === 'encounter') {
    // Note: User flagged encounter logic as potentially non-migrated. 
    // Manual testing only for now.
    await window.__VITE_DEBUG__.spawnEncounter(config.value)
  } else {
    await window.__VITE_DEBUG__.createPokemon(config.value)
  }
}

function handleClickOutside(e) {
  if (creatorRef.value && !creatorRef.value.contains(e.target)) {
    showSpeciesDropdown.value = false
    showNatureDropdown.value = false
    showAbilityDropdown.value = false
    showMapDropdown.value = false
    activeMoveSlot.value = null
  }
}

// --- HELPERS ---
const currentSprite = computed(() => pokemonDataProvider.getSpriteUrl(config.value.id, config.value.isShiny))

onMounted(() => {
  speciesSearch.value = (pokemonDataProvider.getPokemonData(config.value.id)?.name || config.value.id).toUpperCase()
  natureSearch.value = config.value.nature.toUpperCase()
  abilitySearch.value = config.value.ability.toUpperCase()
  
  if (allMaps.value.length > 0) {
    const firstMap = allMaps.value[0]
    config.value.mapId = firstMap.id
    mapSearch.value = firstMap.name.toUpperCase()
  }
  
  window.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <div
    ref="creatorRef"
    class="pokemon-debug-creator"
  >
    <h3 class="debug-section-title">
      LABORATORIO POKÉMON (ADMIN)
    </h3>
    
    <div class="creator-grid">
      <!-- Left: Species & Stats -->
      <div class="creator-section">
        <h4>BASE & ATRIBUTOS</h4>
        
        <!-- Species Search -->
        <div class="debug-input-group search-select-container">
          <label>ESPECIE</label>
          <PVTooltip
            title="Buscador de especies"
            description="Busca y selecciona la especie base del Pokémon."
          >
            <input 
              v-model="speciesSearch" 
              type="text" 
              placeholder="BUSCAR..."
              class="search-input"
              @focus="showSpeciesDropdown = true"
            >
          </PVTooltip>
          <div
            v-if="showSpeciesDropdown"
            class="options-dropdown custom-scrollbar"
          >
            <div 
              v-for="p in filteredSpecies" 
              :key="p.id" 
              class="option-item"
              :class="{ active: config.id === p.id }"
              @click="selectSpecies(p)"
            >
              <img
                @error="e => e.target.style.display = 'none'" :src="pokemonDataProvider.getSpriteUrl(p.id)"
                class="item-icon"
              >
              {{ p.name.toUpperCase() }}
            </div>
          </div>
        </div>

        <div class="debug-input-group">
          <label>NIVEL (1-100)</label>
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
          
        <PokemonIVEditor 
          :ivs="config.ivs" 
          @update:iv="(stat, val) => config.ivs[stat] = val" 
        />

        <!-- Nature & Ability -->
        <div class="debug-input-group search-select-container">
          <label>NATURALEZA</label>
          <PVTooltip
            title="Naturaleza"
            description="Modificadores de estadísticas basados en la personalidad."
          >
            <input 
              v-model="natureSearch" 
              type="text" 
              placeholder="BUSCAR..."
              @focus="showNatureDropdown = true"
            >
          </PVTooltip>
          <div
            v-if="showNatureDropdown"
            class="options-dropdown custom-scrollbar"
          >
            <div 
              v-for="n in filteredNatures" 
              :key="n" 
              class="option-item"
              :class="{ active: config.nature === n }"
              @click="selectNature(n)"
            >
              {{ n.toUpperCase() }}
            </div>
          </div>
        </div>

        <div class="debug-input-group search-select-container">
          <label>HABILIDAD</label>
          <PVTooltip
            title="Habilidad"
            description="Capacidad especial pasiva de esta especie."
          >
            <input 
              v-model="abilitySearch" 
              type="text" 
              placeholder="BUSCAR..."
              @focus="showAbilityDropdown = true"
            >
          </PVTooltip>
          <div
            v-if="showAbilityDropdown"
            class="options-dropdown custom-scrollbar"
          >
            <div 
              v-for="a in filteredAbilities" 
              :key="a" 
              class="option-item"
              :class="{ active: config.ability === a }"
              @click="selectAbility(a)"
            >
              {{ a.toUpperCase() }}
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Preview & Moves -->
      <div class="creator-section">
        <h4>VISUALIZACIÓN & ATAQUES</h4>
        
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
        />
      </div>

      <!-- Bottom/Right: Extras & Action -->
      <div class="creator-section">
        <h4>EXTRAS & ACCIONES</h4>
      
        <div class="debug-input-group">
          <label>APODO (NICKNAME)</label>
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
      
        <!-- Origin Route Dropdown -->
        <div class="debug-input-group search-select-container">
          <label>ORIGEN</label>
          <PVTooltip
            title="Ruta de origen"
            description="Lugar donde se registrará que fue encontrado el Pokémon."
          >
            <input 
              v-model="mapSearch" 
              type="text" 
              placeholder="BUSCAR..."
              @focus="showMapDropdown = true"
            >
          </PVTooltip>
          <div
            v-if="showMapDropdown"
            class="options-dropdown custom-scrollbar"
          >
            <div 
              v-for="m in filteredMaps" 
              :key="m.id" 
              class="option-item"
              :class="{ active: config.mapId === m.id }"
              @click="selectMap(m)"
            >
              {{ m.name.toUpperCase() }}
            </div>
          </div>
        </div>
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
            @click="executeAction('catch')"
          >
            ATRAPAR
          </button>
        </PVTooltip>
          
        <PVTooltip
          title="Añadir huevo al inventario"
          description="Genera un huevo (sin eclosionar) en tu mochila con los stats configurados."
        >
          <button
            class="btn-vicio-primary secondary"
            @click="executeAction('egg_silent')"
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
            @click="executeAction('egg_anim')"
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
            @click="executeAction('encounter')"
          >
            ENCONTRAR
          </button>
        </PVTooltip>
      </div>
    </div>
  </div>
</template>
