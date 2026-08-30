<script setup lang="ts">
/**
 * WalkedEggsPanel
 *
 * Compact horizontal panel that surfaces incubating eggs directly on the Map View,
 * inspired by the legacy #hud-eggs-progress panel but built with modern Vue 3 + GSAP.
 *
 * Rules obeyed:
 *  - Zero-Timer & Zero-Variable Policy: no setTimeout, no boolean animation flags.
 *  - GSAP Exclusive: all motion via gsap timelines / onComplete.
 *  - Zero-Any / Zero-Ignore TypeScript policy.
 */
const EGG_WOBBLE_LARGE_DEG = 12
const EGG_WOBBLE_SMALL_DEG = 8
const EGG_WOBBLE_STEP_DUR_LONG_SEC = 0.14
const EGG_WOBBLE_STEP_DUR_SHORT_SEC = 0.10
const EGG_WOBBLE_REST_PAUSE_SEC = 0.55
const EGG_PANEL_ENTRANCE_OFFSET_Y = -10
const EGG_PANEL_ENTRANCE_DUR_SEC = 0.35
import { computed, onMounted, onBeforeUnmount, watch, useTemplateRef, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { PokemonEgg } from '@/types/pokemon/pokemon'
import EggSprite from '@/components/common/EggSprite.vue'

// ─── Stores ───────────────────────────────────────────────────────────────────
const gameStore  = useGameStore()
const modalStore = useModalStore()

// ─── Reactive Data ────────────────────────────────────────────────────────────
const eggs = computed<PokemonEgg[]>(() => gameStore.state.eggs ?? [])

// ─── Progress Calculation ─────────────────────────────────────────────────────
function getProgress(egg: PokemonEgg): number {
  if (!egg.totalSteps) return 0  // legacy egg: can't compute % without original total
  return Math.min(100, Math.max(0, ((egg.totalSteps - egg.steps) / egg.totalSteps) * 100))
}

function getStepsLabel(egg: PokemonEgg): string {
  if (egg.totalSteps) {
    const walked = Math.max(0, egg.totalSteps - egg.steps)
    return `${Math.floor(walked).toLocaleString()} / ${egg.totalSteps.toLocaleString()} pasos`
  }
  // Legacy egg: show remaining steps countdown
  return `${Math.ceil(egg.steps).toLocaleString()} pasos restantes`
}

function isReady(egg: PokemonEgg): boolean {
  return egg.ready === true || egg.steps <= 0
}

// ─── Refs ─────────────────────────────────────────────────────────────────────
const panelRef = useTemplateRef<HTMLElement>('panelRef')

// Active GSAP timelines keyed by egg uid — kept so we can kill them on unmount.
const wiggleTimelines = new Map<string, gsap.core.Timeline>()

// ─── GSAP Animations ──────────────────────────────────────────────────────────

/** Kick off an infinite wiggle on the egg icon of a ready egg card. */
function startWiggle(uid: string): void {
  // Guard: bail out if uid is invalid or empty — the DOM node won't exist yet.
  if (typeof uid !== 'string' || uid.length === 0 || uid === 'undefined') return
  if (wiggleTimelines.has(uid)) return

  const selector = `[data-egg-uid="${uid}"] .egg-icon`
  const tl = gsap.timeline({ repeat: -1, yoyo: false })
  tl.to(selector, { rotation: EGG_WOBBLE_LARGE_DEG,  duration: EGG_WOBBLE_STEP_DUR_LONG_SEC, ease: 'power1.inOut' })
    .to(selector, { rotation: -EGG_WOBBLE_LARGE_DEG, duration: EGG_WOBBLE_STEP_DUR_LONG_SEC, ease: 'power1.inOut' })
    .to(selector, { rotation: EGG_WOBBLE_SMALL_DEG,   duration: EGG_WOBBLE_STEP_DUR_SHORT_SEC, ease: 'power1.inOut' })
    .to(selector, { rotation: -EGG_WOBBLE_SMALL_DEG,  duration: EGG_WOBBLE_STEP_DUR_SHORT_SEC, ease: 'power1.inOut' })
    .to(selector, { rotation: 0,   duration: EGG_WOBBLE_STEP_DUR_SHORT_SEC, ease: 'power1.out' })
    .to(selector, { rotation: 0,   duration: EGG_WOBBLE_REST_PAUSE_SEC, ease: 'none' }) // rest pause

  wiggleTimelines.set(uid, tl)
}

/** Tear down a specific egg wiggle timeline. */
function stopWiggle(uid: string): void {
  const tl = wiggleTimelines.get(uid)
  if (tl) {
    tl.kill()
    wiggleTimelines.delete(uid)
  }
}

/** Synchronise wiggle timelines with current egg list. */
function syncWiggles(): void {
  // Only process eggs with a valid uid — undefined means data not yet loaded.
  const readyUids = new Set(
    eggs.value
      .filter(e => isReady(e) && e.uid != null && e.uid !== 'undefined')
      .map(e => e.uid)
  )

  // Start wiggles for newly ready eggs
  for (const uid of readyUids) {
    startWiggle(uid)
  }

  // Stop wiggles for eggs that are no longer in the list or not ready
  for (const uid of wiggleTimelines.keys()) {
    if (!readyUids.has(uid)) stopWiggle(uid)
  }
}

/** An animate panel entry using GSAP (no CSS @keyframes). */
function animateIn(): void {
  if (!panelRef.value) return
  gsap.fromTo(
    panelRef.value,
    { opacity: 0, y: EGG_PANEL_ENTRANCE_OFFSET_Y },
    { opacity: 1, y: 0, duration: EGG_PANEL_ENTRANCE_DUR_SEC, ease: 'power2.out' }
  )
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  animateIn()
  // nextTick ensures the v-for has rendered [data-egg-uid] attributes
  // before GSAP tries to query them with a CSS selector.
  nextTick(() => syncWiggles())
})

