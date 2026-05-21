<script setup lang="ts">
// [PureVue-Ignore-Length]
import { computed, ref, onUnmounted, onMounted, watch } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { MAP_ROUTE_MAPPING } from '@/data/map-assets'
import { translateType } from '@/data/types'

import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { useMapStore } from '@/stores/map'
import { getRouteWeather, getWeatherMultiplier } from '@/logic/weatherUtils'
import { getMechanicalWeather, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, WEATHER_REGISTRY } from '@/logic/weather/weatherRegistry'
import { logger } from '@/logic/utils/logger'

import { checkPlayerWinner, calculateSpawnGrid } from '@/logic/map/mapCardHelper'

// Semilla aleatoria única para esta instancia de tarjeta en esta sesión
const sessionWeatherSeed = Math.random() * 1000

// Flare URLs for spawn auras
const flare1Url = getAssetUrl(ASSET_TYPES.ENVIRONMENT, 'flare_1')
const flare2Url = getAssetUrl(ASSET_TYPES.ENVIRONMENT, 'flare_2')

import type { MapLocation } from '@/types/encounters'

import type { DominanceInfo } from '@/types/stores'

interface SpawnPool {
  generic: string[]
  specific: string[]
  rates: Record<string, number>
}

interface Props {
  map: MapLocation
  isLocked?: boolean
  isSafariLocked?: boolean
  cycle?: 'morning' | 'day' | 'dusk' | 'night'
  weather?: string
  badgeCount?: number
  dominance?: DominanceInfo | null
  isRocketExtorted?: boolean
  spawnPool?: SpawnPool
  forcedWeather?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  isLocked: false,
  isSafariLocked: false,
  cycle: 'day',
  weather: 'clear',
  badgeCount: 0,
  dominance: null,
  isRocketExtorted: false,
  spawnPool: () => ({ generic: [], specific: [], rates: {} }),
  forcedWeather: null
})

const emit = defineEmits<{
  (e: 'navigate', map: MapLocation): void
}>()

const uiStore = useUIStore()
const battleStore = useBattleStore()
const mapStore = useMapStore()
const gameStore = useGameStore()

const cardRef = ref<HTMLElement | null>(null)

const isPerformanceMode = computed(() => {
  return uiStore.isAnyBlockingModalOpen || battleStore.isBattleActive || uiStore.isDebugPerformanceMode
})

const imgPath = computed(() => {
  const fileName = (MAP_ROUTE_MAPPING as Record<string, string>)[props.map.id] || 'default'
  return getAssetUrl(ASSET_TYPES.MAP, fileName, { 
    cycle: props.cycle,
    isLowPower: uiStore.isLowPowerActive
  })
})

const cycleEmoji = computed(() => {
  const emojis: Record<string, string> = { morning: '🌅', day: '🌞', dusk: '🌇', night: '🌙' }
  return emojis[props.cycle as string] || '🌞'
})

const cycleName = computed(() => {
  const names: Record<string, string> = { morning: 'Mañana', day: 'Día', afternoon: 'Tarde', dusk: 'Atardecer', night: 'Noche' }
  return names[props.cycle as string] || 'Normal'
})

const seasonName = computed(() => mapStore.currentSeason.label)
const seasonEmoji = computed(() => mapStore.currentSeason.icon)

const computedWeather = computed(() => {
  return props.forcedWeather || mapStore.globalWeather || getRouteWeather(props.map.id, mapStore.currentSeason.id, mapStore.currentEpochHour, mapStore.currentCycle)
})

const weatherEmoji = computed(() => {
  const visual = WEATHER_VISUAL_METADATA[computedWeather.value as string]
  if (visual) return visual.icon
  const mech = getMechanicalWeather(computedWeather.value as string)
  return WEATHER_UI_METADATA[mech]?.icon || ''
})

