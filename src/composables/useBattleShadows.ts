import { ref, computed, watch, onUnmounted } from 'vue'
import { useCombatShadowStore } from '@/stores/combatShadows'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

const { ENTITY_SIZE_PLAYER, ENTITY_SIZE_ENEMY } = WORLD_CONSTANTS

export function useBattleShadows() {
  const shadowStore = useCombatShadowStore()

  // Claves únicas para las sombras en el store
  const currentPlayerShadowKey = ref(null)
  const currentEnemyShadowKey = ref(null)

  const lastEnemyShadowId = ref(null)
  const lastPlayerShadowId = ref(null)

  // Coordenadas de "suelo" persistentes para evitar saltos
  const stableEnemyGroundY = ref('90%')
  const stablePlayerGroundY = ref('90%')

  const enemyGroundY = computed(() => stableEnemyGroundY.value)
  const playerGroundY = computed(() => stablePlayerGroundY.value)

  function getStableShadowId(pokemon, side) {
    if (!pokemon) return null
    if (pokemon.uid) return `shadow_${pokemon.uid}`
    return `${side}_${pokemon.id}`
  }

  const isFlying = (pokemon) => {
    if (!pokemon || !pokemon.id) return false
    // Si el objeto ya trae la propiedad (ej: inyectada), la usamos
    if (pokemon.isFloating !== undefined) return pokemon.isFloating
    // Si no, consultamos al provider centralizado de estética
    const data = pokemonDataProvider.getPokemonData(pokemon.id)
    return data?.isFloating || false
  }

  // Sincronizar visibilidad y posición de la sombra enemiga
  const syncEnemyShadow = async (visible, data, pos, animState) => {
    const shadowId = getStableShadowId(data, 'enemy')
    
    // Limpieza de sombras huérfanas si el ID cambia (evita duplicados al capturar/cambiar)
    if (lastEnemyShadowId.value && lastEnemyShadowId.value !== shadowId) {
      shadowStore.hideShadow(lastEnemyShadowId.value)
      
      // Intentar usar caché inmediatamente para evitar saltos al 90% si no es necesario
      const url = data ? getAssetUrl(ASSET_TYPES.POKEMON, data.id, { isShiny: data.isShiny, isBack: false }) : null
      const cached = url ? shadowStore.feetCache.get(url) : null
      const isFlyingPoke = isFlying(data)
      
      stableEnemyGroundY.value = isFlyingPoke ? '90%' : (cached ? `${cached.feetY * 100}%` : '90%')
    }
    lastEnemyShadowId.value = shadowId
    currentEnemyShadowKey.value = shadowId

    // Ocultar sombra si está en cualquier estado de transición de Poké Ball (energía)
    const isEnergyState = !!animState 
    if (!visible || !data || data.hp <= 0 || isEnergyState) {
      if (shadowId) shadowStore.hideShadow(shadowId)
      return
    }

    await shadowStore.requestShadow(shadowId, {
      side: 'enemy',
      entityX: pos.x,
      entityY: pos.y,
      entitySize: ENTITY_SIZE_ENEMY,
      isFlying: isFlying(data),
      spriteUrl: getAssetUrl(ASSET_TYPES.POKEMON, data.id, { isShiny: data.isShiny, isBack: false }),
      precalculate: true,
      visible: true
    })
  }

  // Sincronizar visibilidad y posición de la sombra del jugador
  const syncPlayerShadow = async (pokemon, pos, animState) => {
    const shadowId = getStableShadowId(pokemon, 'player')

    // Limpieza de sombras huérfanas
    if (lastPlayerShadowId.value && lastPlayerShadowId.value !== shadowId) {
      shadowStore.hideShadow(lastPlayerShadowId.value)
      
      const url = pokemon ? getAssetUrl(ASSET_TYPES.POKEMON, pokemon.id, { isShiny: pokemon.isShiny, isBack: true }) : null
      const cached = url ? shadowStore.feetCache.get(url) : null
      const isFlyingPoke = isFlying(pokemon)

      stablePlayerGroundY.value = isFlyingPoke ? '90%' : (cached ? `${cached.feetY * 100}%` : '90%')
    }
    lastPlayerShadowId.value = shadowId
    currentPlayerShadowKey.value = shadowId

    // Ocultar sombra durante transiciones de energía
    const isEnergyState = !!animState
    if (!pokemon || pokemon.hp <= 0 || isEnergyState) {
      if (shadowId) shadowStore.hideShadow(shadowId)
      return
    }

    await shadowStore.requestShadow(shadowId, {
      side: 'player',
      entityX: pos.x,
      entityY: pos.y,
      entitySize: ENTITY_SIZE_PLAYER,
      isFlying: isFlying(pokemon),
      spriteUrl: getAssetUrl(ASSET_TYPES.POKEMON, pokemon.id, { isShiny: pokemon.isShiny, isBack: true }),
      precalculate: true,
      visible: true
    })
  }

  // Watchers de actualización de feetY basados en el store
  watch(() => shadowStore.activeShadows.get(currentEnemyShadowKey.value), (shadow) => {
    if (shadow) stableEnemyGroundY.value = `${shadow.feetY * 100}%`
  }, { deep: true })

  watch(() => shadowStore.activeShadows.get(currentPlayerShadowKey.value), (shadow) => {
    if (shadow) stablePlayerGroundY.value = `${shadow.feetY * 100}%`
  }, { deep: true })

  // Solo resetear si no hay un shadowKey válido (limpieza profunda)
  watch(currentEnemyShadowKey, (val) => {
    if (!val) stableEnemyGroundY.value = '90%'
  })
  watch(currentPlayerShadowKey, (val) => {
    if (!val) stablePlayerGroundY.value = '90%'
  })

  const preloadTeamFeet = async (team, side) => {
    if (!team || !Array.isArray(team)) return
    const tasks = team.map(p => {
      const isBack = side === 'player'
      const url = getAssetUrl(ASSET_TYPES.POKEMON, p.id, { isShiny: p.isShiny, isBack })
      return shadowStore.detectFeetPoints(url)
    })
    return Promise.all(tasks)
  }

  const preloadCombatCoords = async (p1Data, p2Data, p1Position, p2Position, p1Team, p2Team) => {
    const tasks = []
    
    // Pre-cargar puntos de pies de TODOS los equipos para evitar el lag de la "primera vez"
    if (p1Team) tasks.push(preloadTeamFeet(p1Team, 'player'))
    if (p2Team) tasks.push(preloadTeamFeet(p2Team, 'enemy'))

    if (p1Data) {
      const shadowId = getStableShadowId(p1Data, 'player')
      currentPlayerShadowKey.value = shadowId
      const url = getAssetUrl(ASSET_TYPES.POKEMON, p1Data.id, { isShiny: p1Data.isShiny, isBack: true })
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
    
    if (p2Data) {
      const shadowId = getStableShadowId(p2Data, 'enemy')
      currentEnemyShadowKey.value = shadowId
      const url = getAssetUrl(ASSET_TYPES.POKEMON, p2Data.id, { isShiny: p2Data.isShiny, isBack: false })
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

    if (tasks.length > 0) {
      await Promise.all(tasks).catch(err => console.warn('[useBattleShadows] Preloading failed:', err))
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
