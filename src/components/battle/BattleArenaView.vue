// [PureVue-Ignore-Length]
<script setup>
import { ref, computed, watch } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useBattleBackground } from '@/composables/useBattleBackground'
import { useMapStore } from '@/stores/map'
import { getRouteWeather } from '@/logic/weatherUtils'
import { PLAYER_CLASSES } from '@/data/playerClasses'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import BattleInfoCard from './BattleInfoCard.vue'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

const battleStore = useBattleStore()
const gameStore = useGameStore()
const mapStore = useMapStore()
const uiStore = useUIStore()
const { getBackgroundUrl } = useBattleBackground()

const bgData = computed(() => {
  return getBackgroundUrl(battle.value?.locationId || 'route1', mapStore.currentCycle)
})

const atmosphere = ref(null)

const gs = computed(() => gameStore.state)
const battle = computed(() => battleStore.state)
const enemy = computed(() => battle.value?.enemy)
const player = computed(() => battle.value?.player)

const isSearching = computed(() => battleStore.isSearching)
const isFinishing = computed(() => battleStore.isFinishing)
const upcomingPokemon = computed(() => battleStore.upcomingPokemon)

const hasBinoculars = computed(() => {
  // El inventario es un objeto { itemId: count }
  return (gameStore.state.inventory?.['binoculars'] > 0) || false
})

const isEmerging = ref(false)
watch(isSearching, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    isEmerging.value = true
    setTimeout(() => { isEmerging.value = false }, 1000)
  }
})

const playerAnimSeed = Math.random()
const enemyAnimSeed = Math.random()
const _animSeed = Math.random()

// Coordenada Y efectiva para el suelo (arbustos y siluetas)
const effectiveFeetY = computed(() => {
  if (isSearching.value || upcomingPokemon.value) return searchingFeetY.value
  return enemyFeetY.value
})

const grassIsBakedIn = ref(false)

const handleGrassLoad = (e) => {
  const src = e.target.src
  const cycleSuffixes = ['_noche', '_atardecer', '_amanecer', '_dia']
  // Si el src contiene uno de estos sufijos (y NO es el default tall-grass), es baked-in
  grassIsBakedIn.value = cycleSuffixes.some(s => src.includes(s)) && !src.includes('tall-grass')
}

const handleGrassError = (e) => {
  const defaultUrl = getAssetUrl(ASSET_TYPES.ENVIRONMENT, 'tall-grass')
  if (e.target.src && !e.target.src.endsWith(defaultUrl)) {
    e.target.src = defaultUrl
    grassIsBakedIn.value = false // El fallback nunca es baked-in
  }
}

const playerTrainerSpriteUrl = computed(() => {
  const classId = gameStore.state.playerClass || 'entrenador'
  const classDef = PLAYER_CLASSES[classId]
  const spriteId = classDef?.showdownSpriteId || 'red-lgpe'
  return getAssetUrl(ASSET_TYPES.TRAINER, spriteId)
})

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

const isFlying = (pokemon) => {
  if (!pokemon || !pokemon.id) return false
  const data = pokemonDataProvider.getPokemonData(pokemon.id)
  return data?.isFloating || false
}

const isUpcomingFlying = computed(() => isFlying(upcomingPokemon.value))

const playerFeetY = ref(0.9)
const enemyFeetY = ref(0.9)
const searchingFeetY = ref(0.9)

/**
 * Universal Pixel-based Feet Detection
 * Finds the first non-transparent pixel from the bottom to ground the shadow/bushes.
 */
const detectFeetYFromUrl = async (url, isFlying = false) => {
  if (!url) return 0.9
  if (isFlying) return 0.98

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
  if (!enemy.value) return
  const url = getAssetUrl(ASSET_TYPES.POKEMON, enemy.value.id, { 
    isShiny: enemy.value.isShiny, 
    isBack: false 
  })
  enemyFeetY.value = await detectFeetYFromUrl(url, isFlying(enemy.value))
}, { immediate: true })

