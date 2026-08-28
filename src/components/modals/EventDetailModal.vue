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
  resolveSubCompetitionDirection,
  resolveWeeklyRotation,
  type Event as GameEvent,
  type EventConfig,
  type SubCompetitionConfig,
  type ResolvedSubCompetition,
  type WeeklyRotationEntry
} from '@/logic/events/eventEngine'
import RewardPillsGroup from '@/components/shared/RewardPillsGroup.vue'

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

const getSubCompDefaultIcon = (catId: string) => {
  if (catId.startsWith('ivs')) return '🧬'
  if (catId.startsWith('weight')) return '⚖️'
  if (catId.startsWith('height')) return '📏'
  if (catId.startsWith('level')) return '📈'
  if (catId.startsWith('friendship')) return '💖'
  return '🏆'
}

const getSubCompTitle = (sub: ResolvedSubCompetition | SubCompetitionConfig) => {
  const dir = resolveSubCompetitionDirection(props.event.id, sub.id, sub.order)
  const speciesSuffix = ('targetSpecies' in sub && sub.targetSpecies) ? ` (${sub.targetSpecies})` : '' // domain-ok
  if (sub.metric === 'total_ivs') {
    return 'Mayor cantidad de IVs totales (0 a 186) · Todas las especies'
  }
  if (sub.metric === 'stat_iv' && sub.targetStat) {
    return `Mayor IV en ${sub.targetStat.toUpperCase()}${speciesSuffix}` // domain-ok
  }
  if (sub.metric === 'weight') {
    return dir === 'max' ? `Mayor Peso (Titán / XXL)${speciesSuffix}` : `Menor Peso (Miniatura / XXS)${speciesSuffix}`
  }
  if (sub.metric === 'height') {
    return dir === 'max' ? `Mayor Altura (Gran Salto / XXL)${speciesSuffix}` : `Menor Altura (Miniatura / XXS)${speciesSuffix}`
  }
  if (sub.metric === 'level') {
    return dir === 'max' ? `Mayor Nivel${speciesSuffix}` : `Menor Nivel${speciesSuffix}`
  }
  if (sub.metric === 'friendship') {
    return dir === 'max' ? `Mayor Amistad${speciesSuffix}` : `Menor Amistad${speciesSuffix}`
  }
  return sub.description || sub.name || 'Criterio de evaluación'
}

