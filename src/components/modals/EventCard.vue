<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import type { Event as GameEvent, EventConfig } from '@/logic/events/eventEngine'
import { isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { Pokemon } from '@/types/pokemon/pokemon'

interface Props {
  event: GameEvent
}

const props = defineProps<Props>()

const eventStore = useEventStore()
const gameStore = useGameStore()
const modalStore = useModalStore()

const now = ref(Temporal.Now.instant().epochMilliseconds)
let timerTween: gsap.core.Tween | null = null
const badgeRef = ref<HTMLElement | null>(null)
let badgeCtx: gsap.Context | null = null

const updateTime = () => {
  now.value = Temporal.Now.instant().epochMilliseconds
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
}

const userEntry = computed(() => eventStore.userEntries[props.event.id])

const participatingPokemon = computed<CompetitionParticipant | null>(() => {
  if (!userEntry.value) return null
  const uid = userEntry.value.pokemon_uid
  const team = (gameStore.state.team || []) as (Pokemon | null)[]
  const box = (gameStore.state.box || []) as (Pokemon | null)[]
  const found = [...team, ...box].find(p => p && p.uid === uid)
  if (found) {
    return {
      uid: found.uid,
      id: found.id,
      name: found.name,
      nickname: found.nickname,
      level: found.level,
      isShiny: found.isShiny,
      ivs: found.ivs,
      size: found.size,
      height: found.height
    }
  }

  const data = userEntry.value.data
  if (data && data.species && isPokemonSpeciesId(data.species)) {
    return {
      uid,
      id: data.species,
      name: data.name || String(data.species),
      nickname: data.nickname,
      level: data.level || 1,
      isShiny: !!data.is_shiny,
      ivs: data.ivs as Pokemon['ivs'],
      size: data.size
    }
  }
  return null
})

const eventMetricType = computed<'ivs' | 'level' | 'size' | 'shiny' | 'score'>(() => {
  const c = parsedEventConfig.value
  const metric = (c.metric || '').toLowerCase()
  if (metric.includes('iv') || metric === 'total_ivs' || metric === 'ivs' || !metric) {
    return 'ivs'
  }
  if (metric.includes('level') || metric === 'level') {
    return 'level'
  }
  if (metric.includes('size') || metric.includes('height') || metric.includes('weight')) {
    return 'size'
  }
  if (metric.includes('shiny')) {
    return 'shiny'
  }
  return 'score'
})

const metricDisplay = computed(() => {
  if (!participatingPokemon.value) return null
  const p = participatingPokemon.value
  const ivs = p.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)

  if (eventMetricType.value === 'ivs') {
    return {
      title: 'IVs TOTALES',
      value: `${totalIvs} / 186`,
      ivs
    }
  }
  if (eventMetricType.value === 'level') {
    return {
      title: 'NIVEL',
      value: `Nv. ${p.level ?? 1}`,
      ivs: null
    }
  }
  if (eventMetricType.value === 'size') {
    const sizeVal = p.size || p.height || 'Normal'
    return {
      title: 'TAMAÑO',
      value: String(sizeVal),
      ivs: null
    }
  }
  if (eventMetricType.value === 'shiny') {
    return {
      title: 'VARIOCOLOR',
      value: p.isShiny ? '✨ Shiny' : 'Estándar',
      ivs: null
    }
  }
  return {
    title: 'PUNTOS',
    value: `${totalIvs}`,
    ivs: null
  }
})

