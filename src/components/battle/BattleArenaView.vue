<script setup>
import { ref, computed, watch } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useBattleBackground } from '@/composables/useBattleBackground'
import { useMapStore } from '@/stores/map'
import { getRouteWeather } from '@/logic/weatherUtils'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import BattleInfoCard from './BattleInfoCard.vue'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'

const battleStore = useBattleStore()
const gameStore = useGameStore()
const mapStore = useMapStore()
const uiStore = useUIStore()
const { getBackgroundUrl } = useBattleBackground()

const atmosphere = ref(null)

const gs = computed(() => gameStore.state)
const battle = computed(() => battleStore.state)
const enemy = computed(() => battle.value?.enemy)
const player = computed(() => battle.value?.player)

const playerAnimSeed = Math.random()
const enemyAnimSeed = Math.random()
const _animSeed = Math.random()

// Background Error Handling
const handleBackgroundError = (e) => {
  const currentSrc = e.target.src
  if (currentSrc.includes('_')) {
    const baseSrc = currentSrc.substring(0, currentSrc.lastIndexOf('_')) + '.webp'
    if (baseSrc !== currentSrc) {
      e.target.src = baseSrc
    }
  }
}

// Animation & Shadow Logic
const getAttackAnimClass = (side) => {
  if (battleStore.attackerSide !== side || !battleStore.activeMove) return ''
  const move = battleStore.activeMove
  if (move.side !== side) return ''

  if (move.cat === 'physical') return 'atk-physical'
  if (move.cat === 'special') return 'atk-special'
  if (move.cat === 'status') return 'atk-status'
  return 'atk-default'
}

const FLYING_SPECIES = [
  'charizard', 'butterfree', 'pidgey', 'pidgeotto', 'pidgeot', 'spearow', 'fearow',
  'zubat', 'golbat', 'doduo', 'dodrio', 'scyther', 'gyarados', 'aerodactyl',
  'articuno', 'zapdos', 'moltres', 'dragonite', 'crobat', 'togetic', 'natu', 'xatu',
  'hoppip', 'skiploom', 'jumpluff', 'yanma', 'murkrow', 'gligar', 'delibird', 'mantine', 'skarmory',
  'lugia', 'ho-oh', 'rayquaza', 'salamence'
]

const isFlying = (pokemon) => {
  if (!pokemon) return false
  return pokemon.type === 'flying' || FLYING_SPECIES.includes(pokemon.id)
}

const playerFeetY = ref(0.9)
const enemyFeetY = ref(0.9)

const detectFeetY = async (pokemon) => {
  if (!pokemon) return 0.9
  if (isFlying(pokemon)) return 0.98

  const url = getAssetUrl(ASSET_TYPES.POKEMON, pokemon.id, { 
    isShiny: pokemon.isShiny, 
    isBack: pokemon === player.value 
  })

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      try {
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        for (let y = canvas.height - 1; y >= 0; y--) {
          for (let x = 0; x < canvas.width; x++) {
            const alpha = data[(y * canvas.width + x) * 4 + 3]
            if (alpha > 50) {
              resolve(y / canvas.height)
              return
            }
          }
        }
      } catch (_err) { resolve(0.9) }
      resolve(0.9)
    }
    img.onerror = () => resolve(0.9)
    img.src = url
  })
}

watch(() => enemy.value?.id, async () => {
  enemyFeetY.value = await detectFeetY(enemy.value)
}, { immediate: true })

watch(() => player.value?.id, async () => {
  playerFeetY.value = await detectFeetY(player.value)
}, { immediate: true })

const computedWeather = computed(() => {
  if (mapStore.globalWeather) return mapStore.globalWeather
  return getRouteWeather(battle.value?.locationId || 'route1', mapStore.currentSeason.id, mapStore.currentEpochHour)
})

</script>

<template>
  <div class="battle-arena">
    <div class="battle-arena-content">
      <AtmosphereLayer
        ref="atmosphere"
        :weather="computedWeather"
        :cycle="mapStore.currentCycle"
        :season="mapStore.currentSeason.id"
        :is-performance-mode="uiStore.isPerformanceMode"
        z-index="3"
        :seed="(battle?.locationId || 'route1').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)"
      />

      <!-- Battle Background -->
      <img 
        :src="getBackgroundUrl(battle?.locationId || 'route1', mapStore.currentCycle)" 
        class="arena-bg" 
        :style="atmosphere?.atmosphereStyles"
        alt="Battle Background"
        @error="handleBackgroundError"
      >
    </div>
    
    <div class="battle-sprites">
      <!-- Enemy Sprite -->
      <div
        class="combatant-sprite enemy-side-sprite"
        :class="[{ 'fainted': enemy.hp <= 0, 'is-attacking': battleStore.attackerSide === 'enemy' }, getAttackAnimClass('enemy')]"
      >
        <div 
          class="sprite-idle-wrapper combatant-idle-subtle"
          :style="{ animationDelay: `calc(${enemyAnimSeed} * -3s)`, '--idle-dist': isFlying(enemy) ? '-8px' : '-3px' }"
        >
          <PVSpriteFX
            :is-shiny="enemy.isShiny"
            :is-guardian="enemy.isGuardian"
            :vibrant="true"
            :sparkle-count="8"
          >
            <img
              class="pokemon-combat-image"
              :src="getAssetUrl(ASSET_TYPES.POKEMON, enemy.id, { isShiny: enemy.isShiny, isBack: false })"
              @error="e => e.target.style.display = 'none'"
            >
          </PVSpriteFX>
        </div>
        <div
          class="pv-shadow"
          :style="{ top: `${enemyFeetY * 100}%`, width: `${18 + (1 - enemyFeetY) * 10}cqw` }"
        />
      </div>
      
      <!-- Player Sprite -->
      <div
        class="combatant-sprite player-side-sprite"
        :class="[{ 'fainted': player.hp <= 0, 'is-attacking': battleStore.attackerSide === 'player' }, getAttackAnimClass('player')]"
      >
        <div 
          class="sprite-idle-wrapper combatant-idle-subtle"
          :style="{ animationDelay: `calc(${playerAnimSeed} * -3s)`, '--idle-dist': isFlying(player) ? '-8px' : '-3px' }"
        >
          <PVSpriteFX
            :is-shiny="player.isShiny"
            :is-guardian="player.isGuardian"
            :vibrant="true"
            :sparkle-count="8"
          >
            <img
              class="pokemon-combat-image"
              :src="getAssetUrl(ASSET_TYPES.POKEMON, player.id, { isShiny: player.isShiny, isBack: true })"
              @error="e => e.target.style.display = 'none'"
            >
          </PVSpriteFX>
        </div>
        <div
          class="pv-shadow"
          :style="{ top: `${playerFeetY * 100}%`, width: `${18 + (1 - playerFeetY) * 10}cqw` }"
        />
      </div>
    </div>

    <div class="battle-info-container">
      <div class="combatant-info-wrap enemy-side">
        <BattleInfoCard :pokemon="enemy" />
      </div>
      <div class="combatant-info-wrap player-side">
        <BattleInfoCard
          :pokemon="player"
          :is-player="true"
          :nick-style="gs.nick_style"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.battle-arena {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 350px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  overflow: hidden;
  container-type: inline-size;
  flex-shrink: 0;

  @media (max-width: 959px) {
    height: 60vh;
    max-height: 500px;
  }
}