watch([() => player.value?.id, () => player.value?.hp], async () => {
  if (!player.value) return
  
  const url = player.value.hp <= 0 
    ? playerTrainerSpriteUrl.value 
    : getAssetUrl(ASSET_TYPES.POKEMON, player.value.id, { isShiny: player.value.isShiny, isBack: true })
  
  const flying = player.value.hp > 0 && isFlying(player.value)
  
  playerFeetY.value = await detectFeetYFromUrl(url, flying)
}, { immediate: true })

// Actualizar la sombra cuando cambie el enemigo actual
watch(enemy, async (val) => {
  if (!val) return
  const url = getAssetUrl(ASSET_TYPES.POKEMON, val.id, { isShiny: val.isShiny })
  enemyFeetY.value = await detectFeetYFromUrl(url, isFlying(val))
}, { immediate: true })

// Actualizar la sombra anticipada cuando se pre-genera el próximo encuentro
watch(() => battleStore.upcomingPokemon, async (upPoke) => {
  if (!upPoke) return
  const url = getAssetUrl(ASSET_TYPES.POKEMON, upPoke.id, { isShiny: upPoke.isShiny, isBack: false })
  searchingFeetY.value = await detectFeetYFromUrl(url, isFlying(upPoke))
}, { immediate: true })

const computedWeather = computed(() => {
  if (mapStore.globalWeather) return mapStore.globalWeather
  return getRouteWeather(battle.value?.locationId || 'route1', mapStore.currentSeason.id, mapStore.currentEpochHour)
})

// --- PIXEL SHADOW GENERATOR ---
const shadowUrl = ref('')
const generatePixelShadow = (w = 21, h = 6) => {
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  
  // Limpiar y dibujar óvalo sólido
  ctx.fillStyle = 'Rgba(0, 0, 0, 0.35)'
  ctx.beginPath()
  // Usamos el centro y radios para llenar el canvas de 43x12
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  
  return canvas.toDataURL('image/png')
}

import { onMounted } from 'vue'
onMounted(() => {
  shadowUrl.value = generatePixelShadow()
})

</script>

