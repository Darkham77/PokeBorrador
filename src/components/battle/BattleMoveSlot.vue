<!-- [PureVue-Ignore-Length] -->
<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import MoveTooltip from '@/components/battle/MoveTooltip.vue'
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'
import { MOVE_DATA } from '@/data/moves'
import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry'
import { getDayCycle } from '@/logic/timeUtils'
import { useBattleStore } from '@/stores/battle'
import type { Pokemon, Move } from '@/types/pokemon'

interface Props {
  move: Move | null
  index: number
  isProcessing?: boolean
  playerInfo?: Pokemon | null
  canReorder?: boolean
  draggedIndex?: number | null
  dragOverIndex?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  isProcessing: false,
  playerInfo: null,
  canReorder: false,
  draggedIndex: null,
  dragOverIndex: null
})

const emit = defineEmits<{
  (e: 'use-move', index: number): void
}>()

const battleStore = useBattleStore()
const rootEl = ref<HTMLElement | null>(null)
let glowTween: gsap.core.Tween | null = null

const moveData = computed(() => {
  if (!props.move) return null
  const md = (MOVE_DATA as Record<string, { type?: string; power?: number; acc?: number; cat?: string }>)[props.move.name] || {}
  return {
    ...props.move,
    type: props.move.type || md.type || 'normal',
    power: props.move.power !== undefined ? props.move.power : md.power,
    acc: props.move.acc !== undefined ? props.move.acc : md.acc,
    cat: props.move.cat || md.cat || 'physical'
  }
})

const finalPower = computed(() => {
  const md = moveData.value
  if (!md || md.power === undefined || md.power === 0) return md?.power || 0

  let power = md.power
  const attacker = props.playerInfo
  const defender = battleStore.state?.enemy
  const weather = battleStore.state?.weather
  const mechWeather = getMechanicalWeather(weather?.type)
  const cycle = getDayCycle()

  if (!attacker) return power

  // 1. STAB
  const moveType = md.type.toLowerCase()
  let stab = (moveType === attacker.type?.toLowerCase() || moveType === attacker.type2?.toLowerCase()) ? 1.5 : 1
  if (attacker.ability === 'Adaptable' && stab > 1) stab = 2
  power *= stab

  // 2. Weather
  let weatherMult = 1
  if (weather && weather.turns !== 0) {
    const wType = weather.type.toLowerCase()
    if (mechWeather === WEATHER_MECHANICAL.SUN) {
      if (moveType === 'fire') weatherMult = 1.5
      if (moveType === 'water') weatherMult = (wType === 'heatwave') ? 0 : 0.5
    } else if (mechWeather === WEATHER_MECHANICAL.RAIN) {
      if (moveType === 'water') weatherMult = 1.5
      if (moveType === 'fire') weatherMult = (wType === 'storm' || wType === 'heavy_rain') ? 0 : 0.5
      if (moveType === 'electric' || moveType === 'dragon') weatherMult = 1.5
    } else if (wType === 'thunderstorm') {
      if (moveType === 'electric' || moveType === 'dragon') weatherMult = 1.5
    }
  }

  // Solar Beam
  if (md.id === 'solar_beam' && weather && weather.turns !== 0) {
    const isSun = mechWeather === WEATHER_MECHANICAL.SUN
    const isClear = mechWeather === WEATHER_MECHANICAL.CLEAR && weather.type !== 'thunderstorm'
    if (!isSun && !isClear) {
      weatherMult *= 0.5
    }
  }

  // Day cycle
  if (weatherMult === 1 && (mechWeather === WEATHER_MECHANICAL.CLEAR || !weather)) {
    if ((cycle === 'day' || cycle === 'morning') && moveType === 'fire') weatherMult = 1.2
    if ((cycle === 'night' || cycle === 'dusk') && moveType === 'water') weatherMult = 1.2
  }

  power *= weatherMult

  // 3. Ability
  let abilMult = 1
  const isLowHp = attacker.hp <= (attacker.maxHp / 3)
  if (isLowHp) {
    if (attacker.ability === 'Mar llamas' && moveType === 'fire') abilMult = 1.5
    if (attacker.ability === 'Torrente' && moveType === 'water') abilMult = 1.5
    if (attacker.ability === 'Espesura' && moveType === 'grass') abilMult = 1.5
    if (attacker.ability === 'Enjambre' && moveType === 'bug') abilMult = 1.5
  }
  if (attacker.ability === 'Experto' && md.power <= 60) {
    abilMult *= 1.5
  }
  if (weather && weather.turns !== 0 && attacker.ability === 'Fuerza arena' && mechWeather === WEATHER_MECHANICAL.SANDSTORM) {
    if (moveType === 'ground' || moveType === 'rock' || moveType === 'steel') {
      abilMult *= 1.3
    }
  }
  power *= abilMult

  // 4. Defender Ability
  if (defender && defender.ability === 'Sebo' && (moveType === 'fire' || moveType === 'ice')) {
    power *= 0.5
  }

  // 5. Item
  let itemMult = 1
  if (attacker.heldItem) {
    const h = attacker.heldItem
    const typeBoosters: Record<string, string> = {
      'Carbón': 'fire', 'Imán': 'electric', 'Agua Mística': 'water',
      'Semilla Milagro': 'grass', 'Cinturón Negro': 'fighting',
      'Cuchara Torcida': 'psychic', 'Hechizo': 'ghost', 'Polvo Plata': 'bug',
      'Flecha Venenosa': 'poison'
    }
    if (typeBoosters[h] === moveType) itemMult = 1.2
    if (h === 'Cinta Elegida' && md.cat === 'physical') itemMult = 1.5
  }
  power *= itemMult

  return Math.max(1, Math.round(power))
})

