<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { STATUS_EMOJI_MAP, STATUS_TOOLTIP_MAP, STAT_EMOJI_MAP } from '@/logic/battle/battleUiUtils'
import { useBattleStore } from '@/stores/battle'
import { useProfileStore } from '@/stores/profile'
import { getMechanicalWeather, WEATHER_MECHANICAL, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA } from '@/logic/battle/weatherMapper'
import { getDayCycle } from '@/logic/timeUtils'
import { ABILITY_DATA } from '@/data/abilities'
import { supabase } from '@/logic/supabase'
import { getStatBreakdown, getStatMultiplier } from '@/logic/battle/battleEngine'

interface Props {
  pokemon: any
  isPlayer?: boolean
  nickStyle?: string
  isScrambled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPlayer: false,
  nickStyle: '',
  isScrambled: false
})

const p = computed(() => props.pokemon)
const battleStore = useBattleStore()
const profileStore = useProfileStore()

const isAdmin = computed(() => {
  return profileStore.profileData.isAdmin || (window as any).__ADMIN_DEBUG__ || supabase.isLocal
})

// displayHp permite animar la barra desde 0 cuando el componente aparece (Fase 3)
const displayHp = ref(0)

const hpTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
onMounted(() => {
  // Sincronizar con la transición de aparición del HUD
  hpTimeout.value = setTimeout(() => {
    displayHp.value = p.value.hp
  }, 50)
})

onUnmounted(() => {
  if (hpTimeout.value) clearTimeout(hpTimeout.value)
})

watch(() => p.value.hp, (newHp) => {
  displayHp.value = newHp
})

// --- GESTIÓN DE XP Y LEVEL UP (Phase 3) ---
const isLevelingUp = ref(false)
const xpAnimationActive = ref(false)
const displayExpPct = ref((p.value.exp / p.value.expNeeded) * 100)

watch(() => p.value.level, (newLevel, oldLevel) => {
  if (oldLevel && newLevel > oldLevel) {
    // 1. Efecto de Destello (Flash)
    isLevelingUp.value = true
    setTimeout(() => { isLevelingUp.value = false }, 1000)

    // 2. Orquestación de barra de XP (Reset suave)
    // Primero aseguramos que la barra esté al 100%
    displayExpPct.value = 100
    xpAnimationActive.value = true
    
    // Pequeño delay para que se vea el 100% antes de resetear
    setTimeout(() => {
      xpAnimationActive.value = false // Desactivar transición para reset instantáneo
      displayExpPct.value = 0
      
      // Siguiente tick: volver a activar transición y poner el valor real del nuevo nivel
      setTimeout(() => {
        xpAnimationActive.value = true
        displayExpPct.value = (p.value.exp / p.value.expNeeded) * 100
      }, 50)
    }, 600)
  }
}, { immediate: false })

watch(() => p.value.exp, (newExp) => {
  // Solo actualizar si no estamos en medio de un reset por level up
  if (!isLevelingUp.value) {
    xpAnimationActive.value = true
    displayExpPct.value = (newExp / p.value.expNeeded) * 100
  }
})

const getHpPct = (cur: number, max: number) => (cur / max) * 100
const getHpClass = (pct: number) => {
  if (pct > 50) return 'hp-high'
  if (pct > 25) return 'hp-mid'
  return 'hp-low'
}

const getGenderText = (g: string) => ({ M: '♂', F: '♀' } as any)[g] || ''
const getGenderCls = (g: string) => ({ M: 'gender-male', F: 'gender-female' } as any)[g] || 'gender-none'

const activeStages = computed(() => {
  const s = props.isPlayer ? battleStore.playerStages : battleStore.enemyStages
  if (!s) return []
  
  const results = []
  // Recorremos las claves explícitas para asegurar el tracking de reactividad de Vue
  const keys = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva']
  
  for (const key of keys) {
    const val = (s as any)[key]
    if (val !== 0) {
      const config = (STAT_EMOJI_MAP as any)[key] || { icon: '❓', name: key }
      const mult = getStatMultiplier(val)
      const pct = Math.round((mult - 1) * 100)
      const pctText = pct > 0 ? `+${pct}%` : `${pct}%`
      
      results.push({
        key,
        val,
        icon: config.icon,
        text: `${config.name} ${val > 0 ? '↑' : '↓'}${Math.abs(val)} (${pctText})`
      })
    }
  }

  return results
})