<template>
  <div class="battle-arena">
    <div class="battle-arena-content">
      <!-- Battle Background -->
      <img 
        :src="bgData.url" 
        class="arena-bg" 
        :style="bgData.isBakedIn ? atmosphere?.weatherOnlyStyles : atmosphere?.atmosphereStyles"
        alt="Battle Background"
        @error="handleBackgroundError"
      >
    </div>
    
    <div class="battle-sprites">
      <!-- Enemy Sprite -->
      <div class="combatant-sprite enemy-side-sprite">
        <!-- Animator Wrapper: Handles combat animations (rotation, scale) without affecting the shadow -->
        <div 
          class="sprite-animator"
          :class="[
            { 
              'fainted': enemy.hp <= 0, 
              'is-attacking': battleStore.attackerSide === 'enemy',
              'is-emerging': isEmerging
            }, 
            getAttackAnimClass('enemy')
          ]"
        >
          <!-- Shadow (Behind everything) -->
          <div
            class="pv-shadow"
            :class="{ 'is-hidden': isSearching || (!upcomingPokemon && (!enemy || enemy.hp <= 0) && !isFinishing) }"
            :style="{ backgroundImage: `url(${shadowUrl})`, top: `${effectiveFeetY * 100}%` }"
          />

          <!-- Rotation Layer: Handles tilts and rotations without affecting the shadow -->
          <div 
            class="sprite-rotation-layer"
            :class="getAttackAnimClass('enemy')"
          >
            <div 
              v-if="enemy.hp <= 0 && battle.isTrainer"
              class="trainer-battle-sprite"
            >
              <img
                :src="enemyTrainerSpriteUrl"
                class="trainer-image"
                @error="e => e.target.style.display = 'none'"
              >
            </div>

            <div 
              v-else
              class="sprite-idle-wrapper combatant-idle-subtle"
              :class="{ 'is-floating-species': isFlying(enemy) }"
              :style="{ animationDelay: `calc(${enemyAnimSeed} * -3s)`, '--idle-dist': isFlying(enemy) ? '-12px' : '-3px' }"
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
            </div> <!-- End sprite-idle-wrapper -->
          </div> <!-- End Rotation Layer -->

          <!-- Capas de Encuentro (Unificadas para sincronización total) -->
          <Transition name="fade">
            <div 
              v-if="isSearching || (isFinishing && enemy?.hp <= 0 && player?.hp > 0)"
              class="encounter-layers"
              :style="grassIsBakedIn ? atmosphere?.weatherOnlyStyles : atmosphere?.atmosphereStyles"
            >
              <!-- Searching Visuals: Bushes (Capa TRASERA) -->
              <div 
                v-if="!isUpcomingFlying"
                class="searching-bushes back"
              >
                <div 
                  class="bush-container-ground"
                  :style="{ top: `${effectiveFeetY * 100}%` }"
                >
                  <div class="bush-wrapper bush-back-1">
                    <img
                      :src="getAssetUrl(ASSET_TYPES.ENVIRONMENT, `${battle.locationId}_tallgrass`)"
                      class="pixel-bush"
                      @load="handleGrassLoad"
                      @error="handleGrassError"
                    >
                  </div>
                  <div class="bush-wrapper bush-back-2">
                    <img
                      :src="getAssetUrl(ASSET_TYPES.ENVIRONMENT, `${battle.locationId}_tallgrass`)"
                      class="pixel-bush"
                      @load="handleGrassLoad"
                      @error="handleGrassError"
                    >
                  </div>
                </div>
              </div>

              <!-- Upcoming Pokemon Preview -->
              <div 
                v-if="upcomingPokemon"
                class="upcoming-preview combatant-idle-subtle"
                :class="{ 'is-floating-species': isFlying(upcomingPokemon) }"
                :style="{ animationDelay: `calc(${_animSeed} * -3s)`, '--idle-dist': isFlying(upcomingPokemon) ? '-12px' : '-3px' }"
              >
                <PVSpriteFX
                  :is-shiny="false"
                  :is-guardian="false"
                >
                  <img 
                    :src="getAssetUrl(ASSET_TYPES.POKEMON, upcomingPokemon.id, { isShiny: upcomingPokemon.isShiny })" 
                    class="upcoming-image"
                    :class="{ 'is-silhouette': !hasBinoculars }"
                    @error="e => e.target.style.display = 'none'"
                  >
                </PVSpriteFX>
              </div>


              <!-- Searching Visuals: Bushes (Capa DELANTERA) -->
              <div 
                v-if="!isUpcomingFlying"
                class="searching-bushes front"
              >
                <div 
                  class="bush-container-ground"
                  :style="{ top: `${effectiveFeetY * 100}%` }"
                >
                  <div class="bush-wrapper bush-front-1">
                    <img
                      :src="getAssetUrl(ASSET_TYPES.ENVIRONMENT, `${battle.locationId}_tallgrass`)"
                      class="pixel-bush"
                      @load="handleGrassLoad"
                      @error="handleGrassError"
                    >
                  </div>
                  <div class="bush-wrapper bush-front-2">
                    <img
                      :src="getAssetUrl(ASSET_TYPES.ENVIRONMENT, `${battle.locationId}_tallgrass`)"
                      class="pixel-bush"
                      @load="handleGrassLoad"
                      @error="handleGrassError"
                    >
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div> <!-- End sprite-animator -->
      </div> <!-- End combatant-sprite -->
      
      <!-- Player Side -->
      <div class="combatant-sprite player-side-sprite">
        <div 
          class="sprite-animator"
          :class="[
            { 
              'fainted': player.hp <= 0, 
              'is-attacking': battleStore.attackerSide === 'player' 
            }, 
            getAttackAnimClass('player')
          ]"
        >
          <!-- Shadow (Behind everything) -->
          <div
            class="pv-shadow"
            :style="{ backgroundImage: `url(${shadowUrl})`, top: `${playerFeetY * 100}%` }"
          />

          <!-- Rotation Layer -->
          <div 
            class="sprite-rotation-layer"
            :class="getAttackAnimClass('player')"
          >
            <!-- Trainer Sprite (Visible only when fainted) -->
            <div
              v-if="player.hp <= 0"
              class="trainer-battle-sprite"
            >
              <img
                :src="playerTrainerSpriteUrl"
                class="trainer-image"
                @error="e => e.target.style.display = 'none'"
              >
            </div>

            <div 
              v-else
              class="sprite-idle-wrapper combatant-idle-subtle"
              :class="{ 'is-floating-species': isFlying(player) }"
              :style="{ animationDelay: `calc(${playerAnimSeed} * -3s)`, '--idle-dist': isFlying(player) ? '-12px' : '-3px' }"
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
          </div> <!-- End Rotation Layer -->
        </div> <!-- End sprite-animator -->
      </div> <!-- End combatant-sprite -->
    </div> <!-- End battle-sprites -->

    <AtmosphereLayer
      ref="atmosphere"
      :weather="computedWeather"
      :cycle="mapStore.currentCycle"
      :season="mapStore.currentSeason.id"
      :is-performance-mode="uiStore.isPerformanceMode"
      :z-index="'calc(var(--z-base) + 20)'"
      :seed="(battle?.locationId || 'route1').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)"
    />

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
  overflow: hidden;
  container-type: inline-size;
  flex-shrink: 0;

  @media (max-width: 959px) {
    height: auto;
    min-height: 280px;
    max-height: none;
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
  z-index: calc(var(--z-base) + 1);
  image-rendering: pixelated !important;
  image-rendering: crisp-edges !important;
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
  z-index: calc(var(--z-base) + 10);
  overflow: hidden;
}