const finalAccuracy = computed(() => {
  const md = moveData.value
  if (!md || md.acc === undefined || md.acc === 1000) return md?.acc || 0

  let acc = md.acc
  const weather = battleStore.state?.weather?.type
  const mechWeather = getMechanicalWeather(weather)
  const cycle = getDayCycle()
  const isSunActive = mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning'))
  const isRainActive = mechWeather === WEATHER_MECHANICAL.RAIN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'night' || cycle === 'dusk'))

  const isThunderstorm = weather === 'thunderstorm'
  if ((isRainActive || isThunderstorm) && (md.id === 'thunder' || md.id === 'hurricane')) {
    acc = 100
  } else if (isSunActive && (md.id === 'thunder' || md.id === 'hurricane')) {
    acc = 50
  } else if ((mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) && md.id === 'blizzard') {
    acc = 100
  } else if (mechWeather === WEATHER_MECHANICAL.FOG) {
    const isMist = weather === "mist" || weather === "mist_visual"
    acc = Math.floor(md.acc * (isMist ? 0.8 : 0.6))
  }

  const accStage = battleStore.playerStages?.acc || 0
  const evaStage = battleStore.enemyStages?.eva || 0
  
  acc = acc * (1 + (0.33 * accStage)) * (1 - (0.33 * evaStage))
  return Math.max(0, Math.min(100, Math.round(acc)))
})

const moveColor = computed(() => {
  if (!props.move) return '#444'
  const type = moveData.value ? moveData.value.type.toLowerCase() : 'normal'
  return (PDEX_TYPE_COLORS as Record<string, string>)[type] || '#444'
})

const hexColorRgb = computed(() => {
  const hex = moveColor.value
  if (!hex) return '255, 255, 255'
  let h = hex.replace('#', '')
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('')
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
})