// Mapeos de Estados Secundarios/Volátiles
const volatileStatuses = computed(() => {
  const list = []
  const target = p.value
  if (!target) return []
  
  // 0. Habilidad Base (MANDATORIA)
  if (target.ability) {
    const ab = target.ability
    const weather = battleStore.state?.weather?.type
    const mechWeather = getMechanicalWeather(weather)
    const cycle = getDayCycle()
    
    let isAbBoosted = false
    const abEntry = (ABILITY_DATA as any)[ab] || Object.entries(ABILITY_DATA).find(([k]) => k.toLowerCase() === ab.toLowerCase())?.[1]
    const abDescription = (abEntry as any)?.desc || 'Sin descripción disponible.'
    let abText = `HABILIDAD: ${ab.toUpperCase()}. ${abDescription}`

    const isSunActive = mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning'))
    const isRainActive = mechWeather === WEATHER_MECHANICAL.RAIN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'night' || cycle === 'dusk'))

    if (ab === 'Clorofila' && isSunActive) { isAbBoosted = true; abText += ' (ACTIVA por el sol/horario)' }
    if (ab === 'Nado rápido' && isRainActive) { isAbBoosted = true; abText += ' (ACTIVA por la lluvia/horario)' }
    if (ab === 'Ímpetu arena' && mechWeather === WEATHER_MECHANICAL.SANDSTORM) { isAbBoosted = true; abText += ' (ACTIVA por la arena)' }
    if (ab === 'Quitanieves' && (mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL)) { isAbBoosted = true; abText += ' (ACTIVA por la nieve)' }

    list.push({ 
      icon: '🧠', 
      text: abText,
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

  // 3. Clima y Ciclo (Lógica Inline para evitar computed anidados)
  const weather = battleStore.state?.weather
  const types = []
  if (p.value.type) types.push(p.value.type.toLowerCase())
  if (p.value.type2) types.push(p.value.type2.toLowerCase())
  const moveTypes = (p.value.moves || []).map((m: any) => (m?.type || '').toLowerCase())
  const moveNames = (p.value.moves || []).map((m: any) => (m?.name || '').toLowerCase())
  const cycle = getDayCycle()

  let weatherAffects = false
  if (weather && weather.type !== 'clear') {
    const mechWeather = getMechanicalWeather(weather.type)
    if (['fog', 'sandstorm', 'hail'].includes(mechWeather)) {
      weatherAffects = true
    } else if (mechWeather === 'sun') {
      const sunMoves = ['synthesis', 'síntesis', 'morning sun', 'sol beam', 'rayo solar', 'solar beam', 'solar blade', 'cuchilla solar']
      if (types.includes('fire') || types.includes('water') || moveTypes.includes('fire') || moveTypes.includes('water') || moveNames.some((n: any) => sunMoves.includes(n))) {
        weatherAffects = true
      }
    } else if (mechWeather === 'rain') {
      const rainMoves = ['thunder', 'trueno', 'hurricane', 'vendaval', 'weather ball']
      if (types.includes('fire') || types.includes('water') || moveTypes.includes('fire') || moveTypes.includes('water') || moveTypes.includes('electric') || moveNames.some((n: any) => rainMoves.includes(n))) {
        weatherAffects = true
      }
    } else if (mechWeather === 'snow') {
      const snowMoves = ['blizzard', 'ventisca', 'aurora veil', 'velo aurora']
      if (types.includes('ice') || moveTypes.includes('ice') || moveNames.some((n: any) => snowMoves.includes(n))) {
        weatherAffects = true
      }
    }
  }

  let cycleAffects = false
  if (cycle === 'morning' || cycle === 'day') {
    const sunMoves = ['synthesis', 'síntesis', 'morning sun', 'sol beam', 'rayo solar', 'solar beam', 'solar blade', 'cuchilla solar']
    if (types.includes('fire') || types.includes('water') || moveTypes.includes('fire') || moveTypes.includes('water') || moveNames.some((n: any) => sunMoves.includes(n))) {
      cycleAffects = true
    }
  } else if (cycle === 'dusk' || cycle === 'night') {
    if (types.includes('water') || moveTypes.includes('water')) {
      cycleAffects = true
    }
  }

  if (weather && weather.type !== 'clear' && weatherAffects) {
    const visualType = weather.visual || weather.type
    const mechType = getMechanicalWeather(weather.type)
    const config = WEATHER_VISUAL_METADATA[visualType] || WEATHER_UI_METADATA[mechType]
    if (config) {
      list.push({ icon: config.icon, text: `${config.label}: ${config.description}` })
    }
  } else if (cycleAffects) {
    const cycleData = ({
      morning: { icon: '🌅', label: 'MAÑANA', desc: 'Bonifica movimientos FUEGO (1.2x) y habilidades solares.' },
      day: { icon: '☀️', label: 'DÍA', desc: 'Bonifica movimientos FUEGO (1.2x) y habilidades solares.' },
      dusk: { icon: '🌆', label: 'OCASO', desc: 'Bonifica movimientos AGUA (1.2x) y habilidades nocturnas.' },
      night: { icon: '🌙', label: 'NOCHE', desc: 'Bonifica movimientos AGUA (1.2x) y habilidades nocturnas.' }
    } as any)[cycle]
    if (cycleData) {
      list.push({ icon: cycleData.icon, text: `HORARIO (${cycleData.label}): ${cycleData.desc}` })
    }
  }

  return list
})

const adminStatConfig = [
  { key: 'atk', label: 'ATK', icon: '⚔️' },
  { key: 'def', label: 'DEF', icon: '🛡️' },
  { key: 'spa', label: 'SPA', icon: '🔮' },
  { key: 'spd', label: 'SPD', icon: '✨' },
  { key: 'spe', label: 'SPE', icon: '⚡' }
]

const getStatModifier = (key: string) => {
  const stages = props.isPlayer ? battleStore.playerStages : battleStore.enemyStages
  if (!stages) return 0
  return (stages as any)[key] || 0
}

const getBreakdown = (key: string) => {
  const stages = props.isPlayer ? battleStore.playerStages : battleStore.enemyStages
  const weather = battleStore.state?.weather
  return getStatBreakdown(p.value, key as any, stages, weather || null) as any
}

const formatMult = (m: number) => {
  if (m === 1) return ''
  return ` x${m.toFixed(1)}`
}

</script>

<template>
  <div 
    class="glass-card battle-info-card" 
    :class="[
      isPlayer ? 'player-card' : 'enemy-card', 
      { 
        'is-admin-view': isAdmin,
        'is-leveling-up': isLevelingUp
      }
    ]"
  >
    <div class="card-content-wrapper">
      <div class="card-header">
        <span 
          class="poke-name" 
          :class="isPlayer ? nickStyle : ''"
        >
          {{ isScrambled ? '???' : p.name }}
        </span>
        <div
          v-if="p.gender && !isScrambled"
          class="m-badge-gender"
          :class="getGenderCls(p.gender)"
        >
          {{ getGenderText(p.gender) }}
        </div>
        <img
          v-if="!isPlayer && p.caught"
          :src="getAssetUrl(ASSET_TYPES.ITEM, 'poke-ball')"
          class="caught-icon"
          @error="e => (e.target as any).style.display = 'none'"
        >

        <!-- Admin Info Icon -->
        <PVTooltip
          v-if="isAdmin"
          position="bottom"
          title="😈 ADMIN: UNIT STATS"
          class="admin-info-trigger"
        >
          <span class="admin-icon-btn">❓</span>
          
          <template #content>
            <div class="admin-stat-debug">
              <div 
                v-for="stat in adminStatConfig" 
                :key="stat.key"
                class="debug-stat-row"
                :class="{
                  'is-up': getStatModifier(stat.key) > 0,
                  'is-down': getStatModifier(stat.key) < 0
                }"
              >
                <div class="stat-main-line">
                  <span class="d-icon">{{ stat.icon }}</span>
                  <span class="d-label">{{ stat.label }}</span>
                  <span class="d-val">{{ Math.round(getBreakdown(stat.key).final) }}</span>
                  <span
                    v-if="getStatModifier(stat.key) !== 0"
                    class="d-mod"
                  >
                    {{ getStatModifier(stat.key) > 0 ? '↑' : '↓' }}{{ Math.abs(getStatModifier(stat.key)) }}
                  </span>
                </div>
                <div class="stat-breakdown-line">
                  <span class="b-base">{{ getBreakdown(stat.key).base }}</span>
                  <span class="b-ops">
                    {{ formatMult(getBreakdown(stat.key).weatherMult) }}
                    {{ formatMult(getBreakdown(stat.key).stageMult) }}
                    {{ formatMult(getBreakdown(stat.key).abilityMult) }}
                    {{ formatMult(getBreakdown(stat.key).statusMult) }}
                  </span>
                </div>
              </div>
              <div class="admin-notice">
                ⚠️ Solo visible para ADMIN
              </div>
            </div>
          </template>
        </PVTooltip>
      </div>
        
      <div class="level-row">
        <div class="poke-level m-badge-level">
          Nv. {{ isScrambled ? '??' : p.level }}
        </div>
        <PokemonTypePills 
          v-if="!isScrambled"
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
            :class="{ 'is-animating': xpAnimationActive }"
            :style="{ width: displayExpPct + '%' }"
          />
        </div>

        <div class="hp-values">
          HP: {{ isScrambled ? '???/???' : `${Math.max(0, Math.round(displayHp))}/${p.maxHp}` }}
        </div>
      </div>

      <!-- Contenedor de Estados (Primarios + Volátiles + Stages) -->
      <div 
        v-if="!isScrambled && (p.status || volatileStatuses.length > 0 || activeStages.length > 0)"
        class="status-container"
      >
        <!-- Estado Primario -->
        <PVTooltip
          v-if="p.status"
          :description="(STATUS_TOOLTIP_MAP as any)[p.status.toLowerCase()] || p.status"
          position="bottom"
        >
          <div
            class="status-badge"
            :class="p.status.toLowerCase()"
          >
            {{ (STATUS_EMOJI_MAP as any)[p.status.toLowerCase()] || p.status.toUpperCase() }}
            <span
              v-if="p.status.toLowerCase() === 'sleep' && p.sleepTurns"
              class="status-counter"
            >
              {{ p.sleepTurns }}t
            </span>
          </div>
        </PVTooltip>

        <!-- Estados Volátiles -->
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

        <!-- Stages -->
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
  width: 0;
  transition: none;
  &.is-animating {
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @include will-animate(width);
}

