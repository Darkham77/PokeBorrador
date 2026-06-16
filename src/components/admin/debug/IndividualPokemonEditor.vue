<script setup lang="ts">
import { computed, watch } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { recalcPokemonStats, getExpNeeded } from '@/logic/pokemon/pokemonFactory'
import { generateRandomIVs } from '@/logic/pokemon/pokemonUtils'
import { MAX_POKEMON_LEVEL } from '@/data/constants'
import { NATURE_DATA } from '@/data/natures'
import { ABILITY_DATA } from '@/data/abilities'
import { SHOP_ITEMS } from '@/data/items'

// Subcomponents
import DebugSearchSelect from './DebugSearchSelect.vue'
import PokemonIVEditor from './PokemonIVEditor.vue'
import PokemonMovePicker from './PokemonMovePicker.vue'
import PokemonPreview from './PokemonPreview.vue'
import PokemonBaseStats from './PokemonBaseStats.vue'

import type { Pokemon } from '@/types/pokemon'

const props = defineProps<{
  pokemon: Pokemon
  index: number
}>()

const activePoke = computed(() => props.pokemon)

// --- DATA LISTS FOR EDITORS ---
const allSpecies = computed(() => {
  const db = pokemonDataProvider.getPokemonDb()
  return Object.keys(db).map(id => ({
    id,
    name: db[id]?.name || id,
    icon: pokemonDataProvider.getSpriteUrl(id)
  }))
})
const allNatures = Object.keys(NATURE_DATA).map(n => ({ id: n, name: n }))
const allAbilities = Object.keys(ABILITY_DATA).map(a => ({ id: a, name: a }))
const allItems = computed(() => {
  return [
    { id: '', name: 'Ninguno' },
    ...SHOP_ITEMS
      .filter(i => i.cat === 'held' || i.type === 'held')
      .map(i => ({ id: i.name, name: i.name }))
  ]
})

// --- ACTIVE POKEMON EDIT COMPUTEDS ---
const activePokeNature = computed({
  get: () => activePoke.value.nature || '',
  set: (val: string) => { activePoke.value.nature = val }
})

const activePokeAbility = computed({
  get: () => activePoke.value.ability || '',
  set: (val: string) => { activePoke.value.ability = val }
})

const activePokeHeldItem = computed({
  get: () => activePoke.value.heldItem || '',
  set: (val: string) => { activePoke.value.heldItem = val }
})

const activePokeNickname = computed({
  get: () => activePoke.value.nickname || '',
  set: (val: string) => { activePoke.value.nickname = val }
})

const activeSpeciesMoves = computed<string[]>(() => {
  const data = pokemonDataProvider.getPokemonData(activePoke.value.id)
  if (!data || !data.learnset) return []
  return [...new Set(data.learnset.map(m => m.name))]
})