const moveModifier = computed(() => {
  if (!props.move || !battleStore.isBattleActive) return null
  const md = moveData.value
  if (!md) return null
  
  const weather = battleStore.state?.weather?.type
  const mechWeather = getMechanicalWeather(weather)
  const cycle = getDayCycle()

  const isRaining = mechWeather === WEATHER_MECHANICAL.RAIN
  const isSunny = mechWeather === WEATHER_MECHANICAL.SUN
  const isSnowing = mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL
  const isDayTime = cycle === 'day' || cycle === 'morning'
  const isNightTime = cycle === 'night' || cycle === 'dusk'

  const isSunActive = isSunny || (mechWeather === WEATHER_MECHANICAL.CLEAR && isDayTime)
  const isRainActive = isRaining || (mechWeather === WEATHER_MECHANICAL.CLEAR && isNightTime)

  const moveName = (md.name || '').toLowerCase()

  // 1. Accuracy Boosted
  if (moveName === 'trueno' || moveName === 'thunder' || moveName === 'vendaval' || moveName === 'hurricane') {
    if (isSunny) return 'penalized'
    if (isRaining) return 'boosted'
  }
  
  if (moveName === 'ventisca' || moveName === 'blizzard') {
    if (isSnowing) return 'boosted'
  }

  // 2. Solar Moves
  if (moveName === 'rayo solar' || moveName === 'solar beam' || moveName === 'cuchilla solar' || moveName === 'solar blade') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR && !isSunActive) return 'penalized'
    if (isSunActive) return 'boosted'
  }

  // 3. Weather Ball
  if (moveName === 'meteorobola' || moveName === 'weather ball') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR) return 'boosted'
  }

  // 4. Accuracy Penalties (Fog)
  if (mechWeather === WEATHER_MECHANICAL.FOG) {
    return 'penalized'
  }

  if (md.cat === 'status') return null

  // 5. Elemental
  if (md.type === 'fire') {
    if (isRaining) return 'penalized'
    if (isSunActive) return 'boosted'
  }
  if (md.type === 'water') {
    if (isSunny) return 'penalized'
    if (isRainActive) return 'boosted'
  }
  
  return null
})

const isDisabled = computed(() => {
  if (props.isProcessing) return true
  if (!props.move || props.move.pp <= 0) return true
  
  // Choice Item Logic
  const p = props.playerInfo
  if (p && p.heldItem === 'Cinta Elegida') {
    const pk = p as Pokemon & { choiceMove?: string }
    if (pk.choiceMove && pk.choiceMove !== props.move.name) {
      return true
    }
  }
  return false
})

const updateGlow = () => {
  if (glowTween) {
    glowTween.kill()
    glowTween = null
  }

  const el = rootEl.value
  if (!el || !props.move) return

  const mod = moveModifier.value
  if (mod === 'boosted') {
    glowTween = gsap.to(el, {
      boxShadow: '0 0 22px Rgba(255, 215, 0, 0.9), inset 0 0 15px Rgba(255, 215, 0, 0.5)',
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    })
  } else if (mod === 'penalized') {
    glowTween = gsap.to(el, {
      boxShadow: '0 0 22px Rgba(255, 0, 0, 0.9), inset 0 0 15px Rgba(255, 0, 0, 0.5)',
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    })
  } else {
    // Reset shadow
    gsap.set(el, { clearProps: 'boxShadow' })
  }
}

const onHover = (isEntering: boolean) => {
  const el = rootEl.value
  if (!el || isDisabled.value) return

  if (isEntering) {
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth <= 768
    gsap.to(el, { 
      scale: isSmallScreen ? 1 : 1.08, 
      filter: 'Brightness(1.1)',
      zIndex: 10,
      duration: 0.3, 
      ease: 'power2.out' 
    })
  } else {
    gsap.to(el, { 
      scale: 1, 
      filter: 'Brightness(1)',
      zIndex: 1,
      duration: 0.3, 
      ease: 'power2.out',
      onComplete: () => {
        if (el) gsap.set(el, { clearProps: 'zIndex' })
      }
    })
  }
}

watch([() => props.move, moveModifier], () => {
  updateGlow()
})

onMounted(() => {
  updateGlow()
})

onUnmounted(() => {
  if (glowTween) glowTween.kill()
})
</script>

