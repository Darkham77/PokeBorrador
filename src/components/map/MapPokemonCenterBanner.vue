<script setup lang="ts">
import { computed } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { pokemonNeedsHealing } from '@/logic/economy/economyFormulas'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import { usePokemonCenterCooldown } from '@/composables/map/usePokemonCenterCooldown'
import type { Pokemon } from '@/types/pokemon/pokemon'

const gameStore = useGameStore()
const uiStore = useUIStore()
const modalStore = useModalStore()
const { cooldownSecondsLeft, cooldownFormatted, handleCooldownClick } = usePokemonCenterCooldown()

const bannerUrl = computed(() => {
  const assetName = cooldownSecondsLeft.value > 0 ? 'pokecenter_closed_banner' : 'pokecenter_banner'
  return getAssetUrl(ASSET_TYPES.BANNER, assetName)
})

const bannerStyle = computed(() => ({
  backgroundImage: `url('${bannerUrl.value}')`
}))

const onBannerHover = (event: MouseEvent, enter: boolean) => {
  const el = event.currentTarget as HTMLElement
  if (!el || cooldownSecondsLeft.value > 0) return
  const bg = el.querySelector('.banner-bg') as HTMLElement | null

  if (enter) {
    gsap.to(el, { y: -3, duration: 0.25, ease: 'power2.out', overwrite: 'auto' })
    if (bg) gsap.to(bg, { scale: 1.03, duration: 0.35, ease: 'power2.out', overwrite: 'auto' })
  } else {
    gsap.to(el, { y: 0, duration: 0.25, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform' })
    if (bg) gsap.to(bg, { scale: 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform,scale' })
  }
}

const openCenter = () => {
  const needsHeal = (gameStore.state.team as (Pokemon | null)[]).some(p => p && pokemonNeedsHealing(p))
  
  if (!needsHeal) {
    uiStore.notify('Tu equipo ya está en perfectas condiciones.', '💖')
    return
  }

  if (cooldownSecondsLeft.value > 0) {
    uiStore.notify(`El Centro Pokémon está en mantenimiento. Disponible en ${cooldownFormatted.value}.`, '🏥')
    return
  }
  
  modalStore.open('PokemonCenter')
}
</script>

<template>
  <div class="map-pokecenter-wrapper">
    <div
      class="pokecenter-banner"
      :class="{ 'on-cooldown': cooldownSecondsLeft > 0 }"
      @click.stop="cooldownSecondsLeft > 0 ? handleCooldownClick() : openCenter()"
      @mouseenter="onBannerHover($event, true)"
      @mouseleave="onBannerHover($event, false)"
    >
      <div 
        class="banner-bg" 
        :style="bannerStyle"
      />
      <div class="banner-overlay">
        <div class="banner-title">
          <span class="title-icon">💊</span> CENTRO POKÉMON
        </div>
        <div class="banner-desc">
          Saná a tu equipo y restaurá todos sus PP al instante.
        </div>
      </div>
      <PVTooltip 
        v-if="cooldownSecondsLeft > 0"
        title="Centro Pokémon en mantenimiento" 
        description="Debes esperar a que termine el tiempo de enfriamiento para volver a curar gratis."
        position="bottom"
        class="banner-tag-tooltip"
      >
        <span class="banner-tag cooldown">
          <span class="icon">⏱️</span> {{ cooldownFormatted }}
        </span>
      </PVTooltip>
      <span
        v-else
        class="banner-tag"
      ><span class="icon">💊</span> CURACIÓN</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.map-pokecenter-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
  box-sizing: border-box;
  width: fit-content;
}

.pokecenter-banner {
  position: relative;
  width: 440px;
  max-width: 100%;
  height: auto;
  aspect-ratio: 307 / 171;
  border-radius: 16px;
  cursor: pointer;
  
  box-shadow: 0 10px 40px Rgba(0, 0, 0, 0.6), inset 0 0 15px Rgba(0, 0, 0, 0.5);
  border: 4px solid Rgba(255, 0, 127, 1);
  overflow: hidden;
  box-sizing: border-box;
  
  .banner-bg {
    position: absolute;
    inset: -2px;
    background-size: cover;
    background-position: center center;
    background-repeat: no-repeat;
    z-index: calc(var(--z-base) + 1);
    border-radius: 14px;
    @include pixelated;
  }

  &::after {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(to top, var(--black, #000000) 0%, Rgba(0, 0, 0, 0.6) 30%, transparent 55%);
    z-index: calc(var(--z-base) + 2);
    pointer-events: none;
    border-radius: 14px;
  }

  &.on-cooldown {
    border-color: Rgba(107, 114, 128, 1) !important;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    max-width: 100%;
  }
}

.banner-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 20px;
  text-align: left;
  z-index: calc(var(--z-base) + 3);
  border-radius: 0 0 16px 16px;
  background: linear-gradient(to top, Rgba(0, 0, 0, 0.6) 0%, transparent 100%);
}

.banner-title {
  @include pixelated;
  font-size: 18px;
  font-weight: 700;
  color: white;
  margin-bottom: 2px;
  text-shadow: 0 3px 8px Rgba(0, 0, 0, 1);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;

  .title-icon {
    font-size: 16px;
  }

  @media (max-width: 480px) {
    font-size: 15px;
  }
}

.banner-desc {
  @include pixelated;
  font-size: 8px;
  font-weight: 400 !important;
  color: Rgba(255, 255, 255, 0.85);
  max-width: 90%;
  text-shadow: 0 2px 4px Rgba(0, 0, 0, 1);
}

.banner-tag-tooltip {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: calc(var(--z-base) + 4);

  .banner-tag {
    position: relative;
    top: auto;
    right: auto;
    z-index: auto;
  }
}

.banner-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  background: Rgba(16, 185, 129, 1);
  color: var(--white);
  padding: 5px 10px;
  border-radius: 8px;
  @include pixelated;
  font-size: 8px;
  box-shadow: 0 4px 10px Rgba(16, 185, 129, 0.3);
  z-index: calc(var(--z-base) + 4);
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &.cooldown {
    background: Rgba(75, 85, 99, 1);
    box-shadow: 0 4px 10px Rgba(75, 85, 99, 0.3);
  }
}
</style>
