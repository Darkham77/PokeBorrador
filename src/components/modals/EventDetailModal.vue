<script setup>
import { computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  show: Boolean,
  event: { type: Object, required: true }
})

const emit = defineEmits(['close'])

const cfg = computed(() => {
  if (typeof props.event.config === 'string') {
    try { return JSON.parse(props.event.config) } catch (_e) { return {} }
  }
  return props.event.config || {}
})

const sched = computed(() => {
  if (typeof props.event.schedule === 'string') {
    try { return JSON.parse(props.event.schedule) } catch (_e) { return {} }
  }
  return props.event.schedule || {}
})

const bonusMap = {
  expMult:      { label: '⚡ EXP', color: '#a78bfa' },
  moneyMult:    { label: '💰 Dinero', color: '#fbbf24' },
  bcMult:       { label: '🪙 Battle Coins', color: '#60a5fa' },
  shinyMult:    { label: '✨ Shiny Rate (Salvaje)', color: '#f472b6' },
  eggShinyMult: { label: '✨ Shiny Rate (Huevos)', color: '#f472b6' },
  hatchMult:    { label: '🥚 Eclosión Rápida', color: '#34d399' },
  rivalMult:    { label: '😈 Aparición de Rival', color: '#ef4444' },
  trainerMult:  { label: '🎒 Aparición de Entrenadores', color: '#3b82f6' },
  fishingMult:  { label: '🎣 Eventos de Pesca', color: '#0ea5e9' },
}

const activeBonuses = computed(() => {
  return Object.entries(bonusMap)
    .filter(([key]) => cfg.value[key] && cfg.value[key] > 1)
    .map(([key, meta]) => ({
      label: meta.label,
      color: meta.color,
      value: `x${cfg.value[key]}`
    }))
})

const prizes = computed(() => {
  if (cfg.value.hasCompetition === false || !cfg.value.prizes) return null
  return cfg.value.prizes
})

const getPrizeDesc = (p) => {
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
  if (cfg.value.hasCompetition === false) return null
  const sortBy = cfg.value.sortBy || 'data.total_ivs'
  const labels = {
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
    const days = sched.value.days.map(d => dayNames[d]).join(', ')
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
        @click="emit('close')"
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
  font-size: 64px;
  text-align: center;
  margin-bottom: 10px;
  filter: Drop-Shadow(0 0 15px rgba(255, 214, 10, 0.4));
}

.event-header {
  text-align: center;
  margin-bottom: 30px;

  .event-title {
    @include pixelated;
    font-size: 14px;
    color: var(--yellow);
    margin-bottom: 15px;
    line-height: 1.6;
    @include pixelated;
  }

  .event-desc {
    font-size: 13px;
    color: #94a3b8;
    line-height: 1.6;
    padding: 0 20px;
  }
}

.event-section {
  margin-bottom: 25px;
  text-align: center;

  .section-tag {
    @include pixelated;
    font-size: 9px;
    color: $muted;
    margin-bottom: 15px;
    letter-spacing: 1px;
    display: inline-block;
    @include pixelated;
  }
}

.bonus-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bonus-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 14px 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .bonus-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .bonus-emoji {
    font-size: 16px;
  }

  .bonus-label {
    font-size: 14px;
    color: #cbd5e1;
  }

  .bonus-value {
    @include pixelated;
    font-size: 11px;
    @include pixelated;
  }
}

.prizes-container {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prize-item {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;

  .rank {
    font-weight: 700;
    font-size: 14px;
  }

  .desc {
    font-size: 14px;
    font-weight: 600;
  }

  &.gold { .rank, .desc { color: #fde68a; } }
  &.silver { .rank, .desc { color: #cbd5e1; } }
  &.bronze { .rank, .desc { color: #b45309; } }
}

.info-box {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 15px 20px;
  font-size: 14px;
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;

  &.active {
    background: rgba(34, 197, 94, 0.1);
    border-color: rgba(34, 197, 94, 0.2);
    color: #4ade80;
  }
}

.legacy-confirm-btn {
  margin: 20px 0 10px;
  width: 100%;
  @include btn-vicio-primary;
}
</style>
