<script setup lang="ts">

import { ref, computed, watch, defineAsyncComponent, type Component, onMounted, onUnmounted, nextTick, reactive } from 'vue'

const PILL_GLOW_DURATION_SEC = 1.5;
const PILL_DRIFT_X_PX = 3;
const PILL_DRIFT_DURATION_SEC = 2.0;
const PILL_SHAKE_ROTATION_DEG = 2;
const PILL_SHAKE_HALF_DURATION_SEC = 0.125;
const PILL_SHAKE_FULL_DURATION_SEC = 0.25;
import { gsap } from 'gsap'
import { useBattleStore } from '@/stores/battle/battle'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useDebugStore } from '@/stores/debug'
import type { PillFxType } from '@/types/system/game'
import { useGameStore } from '@/stores/game'
import { getRouteWeather, getWeatherMultiplier, getNpcEncounterChances } from '@/logic/weather/weatherUtils'
import { getMechanicalWeather, requireWeatherId, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, type WeatherId } from '@/logic/weather/weatherRegistry'
import { ACTIVE_GENERATION } from '@/data/system/constants'
import { getWeatherCombatDescription } from '@/logic/weather/weatherGenerationProvider'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getEncounterPool, getSpeciesEntries } from '@/logic/encounters/encounters'
import { getWeatherFamily } from '@/data/system/weatherFamilies.ts'
import { requireWeatherSeasonId } from '@/data/world/weather-tables'
import { requireMapRouteId } from '@/data/world/map-assets'
import { requireDayPhase } from '@/logic/utils/timeUtils'
import type { MapLocation } from '@/types/pokemon/encounters'
import { useRouteSpawnsFishing } from '@/composables/modals/useRouteSpawnsFishing'
import { useRouteSpawnsArchaeology } from '@/composables/modals/useRouteSpawnsArchaeology'

const debugStore = useDebugStore()
const isDebugActive = computed(() => {
  return debugStore.canAccess && typeof window !== 'undefined' && !!window.__VITE_DEBUG__
})
const BattleDebugTools = defineAsyncComponent(() => import('./BattleDebugTools.vue')) as Component

const battleStore = useBattleStore()
const uiStore = useUIStore()
const mapStore = useMapStore()
const gameStore = useGameStore()

const RESPONSIVE_SMALL_SCREEN_MAX_WIDTH_PX = 950

// Responsive logic
const isSmallScreen = computed(() => {
  return (uiStore.windowWidth / uiStore.appZoom) < RESPONSIVE_SMALL_SCREEN_MAX_WIDTH_PX
})


// Sub-components
import BattleLog from './BattleLog.vue'
import BattleArenaView from './BattleArenaView.vue'
import BattleArenaControls from './BattleArenaControls.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

const battle = computed(() => battleStore.state)

const cycleEmoji = computed(() => {
  const emojis: Record<string, string> = { morning: '🌅', day: '🌞', dusk: '🌇', night: '🌙' }
  return emojis[mapStore.currentCycle] || '☀️'
})
const seasonEmoji = computed(() => mapStore.currentSeason.icon)
const currentDayPhase = computed(() => requireDayPhase(mapStore.currentCycle || 'day'))
const computedWeather = computed<WeatherId>(() => {
  if (battle.value?.weather && battle.value.weather.type !== 'clear' && battle.value.weather.type !== 'none') {
    return requireWeatherId(battle.value.weather.visual || battle.value.weather.type)
  }
  if (mapStore.globalWeather) return requireWeatherId(mapStore.globalWeather)
  return getRouteWeather(
    requireMapRouteId(battle.value?.locationId || 'route1'),
    requireWeatherSeasonId(mapStore.currentSeason.id),
    mapStore.currentEpochHour,
    currentDayPhase.value
  )
})
const weatherEmoji = computed(() => {
  const visual = WEATHER_VISUAL_METADATA[computedWeather.value]
  if (visual) return visual.icon
  const mech = getMechanicalWeather(computedWeather.value)
  return WEATHER_UI_METADATA[mech]?.icon || ''
})