onBeforeUnmount(() => {
  for (const uid of wiggleTimelines.keys()) stopWiggle(uid)
})

watch(eggs, () => nextTick(() => syncWiggles()), { deep: false })

// ─── Actions ──────────────────────────────────────────────────────────────────
function hatchEgg(egg: PokemonEgg): void {
  if (!isReady(egg)) return
  modalStore.open('HatchAnimation', { egg })
}
</script>

<template>
  <div
    v-if="eggs.length > 0"
    ref="panelRef"
    class="walked-eggs-panel"
    aria-label="Huevos en caminata"
  >
    <!-- Section label -->
    <div class="panel-label">
      <img
        :src="getAssetUrl(ASSET_TYPES.POKEMON, 'egg')"
        alt="Huevo"
        class="egg-label-icon"
      > <span>EN CAMINATA</span>
    </div>

    <!-- Egg cards row -->
    <div class="eggs-row">
      <div
        v-for="egg in eggs"
        :id="'egg-hud-card-' + egg.uid"
        :key="egg.uid"
        :data-egg-uid="egg.uid"
        class="egg-hud-card"
        :class="{ 'is-ready': isReady(egg) }"
        :role="isReady(egg) ? 'button' : 'article'"
        :tabindex="isReady(egg) ? 0 : -1"
        :aria-label="isReady(egg) ? 'Eclosionar huevo' : 'Huevo en progreso'"
        @click="hatchEgg(egg)"
        @keydown.enter="hatchEgg(egg)"
      >
        <!-- Egg icon (GSAP target) -->
        <div class="egg-icon">
          <EggSprite
            :tint="egg.tint"
            size="28"
            class="egg-sprite-img"
          />
          <span
            v-if="egg.isShiny"
            class="shiny-star"
          ><span class="icon">✨</span></span>
        </div>

        <!-- Progress info -->
        <div class="egg-body">
          <!-- Status badge -->
          <div
            class="egg-status"
            :class="{ 'status-ready': isReady(egg) }"
          >
            {{ isReady(egg) ? '¡LISTO!' : 'CAMINANDO' }}
          </div>

          <!-- Progress bar -->
          <div class="progress-track">
            <div
              class="progress-fill"
              :style="{ width: `${getProgress(egg)}%` }"
            />
          </div>

          <!-- Steps label -->
          <div class="steps-remaining">
            {{ isReady(egg) ? 'Toca para eclosionar' : getStepsLabel(egg) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

// ── Panel wrapper ────────────────────────────────────────────────────────────
.walked-eggs-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0 2px;
  will-change: opacity, transform;
}

// ── Section label — matches .pc-banner-title tone ─────────────────────────────
.panel-label {
  @include pixelated;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 8px;
  letter-spacing: 2px;
  color: var(--gray);
  padding: 0 4px;
  opacity: 0.75;

  .egg-label-icon {
    width: 14px;
    height: 14px;
    @include pixelated;
  }
}

// ── Cards row ─────────────────────────────────────────────────────────────────
.eggs-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

// ── Individual egg card — mirrors .pc-banner aesthetic ───────────────────────
.egg-hud-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 14px;

  // Same neutral dark as the status cards
  background: Rgba(15, 23, 42, 0.95);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  box-shadow:
    0 8px 24px Rgba(0, 0, 0, 0.45),
    inset 0 1px 1px Rgba(255, 255, 255, 0.06);

  flex: 1 1 190px;
  max-width: 280px;
  min-width: 160px;
  cursor: default;
  outline: none;
  

  &:hover {
    border-color: Rgba(255, 255, 255, 0.15);
    box-shadow:
      0 12px 30px Rgba(0, 0, 0, 0.55),
      inset 0 1px 1px Rgba(255, 255, 255, 0.08);
  }

  @media (max-width: 600px) {
    flex: 1 1 100%;
    max-width: none;
  }

  // ── Ready state — subtle green accent, still quiet ───────────────────────
  &.is-ready {
    border-color: Rgba(34, 197, 94, 0.3);
    box-shadow:
      0 8px 24px Rgba(0, 0, 0, 0.45),
      0 0 12px Rgba(34, 197, 94, 0.08),
      inset 0 1px 1px Rgba(255, 255, 255, 0.06);
    cursor: pointer;

    &:hover {
      border-color: Rgba(34, 197, 94, 0.55);
      box-shadow:
        0 12px 30px Rgba(0, 0, 0, 0.55),
        0 0 20px Rgba(34, 197, 94, 0.14);
    }

    &:focus-visible {
      outline: 2px solid Rgba(34, 197, 94, 0.6);
      outline-offset: 2px;
    }
  }
}

