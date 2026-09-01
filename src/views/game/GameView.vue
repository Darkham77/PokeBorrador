<script setup lang="ts">
import { gsap } from 'gsap'
import { GSAP_FAST_DURATION_SEC } from '@/logic/constants/animations.ts'
import { useUIStore } from '@/stores/ui.ts'

const GAME_VIEW_TRANSITION_Y_PX = 10
const uiStore = useUIStore()

const onBeforeEnter = (el: Element) => {
  gsap.set(el, { opacity: 0, y: GAME_VIEW_TRANSITION_Y_PX })
}

const onEnter = (el: Element, done: () => void) => {
  gsap.to(el, {
    opacity: 1,
    y: 0,
    duration: GSAP_FAST_DURATION_SEC,
    ease: 'power2.out',
    onComplete: done
  })
}

const onLeave = (el: Element, done: () => void) => {
  gsap.to(el, {
    opacity: 0,
    y: GAME_VIEW_TRANSITION_Y_PX,
    duration: GSAP_FAST_DURATION_SEC,
    ease: 'power2.in',
    onComplete: done
  })
}

const onNavItemMouseEnter = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'Rgba(255, 255, 255, 0.05)',
    color: '#ffffff',
    duration: GSAP_FAST_DURATION_SEC,
    overwrite: 'auto'
  })
}

const onNavItemMouseLeave = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  const isActive = target.classList.contains('active')
  
  gsap.to(target, {
    backgroundColor: isActive ? 'Rgba(255, 184, 0, 0.1)' : 'transparent',
    color: isActive ? 'var(--yellow)' : 'var(--gray)',
    duration: 0.2,
    overwrite: 'auto'
  })
}
</script>

<template>
  <div class="game-view">
    <div class="stars" />
    <div class="game-container">
      <div class="placeholder-hud">
        HUD (Migrada a LegacyInterface)
      </div>
      
      <main class="content-area">
        <router-view v-slot="{ Component }">
          <transition
            mode="out-in"
            @before-enter="onBeforeEnter"
            @enter="onEnter"
            @leave="onLeave"
          >
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <nav class="bottom-nav">
        <router-link
          to="/"
          class="nav-item"
          active-class="active"
          @mouseenter="onNavItemMouseEnter"
          @mouseleave="onNavItemMouseLeave"
        >
          <span class="emoji">🗺️</span>
          <span>Mapa</span>
        </router-link>
        <button
          id="nav-team-management"
          type="button"
          class="nav-item"
          @click="uiStore.toggleTeamManagement"
          @mouseenter="onNavItemMouseEnter"
          @mouseleave="onNavItemMouseLeave"
        >
          <span class="emoji">⚡</span>
          <span>Equipo</span>
        </button>
        <router-link
          to="/pokedex"
          class="nav-item"
          active-class="active"
          @mouseenter="onNavItemMouseEnter"
          @mouseleave="onNavItemMouseLeave"
        >
          <span class="emoji">📖</span>
          <span>Pokedex</span>
        </router-link>
      </nav>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.game-view {
  min-height: 100dvh;
  background: var(--darker);
  color: var(--white);
  padding: 20px;
}

.game-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 40px);
}

.content-area {
  flex: 1;
  padding-top: 100px; /* Space for the floating HUD */
  padding-bottom: 90px; /* Space for the floating bottom nav */
}

@media (max-width: 768px) {
  .content-area {
    padding-top: 85px;
  }
}

.bottom-nav {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: Translatex(-50%);
  background: Rgba(0, 0, 0, 0.85);
  -webkit-will-change: transform, opacity;
  will-change: transform, opacity;
  @include gpu-layer;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 8px 16px;
  display: flex;
  gap: 12px;
  box-shadow: 0 10px 30px Rgba(0, 0, 0, 0.5);
  z-index: var(--z-navigation);
  transform: Translatex(-50%) Translatez(0);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 12px;
  text-decoration: none;
  color: var(--gray);
  font-size: 11px;
  font-weight: bold;
}

.nav-item span:first-child {
  font-size: 18px;
}

.nav-item:hover {
  color: var(--white);
}

.nav-item.active {
  background: Rgba(255, 184, 0, 0.1);
  color: var(--yellow);
}

@media (max-width: 768px) {
  .game-view {
    padding: 10px;
  }
  .bottom-nav {
    width: 90%;
    bottom: 10px;
    justify-content: space-around;
  }
}
</style>