const cycleName = computed(() => {
  const names: Record<string, string> = { morning: 'Mañana', day: 'Día', dusk: 'Atardecer', night: 'Noche' }
  return names[mapStore.currentCycle] || 'Día'
})
const seasonName = computed(() => mapStore.currentSeason.label)
const weatherName = computed(() => {
  const visual = WEATHER_VISUAL_METADATA[computedWeather.value]
  if (visual) return visual.label
  const mech = getMechanicalWeather(computedWeather.value)
  return WEATHER_UI_METADATA[mech]?.label || 'Normal'
})

const mapsList = computed<MapLocation[]>(() => pokemonDataProvider.getMaps())

const mapPropForModal = computed(() => {
  const locId = requireMapRouteId(battle.value?.locationId || 'route1')
  const loc = mapsList.value.find(m => m.id === locId)
  if (loc) return loc
  const first = mapsList.value[0]
  if (first) return first
  throw new Error('[BattleArena] No maps available for route spawns modal')
})

const routeSpawnsProps = reactive({
  map: computed(() => mapPropForModal.value || mapsList.value[0]),
  weather: computedWeather,
  cycle: currentDayPhase
})

const { fishingSpawns } = useRouteSpawnsFishing(routeSpawnsProps)
const { archaeologyRewards } = useRouteSpawnsArchaeology(routeSpawnsProps)

const weatherTooltipDescription = computed(() => {
  const weatherKey = computedWeather.value
  const desc = getWeatherCombatDescription(weatherKey, ACTIVE_GENERATION)
  const weatherDescText = desc && desc !== 'Sin efectos en combate.' ? `\n---\nEFECTOS EN COMBATE:\n${desc}` : ''
  const baseDesc = `Ciclo: ${cycleName.value}\nEstación: ${seasonName.value}\nClima: ${weatherName.value}${weatherDescText}`
  if (!debugStore.isAdminOrOffline) return baseDesc

  const locId = battle.value?.locationId || 'route1'
  const loc = mapsList.value.find(m => m.id === locId)
  if (!loc) return baseDesc

  const cycle = currentDayPhase.value
  const weather = computedWeather.value
  const activeEvents = mapStore.activeEvents || []

  const lines: string[] = [] // text-ok

  // 1. Wild Spawns
  if (loc.wild) {
    const { pool, rates } = getEncounterPool(loc, cycle, weather, activeEvents)
    const poolCopy = [...pool]
    const ratesCopy = [...rates]

    if (weather && weather !== 'clear') {
      const visitorIndices = ratesCopy.map((r, i) => r < 0 ? i : -1).filter(i => i !== -1)
      const nativeIndices = ratesCopy.map((r, i) => r >= 0 ? i : -1).filter(i => i !== -1)

      let wConfig = loc.weather?.[weather]
      if (!wConfig && weather) {
        const family = getWeatherFamily(weather) as keyof NonNullable<typeof loc.weather>
        if (family && loc.weather?.[family]) {
          wConfig = loc.weather[family]
        }
      }
      const exclusives = wConfig?.exclusive ? getSpeciesEntries(wConfig.exclusive).map(entry => entry.id) : []

      nativeIndices.forEach(idx => {
        const spId = poolCopy[idx]
        if (spId) {
          const isExclusive = exclusives.includes(spId)
          if (!isExclusive) {
            ratesCopy[idx] = (ratesCopy[idx] || 0) * getWeatherMultiplier(spId, weather)
          }
        }
      })

      if (visitorIndices.length > 0) {
        const totalNativeWeight = nativeIndices.reduce((sum, idx) => sum + (ratesCopy[idx] || 0), 0)
        const visitorQuota = totalNativeWeight / 9
        const sumRelativeWeights = visitorIndices.reduce((sum, idx) => sum + Math.abs(ratesCopy[idx] || 0), 0)
        
        visitorIndices.forEach(idx => {
          const relativeWeight = Math.abs(ratesCopy[idx] || 0) / (sumRelativeWeights || 1)
          ratesCopy[idx] = visitorQuota * relativeWeight
        })
      }
    }

    const totalRate = ratesCopy.reduce((sum, r) => sum + r, 0)
    if (totalRate > 0) {
      lines.push('---')
      lines.push('Chances actuales (Hierba/Tierra):')
      let wConfig = loc.weather?.[weather]
      if (!wConfig && weather) {
        const family = getWeatherFamily(weather) as keyof NonNullable<typeof loc.weather>
        if (family && loc.weather?.[family]) {
          wConfig = loc.weather[family]
        }
      }
      const exclusives = wConfig?.exclusive ? getSpeciesEntries(wConfig.exclusive).map(entry => entry.id) : []
      const visitors = wConfig?.visitors ? getSpeciesEntries(wConfig.visitors).map(entry => entry.id) : []

      poolCopy.forEach((spId, idx) => {
        const rateVal = ratesCopy[idx] || 0
        const pct = (rateVal / totalRate) * 100
        const name = spId.charAt(0).toUpperCase() + spId.slice(1)
        
        let tag = ''
        if (exclusives.includes(spId)) {
          tag = ' (Exclusivo)'
        } else if (visitors.includes(spId)) {
          tag = ' (Visitante)'
        }
        
        lines.push(`• ${name}: ${pct.toFixed(1)}%${tag}`)
      })
    }
  }

  // 2. Fishing Spawns
  if (fishingSpawns.value && fishingSpawns.value.length > 0) {
    lines.push('---')
    lines.push('🎣 Pesca:')
    fishingSpawns.value.forEach((fs: { id: string; name: string; percentage: number }) => { // type-ok
      const realName = pokemonDataProvider.getPokemonData(fs.id)?.name || fs.name
      lines.push(`• ${realName}: ${fs.percentage.toFixed(1)}%`)
    })
  }

  // 3. Archaeology Rewards
  if (archaeologyRewards.value && archaeologyRewards.value.length > 0) {
    lines.push('---')
    lines.push('⛏️ Arqueología:')
    archaeologyRewards.value.forEach((ar: { name: string; percentage: number }) => { // type-ok
      lines.push(`• ${ar.name}: ${ar.percentage.toFixed(1)}%`)
    })
  }

  // 4. NPC / Special Encounters
  const mapIds = mapsList.value.map(m => m.id)
  const npcChances = getNpcEncounterChances(locId, gameStore.state, {}, mapIds)
  if (npcChances && npcChances.length > 0) {
    lines.push('---')
    lines.push('👥 Encuentros Especiales:')
    npcChances.forEach(npc => {
      const details = npc.details ? ` (${npc.details})` : ''
      lines.push(`• ${npc.name}: ${npc.chance.toFixed(1)}%${details}`)
    })
  }

  return baseDesc + '\n' + lines.join('\n')
})