const weatherName = computed(() => {
  const visual = WEATHER_VISUAL_METADATA[computedWeather.value as string]
  if (visual) return visual.label
  const mech = getMechanicalWeather(computedWeather.value as string)
  return WEATHER_UI_METADATA[mech]?.label || 'Normal'
})

const weatherModifiersDescription = computed(() => {
  const entry = WEATHER_REGISTRY[computedWeather.value as string]
  const mods = entry?.modifiers
  if (!mods) return ''

  const formatList = (list?: string[]) => (list || []).map(translateType).join(', ')
  
  let lines = []
  if (mods.boost?.length) lines.push(`▲ ${formatList(mods.boost)}`)
  if (mods.debuff?.length) lines.push(`▼ ${formatList(mods.debuff)}`)
  if (mods.block?.length) lines.push(`🚫 ${formatList(mods.block)}`)
  
  return lines.length ? `\n\n${lines.join('\n')}` : ''
})

const atmosphere = ref<{ animClass?: string } | null>(null)

const factionAnimClass = computed(() => {
  if (!props.dominance?.winner) return ''
  return props.dominance.winner === 'union' ? 'anim-shine' : 'anim-thump'
})

const getPokemonSprite = (id: string) => getAssetUrl(ASSET_TYPES.POKEMON, id)

const getFormattedTypes = (data: { type: string | string[]; type2?: string }): string => {
  const types: string[] = []
  if (Array.isArray(data.type)) {
    types.push(...data.type)
  } else {
    if (data.type) types.push(data.type)
    if (data.type2) types.push(data.type2)
  }
  return types.map(translateType).join('/').toUpperCase()
}

const processedGuardian = computed(() => {
  if (!props.dominance?.guardian) return null
  const id = props.dominance.guardian.id
  let isSeen = (gameStore.state.seenPokedex || []).includes(id) || (gameStore.state.pokedex || []).includes(id)
  let isCaught = (gameStore.state.pokedex || []).includes(id)

  if (uiStore.debugPokedexMode === 'caught') {
    isSeen = true; isCaught = true
  } else if (uiStore.debugPokedexMode === 'seen') {
    isSeen = true
  } else if (uiStore.debugPokedexMode === 'none') {
    isSeen = false; isCaught = false
  }
  
  const data = isSeen ? pokemonDataProvider.getPokemonData(id) : null
  const name = isSeen ? (data?.name || id.toUpperCase()) : 'Desconocido'
  const typeInfo = (isSeen && data) ? getFormattedTypes(data) : '???'
  const captured = props.dominance.guardian.captured || false

  return { 
    ...props.dominance.guardian, 
    isSeen, 
    isCaught, 
    name, 
    typeInfo, 
    captured,
    sprite: getPokemonSprite(id), 
    seed: id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) / 100
  }
})

const isPlayerWinner = computed(() => checkPlayerWinner(props.dominance?.winner || null, gameStore.state.faction))

interface ProcessedSpawn {
  id: string | null
  key: string
  name?: string
  sprite?: string
  isSeen?: boolean
  isCaught?: boolean
  isRare?: boolean
  isAtmospheric?: boolean
  isDebuffed?: boolean
  tooltipTitle?: string
  tooltipDesc?: string
  seed?: number
}