.battle-info-container {
  position: absolute;
  inset: 0;
  z-index: calc(var(--z-base) + 30);
  padding: 4cqw;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;

  @media (max-width: 600px) {
    padding: 2cqw;
  }
}

.combatant-info-wrap { pointer-events: auto; }

.combatant-sprite {
  position: absolute;
  width: 38cqw; // Tamaño base igual al del pokemon
  height: 38cqw;
  max-width: 190px;
  max-height: 190px;
  display: Flex;
  align-items: flex-end;
  justify-content: Center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  image-rendering: pixelated;
  overflow: hidden; // Clipping del sprite al rotar/escalar

  .pokemon-combat-image {
    width: 38cqw;
    height: 38cqw;
    max-width: 190px;
    max-height: 190px;
    object-fit: contain;
    object-position: bottom;
  }
  
  &.enemy-side-sprite {
    top: 12%;
    right: 12%;
    @media (max-width: 690px) { right: Clamp(2%, 12cqw, 12%); }
  }
  
  &.player-side-sprite {
    bottom: 12%;
    left: 12%;
    @media (max-width: 690px) { left: Clamp(2%, 12cqw, 12%); }
  }
}

.sprite-animator {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  // Translation & Scale Animations (Shadow follows these)
  &.atk-default.is-attacking, &.atk-physical.is-attacking { animation: attack-dash-enemy 0.4s ease-out; }
  &.atk-special.is-attacking { animation: attack-pulse-enemy 0.4s ease-out; }

  .player-side-sprite & {
    &.atk-default.is-attacking, &.atk-physical.is-attacking { animation: attack-dash-player 0.4s ease-out; }
    &.atk-special.is-attacking { animation: attack-pulse-player 0.4s ease-out; }
  }

  &.fainted {
    .sprite-idle-wrapper {
      opacity: 0;
      transform: TranslateY(20px);
      transition: all 0.5s;
      filter: Grayscale(1) Brightness(0.5);
      pointer-events: none;
    }
  }

  &.is-emerging {
    .pokemon-combat-image {
      animation: emerge-bounce 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
  }
}

.sprite-rotation-layer {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden; // Clipping adicional para capas de rotación

  // Rotation Animations (Shadow IGNORES these)
  &.atk-status { 
    animation: attack-status-enemy 0.4s ease-out; 
    
    .player-side-sprite & {
      animation: attack-status-player 0.4s ease-out;
    }
  }
}

.trainer-battle-sprite {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 2%; // Ajuste fino para la base
  animation: trainer-emerge 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;

  .trainer-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: bottom;
    image-rendering: pixelated;
  }
}

@keyframes trainer-emerge {
  0% { transform: TranslateY(20px); opacity: 0; }
  100% { transform: TranslateY(0); opacity: 1; }
}