import type { ComponentPublicInstance } from 'vue'

const envPillRef = ref<ComponentPublicInstance | HTMLElement | null>(null)
let pillContext: gsap.Context | null = null

const initBattlePillAnimation = () => {
  if (pillContext) {
    pillContext.revert()
    pillContext = null
  }

  if (!battleStore.isBattleActive || uiStore.isPerformanceMode || uiStore.isLowPowerActive) {
    return
  }

  const refVal = envPillRef.value
  const el = refVal ? (refVal instanceof HTMLElement ? refVal : (refVal.$el as HTMLElement | null)) : null
  if (!el) return

  pillContext = gsap.context(() => {
    const weather = computedWeather.value
    let type: PillFxType = ''
    if (['clear', 'sun', 'heatwave', 'cold', 'coldwave', 'sandstorm', 'dust_storm', 'intense_sun'].includes(weather)) {
      type = 'glow'
    } else if (['mist', 'fog', 'wind', 'strong_winds'].includes(weather)) {
      type = 'drift'
    } else if (['rain', 'heavy_rain', 'storm', 'thunderstorm', 'hail'].includes(weather)) {
      type = 'shake'
    }

    const seed = 0.5

    if (type === 'glow') {
      const tl = gsap.fromTo(el,
        { filter: 'brightness(1.0)', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)' },
        {
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4), 0px 0px 8px rgba(255, 204, 0, 0.6)',
          filter: 'brightness(1.2)',
          duration: PILL_GLOW_DURATION_SEC,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut'
        }
      )
      tl.progress(seed)
    } else if (type === 'drift') {
      const tl = gsap.to(el, {
        x: PILL_DRIFT_X_PX,
        duration: PILL_DRIFT_DURATION_SEC,
        yoyo: true,
        repeat: -1,
        ease: 'power1.inOut'
      })
      tl.progress(seed)
    } else if (type === 'shake') {
      const tl = gsap.timeline({ repeat: -1 })
      tl.to(el, { rotation: PILL_SHAKE_ROTATION_DEG, duration: PILL_SHAKE_HALF_DURATION_SEC, ease: 'power1.inOut' })
        .to(el, { rotation: -PILL_SHAKE_ROTATION_DEG, duration: PILL_SHAKE_FULL_DURATION_SEC, ease: 'power1.inOut' })
        .to(el, { rotation: 0, duration: PILL_SHAKE_HALF_DURATION_SEC, ease: 'power1.inOut' })
      tl.progress(seed)
    }
  }, el)
}