// ── Egg icon — matches .pc-banner-icon treatment ─────────────────────────────
.egg-icon {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: Rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  flex-shrink: 0;
  filter: Drop-Shadow(0 2px 4px Rgba(0, 0, 0, 0.4));
  box-shadow: inset 0 0 8px Rgba(0, 0, 0, 0.25);
  user-select: none;

  .egg-sprite-img {
    width: 28px;
    height: 28px;
    @include pixelated;
  }

  .shiny-star {
    position: absolute;
    top: -4px;
    right: -5px;
    font-size: 9px;
    line-height: 1;
    filter: Drop-Shadow(0 0 4px var(--yellow));
    pointer-events: none;
  }
}

// ── Right-side content block ──────────────────────────────────────────────────
.egg-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

// ── Status label — muted, matches .pc-banner-title ───────────────────────────
.egg-status {
  @include pixelated;
  font-size: 7px;
  line-height: 1.4;
  letter-spacing: 1px;
  color: var(--gray);

  &.status-ready {
    color: Rgba(34, 197, 94, 0.85);
  }
}

// ── Progress bar track ────────────────────────────────────────────────────────
.progress-track {
  height: 4px;
  background: Rgba(255, 255, 255, 0.06);
  border-radius: 99px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 99px;
  // Subdued violet gradient — less saturated than before
  background: linear-gradient(90deg, Rgba(168, 85, 247, 0.7) 0%, Rgba(99, 102, 241, 0.7) 100%);
  

  .is-ready & {
    background: linear-gradient(90deg, Rgba(34, 197, 94, 0.75) 0%, Rgba(16, 185, 129, 0.75) 100%);
  }
}

// ── Steps remaining — quiet footnote text ─────────────────────────────────────
.steps-remaining {
  @include pixelated;
  font-size: 7px;
  line-height: 1.6;
  padding-top: 1px;
  color: Rgba(148, 163, 184, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .is-ready & {
    color: Rgba(34, 197, 94, 0.6);
  }
}
</style>
