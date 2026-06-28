<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import type { Event as GameEvent, EventConfig } from '@/logic/events/eventEngine'

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
  }
  return (props.event.config as ExtendedEventConfig) || {}
})

const sched = computed<Schedule>(() => {
  if (typeof props.event.schedule === 'string') {
    try { return JSON.parse(props.event.schedule) as Schedule } catch (_e) { return {} }
  }
  return (props.event.schedule as Schedule) || {}
})

const bonusMap: Record<string, { label: string, color: string }> = {
  expMult:      { label: '⚡ EXP', color: 'Rgba(167, 139, 250, 1)' },
  moneyMult:    { label: '💰 Dinero', color: 'Rgba(251, 191, 36, 1)' },
  bcMult:       { label: '🪙 Battle Coins', color: 'Rgba(96, 165, 250, 1)' },
  shinyMult:    { label: '✨ Shiny Rate (Salvaje)', color: 'Rgba(244, 114, 182, 1)' },
  eggShinyMult: { label: '✨ Shiny Rate (Huevos)', color: 'Rgba(244, 114, 182, 1)' },
  hatchMult:    { label: '🥚 Eclosión Rápida', color: 'Rgba(52, 211, 153, 1)' },
  rivalMult:    { label: '😈 Aparición de Rival', color: 'Rgba(239, 68, 68, 1)' },
  trainerMult:  { label: '🎒 Aparición de Entrenadores', color: 'Rgba(59, 130, 246, 1)' },
  fishingMult:  { label: '🎣 Eventos de Pesca', color: 'Rgba(14, 165, 233, 1)' },
}

interface ActiveBonus {
  label: string
  color: string
  value: string
}

const activeBonuses = computed<ActiveBonus[]>(() => {
  return Object.entries(bonusMap)
    .filter(([key]) => {
      const val = cfg.value[key as keyof ExtendedEventConfig]
      return typeof val === 'number' && val > 1
    })
    .map(([key, meta]) => ({
      label: meta.label,
      color: meta.color,
      value: `x${cfg.value[key as keyof ExtendedEventConfig]}`
    }))
})

interface Prize {
  type: 'money' | 'bc' | 'item' | 'pokemon'
  amount?: number
  qty?: number
  item?: string
  species?: string
  shiny?: boolean
  level?: number
}

const prizes = computed<{ first?: Prize, second?: Prize, third?: Prize } | null>(() => {
  const c = cfg.value
  if (c.hasCompetition !== true || !c.prizes) return null
  return c.prizes
})

const getPrizeDesc = (p: Prize) => {
  if (!p) return null
  if (p.type === 'money') return `₽${(p.amount || 0).toLocaleString()}`
  if (p.type === 'bc') return `${(p.amount || 0).toLocaleString()} BC`
  if (p.type === 'item') return `${p.qty || 1}x ${p.item}`
  if (p.type === 'pokemon') {
    return `${p.species}${p.shiny ? ' ✨' : ''} Nv.${p.level}`
  }
  return null
}

const metricText = computed(() => {
  if (cfg.value.hasCompetition !== true) return null
  const sortBy = cfg.value.sortBy || 'data.total_ivs'
  const labels: Record<string, string> = {
    'data.total_ivs': '🧬 Mayor cantidad de IVs totales',
    'data.level': '📈 Mayor Nivel',
    'data.isShiny': '✨ Criterio Shiny',
  }
  return labels[sortBy] || sortBy
})

const scheduleText = computed(() => {
  if (props.event.manual) return '🟢 Evento activo ahora mismo'
  if (sched.value.type === 'weekly' && sched.value.days) {
    const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
    const days = sched.value.days.map((d: number) => dayNames[d]).join(', ')
    const hours = (sched.value.startHour !== undefined && sched.value.endHour !== undefined)
      ? ` · ${sched.value.startHour}:00 – ${sched.value.endHour}:00 hs (ARG)` : ''
    return `${days}${hours}`
  }
  return null
})
</script>

