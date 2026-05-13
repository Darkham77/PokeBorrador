<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { STATUS_TOOLTIP_MAP, STAT_EMOJI_MAP, STATUS_EMOJI_MAP } from '@/logic/battle/battleUiUtils'
import { useBattleStore } from '@/stores/battle'
import { useProfileStore } from '@/stores/profile'
import { getMechanicalWeather, WEATHER_MECHANICAL, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, type WeatherMechanical } from '@/logic/battle/weatherMapper'
import { getDayCycle } from '@/logic/timeUtils'
import { ABILITY_DATA } from '@/data/abilities'
import { supabase } from '@/logic/supabase'
import { getStatBreakdown, getStatMultiplier } from '@/logic/battle/battleEngine'

import type { Pokemon } from '@/types/pokemon'

interface Props {
  pokemon?: Pokemon | null
  isPlayer?: boolean
  nickStyle?: string
  isScrambled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pokemon: null,
  isPlayer: false,
  nickStyle: '',
  isScrambled: false
})

const p = computed(() => props.pokemon as Pokemon)
const battleStore = useBattleStore()
const profileStore = useProfileStore()

const isAdmin = computed(() => {
  const win = window as unknown as { __ADMIN_DEBUG__: boolean }
  return profileStore.profileData.isAdmin || (typeof window !== 'undefined' && win.__ADMIN_DEBUG__) || supabase.isLocal
})

const displayHp = ref(0)
const cardRef = ref<HTMLElement | null>(null)

onMounted(() => {
  // Sincronizar con la transición de aparición del HUD
  gsap.to(displayHp, {
    value: p.value.hp,
    duration: 0.8,
    ease: 'power2.out',
    delay: 0.4
  })
})

watch(() => p.value.hp, (newHp) => {
  gsap.to(displayHp, {
    value: newHp,
    duration: 0.6,
    ease: 'power2.out'
  })
})

// --- GESTIÓN DE XP Y LEVEL UP (Phase 3) ---
const isLevelingUp = ref(false)
const xpAnimationActive = ref(false)
const displayExpPct = ref((p.value.exp / p.value.expNeeded) * 100)

watch(() => p.value.level, (newLevel, oldLevel) => {
  if (oldLevel && newLevel > oldLevel) {
    // 1. Efecto de Destello (Flash) con GSAP
    if (cardRef.value) {
      gsap.fromTo(cardRef.value, 
        { filter: 'Brightness(1) contrast(1)', scale: 1 },
        { 
          filter: 'Brightness(2) contrast(1.2)', 
          scale: 1.05, 
          duration: 0.15, 
          yoyo: true, 
          repeat: 3, 
          ease: 'power2.inOut',
          onComplete: () => {
            gsap.set(cardRef.value, { clearProps: 'filter,scale' })
            isLevelingUp.value = false
          }
        }
      )
    }
    isLevelingUp.value = true

    // 2. Orquestación de barra de XP
    const tl = gsap.timeline()
    tl.to(displayExpPct, {
      value: 100,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => {
        displayExpPct.value = 0
      }
    })
    .to(displayExpPct, {
      value: (p.value.exp / p.value.expNeeded) * 100,
      duration: 0.6,
      ease: 'power2.out'
    })
  }
}, { immediate: false })

watch(() => p.value.exp, (newExp) => {
  if (!isLevelingUp.value) {
    gsap.to(displayExpPct, {
      value: (newExp / p.value.expNeeded) * 100,
      duration: 0.5,
      ease: 'power2.out'
    })
  }
})

const getHpPct = (cur: number, max: number) => (cur / max) * 100
const getHpClass = (pct: number) => {
  if (pct > 50) return 'hp-high'
  if (pct > 25) return 'hp-mid'
  return 'hp-low'
}

const getGenderText = (g: string) => (({ M: '♂', F: '♀' } as Record<string, string>)[g] || '')
const getGenderCls = (g: string) => (({ M: 'gender-male', F: 'gender-female' } as Record<string, string>)[g] || 'gender-none')

