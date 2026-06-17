<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import { useModalStore } from '@/stores/modals'
import type { MapLocation } from '@/types/pokemon/encounters'
import { useRouteSpawnsCalculation } from '@/composables/modals/useRouteSpawnsCalculation'
import RouteSpawnsTable, { type SpawnItem, type ArchaeologyRewardItem } from './RouteSpawnsTable.vue'

interface Props {
  show?: boolean
  map: MapLocation
  weather: string
  cycle: string
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const modalStore = useModalStore()
const gameStore = useGameStore()
const uiStore = useUIStore()

const playerClass = computed(() => gameStore.state.playerClass)

const isOfficialRouteActive = computed(() => {
  if (playerClass.value !== 'entrenador') return false
  if (!props.map.id.startsWith('route')) return false
  const classData = gameStore.state.classData || {}
  if (classData.officialRouteId !== props.map.id) return false
  const now = Temporal.Now.instant().epochMilliseconds
  const timestamp = Number(classData.officialRouteTimestamp || 0)
  return (now - timestamp) <= 30 * 60 * 1000
})

const isExtortedRouteActive = computed(() => {
  if (playerClass.value !== 'rocket') return false
  if (!props.map.id.startsWith('route')) return false
  const classData = gameStore.state.classData || {}
  if (classData.extortedRouteId !== props.map.id) return false
  const now = Temporal.Now.instant().epochMilliseconds
  const timestamp = Number(classData.extortedRouteTimestamp || 0)
  return (now - timestamp) <= 24 * 3600 * 1000
})

const activeExtortedRouteId = computed(() => {
  if (playerClass.value !== 'rocket') return null
  const classData = gameStore.state.classData || {}
  if (!classData.extortedRouteId) return null
  const now = Temporal.Now.instant().epochMilliseconds
  const timestamp = Number(classData.extortedRouteTimestamp || 0)
  if ((now - timestamp) > 24 * 3600 * 1000) return null
  return classData.extortedRouteId
})

const isOfficialRouteOnCooldown = computed(() => {
  if (playerClass.value !== 'entrenador') return false
  const classData = gameStore.state.classData || {}
  const timestamp = Number(classData.officialRouteTimestamp || 0)
  if (!timestamp) return false
  const now = Temporal.Now.instant().epochMilliseconds
  return (now - timestamp) <= 24 * 3600 * 1000
})

const cooldownRemainingText = computed(() => {
  if (!isOfficialRouteOnCooldown.value) return ''
  const classData = gameStore.state.classData || {}
  const timestamp = Number(classData.officialRouteTimestamp || 0)
  const now = Temporal.Now.instant().epochMilliseconds
  const diff = (24 * 3600 * 1000) - (now - timestamp)
  if (diff <= 0) return ''
  const hours = Math.floor(diff / (3600 * 1000))
  const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000))
  return `${hours}h ${mins}m`
})

const timeRemainingText = ref('')
let timerTween: gsap.core.Tween | null = null

const tickTime = () => {
  const classData = gameStore.state.classData || {}
  const now = Temporal.Now.instant().epochMilliseconds
  let expired = false

  if (playerClass.value === 'rocket' && classData.extortedRouteId === props.map.id) {
    const timestamp = Number(classData.extortedRouteTimestamp || 0)
    const diff = (24 * 3600 * 1000) - (now - timestamp)
    if (diff > 0) {
      const hours = Math.floor(diff / (3600 * 1000))
      const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000))
      const secs = Math.floor((diff % (60 * 1000)) / 1000)
      timeRemainingText.value = `${hours}h ${mins}m ${secs}s`
    } else {
      timeRemainingText.value = ''
      expired = true
    }
  } else if (playerClass.value === 'entrenador' && classData.officialRouteId === props.map.id) {
    const timestamp = Number(classData.officialRouteTimestamp || 0)
    const diff = (30 * 60 * 1000) - (now - timestamp)
    if (diff > 0) {
      const mins = Math.floor(diff / (60 * 1000))
      const secs = Math.floor((diff % (60 * 1000)) / 1000)
      timeRemainingText.value = `${mins}m ${secs}s`
    } else {
      timeRemainingText.value = ''
      expired = true
    }
  } else {
    timeRemainingText.value = ''
  }

  if (expired) {
    gameStore.checkRouteExpirations()
  }

  timerTween = gsap.delayedCall(1, tickTime)
}

onMounted(() => {
  gameStore.checkRouteExpirations()
  tickTime()
})

onUnmounted(() => {
  if (timerTween) {
    timerTween.kill()
  }
})

