<script setup lang="ts">
// [PureVue-Ignore-Length]
import { ref, computed, onMounted } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { usePlayerClassStore } from '@/stores/playerClass'
import { useModalStore } from '@/stores/modals'
import { pokemonDebugService } from '@/logic/debug/pokemonDebugService'
import { GYMS } from '@/data/gyms'
import { getAssetUrl, ASSET_TYPES, POKEMON_SPRITE_IDS } from '@/logic/services/assetService'

// Reused Subcomponents
import IndividualPokemonEditor from './IndividualPokemonEditor.vue'

import type { Pokemon } from '@/types/pokemon'
import type { MapLocation } from '@/types/encounters'
import type { BattleOptions } from '@/types/stores'

// --- CUSTOM INTERFACES FOR TYPE SAFETY ---
interface ExtendedPokemon extends Pokemon {
  _revealed?: boolean;
}

interface ExtendedBattleOptions {
  isTrainer?: boolean;
  trainerName?: string;
  isGym?: boolean;
  gymId?: string;
  locationId?: string;
  wasSearching?: boolean;
  enemyTeam?: Pokemon[];
  isFishing?: boolean;
  isArchaeology?: boolean;
  isGuardian?: boolean;
  pts?: number;
  isDebug?: boolean;
  difficulty?: string;
  rewardTM?: string;
  battleOptions?: Record<string, unknown>;
}

// --- TRAINER PRESETS & SPRITES ---
const TRAINER_SPRITES = [
  { id: 'youngster', name: 'Joven' },
  { id: 'lass', name: 'Chica' },
  { id: 'cazabichos', name: 'Cazabichos' },
  { id: 'picnicker', name: 'Dominguera' },
  { id: 'camper', name: 'Campista' },
  { id: 'hiker', name: 'Montañero' },
  { id: 'sailor', name: 'Marinero' },
  { id: 'scientist', name: 'Científico' },
  { id: 'juggler', name: 'Malabarista' },
  { id: 'blackbelt', name: 'Kárateka' },
  { id: 'swimmer', name: 'Nadador' },
  { id: 'tamer', name: 'Domador' },
  { id: 'birdkeeper', name: 'Ornitólogo' },
  { id: 'psychic', name: 'Médium' },
  { id: 'gentleman', name: 'Caballero' },
  { id: 'richboy', name: 'Niño Rico' },
  { id: 'tuber', name: 'Playero' },
  { id: 'cyclist', name: 'Ciclista' },
  { id: 'roughneck', name: 'Macarra' },
  { id: 'biker', name: 'Motorista' },
  { id: 'teamrocket', name: 'Recluta Rocket' },
  { id: 'rocket', name: 'Rocket' },
  { id: 'beauty', name: 'Bella' },
  { id: 'supernerd', name: 'Supernerd' },
  { id: 'burglar', name: 'Ladrón' },
  { id: 'dragontamer', name: 'Domadragones' },
  { id: 'acetrainer', name: 'Entrenador Guay' },
  { id: 'veteran', name: 'Veterano' },
  { id: 'entrenador', name: 'Entrenador genérico' },
  { id: 'criador', name: 'Criador genérico' },
  { id: 'brock', name: 'Líder Brock' },
  { id: 'misty', name: 'Líder Misty' },
  { id: 'ltsurge', name: 'Líder Lt. Surge' },
  { id: 'erika', name: 'Líder Erika' },
  { id: 'koga', name: 'Líder Koga' },
  { id: 'sabrina', name: 'Líder Sabrina' },
  { id: 'blaine', name: 'Líder Blaine' },
  { id: 'giovanni', name: 'Líder Giovanni' },
  { id: 'blue', name: 'Rival Azul' }
]

// --- STATE ---
const trainerName = ref('Entrenador Vicio')
const trainerSprite = ref('youngster')
const enemyTeam = ref<Pokemon[]>([])
const selectedPokeIndex = ref<number | null>(null)

// Combat configuration
const combatLocationType = ref<'map' | 'gym'>('map')
const selectedMapId = ref('route1')
const selectedGymId = ref('pewter')
const gymDifficulty = ref<'easy' | 'normal' | 'hard'>('normal')

