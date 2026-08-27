<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { 
  getDefaultSubCompetitions, 
  resolveSubCompetitionDirection, 
  evaluatePokemonForSubCompetition, 
  getEligiblePokemonForSubCompetition, 
  isPokemonEnrolledInOtherSubCompetition,
  type Event as GameEvent, 
  type EventConfig,
  type SubCompetitionConfig
} from '@/logic/events/eventEngine'
import { isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { getServerTime, getServerInstant } from '@/logic/utils/timeUtils'

interface Props {
  event: GameEvent
}

const props = defineProps<Props>()

const eventStore = useEventStore()
const gameStore = useGameStore()
const modalStore = useModalStore()
const uiStore = useUIStore()

const now = ref(getServerTime())
let timerTween: gsap.core.Tween | null = null
const badgeRef = ref<HTMLElement | null>(null)
let badgeCtx: gsap.Context | null = null

const updateTime = () => {
  now.value = getServerTime()
  timerTween = gsap.delayedCall(1, updateTime)
}

const formatTime = (isoTime: string) => {
  if (!isoTime) return 'Indefinido'
  try {
    const target = Temporal.Instant.from(isoTime)
    const current = Temporal.Instant.fromEpochMilliseconds(now.value)
    
    if (Temporal.Instant.compare(target, current) <= 0) return 'Terminando...'
    
    const duration = target.since(current, { largestUnit: 'minute' })
    const min = Math.max(0, Math.floor(duration.minutes))
    const sec = Math.max(0, Math.floor(Math.abs(duration.seconds) % 60))
    return `${min}m ${sec}s`
  } catch (_e) {
    return 'Error'
  }
}

const parsedEventConfig = computed<EventConfig>(() => {
  if (typeof props.event.config === 'string') {
    try {
      return JSON.parse(props.event.config) as EventConfig
    } catch (_e) {
      return {}
    }
  } else if (props.event.config && typeof props.event.config === 'object') {
    return props.event.config as EventConfig
  }
  return {}
})

const subCompetitions = computed<SubCompetitionConfig[]>(() => {
  return getDefaultSubCompetitions(props.event)
})

interface CompetitionParticipant {
  uid: string;
  id: PokemonSpeciesId;
  name: string;
  nickname?: string | null;
  level: number;
  isShiny: boolean;
  ivs?: Pokemon['ivs'];
  size?: string;
  height?: number;
  weight?: number;
  displayValue?: string;
  score?: number;
}

const getEntryForCategory = (catId: string) => {
  return eventStore.userEntries[`${props.event.id}:${catId}`] || (catId === 'ivs' ? eventStore.userEntries[props.event.id] : undefined)
}

const getParticipantForCategory = (sub: SubCompetitionConfig): CompetitionParticipant | null => {
  const entry = getEntryForCategory(sub.id)
  if (!entry) return null
  const uid = entry.pokemon_uid
  const team = (gameStore.state.team || []) as (Pokemon | null)[]
  const box = (gameStore.state.box || []) as (Pokemon | null)[]
  const found = [...team, ...box].find(p => p && p.uid === uid)

  const dir = resolveSubCompetitionDirection(props.event.id, sub.id, sub.order)

  if (found) {
    const evalRes = evaluatePokemonForSubCompetition(found, sub, dir)
    return {
      uid: found.uid,
      id: found.id,
      name: found.name,
      nickname: found.nickname,
      level: found.level,
      isShiny: found.isShiny,
      ivs: found.ivs,
      height: found.height,
      weight: found.weight,
      displayValue: evalRes.displayValue,
      score: evalRes.score
    }
  }

  const data = entry.data
  if (data && data.species && isPokemonSpeciesId(data.species)) {
    return {
      uid,
      id: data.species,
      name: data.name || String(data.species),
      nickname: data.nickname,
      level: data.level || 1,
      isShiny: !!data.is_shiny,
      ivs: data.ivs as Pokemon['ivs'],
      height: data.height,
      weight: data.weight,
      displayValue: data.displayValue,
      score: data.score
    }
  }
  return null
}

const getMetricDisplay = (sub: SubCompetitionConfig, p: CompetitionParticipant) => {
  const ivs = p.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)

  if (sub.metric === 'total_ivs') {
    return {
      title: 'IVs TOTALES',
      value: p.displayValue || `${totalIvs} / 186 IVs`
    }
  }
  if (sub.metric === 'stat_iv' && sub.targetStat) {
    const statLabels: Record<string, string> = {
      hp: 'HP',
      atk: 'ATK',
      def: 'DEF',
      spa: 'SPA',
      spd: 'SPD',
      spe: 'SPE'
    }
    const statKey = statLabels[sub.targetStat] || sub.targetStat
    return {
      title: `IV EN ${statKey}`,
      value: p.displayValue || `${ivs[sub.targetStat] || 0} / 31 IV`
    }
  }
  if (sub.metric === 'weight') {
    return {
      title: 'PESO',
      value: p.displayValue || `${(p.weight || 0).toFixed(2)} kg`
    }
  }
  if (sub.metric === 'height') {
    return {
      title: 'ALTURA',
      value: p.displayValue || `${(p.height || 0).toFixed(2)} m`
    }
  }
  if (sub.metric === 'level') {
    return {
      title: 'NIVEL',
      value: `Nv. ${p.level ?? 1}`
    }
  }
  return {
    title: 'PUNTOS',
    value: p.displayValue || `${p.score ?? totalIvs} pts`
  }
}