onMounted(() => {
  nextTick(() => {
    initBattlePillAnimation()
  })
})

onUnmounted(() => {
  if (pillContext) {
    pillContext.revert()
    pillContext = null
  }
})

watch(
  [
    () => battleStore.isBattleActive,
    computedWeather,
    () => uiStore.isPerformanceMode,
    () => uiStore.isLowPowerActive
  ],
  () => {
    nextTick(() => {
      initBattlePillAnimation()
    })
  },
  { flush: 'post' }
)

// Body Class Management
watch(() => battleStore.isBattleActive, (active) => {
  if (active) document.body.classList.add('in-battle') // [PureVue-Ignore]
  else document.body.classList.remove('in-battle') // [PureVue-Ignore]
}, { immediate: true })

const handleClose = () => {
  if (battleStore.isFinishing) {
    battleStore.completeBattleFlow('map')
  } else {
    battleStore.flee()
  }
}
</script>

<template>
  <BaseModal
    id="battle-arena-modal"
    :show="battleStore.isBattleActive"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '1600px'"
    :height="isSmallScreen ? '100dvh' : '92dvh'"
    :max-height="isSmallScreen ? '100dvh' : '92dvh'"
    variant="modern"
    overlay="dark"
    close-button-variant="yellow-solid"
    :prevent-close="battleStore.isProcessing || (!!battleStore.state?.cannotEscape && !battleStore.isFinishing)"
    :show-close-button="(!battleStore.state?.isTrainer && !battleStore.state?.isGym) || battleStore.isFinishing"
    :close-on-click-outside="false"
    :hide-header="true"
    padding="raw"
    custom-class="battle-arena-modal"
    disable-zoom
    disable-auto-grow
    @close="handleClose"
  >
    <div
      v-if="!battle?.isGym"
      class="battle-header-actions"
    >
      <!-- Showdown Canonical Animation Registration Tokens: frz drag brn psn tox slp par confusion flinch attract taunt substitute raindance sunnyday sandstorm hail snow electricterrain grassyterrain mistyterrain psychicterrain trickroom gravity stealthrock spikes toxicspikes mega primal terastallize dynamax -->
      <PVTooltip
        ref="envPillRef"
        class="location-tag tag-wild"
        :title="'ESTADO AMBIENTAL'"
        :description="weatherTooltipDescription"
        position="top"
      >
        <span class="pill-content">
          <span class="emoji">{{ cycleEmoji + seasonEmoji + weatherEmoji }}</span>
        </span>
      </PVTooltip>
    </div>

    <div
      v-if="battle || battleStore.isSearching"
      id="battle-screen" 
      class="battle-screen-grid"
      :class="{ 
        'is-finishing': battleStore.isFinishing, 
        'is-fullscreen': isSmallScreen,
        'is-searching': battleStore.isSearching
      }"
    >
      <div class="battle-container">
        <!-- Viewport: Background & Sprites -->
        <BattleArenaView />

        <!-- Log: Sidebar or Bottom -->
        <div class="battle-log-wrapper">
          <BattleLog class="battle-log" />
        </div>

        <!-- Controls: Moves & Actions -->
        <BattleArenaControls />
      </div>
    </div>

    <!-- GLOBAL BATTLE DEBUG HUD -->
    <Teleport to="body">
      <div 
        v-if="battleStore.isBattleActive && isDebugActive" 
        class="battle-debug-hud-container"
      >
        <component
          :is="BattleDebugTools"
          v-if="BattleDebugTools"
        />
      </div>
    </Teleport>
  </BaseModal>
</template>


<style src="./BattleArena.styles.scss" lang="scss"></style>
<style scoped src="./BattleArena.scoped.scss" lang="scss"></style>
