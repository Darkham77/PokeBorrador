import { ref, computed, watch, onUnmounted } from 'vue'
import { useCombatShadowStore } from '@/stores/battle/combatShadows'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getPokemonFeetCoords } from '@/logic/combat/shadowHelpers'
import { ANIMATED_SPRITE_DATABASE } from '@/data/pokemon/animatedSpriteDatabase'
import { POKEMON_SPRITE_IDS } from '@/data/pokemon/spriteMapping'

import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { logger } from '@/logic/utils/logger'

function resolveAnimatedKey(
  pokemonId: string | number | null | undefined,
  isBack = false,
  gender?: string | null
): string | null {
  if (!pokemonId) return null
  const strId = String(pokemonId).toLowerCase()
  const spriteNum = (POKEMON_SPRITE_IDS as Record<string, number | string>)[strId] || pokemonId
  const match = String(spriteNum).match(/^(\d+)(.*)$/)
  if (!match) return null
  const numId = match[1]!
  const suffix = match[2]!
  const isFemale = gender === 'F'

  const candidates = [`${numId}i${suffix}`, `${numId}${suffix}`]
  for (const cand of candidates) {
    if (isBack) {
      if (isFemale && ANIMATED_SPRITE_DATABASE[`${cand}_f_back`]) {
        return `${cand}_f_back`
      }
      if (ANIMATED_SPRITE_DATABASE[`${cand}_back`]) {
        return `${cand}_back`
      }
    } else {
      if (isFemale && ANIMATED_SPRITE_DATABASE[`${cand}_f`]) {
        return `${cand}_f`
      }
      if (ANIMATED_SPRITE_DATABASE[cand]) {
        return cand
      }
    }
  }

  return null
}

function checkAnimated(pokemonId: string | null | undefined, gender?: string | null): boolean {
  if (!pokemonId) return false
  return !!resolveAnimatedKey(pokemonId, false, gender) || !!resolveAnimatedKey(pokemonId, true, gender)
}

function getFinalSpriteUrl(pokemon: { id: string | number; form?: string; gender?: string | null }, isShiny: boolean, isBack: boolean): string {
  const spriteId = pokemon.form && pokemon.form !== 'normal' ? `${pokemon.id}-${pokemon.form}` : String(pokemon.id)
  const isAnim = checkAnimated(spriteId, pokemon.gender)
  const url = getAssetUrl(ASSET_TYPES.POKEMON, spriteId, { isShiny, isBack, isAnimated: isAnim })
  if (isAnim && url) {
    const key = resolveAnimatedKey(spriteId, isBack, pokemon.gender)
    if (key) {
      const filename = key.replace(/_back$/, '')
      return url.replace(/\/([^/]+)\.webp$/i, `/${filename}.webp`)
    }
  }
  return url
}

const { ENTITY_SIZE_PLAYER, ENTITY_SIZE_ENEMY } = WORLD_CONSTANTS

interface Position {
  x: number
  y: number
}

export function isFlying(pokemon: Pokemon | null | undefined): boolean {
  if (!pokemon || !pokemon.id) return false
  const data = pokemonDataProvider.getPokemonData(pokemon.id)
  if (!data) return false
  if (data.isFloating !== undefined) return data.isFloating
  
  const types: string[] = []
  if (data.type) types.push(data.type.toLowerCase())
  if (data.type2) types.push(data.type2.toLowerCase())
  return types.includes('flying')
}

function getEffectiveSpriteId(pokemon: { id: string | number; form?: string }): string {
  return pokemon.form && pokemon.form !== 'normal' ? `${pokemon.id}-${pokemon.form}` : String(pokemon.id)
}

function getShadowWidth(pokemon: { id: string | number; form?: string; gender?: string | null }, isBack: boolean): string {
  const spriteId = getEffectiveSpriteId(pokemon)
  const animKey = resolveAnimatedKey(spriteId, isBack, pokemon.gender) || resolveAnimatedKey(spriteId, !isBack, pokemon.gender)
  const meta = animKey ? ANIMATED_SPRITE_DATABASE[animKey] : null
  const bodyRadius = meta?.bodyRadius ?? 0.4
  return `${bodyRadius * 250}%`
}