.pv-shadow {
  position: absolute;
  left: 50%;
  transform: TranslateX(-50%) TranslateY(-50%);
  width: 70%; 
  height: 12px; 
  
  z-index: calc(var(--z-base) - 1);
  pointer-events: none;
  
  // Posicionamos el centro de la sombra exactamente en el pixel detectado.
  // Usamos background-size: contain para que la sombra no se corte.
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  // MAGIA PIXEL-ART: Escalado sin alias
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  image-rendering: -moz-crisp-edges;
  
  filter: none;
}

.sprite-idle-wrapper {
  width: 100%; height: 100%;
  display: Flex; align-items: flex-end; justify-content: Center;
  @include will-animate(transform);
  
}

.combatant-idle-subtle {
  animation: combatant-idle-subtle 3s infinite ease-in-out !important;
}

.is-floating-species {
  margin-bottom: 25px; // Elevación base sólida
  @media (max-width: 690px) { margin-bottom: 12px; }
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

/* Searching Visuals */
.searching-bushes {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  
  &.back { z-index: calc(var(--z-base) + 4); opacity: 1; }
  &.front { z-index: calc(var(--z-base) + 10); }

  .bush-container-ground {
    position: absolute;
    left: 50%;
    transform: Translate(-50%, -50%);
    width: 200px;
    height: 60px;
    pointer-events: none;
    display: flex;
    justify-content: center;
    align-items: flex-end;
  }
}

.bush-wrapper {
  position: absolute;
  width: 60px;
  height: 60px;
  image-rendering: pixelated;
  
  // Capa Frontal
  &.bush-front-1 { --bx: -25px; --by: 12px; --bs: 1.2; z-index: calc(var(--z-base) + 12); animation: bush-wiggle 1.2s infinite ease-in-out; }
  &.bush-front-2 { --bx: 35px; --by: 5px; --bs: 1.0; z-index: calc(var(--z-base) + 11); animation: bush-wiggle 1.5s infinite ease-in-out -0.4s; }
  
  // Capa Trasera
  &.bush-back-1 { --bx: -35px; --by: -30px; --bs: 0.9; z-index: calc(var(--z-base) + 3); animation: bush-wiggle 1.8s infinite ease-in-out -0.8s; }
  &.bush-back-2 { --bx: 20px; --by: -25px; --bs: 1.1; z-index: calc(var(--z-base) + 2); animation: bush-wiggle 2.1s infinite ease-in-out -0.2s; }
  
  transform: Translate(var(--bx), var(--by)) Scale(var(--bs));
}

.upcoming-preview {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: calc(var(--z-base) + 5);
  pointer-events: none;
  
  .upcoming-image {
    width: 38cqw;
    height: 38cqw;
    max-width: 190px;
    max-height: 190px;
    object-fit: contain;
    object-position: bottom;
    image-rendering: pixelated;
    transition: filter 0.3s ease;

    &.is-silhouette {
      filter: Brightness(0) Drop-Shadow(0 0 2px Rgba(255, 255, 255, 0.8)) !important;
    }

    // No usar transform: translateY aquí para evitar desalineación con la sombra
    backface-visibility: hidden;
  }
}

.pixel-bush {
  width: 100%;
  height: 100%;
  object-fit: contain;
  backface-visibility: hidden;
}

@keyframes bush-wiggle {
  0%, 100% { transform: Translate(var(--bx), var(--by)) Rotate(0deg) Scale(var(--bs)); }
  25% { transform: Translate(var(--bx), var(--by)) Rotate(-5deg) Scale(var(--bs)); }
  75% { transform: Translate(var(--bx), var(--by)) Rotate(5deg) Scale(var(--bs)); }
}

/* Emerge Animation */
.combatant-sprite.is-emerging {
  .pokemon-combat-image {
    animation: emerge-bounce 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }
}

@keyframes emerge-bounce {
  0% { transform: translateY(40px) Scale(0.5); opacity: 0; }
  50% { transform: translateY(-10px) Scale(1.1); opacity: 1; }
  100% { transform: translateY(0) Scale(1); opacity: 1; }
}
.encounter-layers {
  position: absolute;
  inset: 0;
  pointer-events: none;
  will-change: opacity;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s ease;
}

// Sincronización específica de la SOMBRA: 
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