const toggleExtortion = () => {
  if (modalStore.isOpen('Confirm')) return
  const id = props.map.id
  const now = Temporal.Now.instant().epochMilliseconds

  modalStore.open('Confirm', {
    title: '🏴‍☠️ RUTA DE EXTORSISÓN',
    message: `REGLAS DE EXTORSISÓN:\n\n1. Al extorsionar una ruta, tomarás control de ella por las próximas 24 horas.\n2. Los pesos (₽) ganados contra entrenadores (NPCs) en esta ruta se multiplicarán por x1.5.\n3. Solo puedes extorsionar una ruta a la vez.\n\n¿Quieres extorsionar la ${props.map.name.toUpperCase()} hoy?`,
    confirmText: 'EXTORSIONAR',
    cancelText: 'CANCELAR',
    variant: 'retro',
    onConfirm: async () => {
      if (!gameStore.state.classData) {
        gameStore.state.classData = {
          captureStreak: 0,
          longestStreak: 0,
          reputation: 0,
          blackMarketSales: 0,
          criminality: 0,
          blackMarketDaily: { date: '', items: [], purchased: [] }
        }
      }
      gameStore.state.classData.extortedRouteId = id
      gameStore.state.classData.extortedRouteTimestamp = String(now)
      uiStore.notify(`¡Has tomado control y extorsionado la ${props.map.name}!`, '💰')
      await gameStore.save(false)
      tickTime()
    }
  })
}

const toggleOfficialRoute = () => {
  if (modalStore.isOpen('Confirm')) return
  const id = props.map.id
  const now = Temporal.Now.instant().epochMilliseconds

  modalStore.open('Confirm', {
    title: '📍 RUTA OFICIAL',
    message: `REGLAS DE RUTA OFICIAL:\n\n1. La Ruta Oficial te permite declarar una zona de patrullaje especial.\n2. Durante los próximos 30 minutos, cada combate ganado aquí otorgará +1 punto de Reputación.\n3. Solo puedes marcar una ruta oficial una vez cada 24 horas.\n\n¿Quieres marcar la ${props.map.name.toUpperCase()} como tu Ruta Oficial?`,
    confirmText: 'ESTABLECER',
    cancelText: 'CANCELAR',
    variant: 'retro',
    onConfirm: async () => {
      if (!gameStore.state.classData) {
        gameStore.state.classData = {
          captureStreak: 0,
          longestStreak: 0,
          reputation: 0,
          blackMarketSales: 0,
          criminality: 0,
          blackMarketDaily: { date: '', items: [], purchased: [] }
        }
      }
      gameStore.state.classData.officialRouteId = id
      gameStore.state.classData.officialRouteTimestamp = String(now)
      uiStore.notify(`¡Estableciste la ${props.map.name} como tu Ruta Oficial!`, '📍')
      await gameStore.save(false)
      tickTime()
    }
  })
}

const openPokemonDetail = (speciesId: string, isSeen: boolean) => {
  if (!isSeen) return
  modalStore.open('PokemonDetail', { speciesId, context: 'pokedex' })
}

const cycleLabels: Record<string, string> = {
  morning: '🌅 Amanecer',
  day: '☀️ Día',
  dusk: '🌇 Ocaso',
  night: '🌙 Noche'
}

const {
  weatherEmoji,
  weatherLabel,
  weatherDetails,
  parsedDescriptionLines,
  getStatusTooltip,
  wildSpawns,
  fishingSpawns,
  terrainTags,
  activeFishingChance,
  baseFishingChance,
  activeArchaeologyChance,
  baseArchaeologyChance,
  activeTerrestrialChance,
  baseTerrestrialChance,
  getProbClass,
  getCategoryTooltip,
  archaeologyRewards,
  getWildSpawnTooltip,
  getFishingSpawnTooltip,
  getArchaeologySpawnTooltip
} = useRouteSpawnsCalculation(props)
</script>

