<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battle'
import { getMechanicalWeather, WEATHER_MECHANICAL, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA } from '@/logic/battle/weatherMapper'
import { getDayCycle } from '@/logic/timeUtils'

const props = defineProps({
  pokemon: { type: Object, required: true },
  isPlayer: { type: Boolean, default: false },
  nickStyle: { type: String, default: '' }
})

const p = computed(() => props.pokemon)
const battleStore = useBattleStore()
const { playerStages, enemyStages } = storeToRefs(battleStore)

// displayHp permite animar la barra desde 0 cuando el componente aparece (Fase 3)
const displayHp = ref(0)

onMounted(() => {
  // Sincronizar con la transición de aparición del HUD
  setTimeout(() => {
    displayHp.value = p.value.hp
  }, 50)
})

watch(() => p.value.hp, (newHp) => {
  displayHp.value = newHp
})

const getHpPct = (cur, max) => (cur / max) * 100
const getHpClass = (pct) => {
  if (pct > 50) return 'hp-high'
  if (pct > 25) return 'hp-mid'
  return 'hp-low'
}

const getGenderText = (g) => ({ M: '♂', F: '♀' }[g] || '')
const getGenderCls = (g) => ({ M: 'gender-male', F: 'gender-female' }[g] || 'gender-none')

import { STATUS_EMOJI_MAP, STATUS_TOOLTIP_MAP, STAT_EMOJI_MAP } from '@/logic/battle/battleUiUtils'

const activeStages = computed(() => {
  const s = props.isPlayer ? battleStore.playerStages : battleStore.enemyStages
  if (!s) return []
  
  const results = []
  // Recorremos las claves explícitas para asegurar el tracking de reactividad de Vue
  const keys = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva']
  
  for (const key of keys) {
    const val = s[key]
    if (val !== 0) {
      const config = STAT_EMOJI_MAP[key] || { icon: '❓', name: key }
      results.push({
        key,
        val,
        icon: config.icon,
        text: `${config.name} ${val > 0 ? '↑' : '↓'}${Math.abs(val)}`
      })
    }
  }
  return results
})


