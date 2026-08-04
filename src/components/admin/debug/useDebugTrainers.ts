import { ref, computed } from 'vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useBattleStore } from '@/stores/battle/battle'
import { useGameStore } from '@/stores/game'
import { useDebugStore } from '@/stores/debug'
import { getSpritesForArchetype, type NpcArchetype, type NpcSpriteId } from '@/logic/utils/npcSpriteRouter'
import { ARCHETYPE_SPRITES } from '@/data/pokemon/npcSpriteCatalog'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { useModalStore } from '@/stores/modals'
import { pokemonDebugService } from '@/logic/debug/pokemonDebugService'
import { GYMS } from '@/data/world/gyms'
import { TRAINER_TYPES, isTrainerTypeKey } from '@/data/player/trainerTypes'
import { generateNpcName } from '@/logic/utils/npcNameGenerator'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { MapLocation } from '@/types/pokemon/encounters'
import type { BattleOptions } from '@/types/system/stores'

interface ExtendedPokemon extends Pokemon {
  _revealed?: boolean
}

interface ExtendedBattleOptions {
  isTrainer?: boolean
  trainerName?: string
  isGym?: boolean
  gymId?: string
  locationId?: string
  wasSearching?: boolean
  enemyTeam?: Pokemon[]
  isFishing?: boolean
  isArchaeology?: boolean
  isGuardian?: boolean
  pts?: number
  isDebug?: boolean
  difficulty?: string
  rewardTM?: string
  battleOptions?: Record<string, unknown>
}

// TRAINER_SPRITES removed — use ARCHETYPE_SPRITES from npcSpriteCatalog for dynamic selection.
// Use getSpritesForArchetype(archetype) to get the full list for a given archetype.

// Derivado de TRAINER_TYPES para evitar duplicación — si se añade un arquetipo allí, aparece aquí automáticamente
export const ARCHETYPE_PRESETS = [
  { id: 'random', name: 'Al Azar (Total)' },
  ...Object.entries(TRAINER_TYPES).map(([id, def]) => ({ id, name: def.name }))
]

// All sprites across all archetypes, flattened — used for totally random selection
const ALL_CATALOG_SPRITES: readonly NpcSpriteId[] = (Object.values(ARCHETYPE_SPRITES) as ReadonlyArray<readonly NpcSpriteId[]>).flat()