const processedGrid = computed<ProcessedSpawn[]>(() => {
  const gridData = spawnGrid.value
  const slots = gridData.slots || []
  const seenPokedex = gameStore.state.seenPokedex || []
  const caughtPokedex = gameStore.state.pokedex || []
  

  return slots.map((id: string | null, index: number): ProcessedSpawn => {
    if (!id) return { id: null, key: `empty-${index}` }
    let isSeen = seenPokedex.includes(id) || caughtPokedex.includes(id)
    let isCaught = caughtPokedex.includes(id)

    if (uiStore.debugPokedexMode === 'caught') {
      isSeen = true; isCaught = true
    } else if (uiStore.debugPokedexMode === 'seen') {
      isSeen = true
    }
    const rate = props.spawnPool?.rates?.[id] || 10
    const data = isSeen ? pokemonDataProvider.getPokemonData(id) : null
    const name = isSeen ? (data?.name || id.toUpperCase()) : 'Desconocido'
    const typeInfo = (isSeen && data) ? `Tipo: ${getFormattedTypes(data)}` : ''

    const cycles = ['morning', 'day', 'dusk', 'night']
    const appearingCycles = cycles.filter(c => (props.map.wild?.[c] || []).includes(id))
    const isLimited = appearingCycles.length > 0 && appearingCycles.length < cycles.length
    
    const emojiMap: Record<string, string> = { morning: '🌅', day: '🌞', dusk: '🌇', night: '🌙' }
    
    // Detección Atmosférica temprana para el texto
    const weather = computedWeather.value
    const isVisitor = !!(props.map.weather?.[weather]?.visitors as Record<string, unknown>)?.[id]
    const isExclusive = !!(props.map.weather?.[weather]?.exclusive as Record<string, unknown>)?.[id]

    let timeText = ''
    
    // 1. Información de Ciclo (Si es limitado y lo hemos visto)
    if (isLimited && isSeen) {
      const emojis = appearingCycles.map(c => emojiMap[c] || c).join('')
      timeText = `Aparición: ${emojis}`
    }

    // 2. Información Atmosférica
    const multiplier = getWeatherMultiplier(id, weather)
    const isBoosted = !isVisitor && !isExclusive && multiplier > 1.0
    const isDebuffed = !isVisitor && !isExclusive && multiplier < 1.0 && multiplier > 0
    const isSpecialWeatherSpawn = isVisitor || isExclusive
    const hasWeatherEffect = isSpecialWeatherSpawn || isBoosted || isDebuffed

    if (hasWeatherEffect) {
      if (isSeen) {
        const weatherTag = isVisitor ? 'Visitante' : (isExclusive ? 'Exclusivo' : (isBoosted ? 'Potenciado' : 'Debilitado'))
        const weatherLine = `${weatherEmoji.value} ${weatherTag} por el clima.`
        timeText = timeText ? `${timeText}\n${weatherLine}` : weatherLine
      } else {
        timeText = `${weatherEmoji.value} Anomalía Atmosférica detectada.`
      }
    }

    // 3. Fallback: Habitante común (Solo si no hay ciclo ni clima)
    if (!timeText) {
      timeText = 'Habitante común.'
    }

    return {
      id, 
      key: `${id}-${index}`, 
      name, 
      sprite: getAssetUrl(ASSET_TYPES.POKEMON, id), 
      isSeen, 
      isCaught, 
      isRare: (rate < 10) || isVisitor || isExclusive, 
      isAtmospheric: isSpecialWeatherSpawn, 
      tooltipTitle: name, 
      tooltipDesc: typeInfo ? `${typeInfo}\n${timeText}` : timeText, 
      seed: (id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) + index) / 100
    }

  })
})

const isVisible = ref(false)
import { useWeatherVisuals } from '@/composables/useWeatherVisuals'

const { weatherOnlyFilter } = useWeatherVisuals({
  weather: computedWeather,
  cycle: computed(() => props.cycle)
})

const allSpawns = computed(() => [...props.spawnPool.generic, ...props.spawnPool.specific])
const currentCols = ref(3)
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null

import { gsap } from 'gsap'

const spawnGridRef = ref<HTMLElement | null>(null)
let auraContext: gsap.Context | null = null