export function useBattleShadows() {
  const shadowStore = useCombatShadowStore()


  // Claves únicas para las sombras en el store
  const currentPlayerShadowKey = ref<string | null>(null)
  const currentEnemyShadowKey = ref<string | null>(null)

  const lastEnemyShadowId = ref<string | null>(null)
  const lastPlayerShadowId = ref<string | null>(null)

  // Coordenadas de "suelo" persistentes para evitar saltos
  const stableEnemyGroundY = ref('75%')
  const stablePlayerGroundY = ref('75%')

  const enemyGroundY = computed(() => stableEnemyGroundY.value)
  const playerGroundY = computed(() => stablePlayerGroundY.value)

  function getStableShadowId(pokemon: Pokemon | null, side: string): string | null {
    if (!pokemon) return null
    if (pokemon.uid) return `shadow_${pokemon.uid}`
    return `${side}_${pokemon.id}`
  }





  // Sincronizar visibilidad y posición de la sombra enemiga
  const syncEnemyShadow = async (visible: boolean, data: Pokemon | null, pos: Position, animState: unknown) => {
    const shadowId = getStableShadowId(data, 'enemy')
    
    // Inicializar coordenadas inmediatamente si el asiento está ocupado por un pokemon
    if (data) {
      const url = getFinalSpriteUrl(data, !!data.isShiny, false)
      getPokemonFeetCoords(url)
      stableEnemyGroundY.value = '75%'
    }

    // Limpieza de sombras huérfanas si el ID cambia (evita duplicados al capturar/cambiar)
    if (lastEnemyShadowId.value && lastEnemyShadowId.value !== shadowId) {
      if (lastEnemyShadowId.value) shadowStore.hideShadow(lastEnemyShadowId.value)
    }
    lastEnemyShadowId.value = shadowId
    currentEnemyShadowKey.value = shadowId

    // Ocultar sombra si está en cualquier estado de transición de Poké Ball (energía)
    const isEnergyState = !!animState 
    if (!visible || !data || isEnergyState) {
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
        spriteUrl: data ? getFinalSpriteUrl(data, !!data.isShiny, false) : '',
        width: data ? getShadowWidth(data, false) : '100%',
        visible: true
      })
    }
  }

  // Sincronizar visibilidad y posición de la sombra del jugador
  const syncPlayerShadow = async (pokemon: Pokemon | null, pos: Position, animState: unknown) => {
    const shadowId = getStableShadowId(pokemon, 'player')

    // Inicializar coordenadas inmediatamente si el asiento está ocupado por un pokemon
    if (pokemon) {
      const url = getFinalSpriteUrl(pokemon, !!pokemon.isShiny, true)
      getPokemonFeetCoords(url)
      stablePlayerGroundY.value = '75%'
    }

    // Limpieza de sombras huérfanas
    if (lastPlayerShadowId.value && lastPlayerShadowId.value !== shadowId) {
      if (lastPlayerShadowId.value) shadowStore.hideShadow(lastPlayerShadowId.value)
    }
    lastPlayerShadowId.value = shadowId
    currentPlayerShadowKey.value = shadowId

    // Ocultar sombra durante transiciones de energía
    const isEnergyState = !!animState
    if (!pokemon || isEnergyState) {
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
        spriteUrl: pokemon ? getFinalSpriteUrl(pokemon, !!pokemon.isShiny, true) : '',
        width: getShadowWidth(pokemon, true),
        visible: true
      })
    }
  }

  // Ground line is fixed at 75% — watchers based on shadow.feetY were removed because
  // feetY represents the foot position WITHIN the sprite, not the ground line in the entity box.
  watch(currentEnemyShadowKey, (val) => {
    if (!val) stableEnemyGroundY.value = '75%'
  })
  watch(currentPlayerShadowKey, (val) => {
    if (!val) stablePlayerGroundY.value = '75%'
  })

  const preloadTeamFeet = async (team: Pokemon[], side: string) => {
    if (!team || !Array.isArray(team)) return
    const tasks = team.map(p => {
      const isBack = side === 'player'
      const url = getFinalSpriteUrl(p, !!p.isShiny, isBack)
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
      const url = getFinalSpriteUrl(p1Data, !!p1Data.isShiny, true)
      if (shadowId) {
        tasks.push(shadowStore.requestShadow(shadowId, {
          side: 'player',
          entityX: p1Position.x,
          entityY: p1Position.y,
          entitySize: ENTITY_SIZE_PLAYER,
          isFlying: isFlying(p1Data),
          spriteUrl: url,
          width: getShadowWidth(p1Data, true),
          visible: true
        }))
      }
    }
    
    if (p2Data) {
      const shadowId = getStableShadowId(p2Data, 'enemy')
      currentEnemyShadowKey.value = shadowId
      const url = getFinalSpriteUrl(p2Data, !!p2Data.isShiny, false)
      if (shadowId) {
        tasks.push(shadowStore.requestShadow(shadowId, {
          side: 'enemy',
          entityX: p2Position.x,
          entityY: p2Position.y,
          entitySize: ENTITY_SIZE_ENEMY,
          isFlying: isFlying(p2Data),
          spriteUrl: url,
          width: getShadowWidth(p2Data, false),
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
