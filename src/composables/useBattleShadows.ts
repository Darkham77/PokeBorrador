import { ref, computed, watch, onUnmounted } from 'vue'
import { useCombatShadowStore } from '@/stores/combatShadows'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { POKEMON_FEET_DATABASE } from '@/data/pokemonFeetDatabase'

import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { Pokemon } from '@/types/pokemon'
import { logger } from '@/logic/utils/logger'

const { ENTITY_SIZE_PLAYER, ENTITY_SIZE_ENEMY } = WORLD_CONSTANTS

interface Position {
  x: number
  y: number
}

export function useBattleShadows() {
  const shadowStore = useCombatShadowStore()

  // Claves únicas para las sombras en el store
  const currentPlayerShadowKey = ref<string | null>(null)
  const currentEnemyShadowKey = ref<string | null>(null)

  const lastEnemyShadowId = ref<string | null>(null)
  const lastPlayerShadowId = ref<string | null>(null)

  // Coordenadas de "suelo" persistentes para evitar saltos
  const stableEnemyGroundY = ref('90%')
  const stablePlayerGroundY = ref('90%')

  const enemyGroundY = computed(() => stableEnemyGroundY.value)
  const playerGroundY = computed(() => stablePlayerGroundY.value)

  function getStableShadowId(pokemon: Pokemon | null, side: string): string | null {
    if (!pokemon) return null
    if (pokemon.uid) return `shadow_${pokemon.uid}`
    return `${side}_${pokemon.id}`
  }

  const isFlying = (pokemon: Pokemon | null) => {
    if (!pokemon || !pokemon.id) return false
    const data = pokemonDataProvider.getPokemonData(pokemon.id)
    if (!data) return false
    if (data.isFloating !== undefined) return data.isFloating
    
    const types: string[] = []
    if (data.type) types.push(data.type.toLowerCase())
    if (data.type2) types.push(data.type2.toLowerCase())
    return types.includes('flying')
  }

  // Sincronizar visibilidad y posición de la sombra enemiga
  const syncEnemyShadow = async (visible: boolean, data: Pokemon | null, pos: Position, animState: unknown) => {
    const shadowId = getStableShadowId(data, 'enemy')
    
    // Inicializar coordenadas inmediatamente si el asiento está ocupado por un pokemon
    if (data) {
      const url = getAssetUrl(ASSET_TYPES.POKEMON, data.id, { isShiny: data.isShiny, isBack: false })
      let dbKey = url || ''
      const base = import.meta.env.BASE_URL || '/'
      if (base !== '/' && dbKey.startsWith(base)) {
        dbKey = dbKey.slice(base.length - 1)
      }
      const cached = dbKey ? POKEMON_FEET_DATABASE[dbKey] : null
      if (!cached) {
        throw new Error(`[PokemonFeetDatabase] Sprite key "${dbKey}" not found in POKEMON_FEET_DATABASE. Did you forget to compile assets? Run "npm run assets:convert".`)
      }
      const isFlyingPoke = isFlying(data)
      
      stableEnemyGroundY.value = isFlyingPoke ? '90%' : `${cached.feetY * 100}%`
    }

    // Limpieza de sombras huérfanas si el ID cambia (evita duplicados al capturar/cambiar)
    if (lastEnemyShadowId.value && lastEnemyShadowId.value !== shadowId) {
      if (lastEnemyShadowId.value) shadowStore.hideShadow(lastEnemyShadowId.value)
    }
    lastEnemyShadowId.value = shadowId
    currentEnemyShadowKey.value = shadowId

    // Ocultar sombra si está en cualquier estado de transición de Poké Ball (energía)
    const isEnergyState = !!animState 
    if (!visible || !data || data.hp <= 0 || isEnergyState) {
      if (shadowId) shadowStore.hideShadow(shadowId)
      return
    }

    if (shadowId) {
      await shadowStore.requestShadow(shadowId, {
        side: 'enemy',
        entityX: pos.x,
        entityY: pos.y,
        entitySize: ENTITY_SIZE_ENEMY,
        isFlying: isFlying(data),
        spriteUrl: getAssetUrl(ASSET_TYPES.POKEMON, data.id, { isShiny: data.isShiny, isBack: false }),
        visible: true
      })
    }
  }

  // Sincronizar visibilidad y posición de la sombra del jugador
  const syncPlayerShadow = async (pokemon: Pokemon | null, pos: Position, animState: unknown) => {
    const shadowId = getStableShadowId(pokemon, 'player')

    // Inicializar coordenadas inmediatamente si el asiento está ocupado por un pokemon
    if (pokemon) {
      const url = getAssetUrl(ASSET_TYPES.POKEMON, pokemon.id, { isShiny: pokemon.isShiny, isBack: true })
      let dbKey = url || ''
      const base = import.meta.env.BASE_URL || '/'
      if (base !== '/' && dbKey.startsWith(base)) {
        dbKey = dbKey.slice(base.length - 1)
      }
      const cached = dbKey ? POKEMON_FEET_DATABASE[dbKey] : null
      if (!cached) {
        throw new Error(`[PokemonFeetDatabase] Sprite key "${dbKey}" not found in POKEMON_FEET_DATABASE. Did you forget to compile assets? Run "npm run assets:convert".`)
      }
      const isFlyingPoke = isFlying(pokemon)

      stablePlayerGroundY.value = isFlyingPoke ? '90%' : `${cached.feetY * 100}%`
    }

    // Limpieza de sombras huérfanas
    if (lastPlayerShadowId.value && lastPlayerShadowId.value !== shadowId) {
      if (lastPlayerShadowId.value) shadowStore.hideShadow(lastPlayerShadowId.value)
    }
    lastPlayerShadowId.value = shadowId
    currentPlayerShadowKey.value = shadowId

    // Ocultar sombra durante transiciones de energía
    const isEnergyState = !!animState
    if (!pokemon || pokemon.hp <= 0 || isEnergyState) {
      if (shadowId) shadowStore.hideShadow(shadowId)
      return
    }

    if (shadowId) {
      await shadowStore.requestShadow(shadowId, {
        side: 'player',
        entityX: pos.x,
        entityY: pos.y,
        entitySize: ENTITY_SIZE_PLAYER,
        isFlying: isFlying(pokemon),
        spriteUrl: getAssetUrl(ASSET_TYPES.POKEMON, pokemon.id, { isShiny: pokemon.isShiny, isBack: true }),
        visible: true
      })
    }
  }

  // Watchers de actualización de feetY basados en el store
  watch(() => shadowStore.activeShadows.get(currentEnemyShadowKey.value || ''), (shadow) => {
    if (shadow) stableEnemyGroundY.value = `${shadow.feetY * 100}%`
  }, { deep: true })

  watch(() => shadowStore.activeShadows.get(currentPlayerShadowKey.value || ''), (shadow) => {
    if (shadow) stablePlayerGroundY.value = `${shadow.feetY * 100}%`
  }, { deep: true })

  // Solo resetear si no hay un shadowKey válido (limpieza profunda)
  watch(currentEnemyShadowKey, (val) => {
    if (!val) stableEnemyGroundY.value = '90%'
  })
  watch(currentPlayerShadowKey, (val) => {
    if (!val) stablePlayerGroundY.value = '90%'
  })

  const preloadTeamFeet = async (team: Pokemon[], side: string) => {
    if (!team || !Array.isArray(team)) return
    const tasks = team.map(p => {
      const isBack = side === 'player'
      const url = getAssetUrl(ASSET_TYPES.POKEMON, p.id, { isShiny: p.isShiny, isBack })
      return shadowStore.detectFeetPoints(url)
    })
    return Promise.all(tasks)
  }

  const preloadCombatCoords = async (
    p1Data: Pokemon | null, 
    p2Data: Pokemon | null, 
    p1Position: Position, 
    p2Position: Position, 
    p1Team: Pokemon[], 
    p2Team: Pokemon[]
  ) => {
    const tasks = []
    
    // Pre-cargar puntos de pies de TODOS los equipos para evitar el lag de la "primera vez"
    if (p1Team) tasks.push(preloadTeamFeet(p1Team, 'player'))
    if (p2Team) tasks.push(preloadTeamFeet(p2Team, 'enemy'))

    if (p1Data) {
      const shadowId = getStableShadowId(p1Data, 'player')
      currentPlayerShadowKey.value = shadowId
      const url = getAssetUrl(ASSET_TYPES.POKEMON, p1Data.id, { isShiny: p1Data.isShiny, isBack: true })
      if (shadowId) {
        tasks.push(shadowStore.requestShadow(shadowId, {
          side: 'player',
          entityX: p1Position.x,
          entityY: p1Position.y,
          entitySize: ENTITY_SIZE_PLAYER,
          isFlying: isFlying(p1Data),
          spriteUrl: url,
          visible: true
        }))
      }
    }
    
    if (p2Data) {
      const shadowId = getStableShadowId(p2Data, 'enemy')
      currentEnemyShadowKey.value = shadowId
      const url = getAssetUrl(ASSET_TYPES.POKEMON, p2Data.id, { isShiny: p2Data.isShiny, isBack: false })
      if (shadowId) {
        tasks.push(shadowStore.requestShadow(shadowId, {
          side: 'enemy',
          entityX: p2Position.x,
          entityY: p2Position.y,
          entitySize: ENTITY_SIZE_ENEMY,
          isFlying: isFlying(p2Data),
          spriteUrl: url,
          visible: true
        }))
      }
    }
    if (tasks.length > 0) {
      await Promise.all(tasks).catch(err => logger.warn('Shadow', `Preloading failed: ${(err as Error).message}`))
    }
  }

  onUnmounted(() => {
    shadowStore.clearAll()
  })

  return {
    currentPlayerShadowKey,
    currentEnemyShadowKey,
    enemyGroundY,
    playerGroundY,
    syncEnemyShadow,
    syncPlayerShadow,
    preloadCombatCoords,
    getStableShadowId
  }
}