.is-leveling-up {
  animation: level-up-flash 0.8s ease-out forwards;
}

@keyframes level-up-flash {
  0% { filter: Brightness(1) contrast(1); transform: Scale(1); }
  20% { filter: Brightness(2) contrast(1.2); transform: Scale(1.05); border-color: Rgba(255,255,255,0.8); }
  100% { filter: Brightness(1) contrast(1); transform: Scale(1); }
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

@keyframes ab-glow {
  from { transform: Scale(1); filter: Drop-Shadow(0 0 2px $coin-gold); }
  to { transform: Scale(1.1); filter: Drop-Shadow(0 0 8px $coin-gold); }
}

.admin-info-trigger {
  margin-left: auto;
  pointer-events: auto;
}

.admin-icon-btn {
  font-size: 18px;
  cursor: help;
  filter: Drop-Shadow(0 0 5px Rgba(255, 255, 0, 0.5));
  animation: admin-icon-pulse 2s infinite alternate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 24px;
  background: Rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  border: 1px solid Rgba(255, 255, 0, 0.3);
  margin-left: 10px;
  
  &:hover {
    filter: Drop-Shadow(0 0 10px Rgba(255, 255, 0, 0.8)) Brightness(1.3);
    background: Rgba(255, 255, 0, 0.1);
  }
}

@keyframes admin-icon-pulse {
  from { transform: Scale(1); opacity: 0.8; }
  to { transform: Scale(1.15); opacity: 1; }
}

.is-admin-view {
  outline: 1px dashed Rgba($yellow, 0.3);
  transition: outline 0.3s ease;
  &:hover {
    outline-color: $yellow;
    outline-offset: 2px;
  }
}

.admin-stat-debug {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 130px;
  padding: 4px 0;
}

.debug-stat-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  @include pixelated;
  padding: 4px 6px;
  border-radius: 8px;
  background: Rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;

  &:hover {
    background: Rgba(255, 255, 255, 0.1);
  }

  .stat-main-line {
    display: flex;
    align-items: center;
    width: 100%;
    font-size: 10px;
  }

  .stat-breakdown-line {
    display: flex;
    align-items: center;
    font-size: 8px;
    opacity: 0.7;
    padding-left: 18px;
    color: Rgba(255, 255, 255, 0.5);
    
    .b-ops { 
      margin-left: auto; 
      color: $coin-gold;
      font-weight: bold;
    }
  }

  .d-icon { width: 18px; font-size: 12px; }
  .d-label { width: 40px; color: var(--gray); opacity: 0.8; }
  .d-val { font-weight: bold; margin-left: auto; color: white; font-size: 11px; }
  .d-mod { 
    margin-left: 8px;
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 4px;
    background: Rgba(255, 255, 255, 0.1);
  }

  &.is-up {
    color: $green;
    .d-mod { background: Rgba(16, 185, 129, 0.2); }
  }
  &.is-down {
    color: $red;
    .d-mod { background: Rgba(239, 68, 68, 0.2); }
  }
}

.admin-notice {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed Rgba(255, 255, 0, 0.2);
  color: $yellow;
  font-size: 8px;
  @include pixelated;
  text-align: center;
  opacity: 0.8;
}

.caught-icon {
  width: 16px;
  height: 16px;
  @include sprite-render;

  @media (max-width: 600px) {
    width: 12px;
    height: 12px;
  }
}
</style>