// Mapeos de Estados Secundarios/Volátiles
const volatileStatuses = computed(() => {
  const list = []
  const target = props.isPlayer ? battleStore.player : battleStore.enemy
  if (!target) return []
  
  // 0. Habilidad Base (MANDATORIA)
  if (target.ability) {
    const ab = target.ability
    const weather = battleStore.state?.weather?.type
    const mechWeather = getMechanicalWeather(weather)
    const cycle = getDayCycle()
    
    let isAbBoosted = false
    let abDesc = `HABILIDAD: ${ab.toUpperCase()}.`

    const isSunActive = mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning'))
    const isRainActive = mechWeather === WEATHER_MECHANICAL.RAIN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'night' || cycle === 'dusk'))

    if (ab === 'Clorofila' && isSunActive) { isAbBoosted = true; abDesc += ' (ACTIVA por el sol/horario)' }
    if (ab === 'Nado rápido' && isRainActive) { isAbBoosted = true; abDesc += ' (ACTIVA por la lluvia/horario)' }
    if (ab === 'Ímpetu arena' && mechWeather === WEATHER_MECHANICAL.SANDSTORM) { isAbBoosted = true; abDesc += ' (ACTIVA por la arena)' }
    if (ab === 'Quitanieves' && (mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL)) { isAbBoosted = true; abDesc += ' (ACTIVA por la nieve)' }

    list.push({ 
      icon: '🧠', 
      text: abDesc,
      isBoosted: isAbBoosted
    })
  }

  // 1. Estados Propios del Pokémon
  if (target.confused) list.push({ icon: '🌀', text: 'CONFUNDIDO: Puede golpearse a sí mismo.' })
  if (target.attracted) list.push({ icon: '❤️', text: 'ENAMORADO: Puede no atacar por atracción.' })
  if (target.cursed) list.push({ icon: '👻', text: 'MALDITO: Pierde 1/4 HP cada turno.' })
  if (target.seeded) list.push({ icon: '🌱', text: 'DRENADORAS: Pierde HP cada turno y cura al rival.' })
  if (target.badPoison) list.push({ icon: '☣️', text: 'TÓXICO: El daño del veneno aumenta cada turno.' })
  if (target.endure) list.push({ icon: '🛡️', text: 'AGUANTE: Sobrevivirá el próximo golpe fatal.' })
  if (target.trapped) list.push({ icon: '🪤', text: 'ATRAPADO: No puede escapar del combate.' })
  if (target.disabledTurns > 0) list.push({ icon: '🚫', text: `ANULADO: Un movimiento está bloqueado (${target.disabledTurns}t).` })
  if (target.encoreTurns > 0) list.push({ icon: '🔁', text: `OTRA VEZ: Repite el mismo movimiento (${target.encoreTurns}t).` })
  if (target.tauntTurns > 0) list.push({ icon: '🤐', text: `MOFA: No puede usar movimientos de estado (${target.tauntTurns}t).` })
  if (target.flinched) list.push({ icon: '💫', text: 'RETROCEDER: No puede atacar este turno.' })
  if (target.protect || target.detect) list.push({ icon: '🛡️', text: 'PROTECCIÓN: Evita el daño este turno.' })
  if (target.substitute > 0) list.push({ icon: '🎭', text: `SUSTITUTO: Un señuelo de ${target.substitute} HP recibe el daño.` })
  if (target.destinyBond) list.push({ icon: '🔗', text: 'MISMODESTINO: Si el usuario cae, el rival también.' })
  if (target.perishSongCount > 0) list.push({ icon: '⏳', text: `CANTO MORTAL: El Pokémon caerá en ${target.perishSongCount} turnos.` })
  if (target.ingrain) list.push({ icon: '🌳', text: 'ARRAIGO: Recupera HP cada turno pero no puede ser retirado.' })
  if (target.focusEnergy) list.push({ icon: '🎯', text: 'FOCO ENERGÍA: Aumenta la probabilidad de golpes críticos.' })
  if (target.lockOn) list.push({ icon: '👁️', text: 'FIJAR BLANCO: El próximo ataque no fallará.' })
  if (target.isTransformed) list.push({ icon: '✨', text: 'TRANSFORMADO: Copia la apariencia y ataques del rival.' })
  if (target.rageActive) list.push({ icon: '💢', text: 'FURIA: Su Ataque sube al recibir daño.' })
  if (target.snatching) list.push({ icon: '🧤', text: 'ROBO: Robará el próximo movimiento de estado beneficioso.' })
  if (target.tormentActive) list.push({ icon: '😒', text: 'TORMENTO: No puede usar el mismo movimiento dos veces.' })
  if (target.mustRecharge) list.push({ icon: '🔋', text: 'RECARGA: Debe descansar el próximo turno.' })
  if (target.bound > 0) list.push({ icon: '⛓️', text: `ATADURA: Sufre daño por atrapamiento (${target.bound}t).` })

  // 2. Efectos de Campo (Side-based)
  const stages = props.isPlayer ? battleStore.playerStages : battleStore.enemyStages
  if (stages) {
    if (stages.reflect > 0) list.push({ icon: '🪞', text: `REFLEJO: Reduce el daño físico (${stages.reflect}t).` })
    if (stages.lightScreen > 0) list.push({ icon: '💡', text: `PANTALLA LUZ: Reduce el daño especial (${stages.lightScreen}t).` })
    if (stages.safeguard > 0) list.push({ icon: '🛡️', text: `VELO SAGRADO: Protege contra estados (${stages.safeguard}t).` })
    if (stages.mist > 0) list.push({ icon: '🌫️', text: `NEBLINA: Protege contra reducción de stats (${stages.mist}t).` })
    if (stages.spikes > 0) list.push({ icon: '📍', text: `PÚAS: Daña a los Pokémon que entran al campo (${stages.spikes} capas).` })
  }

  // 3. Clima (Solo si afecta al Pokémon)
  const weather = battleStore.state?.weather
  if (weather && weather.type !== 'clear') {
    const visualType = weather.visual || weather.type
    const mechType = getMechanicalWeather(weather.type)
    const config = WEATHER_VISUAL_METADATA[visualType] || WEATHER_UI_METADATA[mechType]
    
    if (config) {
      list.push({ 
        icon: config.icon, 
        text: `${config.label}: ${config.description}` 
      })
    }
  } else {
    // 4. Ciclo Horario (Fallback si no hay clima)
    const cycle = getDayCycle()
    const cycleData = {
      morning: { icon: '🌅', label: 'MAÑANA', desc: 'Bonifica movimientos FUEGO (1.2x) y habilidades solares.' },
      day: { icon: '☀️', label: 'DÍA', desc: 'Bonifica movimientos FUEGO (1.2x) y habilidades solares.' },
      dusk: { icon: '🌆', label: 'OCASO', desc: 'Bonifica movimientos AGUA (1.2x) y habilidades nocturnas.' },
      night: { icon: '🌙', label: 'NOCHE', desc: 'Bonifica movimientos AGUA (1.2x) y habilidades nocturnas.' }
    }[cycle]
    
    if (cycleData) {
      list.push({
        icon: cycleData.icon,
        text: `HORARIO (${cycleData.label}): ${cycleData.desc}`
      })
    }
  }

  return list
})
</script>