const getSubCompPrizes = (sub: SubCompetitionConfig): { first?: Prize, second?: Prize, third?: Prize } | null => {
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
      <div 
        v-if="subCompetitions.length" 
        class="event-section"
      >
        <div class="section-tag">
          🏆 SUB-COMPETENCIAS Y PREMIOS
        </div>
        <div class="sub-comp-rule-note">
          <span class="note-icon">⚠️</span>
          <span>Cada Pokémon solo puede participar en una única categoría por evento.</span>
        </div>
        <div class="sub-competitions-container">
          <div 
            v-for="sub in subCompetitions" 
            :key="sub.id"
            class="sub-competition-detail-card"
          >
            <div class="sub-comp-header">
              <span class="sub-comp-icon">{{ sub.icon || getSubCompDefaultIcon(sub.id) }}</span>
              <span class="sub-comp-name pixelated">{{ getSubCompTitle(sub) }}</span>
            </div>

            <!-- Prizes for this sub-competition -->
            <div 
              v-if="getSubCompPrizes(sub)" 
              class="sub-prizes-list"
            >
              <div 
                v-if="getSubCompPrizes(sub)?.first" 
                class="sub-prize-row gold"
              >
                <div class="rank-badge pixelated">
                  🥇 1°
                </div>
                <RewardPillsGroup
                  :prize="getSubCompPrizes(sub)!.first"
                  size="sm"
                />
              </div>
              <div 
                v-if="getSubCompPrizes(sub)?.second" 
                class="sub-prize-row silver"
              >
                <div class="rank-badge pixelated">
                  🥈 2°
                </div>
                <RewardPillsGroup
                  :prize="getSubCompPrizes(sub)!.second"
                  size="sm"
                />
              </div>
              <div 
                v-if="getSubCompPrizes(sub)?.third" 
                class="sub-prize-row bronze"
              >
                <div class="rank-badge pixelated">
                  🥉 3°
                </div>
                <RewardPillsGroup
                  :prize="getSubCompPrizes(sub)!.third"
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Premios Globales Simples (si no hay sub-competencias) -->
      <div 
        v-else-if="prizes" 
        class="event-section"
      >
        <div class="section-tag">
          🏆 PREMIOS DEL PODIO
        </div>
        <div class="prizes-container">
          <div 
            v-if="prizes.first" 
            class="sub-prize-row gold"
          >
            <div class="rank-badge pixelated">
              🥇 1°
            </div>
            <RewardPillsGroup
              :prize="prizes.first"
              size="sm"
            />
          </div>
          <div 
            v-if="prizes.second" 
            class="sub-prize-row silver"
          >
            <div class="rank-badge pixelated">
              🥈 2°
            </div>
            <RewardPillsGroup
              :prize="prizes.second"
              size="sm"
            />
          </div>
          <div 
            v-if="prizes.third" 
            class="sub-prize-row bronze"
          >
            <div class="rank-badge pixelated">
              🥉 3°
            </div>
            <RewardPillsGroup
              :prize="prizes.third"
              size="sm"
            />
          </div>
        </div>
      </div>

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
@use "@/styles/core/mixins" as *;

.event-detail-modal {
  padding: 4px 4px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: center;
  color: var(--white);
}

// ── Banner Header ──────────────────────────────────────────────────────────────
.event-banner-header {
  margin: -4px -4px 0;
  border-radius: 18px 18px 0 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.event-banner-img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
}



.event-pokemon-showcase {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 4px 0 0;
  gap: 6px;

  .event-pokemon-sprite {
    width: 68px;
    height: 68px;
    image-rendering: pixelated;
    object-fit: contain;
    filter: Drop-Shadow(0 4px 12px Rgba(250, 204, 21, 0.4));
  }

  &.clickable {
    cursor: pointer;

    &:hover {
      transform: Scale(1.05);
      filter: Drop-Shadow(0 0 16px Rgba(250, 204, 21, 0.6));
    }
  }

  .showcase-dots {
    display: flex;
    gap: 5px;
    justify-content: center;
    align-items: center;

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: Rgba(255, 255, 255, 0.3);

      &.active {
        background: var(--yellow, #facc15);
        transform: Scale(1.3);
      }
    }
  }
}

.showcase-dots--center {
  justify-content: center;
  margin-top: -8px;
}

.event-main-icon {
  font-size: 40px;
  line-height: 1;
  margin: 4px 0 0;
  filter: Drop-Shadow(0 4px 12px Rgba(250, 204, 21, 0.3));
}

.event-header {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .event-title {
    font-size: 16px;
    font-weight: bold;
    color: var(--yellow);
    margin: 0;
    @include pixelated;
    text-shadow: 0 0 10px Rgba(250, 204, 21, 0.3);
  }

  .event-rotation-badge {
    align-self: center;
    padding: 3px 10px;
    background: Rgba(250, 204, 21, 0.12);
    border: 1px solid Rgba(250, 204, 21, 0.4);
    border-radius: 9999px;
    color: var(--yellow);
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 0.3px;
    box-shadow: 0 2px 6px Rgba(0, 0, 0, 0.3);
  }

  .event-desc {
    font-size: 11px;
    color: Rgba(241, 245, 249, 0.85);
    line-height: 1.4;
    margin: 0;
  }
}

.participants-section {
  .participants-list-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
    background: Rgba(255, 255, 255, 0.03);
    border: 1px solid Rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 12px;
  }

  .participant-pill {
    display: flex;
    align-items: center;
    gap: 10px;
    background: Rgba(15, 23, 42, 0.75);
    border: 1px solid Rgba(96, 165, 250, 0.25);
    border-radius: 10px;
    padding: 6px 12px;
    cursor: pointer;

    &:hover {
      transform: Translatey(-2px);
      border-color: Rgba(250, 204, 21, 0.7);
      background: Rgba(15, 23, 42, 0.95);
      box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.4), 0 0 8px Rgba(250, 204, 21, 0.25);
    }

    .participant-sprite {
      width: 56px;
      height: 56px;
      object-fit: contain;
    }

    .participant-name {
      font-size: 11px;
      font-weight: bold;
      color: #f1f5f9;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      @include pixelated;
    }
  }
}