const initAuraAnimations = () => {
  if (auraContext) auraContext.revert()
  if (!spawnGridRef.value || !isVisible.value) return

  auraContext = gsap.context((self: gsap.Context) => {
    const AURA_CYCLE = 2.0
    const wrappers = self.selector!('.sprite-wrapper') as HTMLElement[]

    wrappers.forEach((el) => {
      const isRare = el.classList.contains('rare-spawn')
      const isAtmos = el.classList.contains('atmospheric-spawn')
      
      if (!isRare && !isAtmos) return

      const seedAttr = el.style.getPropertyValue('--spawn-seed')
      const seed = seedAttr ? parseFloat(seedAttr) : Math.random()
      const baseDelay = (seed % 1) * AURA_CYCLE

      // 1. Pokémon Pulse (Heartbeat) - Disabled in low power mode for performance
      if (!uiStore.isLowPowerActive) {
        const scaleMax = isAtmos ? 1.08 : 1.05
        const tl = gsap.timeline({ repeat: -1, delay: baseDelay })
        tl.to(el, { scale: scaleMax, duration: 0.4, ease: 'power2.out' })
          .to(el, { scale: 1, duration: 0.8, ease: 'sine.inOut' })
      }

      // 2. Aura Effects (Siblings) - Enabled in both modes
      const rareAura = el.parentElement?.querySelector('.rare-aura')
      const atmosAura = el.parentElement?.querySelector('.atmospheric-aura')

      if (rareAura || atmosAura) {
        const auraTl = gsap.timeline({
          repeat: -1,
          delay: baseDelay
        })

        const duration = AURA_CYCLE / 2

        if (rareAura && atmosAura) {
          // Both exist: strict contra-phase immediately
          gsap.set(rareAura, { scale: 0.1, opacity: 0 })
          gsap.set(atmosAura, { scale: 3.375, opacity: 0.9 })

          // Rotate rareAura at start when at minimum size
          auraTl.call(() => {
            gsap.set(rareAura, { rotation: Math.random() * 360 })
          }, [], 0)

          auraTl.to(rareAura, {
            scale: 3.375,
            opacity: 1,
            duration: duration,
            ease: 'sine.inOut'
          }, 0)

          auraTl.to(atmosAura, {
            scale: 0.1,
            opacity: 0,
            duration: duration,
            ease: 'sine.inOut'
          }, 0)

          // Rotate atmosAura at middle when at minimum size
          auraTl.call(() => {
            gsap.set(atmosAura, { rotation: Math.random() * 360 })
          }, [], duration)

          auraTl.to(rareAura, {
            scale: 0.1,
            opacity: 0,
            duration: duration,
            ease: 'sine.inOut'
          }, duration)

          auraTl.to(atmosAura, {
            scale: 3.375,
            opacity: 0.9,
            duration: duration,
            ease: 'sine.inOut'
          }, duration)
        } else {
          // Standard single aura pulse
          if (rareAura) {
            gsap.set(rareAura, { scale: 0.1, opacity: 0 })

            auraTl.call(() => {
              gsap.set(rareAura, { rotation: Math.random() * 360 })
            }, [], 0)

            auraTl.to(rareAura, {
              scale: 3.375,
              opacity: 1,
              duration: duration,
              ease: 'sine.inOut'
            }, 0)

            auraTl.to(rareAura, {
              scale: 0.1,
              opacity: 0,
              duration: duration,
              ease: 'sine.inOut'
            }, duration)
          }
          if (atmosAura) {
            gsap.set(atmosAura, { scale: 0.1, opacity: 0 })

            auraTl.call(() => {
              gsap.set(atmosAura, { rotation: Math.random() * 360 })
            }, [], 0)

            auraTl.to(atmosAura, {
              scale: 3.375,
              opacity: 0.9,
              duration: duration,
              ease: 'sine.inOut'
            }, 0)

            auraTl.to(atmosAura, {
              scale: 0.1,
              opacity: 0,
              duration: duration,
              ease: 'sine.inOut'
            }, duration)
          }
        }
      }
    })

    // 3. Winner Crown - Disabled in low power mode for performance
    if (!uiStore.isLowPowerActive) {
      const crowns = self.selector!('.dom-badge.winning') as HTMLElement[]
      crowns.forEach(crown => {
        gsap.fromTo(crown,
          { scale: 1, filter: 'Brightness(1)' },
          {
            scale: 1.05,
            filter: 'Brightness(1.3)',
            duration: 1.5,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
          }
        )
      })
    }
  }, spawnGridRef.value)
}

