<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useModalStore } from '@/stores/modals'
import BaseModal from '@/components/common/BaseModal.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { normalizeZonedDateTime, getGMT3Date } from '@/logic/utils/timeUtils'
import {
  resolveEventSubCompetitions,
  resolveWeeklyRotation,
  type Event as GameEvent,
  type EventConfig,
  type ResolvedSubCompetition,
  type WeeklyRotationEntry
} from '@/logic/events/eventEngine'
import EventSubCompetitionsSection from './EventSubCompetitionsSection.vue'

interface Props {
  show?: boolean
  event: GameEvent
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

interface Schedule {
  type?: string
  days?: number[]
  startHour?: number
  endHour?: number
}

interface ExtendedEventConfig extends EventConfig {
  hasCompetition?: boolean
  prizes?: {
    first?: Prize
    second?: Prize
    third?: Prize
  }
  sortBy?: string
}

const cfg = computed<ExtendedEventConfig>(() => {
  if (typeof props.event.config === 'string') {
    try { return JSON.parse(props.event.config) as ExtendedEventConfig } catch (_e) { return {} }
  } else if (props.event.config && typeof props.event.config === 'object') {
    return props.event.config as ExtendedEventConfig
  }
  return {}
})

const activeRotation = computed<WeeklyRotationEntry | null>(() => {
  return resolveWeeklyRotation(cfg.value, getGMT3Date())
})

const effectiveBanner = computed<string | null>(() => {
  return activeRotation.value?.banner || cfg.value.banner || null
})

const effectiveTitle = computed<string>(() => {
  return activeRotation.value?.title || props.event.name
})

const effectiveSpeciesString = computed<string | null>(() => {
  return activeRotation.value?.species || cfg.value.species || null
})

const sched = computed<Schedule>(() => {
  if (typeof props.event.schedule === 'string') {
    try { return JSON.parse(props.event.schedule) as Schedule } catch (_e) { return {} }
  } else if (props.event.schedule && typeof props.event.schedule === 'object') {
    return props.event.schedule as Schedule
  }
  return {}
})

interface BonusItem {
  label: string
  color: string
  value: string
}

const activeBonuses = computed<BonusItem[]>(() => {
  const bonuses: BonusItem[] = []
  const c = cfg.value

  // Multiplicadores Globales / Economía
  if (c.expMult && c.expMult > 1) {
    bonuses.push({ label: '⭐ EXP ganada en cada combate', color: 'rgba(74, 222, 128, 1)', value: `x${c.expMult}` })
  }
  if (c.moneyMult && c.moneyMult > 1) {
    bonuses.push({ label: '💰 Dinero ganado por victoria', color: 'rgba(250, 204, 21, 1)', value: `x${c.moneyMult}` })
  }
  if (c.bcMult && c.bcMult > 1) {
    bonuses.push({ label: '🪙 Battle Coins por victoria en combate', color: 'rgba(96, 165, 250, 1)', value: `x${c.bcMult}` })
  }
  if (c.catchRateMult && c.catchRateMult > 1) {
    bonuses.push({ label: '🔴 Mayor probabilidad de captura con cualquier Pokéball', color: 'rgba(244, 114, 182, 1)', value: `x${c.catchRateMult}` })
  }
  if (c.shinyMult && c.shinyMult > 1) {
    bonuses.push({ label: '✨ Más chances de encontrar Pokémon Variocolor (Shiny)', color: 'rgba(244, 114, 182, 1)', value: `x${c.shinyMult}` })
  }
  if (c.eggShinyMult && c.eggShinyMult > 1) {
    bonuses.push({ label: '🥚 Más chances de que los Huevos eclosionen en Shiny', color: 'rgba(244, 114, 182, 1)', value: `x${c.eggShinyMult}` })
  }
  if (c.hatchMult && c.hatchMult > 1) {
    bonuses.push({ label: '🏃 Los Huevos eclosionan más rápido (menos pasos)', color: 'rgba(56, 189, 248, 1)', value: `x${c.hatchMult}` })
  }

  // Bonificaciones de Especies (resueltas desde rotación temática o configuración)
  const resolvedSpecies = involvedSpecies.value
  const spNames = resolvedSpecies.length > 0
    ? resolvedSpecies.map(s => s.toUpperCase()).join(', ') // domain-ok
    : (effectiveSpeciesString.value && effectiveSpeciesString.value !== '*' ? effectiveSpeciesString.value.toUpperCase() : null) // domain-ok

  if (c.speciesShinyMult && c.speciesShinyMult > 1) {
    const label = spNames ? `✨ Más chances de encontrar ${spNames} Variocolor (Shiny)` : '✨ Más chances de encontrar Pokémon del Evento Variocolor (Shiny)'
    bonuses.push({ label, color: 'rgba(244, 114, 182, 1)', value: `x${c.speciesShinyMult}` })
  }
  if (c.speciesRateMult && c.speciesRateMult > 1) {
    const label = spNames ? `🎯 ${spNames} aparece con mayor frecuencia en el mundo` : '🎯 Pokémon del Evento aparecen con mayor frecuencia en el mundo'
    bonuses.push({ label, color: 'rgba(96, 165, 250, 1)', value: `x${c.speciesRateMult}` })
  }



  // Minijuegos - Atajos directos (solo si no están ya en minigameBuffs para evitar duplicados)
  const mb = c.minigameBuffs || {}
  if (c.fishingMult && c.fishingMult > 1 && !mb.fishing) {
    bonuses.push({ label: '🎣 Pesca: Mayor frecuencia de encuentros y capturas', color: 'rgba(56, 189, 248, 1)', value: `x${c.fishingMult}` })
  }
  if (c.archaeologyMult && c.archaeologyMult > 1 && !mb.archaeology) {
    bonuses.push({ label: '⛏️ Arqueología: Mayor probabilidad de fósiles, gemas y tesoros', color: 'rgba(251, 146, 60, 1)', value: `x${c.archaeologyMult}` })
  }
  if (c.bugCatchingMult && c.bugCatchingMult > 1 && !mb.bug_catching) {
    bonuses.push({ label: '🦗 Caza de Bichos: Mayor aparición de Pokémon insecto', color: 'rgba(163, 230, 53, 1)', value: `x${c.bugCatchingMult}` })
  }

  // Buffs detallados de minijuegos por ID
  if (c.minigameBuffs && typeof c.minigameBuffs === 'object') {
    const minigameNames: Record<string, string> = {
      fishing: '🎣 Pesca',
      archaeology: '⛏️ Arqueología',
      bug_catching: '🦗 Caza de Bichos',
      safari: '🧭 Zona Safari'
    }

    for (const [mId, buffs] of Object.entries(c.minigameBuffs)) {
      if (mId === 'casino') continue // Sin casino en el juego
      const mName = minigameNames[mId] || `🎮 ${mId.toUpperCase()}`
      if (buffs.encounterRateMult && buffs.encounterRateMult > 1) {
        bonuses.push({ label: `${mName}: Más Pokémon aparecen por sesión`, color: 'rgba(56, 189, 248, 1)', value: `x${buffs.encounterRateMult}` })
      }
      if (buffs.successRateMult && buffs.successRateMult > 1) {
        bonuses.push({ label: `${mName}: Mayor probabilidad de éxito por intento`, color: 'rgba(74, 222, 128, 1)', value: `x${buffs.successRateMult}` })
      }
      if (buffs.rareDropMult && buffs.rareDropMult > 1) {
        bonuses.push({ label: `${mName}: Más objetos raros, gemas y tesoros`, color: 'rgba(250, 204, 21, 1)', value: `x${buffs.rareDropMult}` })
      }
      if (buffs.shinyMult && buffs.shinyMult > 1) {
        bonuses.push({ label: `${mName}: Mayor probabilidad de hallar Pokémon Shiny`, color: 'rgba(244, 114, 182, 1)', value: `x${buffs.shinyMult}` })
      }
      if (buffs.expMult && buffs.expMult > 1) {
        bonuses.push({ label: `${mName}: Más EXP ganada por actividad`, color: 'rgba(168, 85, 247, 1)', value: `x${buffs.expMult}` })
      }
      if (buffs.scoreMult && buffs.scoreMult > 1) {
        bonuses.push({ label: `${mName}: Puntaje más alto en la clasificación`, color: 'rgba(234, 179, 8, 1)', value: `x${buffs.scoreMult}` })
      }
    }
  }

  // Reglas y Restricciones
  if (c.requireCaughtDuringEvent) {
    bonuses.push({ label: '🕒 Solo se aceptan Pokémon capturados durante este evento', color: 'rgba(250, 204, 21, 1)', value: 'REGLA' })
  }

  // Reglas personalizadas abiertas
  if (Array.isArray(c.customRules)) {
    for (const rule of c.customRules) {
      bonuses.push({ label: rule.label, color: rule.color || 'rgba(250, 204, 21, 1)', value: rule.value })
    }
  }

  return bonuses
})



interface Prize extends Record<string, unknown> { // open-record
  type?: 'money' | 'bc' | 'item' | 'pokemon' | 'mixed'
  amount?: number
  qty?: number
  money?: number
  battleCoins?: number
  item?: string
  items?: Record<string, number>
  species?: string
  shiny?: boolean
  level?: number
}

const prizes = computed<{ first?: Prize, second?: Prize, third?: Prize } | null>(() => {
  const c = cfg.value
  if (c.hasCompetition !== true || !c.prizes) return null
  return c.prizes
})

const subCompetitions = computed<ResolvedSubCompetition[]>(() => {
  if (cfg.value.hasCompetition !== true) return []
  return resolveEventSubCompetitions(props.event, getGMT3Date())
})

const getSubCompPrizes = (sub: ResolvedSubCompetition): { first?: Prize, second?: Prize, third?: Prize } | null => {
  if (sub.prizes && (sub.prizes.first || sub.prizes.second || sub.prizes.third)) {
    return sub.prizes as { first?: Prize, second?: Prize, third?: Prize }
  }
  return prizes.value
}

const scheduleText = computed(() => {
  if (props.event.manual) return '🟢 Evento activo ahora mismo'
  if (sched.value.type === 'weekly' && sched.value.days) {
    const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'] as const
    const days = sched.value.days.length === 7 ? 'Todos los días' : sched.value.days.map((d: number) => dayNames[d]).join(', ')
    const formatH = (hr: number) => {
      const h = Math.floor(hr)
      const m = Math.round((hr % 1) * 60)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
    const isAllDay = sched.value.startHour === 0 && (sched.value.endHour === 24 || (sched.value.endHour !== undefined && sched.value.endHour >= 23.9))
    const hours = (sched.value.startHour !== undefined && sched.value.endHour !== undefined)
      ? (isAllDay ? ' · Todo el día (ARG)' : ` · ${formatH(sched.value.startHour)} – ${formatH(sched.value.endHour)} hs (ARG)`) : ''
    return `${days}${hours}`
  }
  if (props.event.start_at && props.event.end_at) {
    try {
      const startInst = Temporal.Instant.from(props.event.start_at)
      const endInst = Temporal.Instant.from(props.event.end_at)
      const startZdt = normalizeZonedDateTime(startInst)
      const endZdt = normalizeZonedDateTime(endInst)
      const isSameDay = startZdt.year === endZdt.year && startZdt.month === endZdt.month && startZdt.day === endZdt.day
      const isStartOfDay = startZdt.hour === 0 && startZdt.minute === 0
      const isEndOfDay = (endZdt.hour === 23 && endZdt.minute >= 59) || (endZdt.hour === 0 && endZdt.minute === 0)
      const isAllDay = isStartOfDay && isEndOfDay

      const formatTime = (zdt: Temporal.ZonedDateTime) =>
        `${String(zdt.hour).padStart(2, '0')}:${String(zdt.minute).padStart(2, '0')}`

      if (isSameDay) {
        const timePart = isAllDay ? ' · Todo el día (ARG)' : ` · ${formatTime(startZdt)} – ${formatTime(endZdt)} hs (ARG)`
        return `${startZdt.day}/${startZdt.month}/${startZdt.year}${timePart}`
      } else {
        const timePart = isAllDay ? ' · Todo el día (ARG)' : ` · ${formatTime(startZdt)} al ${formatTime(endZdt)} hs (ARG)`
        return `Del ${startZdt.day}/${startZdt.month} al ${endZdt.day}/${endZdt.month}/${endZdt.year}${timePart}`
      }
    } catch {
      return null
    }
  }
  return null
})

const involvedSpecies = computed<PokemonSpeciesId[]>(() => {
  const result: PokemonSpeciesId[] = []
  const seen = new Set<string>()

  const add = (raw: string | undefined | null) => {
    if (!raw) return
    const id = raw.trim().toLowerCase()
    if (isPokemonSpeciesId(id) && !seen.has(id)) {
      seen.add(id)
      result.push(id)
    }
  }

  // 1. effectiveSpeciesString (from rotation or config)
  if (effectiveSpeciesString.value) {
    const list = effectiveSpeciesString.value.split(',')
    list.forEach(add)
  }

  // 2. prizes with species
  if (prizes.value) {
    if (prizes.value.first?.species) add(prizes.value.first.species)
    if (prizes.value.second?.species) add(prizes.value.second.species)
    if (prizes.value.third?.species) add(prizes.value.third.species)
  }

  // 3. Sub-competition prizes with species
  if (subCompetitions.value.length > 0) {
    for (const sub of subCompetitions.value) {
      const p = getSubCompPrizes(sub)
      if (p?.first && typeof p.first === 'object' && 'species' in p.first && typeof p.first.species === 'string') {
        add(p.first.species)
      }
      if (p?.second && typeof p.second === 'object' && 'species' in p.second && typeof p.second.species === 'string') {
        add(p.second.species)
      }
      if (p?.third && typeof p.third === 'object' && 'species' in p.third && typeof p.third.species === 'string') {
        add(p.third.species)
      }
    }
  }

  return result
})

const currentSpeciesIndex = ref(0)
let cycleTween: gsap.core.Tween | null = null

const startSpeciesCycle = () => {
  if (cycleTween) {
    cycleTween.kill()
    cycleTween = null
  }
  if (involvedSpecies.value.length > 1) {
    cycleTween = gsap.delayedCall(2.5, () => {
      currentSpeciesIndex.value = (currentSpeciesIndex.value + 1) % involvedSpecies.value.length
      startSpeciesCycle()
    })
  }
}

watch(involvedSpecies, () => {
  currentSpeciesIndex.value = 0
  startSpeciesCycle()
}, { immediate: true })

onUnmounted(() => {
  if (cycleTween) {
    cycleTween.kill()
    cycleTween = null
  }
})

const currentSpecies = computed<PokemonSpeciesId | null>(() => {
  if (involvedSpecies.value.length === 0) return null
  return involvedSpecies.value[currentSpeciesIndex.value] || involvedSpecies.value[0] || null
})

const bannerUrl = computed<string | null>(() => {
  const bannerKey = effectiveBanner.value
  if (!bannerKey) return null
  return getAssetUrl(ASSET_TYPES.BANNER, bannerKey)
})

const modalStore = useModalStore()

const openSpeciesDetail = (speciesId: PokemonSpeciesId) => {
  modalStore.open('PokedexDetail', {
    speciesId,
    context: 'pokedex'
  })
}
</script>

<template>
  <BaseModal
    :show="show"
    max-width="680px"
    variant="retro"
    accent-color="var(--yellow)"
    close-button-variant="solid"
    hide-header
    @close="emit('close')"
  >
    <div class="event-detail-modal">
      <!-- Banner Header Image (100% visible, sin recortes ni gradientes que lo tapen) -->
      <div
        v-if="bannerUrl"
        class="event-banner-header"
      >
        <img
          :src="bannerUrl"
          :alt="effectiveTitle"
          class="event-banner-img"
          @error="(e: Event) => ((e.target as HTMLImageElement).style.display='none')"
        >
      </div>

      <!-- Pokémon showcase (only when no banner image) -->
      <div
        v-else-if="involvedSpecies.length > 0"
        class="event-pokemon-showcase clickable"
        :title="currentSpecies ? `Ver datos de la Pokédex para ${currentSpecies}` : undefined"
        role="button"
        tabindex="0"
        @click="currentSpecies && openSpeciesDetail(currentSpecies)"
        @keydown.enter="currentSpecies && openSpeciesDetail(currentSpecies)"
      >
        <PVSpriteFX
          :is-shiny="Boolean(cfg.speciesShinyMult || cfg.shinyMult)"
          :sparkle-count="3"
        >
          <img
            v-if="currentSpecies"
            :key="currentSpecies"
            :src="getAssetUrl(ASSET_TYPES.POKEMON, currentSpecies, { isShiny: Boolean(cfg.speciesShinyMult || cfg.shinyMult) })"
            :alt="currentSpecies"
            class="pixelated event-pokemon-sprite"
          >
        </PVSpriteFX>
        <div
          v-if="involvedSpecies.length > 1"
          class="showcase-dots"
        >
          <span
            v-for="(sp, idx) in involvedSpecies"
            :key="sp"
            class="dot"
            :class="{ active: idx === currentSpeciesIndex }"
          />
        </div>
      </div>
      <div
        v-else-if="!bannerUrl && event.icon"
        class="event-main-icon"
      >
        {{ event.icon }}
      </div>

      <!-- Título y Descripción -->
      <div class="event-header">
        <h3 class="event-title">
          ¡{{ effectiveTitle }}!
        </h3>
        <div
          v-if="activeRotation?.title && activeRotation.title !== event.name"
          class="event-rotation-badge"
        >
          🏆 Temática Semanal: {{ activeRotation.title }}
        </div>
        <p class="event-desc">
          {{ event.description || '¡Aprovechá este evento especial mientras esté activo!' }}
        </p>
      </div>

      <!-- Participantes / Especies Permitidas con Sprites -->
      <div
        v-if="involvedSpecies.length > 0"
        class="event-section participants-section"
      >
        <div class="section-tag">
          POKÉMON PARTICIPANTES ({{ involvedSpecies.length }})
        </div>
        <div class="participants-list-pills">
          <div
            v-for="sp in involvedSpecies"
            :key="sp"
            class="participant-pill clickable"
            :title="`Ver información de Pokédex de ${sp}`"
            role="button"
            tabindex="0"
            @click.stop="openSpeciesDetail(sp)"
            @keydown.enter.stop="openSpeciesDetail(sp)"
          >
            <PVSpriteFX
              :is-shiny="Boolean(cfg.speciesShinyMult || cfg.shinyMult)"
              :sparkle-count="2"
            >
              <img
                :src="getAssetUrl(ASSET_TYPES.POKEMON, sp, { isShiny: Boolean(cfg.speciesShinyMult || cfg.shinyMult) })"
                :alt="sp"
                class="pixelated participant-sprite"
              >
            </PVSpriteFX>
            <span class="participant-name">{{ sp }}</span>
          </div>
        </div>
      </div>



      <!-- Horario -->
      <div
        v-if="scheduleText"
        class="event-section"
      >
        <div class="section-tag">
          ⏰ HORARIO
        </div>
        <div
          class="info-box schedule-box"
          :class="{ active: event.manual }"
        >
          {{ scheduleText }}
        </div>
      </div>


      <!-- Bonificaciones -->
      <div 
        v-if="activeBonuses.length" 
        class="event-section"
      >
        <div class="section-tag">
          BONIFICACIONES
        </div>
        <div class="bonus-grid">
          <div 
            v-for="bonus in activeBonuses" 
            :key="bonus.label" 
            class="bonus-item"
          >
            <div class="bonus-left">
              <span class="bonus-label">{{ bonus.label }}</span>
            </div>
            <span 
              class="bonus-value" 
              :style="{ color: bonus.color }"
            >{{ bonus.value }}</span>
          </div>
        </div>
      </div>

      <!-- Sub-Competencias y Premios -->
      <EventSubCompetitionsSection
        :event-id="props.event.id"
        :sub-competitions="subCompetitions"
        :prizes="prizes"
      />

      <!-- Botón Entendido -->
      <button 
        class="legacy-confirm-btn"
        @click.stop="emit('close')"
      >
        ¡ENTENDIDO!
      </button>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/components/EventDetailModal.styles.scss" as *;
</style>