<template>
  <div 
    class="glass-card battle-info-card" 
    :class="isPlayer ? 'player-card' : 'enemy-card'"
  >
    <div class="card-header">
      <span 
        class="poke-name" 
        :class="isPlayer ? nickStyle : ''"
      >
        {{ p.name }}
      </span>
      <div
        v-if="p.gender"
        class="m-badge-gender"
        :class="getGenderCls(p.gender)"
      >
        {{ getGenderText(p.gender) }}
      </div>
      <img
        v-if="!isPlayer && p.caught"
        :src="getAssetUrl(ASSET_TYPES.ITEM, 'poke-ball')"
        class="caught-icon"
        @error="e => e.target.style.display = 'none'"
      >
    </div>
    
    <div class="level-row">
      <div class="poke-level m-badge-level">
        Nv. {{ p.level }}
      </div>
      <PokemonTypePills 
        :pokemon="p" 
        size="sm"
        class="poke-types"
      />
    </div>

    <div class="hp-status">
      <div class="hp-bar-outer">
        <div
          class="hp-bar-inner"
          :class="getHpClass(getHpPct(displayHp, p.maxHp))"
          :style="{ width: getHpPct(displayHp, p.maxHp) + '%' }"
        />
      </div>
      
      <!-- EXP Bar only for player -->
      <div
        v-if="isPlayer"
        class="exp-bar-outer"
      >
        <div
          class="exp-bar-inner"
          :style="{ width: (p.exp / p.expNeeded * 100) + '%' }"
        />
      </div>

      <div class="hp-values">
        HP: {{ Math.max(0, Math.round(displayHp)) }}/{{ p.maxHp }}
      </div>
    </div>

    <!-- Contenedor de Estados (Primarios + Volátiles + Stages) -->
    <div 
      v-if="p.status || volatileStatuses.length > 0 || activeStages.length > 0"
      class="status-container"
    >
      <!-- Estado Primario -->
      <PVTooltip
        v-if="p.status"
        :description="STATUS_TOOLTIP_MAP[p.status.toLowerCase()] || p.status"
        position="bottom"
      >
        <div
          class="status-badge"
          :class="p.status.toLowerCase()"
        >
          {{ STATUS_EMOJI_MAP[p.status.toLowerCase()] || p.status.toUpperCase() }}
          <span
            v-if="p.status.toLowerCase() === 'sleep' && p.sleepTurns"
            class="status-counter"
          >
            {{ p.sleepTurns }}t
          </span>
        </div>
      </PVTooltip>

      <!-- Estados Volátiles (Confusión, Maldición, etc) -->
      <PVTooltip
        v-for="(vs, idx) in volatileStatuses"
        :key="'vs-'+idx"
        :description="vs.text"
        position="bottom"
      >
        <div 
          class="status-badge volatile"
          :class="{ 'is-boosted': vs.isBoosted }"
        >
          {{ vs.icon }}
        </div>
      </PVTooltip>

      <!-- Cambios de Estadísticas (Stages) -->
      <PVTooltip
        v-for="s in activeStages"
        :key="'stage-'+s.key"
        :description="s.text"
        position="bottom"
      >
        <div 
          class="status-badge stage"
          :class="s.val > 0 ? 'is-up' : 'is-down'"
        >
          {{ s.icon }}
        </div>
      </PVTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.glass-card {
  background: Rgba(15, 23, 42, 0.7);
  -webkit-backdrop-filter: Blur(12px);
  backdrop-filter: Blur(12px);
  @include gpu-layer;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 18px;
  padding: 15px;
  min-width: 200px;
  box-shadow: 0 10px 30px Rgba(0,0,0,0.5);
  color: $white;
  @include gpu-layer;

  @media (max-width: 600px) {
    padding: 8px 10px;
    min-width: 140px;
    border-radius: 12px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;

  @media (max-width: 600px) {
    gap: 4px;
    margin-bottom: 2px;
  }
}

.poke-name {
  @include pixelated;
  font-size: 10px;
  letter-spacing: 0.5px;

  @media (max-width: 600px) {
    font-size: 8px;
  }
}

.poke-level {
  margin-bottom: 0;
}

.level-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  @media (max-width: 600px) {
    gap: 4px;
    margin-bottom: 4px;
  }
}