onMounted(() => {
  if (cardRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const width = entry.contentRect.width
      if (width > 350) currentCols.value = 4
      else if (width > 200) currentCols.value = 3
      else currentCols.value = 2
    })
    resizeObserver.observe(cardRef.value)

    intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        isVisible.value = entry.isIntersecting
        if (isVisible.value) {
          gsap.killTweensOf(initAuraAnimations)
          gsap.delayedCall(0.1, initAuraAnimations)
        } else {
          gsap.killTweensOf(initAuraAnimations)
          if (auraContext) {
            auraContext.revert()
            auraContext = null
          }
        }
      }
    }, { 
      rootMargin: '50px', 
      threshold: 0.01 
    })
    intersectionObserver.observe(cardRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
  if (intersectionObserver) intersectionObserver.disconnect()
  if (auraContext) auraContext.revert()
})



const lockReason = computed(() => {
  if (props.isSafariLocked) return 'REQUIERE TICKET SAFARI'
  if (gameStore.isSaveLocked && !uiStore.hasDismissedSessionLock) return 'SESIÓN BLOQUEADA'
  if (!props.isLocked) return ''
  const requiredBadges = props.map.badges || 0
  if (props.badgeCount < requiredBadges) return `REQUIERE ${requiredBadges} MEDALLAS`
  return 'BLOQUEADO'
})

const isLocked = computed(() => {
  if (props.isLocked) return true
  if (gameStore.isSaveLocked && !uiStore.hasDismissedSessionLock) return true
  return false
})

const lockDescription = computed(() => {
  if (props.isSafariLocked) return 'Necesitas un Ticket Safari para entrar a esta zona.'
  if (gameStore.isSaveLocked && !uiStore.hasDismissedSessionLock) return 'Sesión activa en otra pestaña. Toma el control para habilitar el guardado.'
  if (!props.isLocked) return ''
  return `Consigue ${props.map.badges} medallas para acceder a esta zona.`
})

const spawnGrid = computed(() => {
  // Filtrar Pokémon bloqueados por el clima (Multiplier = 0)
  const weather = computedWeather.value
  const filteredSpawns = allSpawns.value.filter(id => {
    return getWeatherMultiplier(id, weather) > 0
  })

  const { rows, cols, totalSlots } = calculateSpawnGrid(filteredSpawns.length, currentCols.value)
  const grid = new Array(totalSlots).fill(null)
  filteredSpawns.forEach((id, index) => { grid[totalSlots - 1 - index] = id })
  return { slots: grid, rows, cols }
})

watch(() => JSON.stringify(spawnGrid.value.slots), (newVal, oldVal) => {
  if (newVal === oldVal) return
  if (isVisible.value) {
    gsap.killTweensOf(initAuraAnimations)
    gsap.delayedCall(0.05, initAuraAnimations)
  }
})

watch(() => uiStore.isLowPowerActive, () => {
  if (isVisible.value) {
    initAuraAnimations()
  }
})

watch(spawnGridRef, (newRef) => {
  if (newRef && isVisible.value) {
    gsap.killTweensOf(initAuraAnimations)
    gsap.delayedCall(0.05, initAuraAnimations)
  } else if (!newRef) {
    if (auraContext) {
      auraContext.revert()
      auraContext = null
    }
  }
}, { flush: 'post' })
</script>