const activeStages = computed(() => {
  const s = props.isPlayer ? battleStore.playerStages : battleStore.enemyStages
  if (!s) return []
  
  const results = []
  // Recorremos las claves explícitas para asegurar el tracking de reactividad de Vue
  const keys = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva']
  
  for (const key of keys) {
    const val = (s as Record<string, number | undefined>)[key] || 0
    if (val !== 0) {
      const config = (STAT_EMOJI_MAP as Record<string, { icon: string; name: string }>)[key] || { icon: '❓', name: key }
      const mult = getStatMultiplier(val || 0)
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
    const abEntry = (ABILITY_DATA as Record<string, { desc: string }>)[ab] || Object.entries(ABILITY_DATA).find(([k]) => k.toLowerCase() === ab.toLowerCase())?.[1]
    const abDescription = abEntry?.desc || 'Sin descripción disponible.'
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
  if (target.disabledTurns && target.disabledTurns > 0) list.push({ icon: '🚫', text: `ANULADO: Un movimiento está bloqueado (${target.disabledTurns}t).` })
  if (target.encoreTurns && target.encoreTurns > 0) list.push({ icon: '🔁', text: `OTRA VEZ: Repite el mismo movimiento (${target.encoreTurns}t).` })
  if (target.tauntTurns && target.tauntTurns > 0) list.push({ icon: '🤐', text: `MOFA: No puede usar movimientos de estado (${target.tauntTurns}t).` })
  if (target.flinched) list.push({ icon: '💫', text: 'RETROCEDER: No puede atacar este turno.' })
  if (target.protect || target.detect) list.push({ icon: '🛡️', text: 'PROTECCIÓN: Evita el daño este turno.' })
  if (target.substitute && target.substitute > 0) list.push({ icon: '🎭', text: `SUSTITUTO: Un señuelo de ${target.substitute} HP recibe el daño.` })
  if (target.destinyBond) list.push({ icon: '🔗', text: 'MISMODESTINO: Si el usuario cae, el rival también.' })
  if (target.perishSongCount !== undefined && target.perishSongCount > 0) list.push({ icon: '⏳', text: `CANTO MORTAL: El Pokémon caerá en ${target.perishSongCount} turnos.` })
  if (target.ingrain) list.push({ icon: '🌳', text: 'ARRAIGO: Recupera HP cada turno pero no puede ser retirado.' })
  if (target.focusEnergy) list.push({ icon: '🎯', text: 'FOCO ENERGÍA: Aumenta la probabilidad de golpes críticos.' })
  if (target.lockOn) list.push({ icon: '👁️', text: 'FIJAR BLANCO: El próximo ataque no fallará.' })
  if (target.isTransformed) list.push({ icon: '✨', text: 'TRANSFORMADO: Copia la apariencia y ataques del rival.' })
  if (target.rageActive) list.push({ icon: '💢', text: 'FURIA: Su Ataque sube al recibir daño.' })
  if (target.snatching) list.push({ icon: '🧤', text: 'ROBO: Robará el próximo movimiento de estado beneficioso.' })
  if (target.tormentActive) list.push({ icon: '😒', text: 'TORMENTO: No puede usar el mismo movimiento dos veces.' })
  if (target.mustRecharge) list.push({ icon: '🔋', text: 'RECARGA: Debe descansar el próximo turno.' })
  if (target.bound && target.bound > 0) list.push({ icon: '⛓️', text: `ATADURA: Sufre daño por atrapamiento (${target.bound}t).` })

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
  const types: string[] = []
  if (p.value.type) types.push(p.value.type.toLowerCase())
  if (p.value.type2) types.push(p.value.type2.toLowerCase())
  const moveTypes = (p.value.moves || []).map((m) => (m?.type || '').toLowerCase())
  const moveNames = (p.value.moves || []).map((m) => (m?.name || '').toLowerCase())
  const cycle = getDayCycle()

  let weatherAffects = false
  if (weather && weather.type !== 'clear') {
    const mechWeather = getMechanicalWeather(weather.type)
    const visualWeather = weather.type
    
    // 1. Climas de Daño Ambiental o Estados Globales
    if (['sandstorm', 'hail', 'fog'].includes(mechWeather)) weatherAffects = true
    if (['blizzard', 'coldwave', 'fog'].includes(visualWeather)) weatherAffects = true

    // 2. Afectación por Tipos Elementales
    if (mechWeather === 'sun' && (types.includes('fire') || types.includes('water') || types.includes('grass'))) weatherAffects = true
    if (mechWeather === 'rain' && (types.includes('fire') || types.includes('water') || types.includes('electric'))) weatherAffects = true
    if (mechWeather === 'snow' && types.includes('ice')) weatherAffects = true
    if ((mechWeather === 'wind' || visualWeather === 'strong_winds') && (types.includes('flying') || p.value.isFloating)) weatherAffects = true

    // 3. Afectación por Movimientos en el Set
    const sunMoves = ['synthesis', 'síntesis', 'morning sun', 'sol beam', 'rayo solar', 'solar beam', 'solar blade', 'cuchilla solar']
    const rainMoves = ['thunder', 'trueno', 'hurricane', 'vendaval', 'weather ball']
    const snowMoves = ['blizzard', 'ventisca', 'aurora veil', 'velo aurora', 'cold-snap']

    if (!weatherAffects) {
      if (mechWeather === 'sun' && moveNames.some(n => sunMoves.includes(n))) weatherAffects = true
      if (mechWeather === 'rain' && moveNames.some(n => rainMoves.includes(n))) weatherAffects = true
      if (mechWeather === 'snow' && moveNames.some(n => snowMoves.includes(n))) weatherAffects = true
    }
  }

  let cycleAffects = false
  if (cycle === 'morning' || cycle === 'day') {
    const sunMoves = ['synthesis', 'síntesis', 'morning sun', 'sol beam', 'rayo solar', 'solar beam', 'solar blade', 'cuchilla solar']
    if (types.includes('fire') || types.includes('water') || moveTypes.includes('fire') || moveTypes.includes('water') || moveNames.some((n) => sunMoves.includes(n))) {
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
    const config = WEATHER_VISUAL_METADATA[visualType] || WEATHER_UI_METADATA[mechType as WeatherMechanical]
    if (config) {
      list.push({ icon: config.icon, text: `${config.label}: ${config.description}` })
    }
  } else if (cycleAffects) {
    const cycleData = ({
      morning: { icon: '🌅', label: 'MAÑANA', desc: 'Bonifica movimientos FUEGO (1.2x) y habilidades solares.' },
      day: { icon: '☀️', label: 'DÍA', desc: 'Bonifica movimientos FUEGO (1.2x) y habilidades solares.' },
      dusk: { icon: '🌆', label: 'OCASO', desc: 'Bonifica movimientos AGUA (1.2x) y habilidades nocturnas.' },
      night: { icon: '🌙', label: 'NOCHE', desc: 'Bonifica movimientos AGUA (1.2x) y habilidades nocturnas.' }
    } as Record<string, { icon: string; label: string; desc: string }>)[cycle]
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
  return (stages as Record<string, number>)[key] || 0
}

const getBreakdown = (key: string) => {
  const stages = props.isPlayer ? battleStore.playerStages : battleStore.enemyStages
  const weather = battleStore.state?.weather
  return getStatBreakdown(p.value, key as 'atk' | 'def' | 'spa' | 'spd' | 'spe', stages, weather || null)
}

const formatMult = (m: number) => {
  if (m === 1) return ''
  return ` x${m.toFixed(1)}`
}

interface StatusIndicator {
  id: string
  emoji: string
  title: string
  description: string
  count?: number | string
  class: string
  isBoosted?: boolean
}

const unifiedStatuses = computed<StatusIndicator[]>(() => {
  const list: StatusIndicator[] = []
  if (!p.value) return []

  // 1. Estado Primario
  if (p.value.status) {
    const s = p.value.status.toLowerCase()
    list.push({
      id: `primary-${s}`,
      emoji: (STATUS_EMOJI_MAP as Record<string, string>)[s] || '❓',
      title: s.toUpperCase(),
      description: (STATUS_TOOLTIP_MAP as Record<string, string>)[s] || s,
      count: s === 'sleep' ? p.value.sleepTurns : undefined,
      class: s
    })
  }

  // 2. Estados Volátiles
  volatileStatuses.value.forEach((vs, idx) => {
    const parts = vs.text?.split(':') || []
    list.push({
      id: `volatile-${idx}`,
      emoji: vs.icon,
      title: parts[0]?.trim() || '',
      description: parts[1]?.trim() || vs.text || '',
      class: 'volatile',
      isBoosted: vs.isBoosted
    })
  })

  // 3. Stages
  activeStages.value.forEach((s) => {
    list.push({
      id: `stage-${s.key}`,
      emoji: s.icon,
      title: s.text?.split('(')[0]?.trim() || '',
      description: `Multiplicador actual: ${s.text?.match(/\(([^)]+)\)/)?.[1] || '100%'}`,
      class: `stage ${(s.val || 0) > 0 ? 'is-up' : 'is-down'}`
    })
  })

  return list
})

</script>

<template>
  <div 
    ref="cardRef"
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
          v-if="p.gender && !isScrambled && !p.name.includes(getGenderText(p.gender))"
          class="m-badge-gender"
          :class="getGenderCls(p.gender)"
        >
          {{ getGenderText(p.gender) }}
        </div>
        <img
          v-if="!isPlayer && p.caught"
          :src="getAssetUrl(ASSET_TYPES.ITEM, 'poke-ball')"
          class="caught-icon"
          @error="e => (e.target as HTMLImageElement).style.display = 'none'"
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
          :size="p.type2 ? 'ssm' : 'sm'"
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

      <!-- Contenedor de Estados Unificado -->
      <div 
        v-if="!isScrambled && unifiedStatuses.length > 0"
        class="status-container"
      >
        <PVTooltip
          v-for="status in unifiedStatuses"
          :key="status.id"
          :title="status.title"
          :description="status.description"
          position="bottom"
        >
          <div
            class="m-status-tag"
            :class="[status.class, { 'is-boosted': status.isBoosted }]"
          >
            {{ status.emoji }}
            <span
              v-if="status.count"
              class="status-counter"
            >
              {{ status.count }}t
            </span>
          </div>
        </PVTooltip>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.glass-card {
  background: Rgba(15, 23, 42, 0.4);
  backdrop-filter: Blur(12px);
  -webkit-backdrop-filter: Blur(12px);
  -webkit-will-change: transform, opacity, backdrop-filter;
  will-change: transform, opacity, backdrop-filter;
  @include gpu-layer;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 18px;
  padding: 15px;
  min-width: 200px;
  box-shadow: 0 10px 30px Rgba(0,0,0,0.5), inset 0 0 10px Rgba(255,255,255,0.05);
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
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;

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
  /* transition handled by GSAP */
  @include will-animate(width);
}
.exp-bar-inner { 
  height: 100%; 
  background: var(--blue); 
  width: 0;
  /* transition handled by GSAP */
  @include will-animate(width);
}

.is-leveling-up {
  will-change: filter, transform;
}

.hp-high { background: Linear-Gradient(90deg, Rgba(16, 185, 129, 1), Rgba(52, 211, 153, 1)); }
.hp-mid { background: Linear-Gradient(90deg, Rgba(245, 158, 11, 1), Rgba(251, 191, 36, 1)); }
.hp-low { background: Linear-Gradient(90deg, Rgba(239, 68, 68, 1), Rgba(248, 113, 113, 1)); }

.hp-values {
  @include pixelated;
  font-size: 8px;
  text-align: right;
  opacity: 1; // Increased for better outline visibility
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;

  @media (max-width: 600px) {
    font-size: 7px;
  }
}

.m-badge-level {
  @include pixelated;
  font-size: 8px;
}

.status-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;

  @media (max-width: 600px) {
    gap: 4px;
    margin-top: 4px;
  }
}

.status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-radius: 4px;
  @include pixelated;
  font-size: 8px;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px Rgba(0,0,0,0.5);
  box-shadow: 0 2px 4px Rgba(0,0,0,0.3);

  @media (max-width: 600px) {
    padding: 1px 4px;
    font-size: 7px;
  }

  &.brn { background: $red; }
  &.par { background: $yellow; color: black; }
  &.slp { background: $gray; }
  &.psn { background: $purple; }
  &.frz { background: $blue; }

  &.volatile {
    background: transparent;
    border: none;
    box-shadow: none;
    font-size: 14px; // Icons slightly larger
    padding: 0;
    
    &.is-boosted {
      filter: Drop-Shadow(0 0 5px Rgba(34, 197, 94, 0.6));
      will-change: filter;
    }
  }

  &.stage {
    background: transparent;
    border: none;
    box-shadow: none;
    font-size: 10px;
    padding: 0;
    
    &.is-up { color: #4ade80; text-shadow: 0 0 5px Rgba(74, 222, 128, 0.5); }
    &.is-down { color: #f87171; text-shadow: 0 0 5px Rgba(248, 113, 113, 0.5); }
  }
}

.status-counter {
  margin-left: 3px;
  opacity: 0.9;
  font-size: 6px;
  font-weight: 400;
}

.gender-male { color: Rgba(59, 139, 255, 1); }
.gender-female { color: Rgba(255, 110, 255, 1); }

.admin-info-trigger {
  margin-left: auto;
  cursor: help;
}

.admin-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: Rgba(255, 214, 10, 0.2);
  border: 1px solid Rgba(255, 214, 10, 0.4);
  border-radius: 50%;
  font-size: 10px;
  color: #ffd60a;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  box-shadow: 0 0 10px Rgba(255, 214, 10, 0.2);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:hover {
    background: Rgba(255, 214, 10, 0.4);
    transform: Scale(1.2);
    box-shadow: 0 0 15px Rgba(255, 214, 10, 0.4);
  }
}

.admin-stat-debug {
  padding: 4px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
  background: none;
  border: none;
}

.debug-stat-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  @include pixelated;
  padding: 4px 6px;
  border-radius: 8px;
  background: #000000;
  transition: all 0.2s ease;

  &:hover {
    background: #1a1a1a;
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