export function useDebugTrainers() {
  const battleStore = useBattleStore()
  const gameStore = useGameStore()
  const classStore = usePlayerClassStore()
  const modalStore = useModalStore()
  const debugStore = useDebugStore()

  const trainerName = ref('Entrenador Vicio')
  const trainerSprite = ref('youngster')
  const enemyTeam = ref<Pokemon[]>([])
  const trainerArchetype = ref<string | undefined>(undefined)
  const selectedPokeIndex = ref<number | null>(null)
  const selectedPreset = ref('random')

  const combatLocationType = ref<'map' | 'gym'>('map')
  const selectedMapId = ref('route1')
  const selectedGymId = ref('pewter')
  const gymDifficulty = ref<'easy' | 'normal' | 'hard'>('normal')

  const genTeamSize = ref(3)
  const genMinLevel = ref(10)
  const genMaxLevel = ref(15)
  const genForceShiny = ref(false)
  const genGuardianProb = ref(0.01)

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
    const maps = pokemonDataProvider.getMaps() as MapLocation[] // domain-ok
    return maps.map(m => ({ id: m.id, name: m.name || m.id }))
  })

  // Dynamic list of sprites for the current preset — used by the sprite <select> in the UI
  const availableSpriteList = computed<{ id: string; label: string }[]>(() => {
    const preset = selectedPreset.value
    const sprites = preset !== 'random'
      ? getSpritesForArchetype(preset as NpcArchetype)
      : ALL_CATALOG_SPRITES
    return (sprites as readonly string[]).map(id => ({ id, label: id })) // domain-ok
  })

  const gymList = computed(() => {
    return GYMS.map(g => ({ id: g.id, name: g.name, leader: g.leader }))
  })

  const activePoke = computed<Pokemon | null>(() => {
    if (selectedPokeIndex.value === null) return null
    return enemyTeam.value[selectedPokeIndex.value] || null
  })

  function generateThemedTrainerName(archetype: string): string {
    return generateNpcName({
      spriteId: trainerSprite.value,
      archetype,
      includeTitle: true
    })
  }

  function randomizeTrainer() {
    randomizeTrainerSprite()
    randomizeTrainerName()
  }

  function randomizeTrainerName() {
    trainerName.value = generateNpcName({
      spriteId: trainerSprite.value,
      archetype: trainerArchetype.value,
      includeTitle: true
    })
  }

  function randomizeTrainerSprite() {
    if (selectedPreset.value !== 'random') {
      // Use the full archetype catalog for the selected archetype
      const sprites = getSpritesForArchetype(selectedPreset.value as NpcArchetype)
      trainerSprite.value = sprites[Math.floor(Math.random() * sprites.length)] || 'youngster'
    } else {
      // Pick from ALL sprites across all archetypes
      trainerSprite.value = ALL_CATALOG_SPRITES[Math.floor(Math.random() * ALL_CATALOG_SPRITES.length)] || 'youngster'
    }
  }

  function generateRandomTeam() {
    const size = Math.max(1, Math.min(6, genTeamSize.value))
    const team: Pokemon[] = []

    if (selectedPreset.value === 'random') {
      trainerArchetype.value = undefined
      randomizeTrainer()
      const dbKeys = Object.keys(pokemonDataProvider.getPokemonDb())
      for (let i = 0; i < size; i++) {
        const randomSpecies = dbKeys[Math.floor(Math.random() * dbKeys.length)] || 'bulbasaur'
        const level = Math.floor(Math.random() * (genMaxLevel.value - genMinLevel.value + 1)) + genMinLevel.value
        const isShiny = genForceShiny.value || Math.random() < 0.05
        const p = pokemonDebugService.generate({
          id: requirePokemonSpeciesId(randomSpecies),
          level: Math.max(1, Math.min(100, level)),
          isShiny
        })
        if (p) {
          p.isGuardian = Math.random() < genGuardianProb.value
          team.push(p)
        }
      }
    } else {
      const archetype = selectedPreset.value
      trainerArchetype.value = isTrainerTypeKey(archetype) ? TRAINER_TYPES[archetype].archetype : archetype
      trainerName.value = generateThemedTrainerName(archetype)

      const availableSprites = getSpritesForArchetype(archetype as NpcArchetype)
      trainerSprite.value = availableSprites[Math.floor(Math.random() * availableSprites.length)] || 'youngster'

      const pool: readonly PokemonSpeciesId[] = isTrainerTypeKey(archetype) ? TRAINER_TYPES[archetype].pool : ['rattata']
      for (let i = 0; i < size; i++) {
        const randomSpecies = pool[Math.floor(Math.random() * pool.length)] || 'rattata'
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
    }

    enemyTeam.value = team
    selectedPokeIndex.value = team.length > 0 ? 0 : null
  }

  function loadPolicePreset() {
    trainerName.value = 'Oficial de Policía'
    trainerSprite.value = 'tamer'
    trainerArchetype.value = 'policeman'
    combatLocationType.value = 'map'

    const pool: PokemonSpeciesId[] = ['growlithe', 'arcanine', 'machoke', 'magneton', 'pidgeot'] as const
    const team: Pokemon[] = []
    
    const teamAlive = gameStore.state.team.filter((p: Pokemon | null) => p && p.hp > 0)
    const averagePlayerLevel = teamAlive.length === 0 ? 30 : Math.floor(teamAlive.reduce((acc: number, cur: Pokemon | null) => acc + (cur?.level || 0), 0) / teamAlive.length)

    const lvl = Math.max(10, averagePlayerLevel + 2)

    pool.forEach(id => {
      const p = pokemonDebugService.generate({
        id,
        level: lvl,
        ivs: { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 }
      })
      if (p) team.push(p)
    })

    enemyTeam.value = team.slice(0, 3)
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
        trainerSprite: trainerSprite.value,
        trainerArchetype: trainerArchetype.value
      }
    }

    await battleStore.startBattle(firstEnemy, opts as BattleOptions) // domain-ok
    modalStore.closeAll()
  }

  return {
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
    availableSpriteList,
    randomizeTrainer,
    randomizeTrainerName,
    randomizeTrainerSprite,
    generateRandomTeam,
    loadPolicePreset,
    addPokemonToTeam,
    removePokemonFromTeam,
    startCombat,
    debugStore
  }
}