<template>
  <div
    ref="cardRef"
    :class="['location-card map-card legacy-panel', { locked: isLocked, 'safari-locked': isSafariLocked }]"
    :style="{ 
      '--weather-only-filter': weatherOnlyFilter,
      '--bg-image': `url('${imgPath}')`,
      '--flare-1-url': `url('${flare1Url}')`,
      '--flare-2-url': `url('${flare2Url}')`
    }"
    @click.stop="() => {
      logger.debug('MapCard', `Click detected. isLocked: ${isLocked}, isPerformanceMode: ${isPerformanceMode}`);
      if (!isLocked && !isPerformanceMode) {
        emit('navigate', props.map);
      } else {
        logger.warn('MapCard', 'Navigation blocked:', { isLocked, isPerformanceMode, isBattleActive: battleStore.isBattleActive, isAnyBlockingModalOpen: uiStore.isAnyBlockingModalOpen });
      }
    }"
  >
    <AtmosphereLayer
      ref="atmosphere"
      :weather="computedWeather"
      :cycle="cycle"
      :season="mapStore.currentSeason.id"
      :is-performance-mode="isPerformanceMode"
      :is-low-power="uiStore.isLowPowerActive"
      :is-visible="isVisible"
      :is-locked="isLocked || isSafariLocked"
      :anim-seed="Math.abs((props.map.name.split('').reduce((acc, char, i) => {
        return acc + (char.charCodeAt(0) * (i + 1))
      }, 0) + sessionWeatherSeed) % 1000) / 1000"
    />

    <div
      v-if="isLocked || isSafariLocked"
      class="lock-overlay"
    >
      <span class="lock-text">{{ lockReason }}</span>
    </div>

    <!-- 1. Guardian (Top Left) -->
    <PVTooltip
      v-if="processedGuardian && !isLocked && !isSafariLocked && isVisible"
      class="guardian-status-badge"
      :title="!processedGuardian.isSeen ? 'POKÉMON DESCONOCIDO' : (processedGuardian.captured ? 'GUARDIÁN DERROTADO' : 'POKÉMON GUARDIÁN')"
      :description="processedGuardian.captured 
        ? 'El protector de esta ruta ha sido vencido, permitiendo que una facción tome el control total.' 
        : `Un Pokémon poderoso que protege la ruta. ${processedGuardian.isSeen ? 'Es un ' + processedGuardian.name + ' (' + processedGuardian.typeInfo + '). ' : ''}Derrótalo para liberar la zona y permitir que tu facción la domine, activando bonus de captura.`"
      position="top"
    >
      <div class="spawn-atmosphere-wrapper">
        <img 
          :src="processedGuardian.sprite" 
          class="guardian-mini-sprite" 
          :class="{ captured: processedGuardian.captured, 'spawn-silhouette': !processedGuardian.isCaught }"
          :style="{ '--spawn-seed': processedGuardian.seed }"
          @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
        >
      </div>
      <span :class="['guardian-label', { captured: processedGuardian.captured }]">
        {{ processedGuardian.captured ? 'DERROTADO' : 'GUARDIÁN' }}
      </span>
    </PVTooltip>

    <!-- 2. Cycle Pill (Top Right) -->
    <PVTooltip
      :class="['location-tag', (isLocked || isSafariLocked) ? 'tag-locked' : 'tag-wild', atmosphere?.animClass]"
      :title="(isLocked || isSafariLocked) ? 'ZONA BLOQUEADA' : 'ESTADO AMBIENTAL'"
      :description="(isLocked || isSafariLocked) ? lockDescription : `Ciclo: ${cycleName}\nEstación: ${seasonName}\nClima: ${weatherName}${weatherModifiersDescription}`"
      position="top"
    >
      <span class="pill-content">
        {{ (isLocked || isSafariLocked) ? '🔒' : (cycleEmoji + seasonEmoji + weatherEmoji) }}
      </span>
    </PVTooltip>

    <!-- 3. Faction Status (Middle Left, below Guardian) -->
    <PVTooltip
      v-if="dominance?.winner && dominance?.winner !== 'none' && !isPerformanceMode && !isLocked && !isSafariLocked && isVisible"
      class="faction-status-pill"
      title="DOMINIO FACCIÓN"
      :description="`Controlado por ${dominance.winner === 'union' ? 'Unión' : 'Poder'}`"
      position="top"
    >
      <div :class="['pill-content', factionAnimClass]">
        <span class="faction-emoji">
          {{ dominance.winner === 'union' ? '⭐' : '✊' }}
        </span>
      </div>
    </PVTooltip>

    <!-- 4. Fishing Icon (Bottom Left) -->
    <PVTooltip
      v-if="map.fishing && !isPerformanceMode && !isLocked && !isSafariLocked && isVisible"
      class="fishing-pill-standalone"
      title="PESCA"
      description="¡Esta zona tiene agua! Puedes pescar Pokémon aquí."
      position="top"
    >
      <div class="interactive-pill fishing-pill map-pill">
        <span class="pill-icon">🎣</span>
      </div>
    </PVTooltip>

    <!-- 5. Spawns Grid (MOVED UP to be behind other UI elements) -->
    <div
      v-if="!isLocked && !isPerformanceMode && isVisible"
      class="location-spawns"
    >
      <div 
        ref="spawnGridRef"
        class="spawn-grid-container" 
        :style="{ '--grid-cols': spawnGrid.cols, '--grid-rows': spawnGrid.rows }"
        :class="{ 'show-debug-grid': uiStore.isDebugGridMode }"
      >
        <div
          v-for="item in processedGrid"
          :key="item.key"
          class="spawn-slot"
        >
          <div
            v-if="item.id"
            class="spawn-content"
          >
            <!-- AURA DIVS (GSAP target) -->
            <div
              v-if="item.isRare"
              class="aura-effect rare-aura"
              :class="{ 'is-low-power': uiStore.isLowPowerActive }"
            />
            <div
              v-if="item.isAtmospheric"
              class="aura-effect atmospheric-aura"
              :class="{ 'is-low-power': uiStore.isLowPowerActive }"
            />

            <div 
              :class="['sprite-wrapper', { 
                'rare-spawn': item.isRare, 
                'atmospheric-spawn': item.isAtmospheric
              }]"
              :style="{ '--spawn-seed': item.seed }"
            >
              <PVTooltip
                :title="item.tooltipTitle"
                :description="item.tooltipDesc"
                position="top"
                class="spawn-tooltip-trigger"
              >
                <div class="spawn-atmosphere-wrapper">
                  <img
                    :src="item.sprite"
                    class="pixelated"
                    :class="{ 'spawn-silhouette': !item.isCaught }"
                    @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
                  >
                </div>
              </PVTooltip>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="!isPerformanceMode"
      class="location-header"
    >
      <div class="location-name">
        {{ map.name }}
      </div>
      <div class="location-desc">
        {{ map.desc }}
      </div>
    </div>

    <!-- 6. Winner Crown (Bottom Right) -->
    <PVTooltip
      v-if="isPlayerWinner && !isPerformanceMode && !isLocked && !isSafariLocked"
      class="dom-badge winning"
      title="DOMINADO"
      description="¡Bonus de captura activo por dominio de facción!"
      position="top"
    >
      <span class="pill-content">👑</span>
    </PVTooltip>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/map-card-weather" as *;

.sprite-wrapper {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.aura-effect {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  margin: auto;
  height: 95%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  image-rendering: auto !important;
  will-change: transform, opacity;
  
  // Mask properties to colorize monochrome assets on the fly
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;

  &.rare-aura {
    z-index: 2;
    -webkit-mask-image: var(--flare-2-url);
    mask-image: var(--flare-2-url);
    background-color: Rgba(255, 0, 0, 0.9);
    filter: Blur(1.5px);

    &.is-low-power {
      filter: none !important;
    }
  }

  &.atmospheric-aura {
    z-index: 1;
    -webkit-mask-image: var(--flare-1-url);
    mask-image: var(--flare-1-url);
    background-color: Rgba(0, 255, 255, 0.85);
    filter: Blur(1.5px);

    &.is-low-power {
      filter: none !important;
    }
  }
}

.spawn-tooltip-trigger {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}
</style>