<template>
  <div
    ref="rootEl"
    class="move-slot-wrapper"
    :class="[
      index % 2 === 0 ? 'is-left' : 'is-right',
      { 
        'is-dragging': draggedIndex === index,
        'is-drag-over': dragOverIndex === index,
        'is-draggable': canReorder && move,
        'is-empty': !move,
        'is-boosted': move && moveModifier === 'boosted',
        'is-penalized': move && moveModifier === 'penalized',
        'is-disabled': move && isDisabled
      }
    ]"
    :style="{ 
      '--m-type-color': moveColor,
      '--m-type-rgb': hexColorRgb,
      background: move 
        ? `#12141c Linear-Gradient(${index % 2 === 0 ? '90deg' : '270deg'}, Rgba(${hexColorRgb}, 0.15) 0%, Transparent 100%)`
        : `#0a0c10`,
      borderColor: move && moveModifier === 'boosted' ? '$coin-gold' : 
        move && moveModifier === 'penalized' ? '#ff4444' :
        move ? `Rgba(${hexColorRgb}, 0.6)` : 
        'Rgba(255, 255, 255, 0.1)'
    }"
    @mouseenter="onHover(true)"
    @mouseleave="onHover(false)"
  >
    <!-- Info Zone with Tooltip -->
    <template v-if="move">
      <PVTooltip
        :title="move.name"
        :delay="400" 
        position="top"
        hide-on-click
        touch-instant
        class="info-tooltip-wrapper"
        :disabled="draggedIndex !== null"
      >
        <template #content>
          <MoveTooltip 
            v-if="moveData"
            :move="moveData as any" 
          />
        </template>
        
        <div 
          class="move-info-zone pixelated"
          @click.stop
        >
          ?
        </div>
      </PVTooltip>
    </template>
    <div
      v-else
      class="info-tooltip-wrapper is-empty-tab"
    />

    <button 
      class="move-card-vicio"
      :class="{ 
        'disabled-move': !canReorder && move && isDisabled,
        'is-draggable': canReorder && move,
        'is-empty': !move
      }"
      :disabled="!move || (!canReorder && isDisabled)"
      @click.stop="move && emit('use-move', index)"
    >
      <template v-if="move">
        <div class="move-top">
          <span class="mv-name pixelated">{{ move.name ? move.name.toUpperCase() : '???' }}</span>
          <PokemonTypeTag
            :type="moveData!.type || 'normal'"
            size="ssm"
          />
        </div>
        
        <div class="move-details-row">
          <div class="detail-item">
            <span class="d-label pixelated">POT:</span>
            <span 
              class="d-val pixelated"
              :class="{
                'stat-boosted': finalPower > (moveData!.power || 0),
                'stat-penalized': finalPower < (moveData!.power || 0)
              }"
            >
              {{ finalPower || '-' }}
              <span
                v-if="finalPower > (moveData!.power || 0)"
                class="arrow up"
              >▲</span>
              <span
                v-if="finalPower < (moveData!.power || 0)"
                class="arrow down"
              >▼</span>
            </span>
          </div>
          <div class="detail-item">
            <span class="d-label pixelated">PREC:</span>
            <span 
              class="d-val pixelated"
              :class="{
                'stat-boosted': moveData!.acc !== 1000 && finalAccuracy > (moveData!.acc || 0),
                'stat-penalized': moveData!.acc !== 1000 && finalAccuracy < (moveData!.acc || 0)
              }"
            >
              <span
                v-if="moveData!.acc === 1000"
                class="infinity-emoji"
              >♾️</span>
              <template v-else>
                {{ finalAccuracy || '-' }}
                <span
                  v-if="finalAccuracy > (moveData!.acc || 0)"
                  class="arrow up"
                >▲</span>
                <span
                  v-if="finalAccuracy < (moveData!.acc || 0)"
                  class="arrow down"
                >▼</span>
              </template>
            </span>
          </div>
          <div class="detail-item">
            <span class="d-label pixelated">CAT:</span>
            <span class="d-val pixelated">
              <span class="cat-full">{{ ({ physical: '⚔️ Físico', special: '✨ Especial', status: '🔮 Estado' } as Record<string, string>)[moveData!.cat] || '🔮 Estado' }}</span>
              <span class="cat-short">{{ ({ physical: '⚔️ FIS', special: '✨ ESP', status: '🔮 EST' } as Record<string, string>)[moveData!.cat] || '🔮 EST' }}</span>
            </span>
          </div>
          <div class="mv-pp-wrap">
            <span class="mv-pp-label pixelated">PP</span>
            <span class="mv-pp-val pixelated">{{ move.pp }}/{{ move.maxPP }}</span>
          </div>
        </div>
      </template>
      <div
        v-else
        class="empty-move-placeholder-wrap"
      >
        <PVTooltip
          position="top"
          :delay="300"
        >
          <template #content>
            <div class="empty-slot-hint">
              Puedes organizar y aprender nuevos movimientos desde la ficha de información del Pokémon.
            </div>
          </template>
          <div class="empty-move-placeholder pixelated">
            <span class="slot-num">SLOT {{ index + 1 }}</span>
            <span class="empty-text">- VACÍO -</span>
          </div>
        </PVTooltip>
      </div>
    </button>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-move-slot.scss"></style>