.hp-bar-outer, .exp-bar-outer {
  width: 100%;
  height: 8px;
  background: Rgba(0,0,0,0.4);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
  border: 1px solid Rgba(255,255,255,0.1);

  @media (max-width: 600px) {
    height: 6px;
    margin-bottom: 2px;
  }
}

.exp-bar-outer { height: 4px; @media (max-width: 600px) { height: 3px; } }
.hp-bar-inner { 
  height: 100%; 
  transition: width 0.4s ease; 
  @include will-animate(width);
}
.exp-bar-inner { 
  height: 100%; 
  background: var(--blue); 
  transition: width 0.4s ease; 
  @include will-animate(width);
}

.hp-high { background: Linear-Gradient(90deg, Rgba(16, 185, 129, 1), Rgba(52, 211, 153, 1)); }
.hp-mid { background: Linear-Gradient(90deg, Rgba(245, 158, 11, 1), Rgba(251, 191, 36, 1)); }
.hp-low { background: Linear-Gradient(90deg, Rgba(239, 68, 68, 1), Rgba(248, 113, 113, 1)); }

.hp-values {
  @include pixelated;
  font-size: 8px;
  text-align: right;
  opacity: 0.8;

  @media (max-width: 600px) {
    font-size: 7px;
  }
}

.status-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  position: relative;
  z-index: var(--z-map-spawns);

  @media (max-width: 600px) {
    gap: 3px;
    margin-top: 5px;
  }
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  @include pixelated;
  font-size: 16px;
  line-height: 1;
  filter: Drop-Shadow(0 2px 4px Rgba(0,0,0,0.5));
  position: relative;

  @media (max-width: 600px) {
    font-size: 12px;
  }

  &.stage {
    font-size: 14px;
    @media (max-width: 600px) { font-size: 10px; }

    &::after {
      content: '';
      position: absolute;
      top: -2px;
      right: -4px;
      font-size: 10px;
      font-weight: bold;
      @media (max-width: 600px) { font-size: 7px; right: -2px; }
    }

    &.is-up {
      color: $green;
      &::after { content: '▲'; color: $green; }
    }
    &.is-down {
      color: $red;
      &::after { content: '▼'; color: $red; }
    }
  }

  &.volatile {
    opacity: 0.9;
    
    &.is-boosted {
      color: $coin-gold;
      filter: Drop-Shadow(0 0 5px Rgba(255, 215, 0, 0.8));
      animation: ab-glow 2s infinite alternate;
    }
  }

  .status-counter {
    position: absolute;
    bottom: -4px;
    right: -6px;
    font-size: 8px;
    background: Rgba(0, 0, 0, 0.8);
    padding: 1px 3px;
    border-radius: 4px;
    color: white;
    font-weight: bold;
    border: 1px solid Rgba(255, 255, 255, 0.2);
  }
}

.gender-male { color: Rgba(59, 139, 255, 1); }
.gender-female { color: Rgba(255, 110, 255, 1); }

.caught-icon {
  width: 16px;
  height: 16px;
  @include sprite-render;

  @media (max-width: 600px) {
    width: 12px;
    height: 12px;
  }
}

@keyframes ab-glow {
  from { transform: Scale(1); filter: Drop-Shadow(0 0 2px $coin-gold); }
  to { transform: Scale(1.1); filter: Drop-Shadow(0 0 8px $coin-gold); }
}
</style>