.battle-arena-content {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.arena-bg {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover;
  z-index: var(--z-base);
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  image-rendering: -moz-crisp-edges;
}

.weather-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.battle-sprites {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: calc(var(--z-base) + 1);
}

.battle-info-container {
  position: absolute;
  inset: 0;
  z-index: calc(var(--z-base) + 2);
  padding: 4cqw;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.combatant-info-wrap { pointer-events: auto; }

.combatant-sprite {
  position: absolute;
  display: Flex;
  align-items: Center;
  justify-content: Center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  image-rendering: pixelated;

  .pokemon-combat-image {
    width: 38cqw;
    height: 38cqw;
    max-width: 190px;
    max-height: 190px;
    object-fit: contain;
  }
  
  &.enemy-side-sprite {
    top: 12%;
    right: 12%;
    @media (max-width: 690px) { right: Clamp(2%, 12cqw, 12%); }

    &.atk-default.is-attacking, &.atk-physical.is-attacking { animation: attack-dash-enemy 0.4s ease-out; }
    &.atk-special.is-attacking { animation: attack-pulse-enemy 0.4s ease-out; }
    &.atk-status.is-attacking { animation: attack-status-enemy 0.4s ease-out; }
  }
  
  &.player-side-sprite {
    bottom: 12%;
    left: 12%;
    @media (max-width: 690px) { left: Clamp(2%, 12cqw, 12%); }
    
    &.atk-default.is-attacking, &.atk-physical.is-attacking { animation: attack-dash-player 0.4s ease-out; }
    &.atk-special.is-attacking { animation: attack-pulse-player 0.4s ease-out; }
    &.atk-status.is-attacking { animation: attack-status-player 0.4s ease-out; }
  }
  
  &.fainted {
    opacity: 0;
    transform: TranslateY(20px);
    transition: all 0.5s;
    filter: Grayscale(1) Brightness(0.5);
  }
}

.pv-shadow {
  position: absolute;
  left: 50%;
  max-width: 100px;
  height: 12px;
  background: Rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  filter: Blur(2px);
  z-index: -1;
  pointer-events: none;
  transform: Translate(-50%, -60%);
}

.sprite-idle-wrapper {
  width: 100%; height: 100%;
  display: Flex; align-items: Center; justify-content: Center;
  @include will-animate(transform);
  
  &.combatant-idle-subtle {
    animation: combatant-idle-subtle 3s infinite ease-in-out !important;
  }
}

@keyframes combatant-idle-subtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(var(--idle-dist, -6px)); }
}

@keyframes attack-dash-player {
  0% { transform: Translate(0, 0); }
  25% { transform: Translate(50px, -50px); }
  100% { transform: Translate(0, 0); }
}

@keyframes attack-dash-enemy {
  0% { transform: Translate(0, 0); }
  25% { transform: Translate(-50px, 50px); }
  100% { transform: Translate(0, 0); }
}

@keyframes attack-pulse-player {
  0% { transform: Scale(1); }
  30% { transform: Scale(1.15) Translate(10px, -10px); filter: Brightness(1.3); }
  100% { transform: Scale(1); }
}
@keyframes attack-pulse-enemy {
  0% { transform: Scale(1); }
  30% { transform: Scale(1.15) Translate(-10px, 10px); filter: Brightness(1.3); }
  100% { transform: Scale(1); }
}

@keyframes attack-status-player {
  0% { transform: Rotate(0deg); }
  30% { transform: Rotate(10deg) Scale(1.1); }
  100% { transform: Rotate(0deg); }
}
@keyframes attack-status-enemy {
  0% { transform: Rotate(0deg); }
  30% { transform: Rotate(-10deg) Scale(1.1); }
  100% { transform: Rotate(0deg); }
}

.enemy-side { align-self: flex-start; }
.player-side { align-self: flex-end; }
</style>