// Batch Generation settings
const genTeamSize = ref(3)
const genMinLevel = ref(10)
const genMaxLevel = ref(15)
const genForceShiny = ref(false)
const genGuardianProb = ref(0.01)

const battleStore = useBattleStore()
const gameStore = useGameStore()
const classStore = usePlayerClassStore()
const modalStore = useModalStore()

const isRocketClass = computed(() => classStore.playerClass === 'rocket')
const criminality = computed({
  get: () => classStore.classData.criminality || 0,
  set: (val: number) => {
    if (classStore.classData) {
      classStore.classData.criminality = val
      gameStore.save(false)
    }
  }
})

const allMapsList = computed(() => {
  const maps = pokemonDataProvider.getMaps() as unknown as MapLocation[]
  return maps.map(m => ({ id: m.id, name: m.name || m.id }))
})

const gymList = computed(() => {
  return GYMS.map(g => ({ id: g.id, name: g.name, leader: g.leader }))
})

// --- ACTIVE POKEMON EDIT COMPUTEDS ---
const activePoke = computed<Pokemon | null>(() => {
  if (selectedPokeIndex.value === null) return null
  return enemyTeam.value[selectedPokeIndex.value] || null
})

// --- ACTIONS ---

function handleSpriteError(e: Event, id: string, isShiny = false) {
  const target = e.target as HTMLImageElement
  const num = (POKEMON_SPRITE_IDS as Record<string, number>)[id.toLowerCase()] || 1
  const folder = isShiny ? 'shiny/' : ''
  target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${folder}${num}.png`
}

function randomizeTrainer() {
  randomizeTrainerSprite()
  randomizeTrainerName()
}

function randomizeTrainerName() {
  const randomNames = [
    'Joven Chano', 'Cazabichos Roberto', 'Montañero Pedro', 'Marinero Paco', 
    'Domadora Sara', 'Ornitólogo Andrés', 'Médium Elías', 'Caballero Carlos', 
    'Recluta Rocket', 'Líder Brock', 'Líder Misty', 'Líder Lt. Surge', 
    'Líder Erika', 'Líder Koga', 'Líder Sabrina', 'Líder Blaine', 'Líder Giovanni',
    'Entrenador Guay Hugo', 'Motorista Ramón', 'Bella Lucía', 'Científico Lucas'
  ]
  trainerName.value = randomNames[Math.floor(Math.random() * randomNames.length)] || 'Entrenador Vicio'
}

function randomizeTrainerSprite() {
  const randomSprite = TRAINER_SPRITES[Math.floor(Math.random() * TRAINER_SPRITES.length)]
  if (randomSprite) {
    trainerSprite.value = randomSprite.id
  }
}

function generateRandomTeam() {
  const size = Math.max(1, Math.min(6, genTeamSize.value))
  const team: Pokemon[] = []
  const dbKeys = Object.keys(pokemonDataProvider.getPokemonDb())

  for (let i = 0; i < size; i++) {
    const randomSpecies = dbKeys[Math.floor(Math.random() * dbKeys.length)] || 'bulbasaur'
    const level = Math.floor(Math.random() * (genMaxLevel.value - genMinLevel.value + 1)) + genMinLevel.value
    const isShiny = genForceShiny.value || Math.random() < 0.05

    const p = pokemonDebugService.generate({
      id: randomSpecies,
      level: Math.max(1, Math.min(100, level)),
      isShiny
    })
    if (p) {
      p.isGuardian = Math.random() < genGuardianProb.value
      team.push(p)
    }
  }

  enemyTeam.value = team
  selectedPokeIndex.value = team.length > 0 ? 0 : null
}

function loadPolicePreset() {
  trainerName.value = 'Oficial de Policía'
  trainerSprite.value = 'tamer'
  combatLocationType.value = 'map'

  // Police themed team: Growlithe, Arcanine, Machoke, Machamp, Magneton, Pidgeot, etc.
  const pool = ['growlithe', 'arcanine', 'machoke', 'magneton', 'pidgeot']
  const team: Pokemon[] = []
  
  const averagePlayerLevel = computed(() => {
    const teamAlive = gameStore.state.team.filter((p: Pokemon | null) => p && p.hp > 0)
    if (teamAlive.length === 0) return 30
    const sum = teamAlive.reduce((acc: number, cur: Pokemon | null) => acc + (cur?.level || 0), 0)
    return Math.floor(sum / teamAlive.length)
  })

  const lvl = Math.max(10, averagePlayerLevel.value + 2)

  pool.forEach(id => {
    const p = pokemonDebugService.generate({
      id,
      level: lvl,
      ivs: { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 }
    })
    if (p) team.push(p)
  })

  enemyTeam.value = team.slice(0, 3) // 3 pokemon is typical
  selectedPokeIndex.value = 0
}

function addPokemonToTeam() {
  if (enemyTeam.value.length >= 6) return
  const p = pokemonDebugService.generate({ id: 'rattata', level: 10 })
  if (p) {
    enemyTeam.value.push(p)
    selectedPokeIndex.value = enemyTeam.value.length - 1
  }
}

function removePokemonFromTeam(index: number) {
  enemyTeam.value.splice(index, 1)
  if (selectedPokeIndex.value === index) {
    selectedPokeIndex.value = enemyTeam.value.length > 0 ? 0 : null
  } else if (selectedPokeIndex.value !== null && selectedPokeIndex.value > index) {
    selectedPokeIndex.value--
  }
}

async function startCombat() {
  if (enemyTeam.value.length === 0) {
    alert('¡Debes agregar al menos un Pokémon al equipo enemigo!')
    return
  }

  // Force close any active battle
  if (battleStore.isBattleActive) {
    await battleStore.endBattle(false, true)
  }

  const firstEnemy = enemyTeam.value[0]
  if (!firstEnemy) return

  const isGym = combatLocationType.value === 'gym'
  const gym = isGym ? GYMS.find(g => g.id === selectedGymId.value) : null

  const locationId = isGym ? 'gym' : selectedMapId.value
  const trainerNameVal = isGym && gym ? `Líder ${gym.leader}` : trainerName.value
  const gymIdVal = isGym && gym ? gym.id : undefined
  const rewardTMVal = isGym && gym ? gym.rewardTM : undefined

  // Pre-reveal team
  enemyTeam.value.forEach(p => {
    (p as ExtendedPokemon)._revealed = true
  })

  const opts: ExtendedBattleOptions = {
    isTrainer: true,
    trainerName: trainerNameVal,
    enemyTeam: enemyTeam.value,
    locationId,
    isGym,
    gymId: gymIdVal,
    difficulty: isGym ? gymDifficulty.value : undefined,
    rewardTM: rewardTMVal,
    battleOptions: {
      trainerSprite: trainerSprite.value
    }
  }

  await battleStore.startBattle(firstEnemy, opts as unknown as BattleOptions)

  modalStore.closeAll()
}

onMounted(() => {
  generateRandomTeam()
})
</script>

<template>
  <div class="pokemon-debug-creator debug-grid trainer-debug-tab scrollbar">
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
                v-for="s in TRAINER_SPRITES" 
                :key="s.id" 
                :value="s.id"
              >
                {{ s.name }} ({{ s.id }})
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
              :src="pokemonDataProvider.getSpriteUrl(p.id, p.isShiny)" 
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
        class="button-row"
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

<style scoped lang="scss">
@use "@/styles/components/debug";
@use "@/styles/core/tools" as *;

.trainer-debug-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.debug-divider {
  display: block !important;
  border: 0 !important;
  height: 2px !important;
  min-height: 2px !important;
  background: Rgba(255, 255, 255, 0.15) !important;
  margin: 18px 0 !important;
  width: 100% !important;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header-row {
  margin-bottom: 8px;
}

.danger-text {
  color: #ef4444;
}

.field-label {
  font-family: var(--font-pixel, monospace);
  font-size: 8px;
  color: Rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  display: inline-block;
  margin-bottom: 2px;
}

.crime-pct {
  @include pixelated;
  font-size: 10px;
  font-weight: bold;
}

.crime-sim-slider-row {
  margin-top: 4px;
  width: 100%;
  
  .slider-crime {
    width: 100%;
    accent-color: #ef4444;
  }
}

.crime-info-fallback {
  font-size: 8px;
  color: $muted;
  margin-top: 6px;
}

.trainer-sprite-preview {
  width: 64px;
  height: 64px;
  background: Rgba(0, 0, 0, 0.4);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  .trainer-sprite-img {
    max-width: 56px;
    max-height: 56px;
    object-fit: contain;
    @include pixelated;
  }
}

.gen-params-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 8px;
}

.cop-preset-btn {
  background: Rgba(59, 139, 255, 0.15);
  border-color: Rgba(59, 139, 255, 0.3);
  color: #5ea2ff;

  &:hover {
    background: #3b8bff;
    color: white;
  }
}

.team-grid-layout {
  display: flex !important;
  overflow-x: auto !important;
  gap: 8px !important;
  margin-top: 8px !important;
  padding-bottom: 8px !important;
  width: 100% !important;

  // Custom scrollbar styling
  &::-webkit-scrollbar {
    height: 4px !important;
  }
  &::-webkit-scrollbar-track {
    background: Rgba(0, 0, 0, 0.2) !important;
    border-radius: 4px !important;
  }
  &::-webkit-scrollbar-thumb {
    background: Rgba(255, 255, 255, 0.1) !important;
    border-radius: 4px !important;
    &:hover {
      background: Rgba(255, 255, 255, 0.2) !important;
    }
  }
}

.team-poke-card {
  flex: 0 0 74px !important;
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  transition: all 0.2s ease;
  
  &:hover {
    background: Rgba(255, 255, 255, 0.05);
    border-color: Rgba(255, 255, 255, 0.15);
  }

  &.active {
    background: Rgba(124, 58, 237, 0.1);
    border-color: var(--vicio-primary);
  }

  .card-top {
    width: 100%;
    display: flex;
    justify-content: center;
    position: relative;
  }

  .poke-sprite {
    width: 48px;
    height: 48px;
    object-fit: contain;
    @include pixelated;
  }

  .btn-delete-poke {
    position: absolute;
    top: -2px;
    right: -2px;
    background: Rgba(239, 68, 68, 0.1);
    border: none;
    color: #ef4444;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    cursor: pointer;

    &:hover {
      background: #ef4444;
      color: white;
    }
  }

  .card-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin-top: 4px;
    
    .name {
      font-size: 9px;
      font-weight: bold;
      color: white;
      text-align: center;
      width: 100%;
    }
    
    .level {
      font-size: 7px;
      color: $muted;
      margin-top: 2px;
    }
  }
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.input-group.vertical {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  
  input, select {
    background: Rgba(0, 0, 0, 0.4);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 11px;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    
    &:focus {
      border-color: var(--vicio-primary);
    }
  }
  
  select {
    appearance: none;
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='Rgba(255,255,255,0.7)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 16px;
    padding-right: 36px;
    cursor: pointer;
    
    option {
      background: #12131a;
      color: white;
    }
  }
}

.gym-fields-flex {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sim-diff-btn {
  @include pixelated;
  font-size: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  background: Rgba(0, 0, 0, 0.4);
  color: var(--gray);
  cursor: pointer;
  transition: all 0.2s ease;

  &.active {
    background: Rgba(255, 255, 255, 0.05);
    color: var(--white);
    &.easy { border-color: Rgba(34, 197, 94, 0.5); color: #22c55e; }
    &.normal { border-color: Rgba(255, 215, 0, 0.5); color: #ffd700; }
    &.hard { border-color: Rgba(239, 68, 68, 0.5); color: #ef4444; }
  }
}

.battle-start-btn-debug {
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  color: white;
  box-shadow: 0 8px 25px Rgba(239, 68, 68, 0.4);
  border: 1px solid Rgba(255, 255, 255, 0.2);
  @include btn-vicio('danger', 'sm', true);

  &:hover {
    box-shadow: 0 12px 30px Rgba(239, 68, 68, 0.6);
  }
}

.btn-vicio-secondary {
  @include btn-vicio('secondary', 'sm');
  width: auto !important;
  height: 24px !important;
  padding: 0 10px !important;
  font-size: 8px !important;
}

.btn-vicio-primary {
  @include btn-vicio('primary', 'sm');
  width: auto !important;
  height: 24px !important;
  padding: 0 10px !important;
  font-size: 8px !important;
}

.btn-vicio-success {
  @include btn-vicio('success', 'sm');
  width: auto !important;
  height: 30px !important;
  padding: 0 16px !important;
  font-size: 9px !important;
}

</style>
