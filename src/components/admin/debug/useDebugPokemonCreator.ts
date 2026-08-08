import { ref, computed, watch, onMounted } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { generateRandomIVs } from '@/logic/pokemon/pokemonUtils'
import type { MapLocation } from '@/types/pokemon/encounters'
import type { PokemonGender, PokemonIVs } from '@/types/pokemon/pokemon'
import { MAX_POKEMON_LEVEL } from '@/data/system/constants'
import { requireAbilityId } from '@/data/battle/abilities'

const DEBUG_CREATOR_SHINY_PROB = 0.05
const DEBUG_CREATOR_GUARDIAN_PROB = 0.01
const MAX_FRIENDSHIP_VAL = 255
const MAX_MOVE_SLOTS_COUNT = 4
const HALF_SPLIT_THRESHOLD = 0.5
const NICKNAME_PROB_THRESHOLD = 0.3
const INITIAL_DEBUG_POKEMON_LEVEL = 5
const INITIAL_FRIENDSHIP_VAL = 70
const PERFECT_IV_VAL = 31

interface PokemonConfig {
  id: string
  level: number
  isShiny: boolean
  isGuardian: boolean
  nature: string
  ability: string
  gender: Exclude<PokemonGender, null>
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

import { getSelectableSpecies, getSelectableNatures, getSelectableAbilities } from '@/logic/utils/routeSpawnHelpers'

export function useDebugPokemonCreator() {
  const config = ref<PokemonConfig>({
    id: 'bulbasaur',
    level: INITIAL_DEBUG_POKEMON_LEVEL,
    isShiny: false,
    isGuardian: false,
    nature: 'adamant',
    ability: 'overgrow',
    gender: 'm',
    nickname: '',
    friendship: INITIAL_FRIENDSHIP_VAL,
    heldItem: '',
    mapId: 'route_1',
    ivs: { hp: PERFECT_IV_VAL, atk: PERFECT_IV_VAL, def: PERFECT_IV_VAL, spa: PERFECT_IV_VAL, spd: PERFECT_IV_VAL, spe: PERFECT_IV_VAL },
    moves: [],
    protocol: 'catch'
  })

  const selectedMinigame = ref<'fishing' | 'archaeology'>('fishing')

  const allSpecies = computed<SpeciesOption[]>(() => getSelectableSpecies(true))
  const allNatures = getSelectableNatures()
  const allAbilities = getSelectableAbilities()



  const allMaps = computed<MapOption[]>(() => {
    const maps = pokemonDataProvider.getMaps() as { id: string, name?: string }[]
    return maps.map(m => ({ id: m.id, name: m.name || m.id }))
  })

  const filteredMaps = computed(() => {
    const maps = pokemonDataProvider.getMaps() as MapLocation[] // domain-ok
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
    return [...new Set(data.learnset.map(m => m.id))]
  })

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
    const abilities = pokemonDataProvider.getSpeciesAbilities(p.id)
    if (abilities.length > 0) {
      config.value.ability = abilities[0] ? requireAbilityId(abilities[0]) : '' // text-ok
    }
    autoFillMoves()
  }

  watch(() => config.value.level, () => {
    autoFillMoves()
  })

  function autoFillMoves() {
    const data = pokemonDataProvider.getPokemonData(config.value.id)
    if (!data?.learnset) return
    
    const learnedMoves = data.learnset
      .filter(m => m.lv <= config.value.level)
      .sort((a, b) => b.lv - a.lv)
      .map(m => m.id)
    
    const uniqueMoves = [...new Set(learnedMoves)].slice(0, MAX_MOVE_SLOTS_COUNT)
    const finalMoves: (string | null)[] = [...uniqueMoves]
    while (finalMoves.length < MAX_MOVE_SLOTS_COUNT) finalMoves.push(null)
    
    config.value.moves = finalMoves as (string | null)[]
  }

  function randomFillMoves() {
    const data = pokemonDataProvider.getPokemonData(config.value.id)
    if (!data?.learnset || data.learnset.length === 0) return

    const allLearnsetMoves = [...new Set(data.learnset.map(m => m.id))]
    const shuffled = allLearnsetMoves.sort(() => HALF_SPLIT_THRESHOLD - Math.random())
    const selected = shuffled.slice(0, MAX_MOVE_SLOTS_COUNT)
    const finalMoves: (string | null)[] = [...selected]
    while (finalMoves.length < MAX_MOVE_SLOTS_COUNT) finalMoves.push(null)
    
    config.value.moves = finalMoves
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
    config.value.level = Math.floor(Math.random() * MAX_POKEMON_LEVEL) + 1
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
    const names = ['POKI', 'CRACK', 'VICIADO', 'RAYO', 'TITAN', 'FURIA', 'CHISPA', 'GOKU', 'PEPE'] as const
    config.value.nickname = Math.random() > NICKNAME_PROB_THRESHOLD ? names[Math.floor(Math.random() * names.length)] || '' : ''
  }

  function randomizeMinigame() {
    selectedMinigame.value = Math.random() > HALF_SPLIT_THRESHOLD ? 'fishing' : 'archaeology'
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
    config.value.isShiny = Math.random() < DEBUG_CREATOR_SHINY_PROB
    config.value.isGuardian = Math.random() < DEBUG_CREATOR_GUARDIAN_PROB
    config.value.gender = Math.random() > HALF_SPLIT_THRESHOLD ? 'm' : 'f'
  }

  function randomizeExtras() {
    randomizeNickname()
    randomizeMinigame()
    randomizeOrigin()
    config.value.friendship = Math.floor(Math.random() * (MAX_FRIENDSHIP_VAL + 1))
  }

  function handleRandomize() {
    randomizeBase()
    randomizeVisuals()
    randomizeExtras()
    randomFillMoves()
  }

  onMounted(() => {
    if (allMaps.value.length > 0) {
      const firstMap = allMaps.value[0]
      if (firstMap) {
        config.value.mapId = firstMap.id
      }
    }
  })

  return {
    config,
    selectedMinigame,
    allSpecies,
    allNatures,
    allAbilities,
    allMaps,
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
  }
}