const openParticipationModal = () => {
  const allowedSpecies = parsedEventConfig.value.species
    ? parsedEventConfig.value.species.split(',').map((s: string) => s.trim()).filter(isPokemonSpeciesId)
    : null

  modalStore.open('PokemonSelection', {
    title: 'SELECCIONAR POKÉMON',
    subtitle: `Elige un Pokémon para inscribir en: ${props.event.name}`,
    maxSelect: 1,
    minSelect: 1,
    includeTeam: true,
    context: 'event',
    allowedSpecies,
    onConfirm: async (selectedObjects: Pokemon[]) => {
      const pokemon = selectedObjects[0]
      if (pokemon) {
        await eventStore.submitCompetitionEntry(props.event.id, pokemon.uid)
      }
    }
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

const onBtnHover = (event: MouseEvent, isEntering: boolean) => {
  const btn = event.currentTarget as HTMLElement
  if (!btn || btn.hasAttribute('disabled')) return
  const isAction = btn.classList.contains('action')
  if (isEntering) {
    gsap.to(btn, {
      background: isAction ? 'var(--yellow)' : 'rgba(255, 255, 255, 0.12)',
      y: -2,
      borderColor: isAction ? 'var(--white)' : 'rgba(255, 255, 255, 0.2)',
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  } else {
    gsap.to(btn, {
      background: isAction ? 'var(--yellow)' : 'rgba(255, 255, 255, 0.05)',
      y: 0,
      borderColor: isAction ? 'var(--white)' : 'rgba(255, 255, 255, 0.1)',
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform,background,borderColor'
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
          <span
            class="type-tag"
            :class="event.type"
          >{{ event.type === 'competition' ? 'COMPETICIÓN' : 'EVENTO' }}</span>
        </div>
      </div>

      <p class="description">
        {{ event.description }}
      </p>

      <!-- Participating Pokemon Section in Competition Event -->
      <div 
        v-if="event.type === 'competition' && participatingPokemon && metricDisplay"
        class="participating-poke-box"
      >
        <div class="participating-header">
          <span class="dot-live" />
          <span class="header-txt">POKÉMON INSCRIPTO</span>
        </div>

        <div class="participating-main-info">
          <div class="poke-avatar-box">
            <PVSpriteFX
              :is-shiny="participatingPokemon.isShiny"
              :sparkle-count="3"
            >
              <img
                :src="getAssetUrl(ASSET_TYPES.POKEMON, participatingPokemon.id, { isShiny: participatingPokemon.isShiny })"
                alt=""
                class="pixelated poke-img"
                @error="(e: Event) => ((e.target as HTMLImageElement).style.display='none')"
              >
            </PVSpriteFX>
          </div>

          <div class="poke-details-box">
            <div class="poke-name-row">
              <span class="poke-name-txt">{{ participatingPokemon.nickname || participatingPokemon.name }}</span>
              <span class="poke-lv-badge">Nv. {{ participatingPokemon.level ?? 1 }}</span>
            </div>

            <div class="metric-highlight-row">
              <span class="metric-lbl">{{ metricDisplay.title }}:</span>
              <span class="metric-val-txt">{{ metricDisplay.value }}</span>
            </div>
          </div>
        </div>

        <!-- IVs detail breakdown if IV competition -->
        <div 
          v-if="eventMetricType === 'ivs' && metricDisplay.ivs"
          class="ivs-detail-grid"
        >
          <div class="iv-chip">
            <span>HP</span><b>{{ metricDisplay.ivs.hp ?? 0 }}</b>
          </div>
          <div class="iv-chip">
            <span>ATK</span><b>{{ metricDisplay.ivs.atk ?? 0 }}</b>
          </div>
          <div class="iv-chip">
            <span>DEF</span><b>{{ metricDisplay.ivs.def ?? 0 }}</b>
          </div>
          <div class="iv-chip">
            <span>SPA</span><b>{{ metricDisplay.ivs.spa ?? 0 }}</b>
          </div>
          <div class="iv-chip">
            <span>SPD</span><b>{{ metricDisplay.ivs.spd ?? 0 }}</b>
          </div>
          <div class="iv-chip">
            <span>SPE</span><b>{{ metricDisplay.ivs.spe ?? 0 }}</b>
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
          class="retro-btn action"
          :class="{ 'is-enrolled': !!participatingPokemon }"
          @mouseenter="onBtnHover($event, true)"
          @mouseleave="onBtnHover($event, false)"
          @click.stop="openParticipationModal"
        >
          {{ participatingPokemon ? 'CAMBIAR' : 'PARTICIPAR' }}
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

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.retro-btn {
  @include pixelated;
  font-size: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 2px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(255, 255, 255, 0.05);
  color: var(--white);
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.action {
    background: var(--yellow);
    border-color: var(--white);
    color: var(--black);
    text-shadow: none;

    &.is-enrolled {
      background: Rgba(255, 255, 255, 0.08);
      border-color: Rgba(255, 255, 255, 0.2);
      color: var(--white);
    }
  }
}

.event-card {
  background: $card-dark;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .participating-poke-box {
    margin-bottom: 16px;
    background: Rgba(0, 0, 0, 0.35);
    border: 1px solid Rgba(255, 215, 0, 0.25);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .participating-header {
      display: flex;
      align-items: center;
      gap: 6px;

      .dot-live {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--green-bright);
        box-shadow: 0 0 6px var(--green-bright);
      }

      .header-txt {
        @include pixelated;
        font-size: 7px;
        color: var(--yellow);
        letter-spacing: 0.5px;
      }
    }

    .participating-main-info {
      display: flex;
      align-items: center;
      gap: 10px;

      .poke-avatar-box {
        width: 36px;
        height: 36px;
        background: Rgba(255, 255, 255, 0.03);
        border: 1px solid Rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .poke-img {
          width: 32px;
          height: 32px;
          object-fit: contain;
        }
      }

      .poke-details-box {
        display: flex;
        flex-direction: column;
        gap: 3px;
        flex: 1;

        .poke-name-row {
          display: flex;
          align-items: center;
          gap: 6px;

          .poke-name-txt {
            font-size: 11px;
            font-weight: bold;
            color: var(--white);
          }

          .poke-lv-badge {
            @include pixelated;
            font-size: 7px;
            padding: 1px 4px;
            border-radius: 3px;
            background: Rgba(255, 255, 255, 0.08);
            color: var(--gray);
          }
        }

        .metric-highlight-row {
          display: flex;
          align-items: center;
          gap: 5px;

          .metric-lbl {
            @include pixelated;
            font-size: 7px;
            color: var(--gray);
          }

          .metric-val-txt {
            @include pixelated;
            font-size: 8px;
            color: var(--green-bright);
            text-shadow: 0 0 6px Rgba(74, 222, 128, 0.3);
          }
        }
      }
    }

    .ivs-detail-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 4px;
      padding-top: 6px;
      border-top: 1px dashed Rgba(255, 255, 255, 0.08);

      .iv-chip {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: Rgba(255, 255, 255, 0.03);
        border-radius: 4px;
        padding: 2px 0;
        border: 1px solid Rgba(255, 255, 255, 0.05);

        span {
          font-size: 6px;
          color: var(--gray);
          line-height: 1;
        }

        b {
          @include pixelated;
          font-size: 7px;
          color: #a7f3d0;
          line-height: 1.2;
          margin-top: 1px;
        }
      }
    }
  }

  .banner-box {
    height: 120px;
    background: var(--black);
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .card-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .body-header {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;

    .event-id-icon {
      width: 40px;
      height: 40px;
      background: Rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      border: 1px solid Rgba(255, 255, 255, 0.05);
    }

    .event-main-meta {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    h2 {
      font-size: 13px;
      font-weight: bold;
      margin: 0 0 4px 0;
      color: var(--white);
    }

    .type-tag {
      font-size: 7px;
      padding: 2px 6px;
      border-radius: 4px;
      background: Rgba(59, 130, 246, 0.1);
      color: var(--blue-bright);
      font-weight: bold;
      width: fit-content;
    }
  }

  .description {
    font-size: 11px;
    color: var(--gray);
    line-height: 1.4;
    margin-bottom: 16px;
    flex: 1;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;

    .timer-box {
      .label {
        display: block;
        font-size: 7px;
        color: var(--gray);
        margin-bottom: 3px;
      }
      .value {
        @include pixelated;
        font-size: 8px;
        color: var(--red);
      }
    }
    
    .active-badge {
      @include pixelated;
      font-size: 8px;
      padding: 6px 12px;
      border-radius: 6px;
      background: Rgba(74, 222, 128, 0.1);
      border: 1px solid var(--green-bright);
      color: var(--green-bright);
      text-shadow: 0 0 8px Rgba(74, 222, 128, 0.3);
    }
  }
}
</style>