<template>
  <BaseModal
    :show="show"
    :title="`ZONA SALVAJE: ${map.name.toUpperCase()}`"
    max-width="850px"
    type="center"
    @close="emit('close')"
  >
    <div class="route-spawns-modal-container">
      <!-- Info Header -->
      <div class="route-info-bar">
        <div class="info-item">
          <span class="label">Ciclo Actual:</span>
          <span class="value">{{ cycleLabels[cycle] || cycle }}</span>
        </div>
        <div class="info-item">
          <span class="label">Clima Activo:</span>
          <span class="value">{{ weatherEmoji }} {{ weatherLabel }}</span>
        </div>
        <div class="info-item">
          <span class="label">Nivel de Zona:</span>
          <span class="value">Nv. {{ map.lv[0] }} - {{ map.lv[1] }}</span>
        </div>
      </div>

      <!-- Terrain / Map features and Weather Effects card -->
      <div class="weather-effects-card">
        <!-- Left panel: Weather description & Type modifiers -->
        <div class="weather-panel-details">
          <div class="weather-header-line">
            <span class="weather-title-badge">{{ weatherEmoji }} EFECTOS EN COMBATE</span>
            <div
              v-if="parsedDescriptionLines.length"
              class="weather-desc-lines"
            >
              <div
                v-for="(line, lineIdx) in parsedDescriptionLines"
                :key="lineIdx"
                :class="['weather-desc-line', line.typeClass]"
              >
                <!-- Si tiene label/acción, lo mostramos con estilo de pill/label pixelado -->
                <div
                  v-if="line.label"
                  class="desc-line-label"
                >
                  <span class="desc-line-icon">
                    <template v-if="line.icon === 'block'">🚫 </template>
                    <template v-else>{{ line.icon }}</template>
                  </span>
                  <span class="desc-line-text">{{ line.label }}</span>
                </div>

                <div :class="[line.label ? 'desc-line-value' : 'desc-line-full']">
                  <template
                    v-for="(segment, idx) in line.segments"
                    :key="idx"
                  >
                    <PokemonTypeTag
                      v-if="segment.isType"
                      :type="segment.type"
                      size="ssm"
                      class="inline-type-tag"
                    />
                    <span v-else-if="!line.label">{{ segment.text }}</span>
                  </template>
                </div>
              </div>
            </div>
            <span
              v-else
              class="weather-desc-line"
            >
              Sin efectos climáticos especiales en combate.
            </span>
          </div>

          <!-- Type modifiers tags lists (Map Spawns) -->
          <div
            v-if="weatherDetails?.modifiers"
            class="weather-modifiers-section"
          >
            <span class="weather-title-badge">⛅ APARICIÓN DE CLIMA</span>
            <div class="weather-type-modifiers">
              <div 
                v-if="weatherDetails.modifiers.boost?.length" 
                class="modifier-group boost"
              >
                <span class="group-label">▲ BONIFICACIÓN:</span>
                <div class="tags-row">
                  <PokemonTypeTag
                    v-for="t in weatherDetails.modifiers.boost"
                    :key="t"
                    :type="t"
                    size="ssm"
                  />
                </div>
              </div>

              <div 
                v-if="weatherDetails.modifiers.debuff?.length" 
                class="modifier-group debuff"
              >
                <span class="group-label">▼ PENALIZACIÓN:</span>
                <div class="tags-row">
                  <PokemonTypeTag
                    v-for="t in weatherDetails.modifiers.debuff"
                    :key="t"
                    :type="t"
                    size="ssm"
                  />
                </div>
              </div>

              <div 
                v-if="weatherDetails.modifiers.block?.length" 
                class="modifier-group block"
              >
                <span class="group-label">🚫 BLOQUEADO:</span>
                <div class="tags-row">
                  <PokemonTypeTag
                    v-for="t in weatherDetails.modifiers.block"
                    :key="t"
                    :type="t"
                    size="ssm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right panel: Terrain and features -->
        <div class="terrain-panel-details">
          <span class="terrain-title-badge">🗺️ CARACTERÍSTICAS</span>
          <div class="terrain-items">
            <div class="terrain-item">
              <span class="label">Entorno:</span>
              <span class="value">
                {{ terrainTags }}
              </span>
            </div>
            
            <!-- Active special route bonus indicators in route stats -->
            <div
              v-if="isOfficialRouteActive"
              class="terrain-item benefit-active-item"
            >
              <span class="label text-primary">📍 Ruta Oficial:</span>
              <span class="value text-primary font-bold">
                +1 REP por victoria (Restan: {{ timeRemainingText }})
              </span>
            </div>
            <div
              v-if="isExtortedRouteActive"
              class="terrain-item benefit-active-item"
            >
              <span class="label text-danger">🏴‍☠️ Extorsionada:</span>
              <span class="value text-danger font-bold">
                x1.5 ₽ por victoria (Restan: {{ timeRemainingText }})
              </span>
            </div>

            <div class="terrain-item">
              <span class="label">Caminar:</span>
              <span class="value">
                🚶 Caminando —
                <b :class="getProbClass(activeTerrestrialChance, baseTerrestrialChance)">{{ activeTerrestrialChance }}%</b>
                <span
                  style="font-size: 9px; margin-left: 4px;"
                  :class="getProbClass(activeTerrestrialChance, baseTerrestrialChance) || 'gray-text'"
                >
                  (Base: {{ baseTerrestrialChance }}%)
                </span>
              </span>
            </div>
            <div
              v-if="map.fishing"
              class="terrain-item"
            >
              <span class="label">Pesca:</span>
              <span class="value">
                🎣 Nv. {{ map.fishing.lv[0] }}-{{ map.fishing.lv[1] }} —
                <b :class="getProbClass(activeFishingChance, baseFishingChance)">{{ activeFishingChance }}%</b>
                <span
                  style="font-size: 9px; margin-left: 4px;"
                  :class="getProbClass(activeFishingChance, baseFishingChance) || 'gray-text'"
                >
                  (Base: {{ baseFishingChance }}%)
                </span>
              </span>
            </div>
            <div
              v-else
              class="terrain-item"
            >
              <span class="label">Pesca:</span>
              <span class="value gray-text">❌ No disponible</span>
            </div>

            <div
              v-if="map.archaeology"
              class="terrain-item"
            >
              <span class="label">Arqueología:</span>
              <span class="value">
                ⛏️ Nv. {{ map.archaeology.lv[0] }}-{{ map.archaeology.lv[1] }} —
                <b :class="getProbClass(activeArchaeologyChance, baseArchaeologyChance)">{{ activeArchaeologyChance }}%</b>
                <span
                  style="font-size: 9px; margin-left: 4px;"
                  :class="getProbClass(activeArchaeologyChance, baseArchaeologyChance) || 'gray-text'"
                >
                  (Base: {{ baseArchaeologyChance }}%)
                </span>
              </span>
            </div>
            <div
              v-else
              class="terrain-item"
            >
              <span class="label">Arqueología:</span>
              <span class="value gray-text">❌ No disponible</span>
            </div>

            <!-- Class specific button actions in RouteSpawnsModal -->
            <div
              v-if="map.id.startsWith('route')"
              class="class-actions-container"
            >
              <!-- Entrenador activation action -->
              <template v-if="playerClass === 'entrenador'">
                <div
                  v-if="isOfficialRouteOnCooldown && !isOfficialRouteActive"
                  class="cooldown-tag"
                >
                  📍 Cooldown Oficial: {{ cooldownRemainingText }}
                </div>
                <button
                  v-else-if="!isOfficialRouteActive"
                  class="btn-vicio-info btn-vicio-sm w-full btn-establish-route"
                  @click.stop="toggleOfficialRoute"
                >
                  📍 MARCAR RUTA OFICIAL
                </button>
              </template>

              <!-- Rocket activation action -->
              <template v-if="playerClass === 'rocket'">
                <div
                  v-if="activeExtortedRouteId && activeExtortedRouteId !== map.id"
                  class="cooldown-tag"
                >
                  🏴‍☠️ Ya extorsionaste otra ruta hoy
                </div>
                <button
                  v-else-if="!isExtortedRouteActive"
                  class="btn-vicio-danger btn-vicio-sm w-full btn-establish-route"
                  @click.stop="toggleExtortion"
                >
                  🏴‍☠️ EXTORSIONAR RUTA
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Terrestrial Spawns List -->
      <RouteSpawnsTable
        title="🚶 ENCUENTROS TERRESTRES"
        :probability="activeTerrestrialChance"
        :base-probability="baseTerrestrialChance"
        :items="wildSpawns"
        mode="pokemon"
        :prob-class="getProbClass(activeTerrestrialChance, baseTerrestrialChance)"
        :weather-emoji="weatherEmoji"
        :weather-label="weatherLabel"
        :get-status-tooltip="getStatusTooltip"
        :get-tooltip-data="(getWildSpawnTooltip as unknown as (item: SpawnItem | ArchaeologyRewardItem) => Record<string, unknown>)"
        @select-pokemon="openPokemonDetail"
      />

      <!-- Fishing Spawns List -->
      <RouteSpawnsTable
        v-if="fishingSpawns.length"
        title="🎣 ENCUENTROS DE PESCA"
        :probability="activeFishingChance"
        :base-probability="baseFishingChance"
        :items="fishingSpawns"
        mode="pokemon"
        :prob-class="getProbClass(activeFishingChance, baseFishingChance)"
        :weather-emoji="weatherEmoji"
        :weather-label="weatherLabel"
        :get-status-tooltip="getStatusTooltip"
        :get-tooltip-data="(getFishingSpawnTooltip as unknown as (item: SpawnItem | ArchaeologyRewardItem) => Record<string, unknown>)"
        @select-pokemon="openPokemonDetail"
      />

      <!-- Archaeology Rewards List -->
      <RouteSpawnsTable
        v-if="archaeologyRewards.length"
        title="⛏️ RECOMPENSAS DE ARQUEOLOGÍA"
        :probability="activeArchaeologyChance"
        :base-probability="baseArchaeologyChance"
        :items="archaeologyRewards"
        mode="item"
        :prob-class="getProbClass(activeArchaeologyChance, baseArchaeologyChance)"
        :weather-emoji="weatherEmoji"
        :weather-label="weatherLabel"
        :get-category-tooltip="getCategoryTooltip"
        :get-tooltip-data="(getArchaeologySpawnTooltip as unknown as (item: SpawnItem | ArchaeologyRewardItem) => Record<string, unknown>)"
      />
    </div>
  </BaseModal>
</template>

<style src="./RouteSpawnsModal.styles.scss" scoped lang="scss"></style>
