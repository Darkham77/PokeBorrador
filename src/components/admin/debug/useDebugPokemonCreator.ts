import { ref, computed, watch, onMounted } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { generateRandomIVs } from '@/logic/pokemonUtils'
import { NATURE_DATA } from '@/data/natures'
import { ABILITY_DATA } from '@/data/abilities'
import type { MapLocation } from '@/types/encounters'
import type { PokemonIVs } from '@/types/pokemon'

export interface PokemonConfig {
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

export interface SpeciesOption {
  id: string
  name: string
  icon?: string
}

export interface MapOption {
  id: string
  name: string
}

export function useDebugPokemonCreator() {
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

  const selectedMinigame = ref<'fishing' | 'archaeology'>('fishing')

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
    
    const learnedMoves = data.learnset
      .filter(m => m.lv <= config.value.level)
      .sort((a, b) => b.lv - a.lv)
      .map(m => m.name)
    
    const uniqueMoves = [...new Set(learnedMoves)].slice(0, 4)
    const finalMoves: (string | null)[] = [...uniqueMoves]
    while (finalMoves.length < 4) finalMoves.push(null)
    
    config.value.moves = finalMoves as (string | null)[]
  }

  function randomFillMoves() {
    const data = pokemonDataProvider.getPokemonData(config.value.id)
    if (!data?.learnset || data.learnset.length === 0) return

    const allLearnsetMoves = [...new Set(data.learnset.map(m => m.name))]
    const shuffled = allLearnsetMoves.sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, 4)
    const finalMoves: (string | null)[] = [...selected]
    while (finalMoves.length < 4) finalMoves.push(null)
    
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
    config.value.isShiny = Math.random() < 0.05
    config.value.isGuardian = Math.random() < 0.01
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