<template>
  <BaseModal
    :show="show"
    max-width="500px"
    variant="retro"
    accent-color="var(--yellow)"
    hide-header
    @close="emit('close')"
  >
    <div class="event-detail-modal">
      <!-- Icono Principal -->
      <div class="event-main-icon">
        {{ event.icon || '🎁' }}
      </div>

      <!-- Título y Descripción -->
      <div class="event-header">
        <h3 class="event-title">
          ¡{{ event.name }}!
        </h3>
        <p class="event-desc">
          {{ event.description || '¡Aprovechá este evento especial mientras esté activo!' }}
        </p>
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

      <!-- Premios -->
      <div 
        v-if="prizes" 
        class="event-section"
      >
        <div class="section-tag">
          🏆 PREMIOS DEL PODIO
        </div>
        <div class="prizes-container">
          <div 
            v-if="prizes.first" 
            class="prize-item gold"
          >
            <span class="rank">🥇 1°</span>
            <span class="desc">{{ getPrizeDesc(prizes.first) }}</span>
          </div>
          <div 
            v-if="prizes.second" 
            class="prize-item silver"
          >
            <span class="rank">🥈 2°</span>
            <span class="desc">{{ getPrizeDesc(prizes.second) }}</span>
          </div>
          <div 
            v-if="prizes.third" 
            class="prize-item bronze"
          >
            <span class="rank">🥉 3°</span>
            <span class="desc">{{ getPrizeDesc(prizes.third) }}</span>
          </div>
        </div>
      </div>

      <!-- Criterio -->
      <div 
        v-if="metricText" 
        class="event-section"
      >
        <div class="section-tag">
          CRITERIO DE VICTORIA
        </div>
        <div class="info-box">
          {{ metricText }}
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

<style lang="scss" scoped>
@use "@/styles/core/tools" as *;

.event-detail-modal {
  display: flex;
  flex-direction: column;
}

.event-main-icon {
  font-size: 48px;
  text-align: center;
  margin-bottom: 8px;
  will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 0 12px Rgba(255, 214, 10, 0.4));
}

.event-header {
  text-align: center;
  margin-bottom: 16px;

  .event-title {
    @include pixelated;
    font-size: 14px;
    color: var(--yellow);
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .event-desc {
    font-size: 12px;
    color: Rgba(148, 163, 184, 1);
    line-height: 1.4;
    padding: 0 16px;
  }
}

.event-section {
  margin-bottom: 16px;
  text-align: center;

  .section-tag {
    @include pixelated;
    font-size: 9px;
    color: $muted;
    margin-bottom: 8px;
    letter-spacing: 1px;
    display: inline-block;
  }
}

.bonus-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bonus-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: Rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px 16px;
  border: 1px solid Rgba(255, 255, 255, 0.05);

  .bonus-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bonus-emoji {
    font-size: 14px;
  }

  .bonus-label {
    font-size: 13px;
    color: Rgba(203, 213, 225, 1);
  }

  .bonus-value {
    @include pixelated;
    font-size: 11px;
  }
}

.prizes-container {
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prize-item {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;

  .rank {
    font-weight: 700;
    font-size: 13px;
  }

  .desc {
    font-size: 13px;
    font-weight: 600;
  }

  &.gold { .rank, .desc { color: Rgba(253, 230, 138, 1); } }
  &.silver { .rank, .desc { color: Rgba(203, 213, 225, 1); } }
  &.bronze { .rank, .desc { color: Rgba(180, 83, 9, 1); } }
}

.info-box {
  background: Rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 13px;
  color: Rgba(203, 213, 225, 1);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  text-align: center;

  &.active {
    background: Rgba(34, 197, 94, 0.1);
    border-color: Rgba(34, 197, 94, 0.2);
    color: Rgba(74, 222, 128, 1);
  }
}

.legacy-confirm-btn {
  margin: 12px 0 4px;
  width: 100%;
  @include btn-vicio-primary;
}
</style>
