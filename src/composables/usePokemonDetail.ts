import { computed, toValue } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { POKEMON_SPRITE_IDS } from '@/logic/pokedexConstants'
import { MOVE_DATA } from '@/data/moves'
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '@/data/evolutionData'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

export function usePokemonDetail(propsRefs: Record<string, any>) {
  const uiStore = useUIStore()
  const gameStore = useGameStore()

  // Normalize inputs (props are passed as a reactive object or refs)
  const getProp = (key: string) => toValue(propsRefs[key])

  const uiData = computed(() => (uiStore as any).modals?.PokemonDetail?.data || {})
  
  const finalIndex = computed(() => {
    const pIdx = getProp('index')
    return pIdx !== -1 ? pIdx : (uiData.value.index ?? -1)
  })

  const finalContext = computed(() => {
    const pCtx = getProp('context')
    return (pCtx && pCtx !== 'pokedex') ? pCtx : (uiData.value.context || 'pokedex')
  })

  const targetPokemon = computed(() => {
    if (finalIndex.value > -1) {
      if (finalContext.value === 'team') return gameStore.state.team[finalIndex.value]
      if (finalContext.value === 'box') return gameStore.state.box[finalIndex.value]
    }
    return getProp('pokemon') || uiData.value.pokemon
  })

  const isInstance = computed(() => !!targetPokemon.value)

  const targetSpeciesId = computed(() => {
    const id = isInstance.value ? targetPokemon.value.id : getProp('speciesId')
    return String(id).toLowerCase()
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

    const enrichEvo = (evo: any) => {
      const toId = evo.to.toLowerCase()
      const isCaught = caught.includes(toId)
      const isSeen = isCaught || seen.includes(toId)
      return { ...evo, isSeen, isCaught }
    }

    if ((EVOLUTION_TABLE as any)[id]) {
      const ev = (EVOLUTION_TABLE as any)[id]
      list.push(enrichEvo({ type: 'level', requirement: `Nv. ${ev.level}`, to: ev.to }))
    }
    
    Object.keys(STONE_EVOLUTIONS).forEach(key => {
      if (key === id || key.startsWith(`${id}_`)) {
        const ev = (STONE_EVOLUTIONS as any)[key]
        list.push(enrichEvo({ type: 'stone', requirement: ev.stone, to: ev.to }))
      }
    })

    if ((TRADE_EVOLUTIONS as any)[id]) {
      list.push(enrichEvo({ type: 'trade', requirement: 'Intercambio', to: (TRADE_EVOLUTIONS as any)[id] }))
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
      const base = (species.value?.stats as any)[key]
      const current = isInstance.value ? (targetPokemon.value[key] || base) : base
      return {
        id: key,
        label: labels[key],
        value: current,
        baseValue: base,
        max: 255,
        color: colors[key],
        iv: isInstance.value ? targetPokemon.value.ivs?.[key] : null
      }
    })
  })

  const moveDetails = computed(() => {
    if (!species.value || !species.value.learnset) return []
    return species.value.learnset.map((m: any) => {
      const data = (MOVE_DATA as any)[m.name] || {}
      return {
        level: m.lv,
        name: m.name,
        type: data.type || 'normal',
        cat: data.cat || 'physical',
        power: data.power || '-',
        acc: data.acc || '-',
        pp: data.pp || '-'
      }
    }).sort((a: any, b: any) => a.level - b.level)
  })

  const currentMoves = computed(() => {
    if (!isInstance.value || !targetPokemon.value.moves) return []
    return targetPokemon.value.moves.map((m: any) => {
      const data = (MOVE_DATA as any)[m.name] || {}
      return { ...m, ...data }
    })
  })

  const canStoneEvolve = computed(() => {
    const id = targetSpeciesId.value
    return Object.keys(STONE_EVOLUTIONS).some(key => key === id || key.startsWith(`${id}_`))
  })

  const instancePhysicalData = computed(() => {
    if (!isInstance.value || !species.value) return null
    const p = targetPokemon.value
    const uid = p.uid || 'def'
    const getRand = (seed: string, range: any) => {
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
    const p = targetPokemon.value
    if (!p) return null
    const dateVal = p.captureDate || p.timestamp || p.date || p.created_at || p.obtainedAt
    if (!dateVal) return isInstance.value ? 'SIN FECHA' : null
    
    try {
      const date = new Date(dateVal)
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    } catch (_) {
      return null
    }
  })

  const getSprite = (id: string, isShiny: boolean = false) => getAssetUrl(ASSET_TYPES.POKEMON, id, { shiny: isShiny })

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
