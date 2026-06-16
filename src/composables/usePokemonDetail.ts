
import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { POKEMON_SPRITE_IDS } from '@/logic/constants/pokedexConstants'
import { MOVE_DATA } from '@/data/moves'
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '@/data/evolutionData'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { Pokemon } from '@/types/pokemon'
import type { MoveBaseData } from '@/types/database'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'

interface EvolutionEntry {
  type: 'level' | 'stone' | 'trade';
  requirement: string;
  to: string;
  isSeen: boolean;
  isCaught: boolean;
}

export function usePokemonDetail(propsRefs: Record<string, MaybeRefOrGetter<unknown>>) {
  const gameStore = useGameStore()
  const modalStore = useModalStore()

  // Normalize inputs (props are passed as a reactive object or refs)
  const getProp = <T,>(key: string): T | undefined => toValue(propsRefs[key]) as T | undefined

  const uiData = computed(() => {
    const modal = modalStore.stack.find(m => m.name === 'PokemonDetail')
    return (modal?.props || {}) as { pokemon?: Pokemon, index?: number, context?: string }
  })
  
  const finalIndex = computed(() => {
    const pIdx = getProp<number>('index') ?? -1
    return pIdx !== -1 ? pIdx : (uiData.value.index ?? -1)
  })

  const finalContext = computed(() => {
    const pCtx = getProp<string>('context')
    return (pCtx && pCtx !== 'pokedex') ? pCtx : (uiData.value.context || 'pokedex')
  })

  const targetPokemon = computed(() => {
    if (finalIndex.value > -1) {
      if (finalContext.value === 'team') return gameStore.state.team[finalIndex.value]
      if (finalContext.value === 'box') return gameStore.state.box[finalIndex.value]
    }
    return getProp<Pokemon>('pokemon') || uiData.value.pokemon
  })

  const isInstance = computed(() => !!targetPokemon.value)

  const targetSpeciesId = computed(() => {
    const id = isInstance.value ? targetPokemon.value?.id : getProp<string>('speciesId')
    return String(id || '').toLowerCase()
  })

  const speciesRaw = computed(() => pokemonDataProvider.getPokemonData(targetSpeciesId.value))

  const species = computed(() => {
    if (!speciesRaw.value) return null
    const s = speciesRaw.value
    const types = Array.isArray(s.type) ? s.type : [s.type]
    const nationalId = POKEMON_SPRITE_IDS[targetSpeciesId.value] || 0
    
    return {
      ...s,
      nationalId: nationalId.toString(),
      type: types,
      stats: {
        hp: s.hp || 0,
        atk: s.atk || 0,
        def: s.def || 0,
        spa: s.spa || 0,
        spd: s.spd || 0,
        spe: s.spe || 0
      }
    }
  })

  const cleanCategory = computed(() => {
    if (!species.value?.category) return 'Desconocido'
    return species.value.category.replace(/^Pokémon\s+/i, '')
  })

  const evolutions = computed(() => {
    const list = []
    const id = targetSpeciesId.value
    const caught = gameStore.state.pokedex || []
    const seen = gameStore.state.seenPokedex || []

    const enrichEvo = (evo: { type: 'level' | 'stone' | 'trade', requirement: string, to: string }): EvolutionEntry => {
      const toId = evo.to.toLowerCase()
      const isCaught = caught.includes(toId)
      const isSeen = isCaught || seen.includes(toId)
      return { ...evo, isSeen, isCaught }
    }

    const evoTable = EVOLUTION_TABLE as Record<string, { level: number, to: string } | undefined>
    if (evoTable[id]) {
      const ev = evoTable[id]!
      list.push(enrichEvo({ type: 'level', requirement: `Nv. ${ev.level}`, to: ev.to }))
    }
    
    const stoneTable = STONE_EVOLUTIONS as Record<string, { stone: string, to: string } | undefined>
    Object.keys(stoneTable).forEach(key => {
      if (key === id || key.startsWith(`${id}_`)) {
        const ev = stoneTable[key]!
        list.push(enrichEvo({ type: 'stone', requirement: ev.stone, to: ev.to }))
      }
    })

    const tradeTable = TRADE_EVOLUTIONS as Record<string, string | undefined>
    if (tradeTable[id]) {
      list.push(enrichEvo({ type: 'trade', requirement: 'Intercambio', to: tradeTable[id]! }))
    }
    return list
  })

  const displayStats = computed(() => {
    if (!species.value) return []
    const labels: Record<string, string> = { hp: 'HP', atk: 'ATK', def: 'DEF', spa: 'SPA', spd: 'SPD', spe: 'SPE' }
    const colors: Record<string, string> = { 
      hp: 'Rgba(255, 89, 89, 1)', 
      atk: 'Rgba(245, 172, 120, 1)', 
      def: 'Rgba(250, 224, 120, 1)', 
      spa: 'Rgba(157, 183, 245, 1)', 
      spd: 'Rgba(167, 219, 141, 1)', 
      spe: 'Rgba(250, 146, 178, 1)' 
    }
    return Object.keys(species.value.stats).map(key => {
      const base = (species.value?.stats as Record<string, number>)[key] || 0
      const current = isInstance.value ? (((targetPokemon.value as unknown as Record<string, number>)[key]) || base) : base
      return {
        id: key,
        label: labels[key] || key.toUpperCase(),
        value: current,
        baseValue: base,
        max: 255,
        color: colors[key] || '#888',
        iv: isInstance.value ? (targetPokemon.value?.ivs as Record<string, number> | undefined)?.[key] || 0 : 0
      }
    })
  })

  const moveDetails = computed(() => {
    if (!species.value || !species.value.learnset) return []
    return species.value.learnset.map(m => {
      const resolvedId = pokemonDataProvider.resolveMoveId(m.name)
      const data = (MOVE_DATA as Record<string, MoveBaseData | undefined>)[resolvedId]
      const basePP = data?.pp || 35
      return {
        level: m.lv,
        name: m.name,
        type: data?.type || 'normal',
        cat: data?.cat || 'physical',
        power: data?.power ?? 0,
        acc: data?.acc ?? 100,
        pp: basePP,
        maxPP: basePP
      }
    }).sort((a, b) => a.level - b.level)
  })

  const currentMoves = computed(() => {
    if (!isInstance.value || !targetPokemon.value?.moves) return []
    return targetPokemon.value.moves.map((m: Pokemon['moves'][number]) => {
      if (!m) return null
      const resolvedId = pokemonDataProvider.resolveMoveId(m.name)
      const data = (MOVE_DATA as Record<string, MoveBaseData | undefined>)[resolvedId]
      return { ...m, ...(data || {}) }
    }).filter((m: unknown): m is (Pokemon['moves'][number] & Partial<MoveBaseData>) => m !== null)
  })

  const canStoneEvolve = computed(() => {
    const id = targetSpeciesId.value
    return Object.keys(STONE_EVOLUTIONS).some(key => key === id || key.startsWith(`${id}_`))
  })

  const instancePhysicalData = computed(() => {
    const p = targetPokemon.value as (Pokemon & { height?: number, weight?: number }) | undefined
    if (!isInstance.value || !p || !species.value) return null
    const uid = p.uid || 'def'
    const getRand = (seed: string, range: number | [number, number] | null) => {
      if (!range) return '0.0'
      const min = Array.isArray(range) ? range[0] : range * 0.85
      const max = Array.isArray(range) ? range[1] : range * 1.15
      let hash = 0
      for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash)
      const normalized = (Math.abs(hash) % 100) / 100
      return (min + normalized * (max - min)).toFixed(1)
    }
    return {
      height: p.height || getRand(uid + 'h', species.value.height),
      weight: p.weight || getRand(uid + 'w', species.value.weight)
    }
  })

  const captureDateFormatted = computed(() => {
    const p = targetPokemon.value as (Pokemon & { captureDate?: string, timestamp?: number, date?: string, created_at?: string }) | undefined
    if (!p) return null
    const dateVal = p.captureDate || p.timestamp || p.date || p.created_at || p.obtainedAt
    if (!dateVal) return isInstance.value ? 'SIN FECHA' : null
    
    try {
      return (typeof dateVal === 'string' ? Temporal.Instant.from(dateVal) : Temporal.Instant.fromEpochMilliseconds(Number(dateVal)))
        .toZonedDateTimeISO(GAME_TIMEZONE)
        .toLocaleString('es-ES', { 
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
          hour12: false
        })
    } catch (_) {
      return null
    }
  })

  const getSprite = (id: string, isShiny: boolean = false) => getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny })

  return {
    targetPokemon,
    isInstance,
    targetSpeciesId,
    species,
    cleanCategory,
    evolutions,
    displayStats,
    moveDetails,
    currentMoves,
    canStoneEvolve,
    instancePhysicalData,
    captureDateFormatted,
    getSprite,
    finalIndex,
    finalContext
  }
}