const getSubCompIcon = (metric: string) => {
  if (metric === 'total_ivs' || metric === 'stat_iv') return '🧬'
  if (metric === 'weight') return '⚖️'
  if (metric === 'height') return '📏'
  if (metric === 'level') return '⭐'
  if (metric === 'friendship') return '💖'
  return '🏆'
}

const getSubCompTitle = (sub: SubCompetitionConfig) => {
  const dir = resolveSubCompetitionDirection(props.event.id, sub.id, sub.order)
  if (sub.metric === 'total_ivs') {
    return 'Mayor IVs Totales'
  }
  if (sub.metric === 'stat_iv' && sub.targetStat) {
    return `Mayor IV en ${sub.targetStat.toUpperCase()}` // domain-ok
  }
  if (sub.metric === 'weight') {
    return dir === 'max' ? 'Mayor Peso (Titán)' : 'Menor Peso (Miniatura)'
  }
  if (sub.metric === 'height') {
    return dir === 'max' ? 'Mayor Altura (Gran Salto)' : 'Menor Altura (Miniatura)'
  }
  if (sub.metric === 'level') {
    return dir === 'max' ? 'Mayor Nivel' : 'Menor Nivel'
  }
  if (sub.metric === 'friendship') {
    return dir === 'max' ? 'Mayor Amistad' : 'Menor Amistad'
  }
  return sub.name || 'Categoría'
}

const openParticipationModal = (sub: SubCompetitionConfig) => {
  const allowedSpecies = parsedEventConfig.value.species
    ? parsedEventConfig.value.species.split(',').map((s: string) => s.trim()).filter(isPokemonSpeciesId)
    : null

  const team = (gameStore.state.team || []) as (Pokemon | null)[]
  const box = (gameStore.state.box || []) as (Pokemon | null)[]
  const allPokes = [...team, ...box].filter((p): p is Pokemon => p !== null)
  
  // Pre-filter candidate Pokémon strictly using isPokemonEligibleForSubCompetition and exclude already enrolled in other categories
  const eligible = getEligiblePokemonForSubCompetition(props.event, sub, allPokes, getServerInstant())
    .filter(p => !isPokemonEnrolledInOtherSubCompetition(eventStore.userEntries, props.event.id, sub.id, p.uid))

  if (eligible.length === 0) {
    uiStore.notify(`No tienes ningún Pokémon disponible para: ${getSubCompTitle(sub)} (los ya inscritos en otra categoría no pueden repetir)`, '⚠️')
    return
  }

  const allowedIds = eligible.map(p => p.uid)
  const subtitle = `Elige un Pokémon para la categoría: ${getSubCompTitle(sub)}`

  modalStore.open('PokemonSelection', {
    title: 'SELECCIONAR POKÉMON',
    subtitle,
    maxSelect: 1,
    minSelect: 1,
    includeTeam: true,
    context: 'event',
    allowedSpecies,
    allowedIds,
    onConfirm: async (selectedObjects: Pokemon[]) => {
      const pokemon = selectedObjects[0]
      if (pokemon) {
        await eventStore.submitCompetitionEntry(props.event.id, sub.id, pokemon.uid)
      }
    }
  })
}

const openEventDetail = () => {
  modalStore.open('EventDetail', {
    event: props.event
  })
}

