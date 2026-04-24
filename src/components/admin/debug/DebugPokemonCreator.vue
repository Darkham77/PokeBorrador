<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUIStore } from '@/stores/ui'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { NATURE_DATA } from '@/data/natures'
import { ABILITY_DATA } from '@/data/abilities'
import { MOVE_DATA } from '@/data/moves'
import PVTooltip from '@/components/common/PVTooltip.vue'

const ui = useUIStore()
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

const allMovesList = Object.keys(MOVE_DATA)
const filteredMoves = computed(() => {
  const s = moveSearch.value.toLowerCase()
  if (!s) return speciesMoves.value
  return allMovesList.filter(m => m.toLowerCase().includes(s)).slice(0, 30)
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

function addMove(m, slotIndex) {
  config.value.moves[slotIndex] = m
  activeMoveSlot.value = null
  moveSearch.value = ''
}

function autoFillMoves() {
  const data = pokemonDataProvider.getPokemonData(config.value.id)
  if (!data?.learnset) return
  
  // Filter moves learned at or below current level, sort by level desc
  const learnedMoves = data.learnset
    .filter(m => m.level <= config.value.level)
    .sort((a, b) => b.level - a.level)
    .map(m => m.move)
  
  // Get the 4 most recent unique moves
  const uniqueMoves = [...new Set(learnedMoves)].slice(0, 4).reverse()
  
  // Ensure we keep 4 slots
  const finalMoves = [...uniqueMoves]
  while (finalMoves.length < 4) finalMoves.push(null)
  
  config.value.moves = finalMoves
}

// Watch level changes to auto-update moves
watch(() => config.value.level, () => {
  autoFillMoves()
})

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
                :src="pokemonDataProvider.getSpriteUrl(p.id)"
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

        <!-- Base Stats Visualization -->
        <PVTooltip
          title="Estadísticas base"
          description="Valores originales de la especie en la base de datos."
        >
          <div class="base-stats-grid">
            <div
              v-for="(val, stat) in baseStats"
              :key="stat"
              class="stat-item"
            >
              <span class="s-label">{{ stat.toUpperCase() }}</span>
              <span class="s-value">{{ val }}</span>
            </div>
          </div>
        </PVTooltip>

        <!-- IVs Grid -->
        <PVTooltip
          title="Valores individuales (IVs)"
          description="Potencial genético de cada estadística (rango 0-31)."
        >
          <div class="iv-grid">
            <div
              v-for="(val, stat) in config.ivs"
              :key="stat"
              class="iv-item"
            >
              <label>{{ stat.toUpperCase() }}</label>
              <input
                v-model.number="config.ivs[stat]"
                type="number"
                min="0"
                max="31"
              >
            </div>
          </div>
        </PVTooltip>

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
        
        <div class="preview-box">
          <div
            class="sprite-container"
            :class="{ 'is-guardian': config.isGuardian, 'is-shiny': config.isShiny }"
          >
            <img
              :src="currentSprite"
              class="preview-sprite"
            >
            <div
              v-if="config.isShiny"
              class="shiny-sparkles"
            >
              <div
                v-for="i in 5"
                :key="i"
                class="sparkle"
              />
            </div>
          </div>
          <div class="preview-flags">
            <PVTooltip
              title="Alternar shiny"
              description="Cambia entre la variante normal y la brillante."
            >
              <button
                class="flag-btn shiny"
                :class="{ active: config.isShiny }"
                @click="config.isShiny = !config.isShiny"
              >
                ✨
              </button>
            </PVTooltip>
            <PVTooltip
              title="Marcar como guardián"
              description="Aplica el aura blanca de poder especial."
            >
              <button
                class="flag-btn guardian"
                :class="{ active: config.isGuardian }"
                @click="config.isGuardian = !config.isGuardian"
              >
                🛡️
              </button>
            </PVTooltip>
            <PVTooltip
              title="Género"
              description="Cambia entre macho y hembra."
            >
              <button
                class="flag-btn gender"
                :class="[config.gender === 'M' ? 'male' : 'female']"
                @click="config.gender = config.gender === 'M' ? 'F' : 'M'"
              >
                {{ config.gender === 'M' ? '♂️' : '♀️' }}
              </button>
            </PVTooltip>
          </div>
        </div>

        <!-- Moves Hybrid Selector -->
        <div class="moves-section">
          <div class="section-header-row">
            <label>ATAQUES (MODO HÍBRIDO)</label>
            <PVTooltip
              title="Autocompletar ataques"
              description="Asigna automáticamente los últimos 4 ataques aprendidos por nivel."
            >
              <button
                class="btn-magic-fill"
                @click="autoFillMoves"
              >
                🪄
              </button>
            </PVTooltip>
          </div>
          <div class="move-slots">
            <div
              v-for="i in 4"
              :key="i"
              class="move-slot"
            >
              <div
                v-if="config.moves[i-1]"
                class="move-pill"
                @click="activeMoveSlot = i"
              >
                <span class="m-name">{{ config.moves[i-1].toUpperCase() }}</span>
                <button
                  class="remove-move"
                  @click.stop="config.moves.splice(i-1, 1)"
                >
                  ×
                </button>
              </div>
              <div
                v-else
                class="move-pill empty"
                @click="activeMoveSlot = i"
              >
                + SELECCIONAR
              </div>
              
              <!-- Move Picker Dropdown -->
              <div
                v-if="activeMoveSlot === i"
                class="move-picker custom-scrollbar"
              >
                <input
                  v-model="moveSearch"
                  type="text"
                  placeholder="BUSCAR..."
                  class="move-search-input"
                  autofocus
                >
                
                <div class="move-list">
                  <div
                    v-if="speciesMoves.length > 0 && !moveSearch"
                    class="move-group-label"
                  >
                    LEARNSET
                  </div>
                  <div 
                    v-for="m in filteredMoves" 
                    :key="m" 
                    class="move-item"
                    @click="addMove(m, i-1)"
                  >
                    {{ m.toUpperCase() }}
                  </div>
                </div>
                <button
                  class="close-picker"
                  @click="activeMoveSlot = null"
                >
                  CERRAR
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Extras & Action -->
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