const activeBaseStats = computed(() => {
  const data = pokemonDataProvider.getPokemonData(activePoke.value.id)
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

const activePokeMoves = computed({
  get: () => {
    const moves = activePoke.value.moves.map(m => m?.name || null)
    while (moves.length < 4) moves.push(null)
    return moves
  },
  set: (val: (string | null)[]) => {
    const formatted = val.map(mName => {
      if (!mName) return null
      const mData = pokemonDataProvider.getMoveData(mName)
      return {
        name: mName,
        pp: mData?.pp || 35,
        maxPP: mData?.pp || 35,
        type: mData?.type || 'normal',
        power: mData?.power || 0,
        acc: mData?.acc || 100,
        cat: (mData?.cat || 'physical') as 'physical' | 'special' | 'status'
      }
    }).filter(Boolean) as Pokemon['moves']
    activePoke.value.moves = formatted
  }
})

// --- RANDOMIZERS ---
function randomizeActiveSpecies() {
  const dbKeys = Object.keys(pokemonDataProvider.getPokemonDb())
  const randomId = dbKeys[Math.floor(Math.random() * dbKeys.length)] || 'bulbasaur'
  selectEditPokeSpecies({ id: randomId })
}

function randomizeActiveLevel() {
  activePoke.value.level = Math.floor(Math.random() * 100) + 1
}

function randomizeActiveNature() {
  const randomNature = allNatures[Math.floor(Math.random() * allNatures.length)]
  if (randomNature) {
    activePokeNature.value = randomNature.id
  }
}

function randomizeActiveAbility() {
  const abilities = pokemonDataProvider.getSpeciesAbilities(activePoke.value.id)
  if (abilities.length > 0) {
    const randomAbility = abilities[Math.floor(Math.random() * abilities.length)]
    if (randomAbility) {
      activePokeAbility.value = randomAbility
    }
  }
}

function randomizeActiveIVs() {
  activePoke.value.ivs = generateRandomIVs()
  recalcPokemonStats(activePoke.value)
}

function randomizeActiveHeldItem() {
  const randomItem = allItems.value[Math.floor(Math.random() * allItems.value.length)]
  if (randomItem) {
    activePokeHeldItem.value = randomItem.id
  }
}

function randomizeActiveNickname() {
  const names = ['POKI', 'CRACK', 'VICIADO', 'RAYO', 'TITAN', 'FURIA', 'CHISPA', 'GOKU', 'PEPE']
  activePokeNickname.value = Math.random() > 0.3 ? names[Math.floor(Math.random() * names.length)] || '' : ''
}

function selectEditPokeSpecies(p: { id: string }) {
  activePoke.value.id = p.id
  activePoke.value.name = pokemonDataProvider.getPokemonDb()[p.id]?.name || p.id
  
  // Set default ability
  const abilities = pokemonDataProvider.getSpeciesAbilities(p.id)
  if (abilities.length > 0) {
    activePoke.value.ability = abilities[0] || ''
  }

  // Refill moves based on level
  const data = pokemonDataProvider.getPokemonData(p.id)
  if (data?.learnset) {
    const learnedMoves = data.learnset
      .filter(m => m.lv <= activePoke.value.level)
      .sort((a, b) => b.lv - a.lv)
      .map(m => m.name)
    const unique = [...new Set(learnedMoves)].slice(0, 4)
    activePokeMoves.value = unique
  }
  
  // Recalculate stats
  recalcPokemonStats(activePoke.value)
  activePoke.value.hp = activePoke.value.maxHp
}

function autoFillActiveMoves() {
  const data = pokemonDataProvider.getPokemonData(activePoke.value.id)
  if (!data?.learnset) return
  const learnedMoves = data.learnset
    .filter(m => m.lv <= activePoke.value.level)
    .sort((a, b) => b.lv - a.lv)
    .map(m => m.name)
  const unique = [...new Set(learnedMoves)].slice(0, 4)
  activePokeMoves.value = unique
}

function randomFillActiveMoves() {
  const data = pokemonDataProvider.getPokemonData(activePoke.value.id)
  if (!data?.learnset || data.learnset.length === 0) return
  const allMoves = [...new Set(data.learnset.map(m => m.name))]
  const shuffled = allMoves.sort(() => 0.5 - Math.random())
  activePokeMoves.value = shuffled.slice(0, 4)
}

function updateActiveIV(stat: string, val: number) {
  activePoke.value.ivs[stat as keyof typeof activePoke.value.ivs] = Math.max(0, Math.min(31, val))
  recalcPokemonStats(activePoke.value)
}

watch(() => activePoke.value?.level, (newLv) => {
  if (!activePoke.value || !newLv) return
  if (newLv > MAX_POKEMON_LEVEL) {
    activePoke.value.level = MAX_POKEMON_LEVEL
    newLv = MAX_POKEMON_LEVEL
  }
  recalcPokemonStats(activePoke.value)
  activePoke.value.hp = activePoke.value.maxHp
  if (newLv >= MAX_POKEMON_LEVEL) {
    activePoke.value.exp = 0
    activePoke.value.expNeeded = Infinity
  } else {
    activePoke.value.expNeeded = getExpNeeded(newLv)
    if (activePoke.value.exp >= activePoke.value.expNeeded) {
      activePoke.value.exp = activePoke.value.expNeeded - 1
    }
  }
})
</script>

<template>
  <div class="debug-card pokemon-editor-card">
    <label style="color: var(--yellow);">EDITAR POKÉMON #{{ index + 1 }}</label>

    <div class="pokemon-editor-vertical-flow">
      <!-- Col 1: Species & Preview -->
      <div class="editor-sub-card">
        <DebugSearchSelect
          v-model="activePoke.id"
          label="ESPECIE"
          :options="allSpecies"
          tooltip-title="ESPECIE"
          tooltip-desc="Busca y selecciona la especie base del Pokémon."
          @select="selectEditPokeSpecies"
        >
          <template #label-action>
            <button
              class="btn-magic-fill btn-random-fill"
              @click.stop="randomizeActiveSpecies"
            >
              🎲
            </button>
          </template>
        </DebugSearchSelect>

        <div
          class="input-group vertical"
          style="margin-top: 8px;"
        >
          <div
            class="label-row"
            style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
          >
            <span
              class="field-label"
              style="margin-bottom: 0;"
            >Nivel (1-100)</span>
            <button
              class="btn-magic-fill btn-random-fill"
              @click.stop="randomizeActiveLevel"
            >
              🎲
            </button>
          </div>
          <input
            v-model.number="activePoke.level"
            type="number"
            min="1"
            max="100"
          >
        </div>

        <PokemonPreview
          :sprite-url="pokemonDataProvider.getSpriteUrl(activePoke.id, activePoke.isShiny)"
          :is-shiny="activePoke.isShiny"
          :is-guardian="activePoke.isGuardian"
          :gender="activePoke.gender || 'M'"
          @toggle-shiny="activePoke.isShiny = !activePoke.isShiny"
          @toggle-guardian="activePoke.isGuardian = !activePoke.isGuardian"
          @toggle-gender="activePoke.gender = activePoke.gender === 'M' ? 'F' : 'M'"
        />

        <PokemonBaseStats :stats="activeBaseStats" />
      </div>

      <!-- Col 2: Natures & Stats -->
      <div
        class="editor-sub-card"
        style="margin-top: 12px; border-top: 1px dashed rgba(255, 255, 255, 0.08); padding-top: 12px;"
      >
        <DebugSearchSelect
          v-model="activePokeNature"
          label="NATURALEZA"
          :options="allNatures"
          tooltip-title="NATURALEZA"
          tooltip-desc="Selecciona la naturaleza de este Pokémon."
        >
          <template #label-action>
            <button
              class="btn-magic-fill btn-random-fill"
              @click.stop="randomizeActiveNature"
            >
              🎲
            </button>
          </template>
        </DebugSearchSelect>

        <DebugSearchSelect
          v-model="activePokeAbility"
          label="HABILIDAD"
          :options="allAbilities"
          tooltip-title="HABILIDAD"
          tooltip-desc="Selecciona la habilidad pasiva del Pokémon."
          style="margin-top: 8px;"
        >
          <template #label-action>
            <button
              class="btn-magic-fill btn-random-fill"
              @click.stop="randomizeActiveAbility"
            >
              🎲
            </button>
          </template>
        </DebugSearchSelect>

        <div
          class="input-group vertical"
          style="margin-top: 8px;"
        >
          <div
            class="label-row"
            style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
          >
            <span
              class="field-label"
              style="margin-bottom: 0;"
            >Genética (IVs)</span>
            <button
              class="btn-magic-fill btn-random-fill"
              @click.stop="randomizeActiveIVs"
            >
              🎲
            </button>
          </div>
          <PokemonIVEditor 
            :ivs="activePoke.ivs as unknown as Record<string, number>" 
            @update:iv="updateActiveIV"
          />
        </div>
      </div>

      <!-- Col 3: Moves & Details -->
      <div
        class="editor-sub-card"
        style="margin-top: 12px; border-top: 1px dashed rgba(255, 255, 255, 0.08); padding-top: 12px;"
      >
        <PokemonMovePicker 
          v-model="activePokeMoves"
          :species-moves="activeSpeciesMoves"
          @auto-fill="autoFillActiveMoves"
          @random-fill="randomFillActiveMoves"
        />

        <DebugSearchSelect
          v-model="activePokeHeldItem"
          label="OBJETO EQUIPADO"
          :options="allItems"
          tooltip-title="OBJETO EQUIPADO"
          tooltip-desc="Busca y selecciona un objeto para equipar al Pokémon."
          style="margin-top: 12px;"
        >
          <template #label-action>
            <button
              class="btn-magic-fill btn-random-fill"
              @click.stop="randomizeActiveHeldItem"
            >
              🎲
            </button>
          </template>
        </DebugSearchSelect>

        <div
          class="input-group vertical"
          style="margin-top: 8px;"
        >
          <div
            class="label-row"
            style="display: flex; justify-content: space-between; align-items: center; width: 100%;"
          >
            <span
              class="field-label"
              style="margin-bottom: 0;"
            >Apodo (Nickname)</span>
            <button
              class="btn-magic-fill btn-random-fill"
              @click.stop="randomizeActiveNickname"
            >
              🎲
            </button>
          </div>
          <input 
            v-model="activePokeNickname" 
            type="text" 
            placeholder="Sin apodo..."
          >
        </div>
      </div>
    </div>
  </div>
</template>