.event-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;

  .section-tag {
    font-size: 8px;
    letter-spacing: 0.5px;
    color: Rgba(148, 163, 184, 0.9);
    margin-left: 2px;
    @include pixelated;
  }
}

.bonus-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bonus-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 11px;

  .bonus-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .bonus-label {
      color: Rgba(241, 245, 249, 0.9);
    }
  }

  .bonus-value {
    font-weight: bold;
    @include pixelated;
    font-size: 8px;
  }
}

.prizes-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-box {
  background: Rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 13px;
  color: Rgba(203, 213, 225, 1);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  text-align: center;

  .metric-main {
    font-weight: 600;
  }

  .tiebreaker-note {
    font-size: 11px;
    color: var(--yellow);
    margin-top: 4px;
    opacity: 0.9;
  }

  &.active {
    background: Rgba(34, 197, 94, 0.1);
    border-color: Rgba(34, 197, 94, 0.2);
    color: Rgba(74, 222, 128, 1);
  }
}

.sub-comp-rule-note {
  display: flex;
  align-items: center;
  gap: 6px;
  background: Rgba(234, 179, 8, 0.08);
  border: 1px dashed Rgba(234, 179, 8, 0.3);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 10px;
  color: Rgba(253, 224, 71, 0.95);
  line-height: 1.3;
  margin-bottom: 4px;

  .note-icon {
    font-size: 12px;
  }
}

.sub-competitions-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sub-competition-detail-card {
  background: Rgba(0, 0, 0, 0.35);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;

  .sub-comp-header {
    display: flex;
    align-items: center;
    gap: 8px;

    .sub-comp-icon {
      font-size: 16px;
    }

    .sub-comp-name {
      font-size: 9px;
      color: var(--yellow);
      font-weight: bold;
    }
  }

  .sub-comp-criterio {
    font-size: 8px;
    color: #93c5fd;
    padding-left: 24px;
    opacity: 0.9;
  }

  .sub-prizes-list {
    margin-top: 4px;
    padding-left: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-top: 1px dashed Rgba(255, 255, 255, 0.08);
    padding-top: 10px;
  }
}

.sub-prize-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 8px 10px;
  box-sizing: border-box;

  .rank-badge {
    font-size: 8px;
    font-weight: bold;
    min-width: 44px;
    text-align: center;
    padding: 3px 6px;
    border-radius: 6px;
    white-space: nowrap;
    border: 1px solid transparent;
  }

  &.gold {
    border-left: 3px solid Rgba(250, 204, 21, 0.85);
    background: Rgba(250, 204, 21, 0.03);

    .rank-badge {
      color: Rgba(253, 230, 138, 1);
      background: Rgba(250, 204, 21, 0.12);
      border-color: Rgba(250, 204, 21, 0.3);
      box-shadow: 0 0 8px Rgba(250, 204, 21, 0.1);
    }
  }

  &.silver {
    border-left: 3px solid Rgba(203, 213, 225, 0.85);
    background: Rgba(203, 213, 225, 0.02);

    .rank-badge {
      color: Rgba(203, 213, 225, 1);
      background: Rgba(203, 213, 225, 0.1);
      border-color: Rgba(203, 213, 225, 0.25);
    }
  }

  &.bronze {
    border-left: 3px solid Rgba(251, 146, 60, 0.85);
    background: Rgba(251, 146, 60, 0.02);

    .rank-badge {
      color: Rgba(253, 186, 116, 1);
      background: Rgba(251, 146, 60, 0.1);
      border-color: Rgba(251, 146, 60, 0.25);
    }
  }
}

.legacy-confirm-btn {
  margin: 12px 0 4px;
  width: 100%;
  @include btn-vicio-primary;
}
</style>