const onCardHover = (event: MouseEvent, isEntering: boolean) => {
  const card = event.currentTarget as HTMLElement
  if (!card) return
  if (isEntering) {
    gsap.to(card, {
      borderColor: 'rgba(255, 215, 0, 0.5)',
      y: -2,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  } else {
    gsap.to(card, {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      y: 0,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'borderColor,transform'
    })
  }
}

onMounted(() => {
  updateTime()
  
  if (badgeRef.value) {
    badgeCtx = gsap.context(() => {
      gsap.fromTo(badgeRef.value, 
        { boxShadow: "0 0 0 0 rgba(74, 222, 128, 0.4)" },
        { 
          boxShadow: "0 0 0 6px rgba(74, 222, 128, 0)",
          duration: 1.4,
          repeat: -1,
          ease: "sine.out"
        }
      )
    }, badgeRef.value)
  }
})

onUnmounted(() => {
  if (timerTween) {
    timerTween.kill()
  }
  if (badgeCtx) {
    badgeCtx.revert()
  }
})
</script>

<template>
  <div
    class="event-card"
    :class="{ 'has-banner': typeof event.config === 'object' && event.config?.banner }"
    @mouseenter="onCardHover($event, true)"
    @mouseleave="onCardHover($event, false)"
  >
    <!-- Banner -->
    <div
      v-if="typeof event.config === 'object' && event.config?.banner"
      class="banner-box"
    >
      <img
        :src="getAssetUrl(ASSET_TYPES.BANNER, event.config.banner)"
        @error="(e: Event) => ((e.target as HTMLImageElement).style.display='none')"
      >
    </div>
    
    <div class="card-body">
      <div class="body-header">
        <div class="event-id-icon">
          {{ event.icon }}
        </div>
        <div class="event-main-meta">
          <h2>{{ event.name }}</h2>
          <div class="tags-row">
            <span
              class="type-tag"
              :class="event.type"
            >{{ event.type === 'competition' ? 'COMPETICIÓN' : 'EVENTO' }}</span>
            <span
              v-if="parsedEventConfig.speciesShinyMult && parsedEventConfig.speciesShinyMult > 1"
              class="type-tag shiny"
            >✨ x{{ parsedEventConfig.speciesShinyMult }} SHINY</span>
            <span
              v-if="parsedEventConfig.speciesRateMult && parsedEventConfig.speciesRateMult > 1"
              class="type-tag spawn"
            >🎯 x{{ parsedEventConfig.speciesRateMult }} SPAWN</span>
            <span
              v-if="parsedEventConfig.fishingMult && parsedEventConfig.fishingMult > 1"
              class="type-tag fishing"
            >🎣 x{{ parsedEventConfig.fishingMult }} PESCA</span>
            <span
              v-if="parsedEventConfig.requireCaughtDuringEvent"
              class="catch-window-tag"
            >🕒 SOLO CAPTURAS DEL EVENTO</span>
          </div>
        </div>
      </div>

      <p class="description">
        {{ event.description }}
      </p>

      <!-- Competition Category Slots List -->
      <div 
        v-if="event.type === 'competition' && subCompetitions.length"
        class="competition-slots-list"
      >
        <div
          v-for="sub in subCompetitions"
          :key="sub.id"
          class="category-slot-card"
          :class="{ 'has-participant': !!getParticipantForCategory(sub) }"
        >
          <!-- Slot Header -->
          <div class="slot-header">
            <div class="slot-header-left">
              <span class="cat-icon">{{ sub.icon || getSubCompIcon(sub.metric) }}</span>
              <span class="cat-title pixelated">{{ getSubCompTitle(sub) }}</span>
            </div>
            <span class="cat-dir-badge pixelated">
              {{ resolveSubCompetitionDirection(event.id, sub.id, sub.order) === 'min' ? '▼ Menor' : '▲ Mayor' }}
            </span>
          </div>

          <!-- Slot Body: Enrolled Pokemon -->
          <div
            v-if="getParticipantForCategory(sub)"
            class="slot-enrolled-body"
          >
            <div class="poke-avatar-box">
              <PVSpriteFX
                :is-shiny="getParticipantForCategory(sub)!.isShiny"
                :sparkle-count="2"
              >
                <img
                  :src="getAssetUrl(ASSET_TYPES.POKEMON, getParticipantForCategory(sub)!.id, { isShiny: getParticipantForCategory(sub)!.isShiny })"
                  alt=""
                  class="pixelated poke-img"
                  @error="(e: Event) => ((e.target as HTMLImageElement).style.display='none')"
                >
              </PVSpriteFX>
            </div>

            <div class="poke-meta-box">
              <div class="poke-name-row">
                <span class="poke-name-txt">{{ getParticipantForCategory(sub)!.nickname || getParticipantForCategory(sub)!.name }}</span>
                <span
                  v-if="getParticipantForCategory(sub)!.isShiny"
                  class="poke-shiny-badge"
                >✨</span>
                <span class="poke-lv-badge">Nv. {{ getParticipantForCategory(sub)!.level ?? 1 }}</span>
              </div>
              <div class="metric-highlight-row">
                <span class="metric-val-txt pixelated">{{ getMetricDisplay(sub, getParticipantForCategory(sub)!).value }}</span>
              </div>
            </div>

            <button
              :id="'event-change-btn-' + event.id + '-' + sub.id"
              class="btn-slot-action change pixelated"
              @click.stop="openParticipationModal(sub)"
            >
              CAMBIAR
            </button>
          </div>

          <!-- Slot Body: Empty State -->
          <div
            v-else
            class="slot-empty-body"
            @click.stop="openParticipationModal(sub)"
          >
            <div class="empty-info">
              <span class="empty-plus">+</span>
              <span class="empty-txt pixelated">Sin Pokémon inscripto</span>
            </div>
            <button
              :id="'event-participate-btn-' + event.id + '-' + sub.id"
              class="btn-slot-action inscribe pixelated"
              @click.stop="openParticipationModal(sub)"
            >
              INSCRIBIR
            </button>
          </div>
        </div>
      </div>

      <footer class="card-footer">
        <div class="timer-box">
          <span class="label">FINALIZA EN:</span>
          <span class="value">{{ formatTime(event.end_at || '') }}</span>
        </div>
        
        <button
          v-if="event.type === 'competition'"
          class="retro-btn rules-btn pixelated"
          @click.stop="openEventDetail"
        >
          📋 REGLAS Y PREMIOS
        </button>
        <div 
          v-else 
          ref="badgeRef"
          class="active-badge"
        >
          ✨ ACTIVO
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped src="./EventCard.styles.scss" lang="scss"></style>
