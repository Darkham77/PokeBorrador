<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { gsap } from 'gsap'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { initGlobalErrorHandlers } from '@/logic/errorHandler'
import { checkDBCompatibility, DBRouter, type DBCompatibilityResponse } from '@/logic/db/dbRouter'

import MainGameView from '@/views/MainGameView.vue'
import ErrorOverlay from '@/components/common/ErrorOverlay.vue'
import ModalHost from '@/components/common/ModalHost.vue'
import ToastNotification from '@/components/ui/ToastNotification.vue'
import ConnectionWarning from '@/components/ui/ConnectionWarning.vue'
import LivePvPArena from '@/components/battle/LivePvPArena.vue'
import BattleArena from '@/components/BattleArena.vue'
import PWAManager from '@/components/common/PWAManager.vue'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { useLoadingStore } from '@/stores/loading'
import { useBodyClass } from '@/composables/useBodyClass'
import { useWindowListener } from '@/composables/useWindowListener'
import { logger } from '@/logic/utils/logger'

import { useProfileStore } from '@/stores/profile'
import { useSocialStore } from '@/stores/social'
import { useRoute } from 'vue-router'

const authStore = useAuthStore()
const gameStore = useGameStore()
const uiStore = useUIStore()
const profileStore = useProfileStore()
const socialStore = useSocialStore()
const battleStore = useBattleStore()
const loadingStore = useLoadingStore()
const route = useRoute()
const dbIncompatible = ref(false)
const dbVersionInfo = ref<DBCompatibilityResponse | null>(null)
const dismissedLock = computed({
  get: () => uiStore.hasDismissedSessionLock,
  set: (val) => { uiStore.hasDismissedSessionLock = val }
})

const isLoginPage = computed(() => {
  if (typeof window === 'undefined') return false
  return window.location?.pathname === '/login' || route.path === '/login'
})

const loadingInfo = computed(() => {
  // 1. Centralized Loading Store (Highest Priority)
  if (loadingStore.isActive) {
    const cur = loadingStore.current
    return { 
      active: true, 
      msg: cur?.message || 'Cargando...', 
      sub: cur?.subMessage || '',
      global: cur?.isGlobal || false
    }
  }

  // 2. Auth Loading
  if (authStore.loading) {
    return { active: true, msg: 'Iniciando sesión...', sub: 'Conectando con el servidor', global: false }
  }
  
  // 3. Game Data & Engine Boot (ULTRA-STICKY GATE)
  // No soltamos la pantalla negra hasta que TODO el motor esté listo
  if (authStore.user && !isLoginPage.value && (!gameStore.isDataLoaded || !gameStore.isEngineReady)) {
    const msg = !gameStore.isDataLoaded ? 'Cargando datos...' : 'Iniciando motor...'
    
    return { 
      active: true, 
      msg, 
      sub: 'Preparando entorno de juego', 
      global: false 
    }
  }

  // 4. Manual Overlays
  if (gameStore.state.isOverlayLoading) {
    return { 
      active: true, 
      msg: gameStore.state.overlayMessage || 'Procesando...', 
      sub: 'Por favor, no cierres la ventana',
      global: true 
    }
  }

  return { active: false, msg: '', sub: '', global: false }
})

const isReadyToSeeGame = computed(() => {
  return authStore.user && loadingStore.isGateOpen
})

onMounted(async () => {
  // 1. Init Global Error Handlers (Vue Bridge)
  initGlobalErrorHandlers()


  // 2. Recuperar sesión (Autologin)
  if (isLoginPage.value) {
    loadingStore.clearAll() // Limpiar TODO si es login
    loadingStore.markAppMounted() // Abrir puerta inmediatamente
  }
  await authStore.checkSession()

  // 3. Check DB Compatibility & Load Game (Omitir si estamos en login para evitar bloqueos)
  if (authStore.user && !isLoginPage.value) {
    const comp = await checkDBCompatibility(gameStore.db as unknown as DBRouter)
    if (!comp.compatible) {
      dbIncompatible.value = true
      dbVersionInfo.value = comp
      return // Stop initialization
    }
    
    // Si la DB es compatible, cargar la partida
    await gameStore.loadGame()
    
    // Restaurar combate si existe uno activo en el estado guardado
    if (gameStore.state.activeBattle && !gameStore.state.activeBattle.over) {
      logger.info('App', 'Detectado combate persistente. Restaurando estado...')
      battleStore.restoreBattle(gameStore.state.activeBattle)
    }
    
    // Sincronizar datos del perfil
    profileStore.syncProfileFromAuth(authStore.user!, gameStore.state)
    
    // Iniciar presencia social globalmente para reportar estado online
    socialStore.startPresence()
  }
  
  // 4. Restore & Sync Zoom Level
  uiStore.setZoom(uiStore.appZoom)
})

// RE-APPLY ZOOM on login/user changes to prevent PWA resolution glitches
watch(() => authStore.user, (newUser) => {
  if (newUser) {
    logger.info('App', 'Usuario detectado, re-aplicando escala visual...')
    uiStore.setZoom(uiStore.appZoom)
  } else {
    // Detener pings de presencia si el usuario cierra sesión
    socialStore.stopPresence()
  }
})

// Intercept low-level events to prevent them from reaching background interactions when modals are open
const blockEvents = (e: Event) => {
  const target = e.target as HTMLElement | null
  if (!target || typeof target.closest !== 'function') return

  const isInsideModal = target.closest('.base-modal-root, .base-modal-content, .modal-host')
  const isScrollable = (el: HTMLElement) => {
    if (!el || el === document.body || el === document.documentElement) return false
    const style = window.getComputedStyle(el)
    const overflow = style.overflow + style.overflowY + style.overflowX
    return /(auto|scroll)/.test(overflow)
  }

  // Find the nearest scrollable parent
  let curr: HTMLElement | null = target
  let foundScrollable = null
  while (curr && curr !== document.body) {
    if (isScrollable(curr)) {
      foundScrollable = curr
      break
    }
    curr = curr.parentElement
  }

  // CRITICAL: If we are inside a modal or a scrollable view, STOP propagation
  if (foundScrollable || isInsideModal) {
    e.stopPropagation()
    return
  }

  // 2. Only block the event entirely if a modal is open AND we are NOT inside it
  if (uiStore.isAnyBlockingModalOpen) {
    e.preventDefault()
    e.stopImmediatePropagation()
  }
}

// Managed Window Listeners (Safe Lifecycle)
useWindowListener('wheel', blockEvents, { capture: true, passive: false }); // [PureVue-Ignore]
useWindowListener('touchmove', blockEvents, { capture: true, passive: false }); // [PureVue-Ignore]

// Bloqueo de Scroll Global para Modales (Pure Vue Managed)
useBodyClass('modal-open', () => uiStore.isAnyBlockingModalOpen)

const handleRetry = () => {
  window.location.reload()
}

const handleReclaim = async () => {
  await gameStore.reclaimControl()
  dismissedLock.value = true
}

// GSAP Transitions for Loading Overlay
const onLoadingEnter = (el: Element, done: () => void) => {
  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'none', onComplete: done })
}

const onLoadingLeave = (el: Element, done: () => void) => {
  gsap.to(el, { opacity: 0, duration: 0.8, ease: 'power2.inOut', onComplete: done })
}
</script>

<template>
  <div id="vue-app">
    <!-- RESTORE LEGACY BACKGROUND (Only visible when game is fully ready and NOT loading) -->
    <div 
      v-show="isReadyToSeeGame || isLoginPage"
      class="global-background-stars" 
    />

    <!-- GLOBAL LOADING OVERLAY -->
    <Teleport to="body">
      <Transition
        :css="false"
        @enter="onLoadingEnter"
        @leave="onLoadingLeave"
      >
        <div
          v-if="!loadingStore.isGateOpen && (!isLoginPage || loadingInfo.active) && !dbIncompatible"
          class="loading-overlay"
          :class="{ 'global-overlay': loadingInfo.global }"
        >
          <div class="loader" />
          <p>{{ loadingInfo.msg }}</p>
          <span 
            v-if="loadingInfo.sub" 
            class="sub-text"
          >
            {{ loadingInfo.sub }}
          </span>
        </div>
      </Transition>
    </Teleport>

    <!-- Vistas de Ruta (Login tiene prioridad absoluta) -->
    <template v-if="isLoginPage">
      <router-view />
    </template>
    
    <template v-else-if="authStore.user">
      <!-- Bloqueo por Versión Outdated -->
      <Teleport v-if="dbIncompatible" to="body">
        <div class="loading-overlay version-lock">
        <div class="lock-icon">
          ⚠️
        </div>
        <h2>SERVIDOR DESACTUALIZADO</h2>
        <p>Tu cliente (v{{ dbVersionInfo?.client }}) es más moderno que el servidor (v{{ dbVersionInfo?.db }}).</p>
        <p class="admin-note">
          Por favor, contacta al administrador para actualizar la base de datos.
        </p>
        <div
          class="retry-btn"
          @click.stop="handleRetry"
        >
          REINTENTAR
        </div>
      </div>
      </Teleport>

      <template v-else-if="gameStore.isReady">
        <MainGameView v-show="!uiStore.isAnyFullscreenModalOpen" />

        <!-- Bloqueo por Sesión (Last-In-Wins) -->
        <Teleport v-if="gameStore.isSaveLocked && !dismissedLock" to="body">
          <div class="loading-overlay session-lock-overlay">
            <div class="lock-icon-wrapper">
            <span class="lock-emoji">🔒</span>
          </div>
          
          <h2 class="lock-title">
            SESIÓN BLOQUEADA
          </h2>
          
          <div class="lock-content">
            <p>Se ha detectado una sesión más reciente en otra pestaña o dispositivo.</p>
            <p class="warning-box">
              Este navegador está ahora en modo <strong>SOLO LECTURA</strong>.
            </p>
          </div>

          <div class="lock-actions">
            <div
              class="retry-btn primary reclaim-btn"
              @click.stop="handleReclaim"
            >
              TOMAR CONTROL DE ESTA SESIÓN
            </div>
            
            <div
              class="risk-btn"
              @click.stop="dismissedLock = true"
            >
              CONTINUAR SIN GUARDAR (RIESGO ALTO)
            </div>
          </div>
        </div>
        </Teleport>
      </template>
    </template>

    <router-view v-else-if="!authStore.loading" />


    <!-- Error Global UI -->
    <ErrorOverlay />
    <ModalHost />
    <ToastNotification />
    <ConnectionWarning />
    <LivePvPArena />
    <BattleArena />
    <PWAManager />
    
    <!-- Optimized SVG Filters for Pixel Art -->
    <svg
      style="visibility: hidden; position: absolute;"
      width="0"
      height="0"
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
    >
      <defs>
        <filter id="pixel-outline-optimized">
          <feMorphology
            in="SourceAlpha"
            result="expanded"
            operator="dilate"
            radius="1"
          />
          <feFlood
            flood-color="black"
            result="black"
          />
          <feComposite
            in="black"
            in2="expanded"
            operator="in"
            result="outline"
          />
          <feMerge>
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="pixel-outline-optimized-3px">
          <feMorphology
            in="SourceAlpha"
            result="expanded"
            operator="dilate"
            radius="3"
          />
          <feFlood
            flood-color="black"
            result="black"
          />
          <feComposite
            in="black"
            in2="expanded"
            operator="in"
            result="outline-raw"
          />
          <feGaussianBlur
            in="outline-raw"
            stdDeviation="0.5"
            result="outline"
          />
          <feMerge>
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="pixel-outline-ice">
          <feMorphology
            in="SourceAlpha"
            result="expanded"
            operator="dilate"
            radius="8"
          />
          <feFlood
            flood-color="#e0ffff"
            result="ice-color"
          />
          <feComposite
            in="ice-color"
            in2="expanded"
            operator="in"
            result="outline"
          />
          <feMerge>
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="pixel-silhouette-optimized">
          <!-- 1. Body: Solid Black -->
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="black-body"
          />
          
          <!-- 2. Outline: White (1.0px Dilate - SourceAlpha) -->
          <feMorphology
            in="SourceAlpha"
            operator="dilate"
            radius="1.0"
            result="expanded"
          />
          <feComposite
            in="expanded"
            in2="SourceAlpha"
            operator="out"
            result="outline-mask"
          />
          
          <!-- 3. Convert mask to white outline -->
          <feColorMatrix
            in="outline-mask"
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"
            result="white-outline-sharp"
          />
          
          <!-- 4. Smooth the outline -->
          <feGaussianBlur
            in="white-outline-sharp"
            stdDeviation="1.0"
            result="white-outline-blur"
          />
          
          <!-- 5. Final Merge: Body on top of Outline -->
          <feMerge>
            <feMergeNode in="white-outline-blur" />
            <feMergeNode in="black-body" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  </div>
</template>

<style lang="scss">
@use "@/styles/core/tools" as *;

#vue-app {
  width: 100dvw;
  height: 100dvh;
  max-width: 100dvw;
  max-height: 100dvh;
  overflow: hidden;
  position: relative;
  margin: 0;
  padding: 0;
  background: $darker;
}

.zoom-target {
  zoom: var(--app-zoom, 1);
  @include gpu-layer;
  will-change: zoom, transform;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  width: 100dvw;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: $black;
  z-index: var(--z-max);
  color: var(--yellow);
  @include pixelated;
  font-size: 12px;
  text-align: center;
}

.loading-overlay p {
  margin-top: 25px;
  margin-bottom: 10px;
}

.loading-overlay .sub-text {
  font-size: 8px;
  opacity: 0.6;
  text-transform: uppercase;
}

.loading-overlay.global-overlay {
  background: Rgba(0, 0, 0, 0.95);
  -webkit-will-change: opacity;
  will-change: opacity;
  @include gpu-layer;
}


.loader {
  width: 50px;
  height: 50px;
  border: 5px solid Rgba(255, 255, 255, 0.1);
  border-top-color: var(--yellow);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: Rotate(360deg); }
}

.version-lock .lock-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.version-lock h2 {
  color: #ff3333;
  margin-bottom: 15px;
}

.version-lock p {
  margin-top: 5px;
  color: $white;
}

.version-lock .admin-note {
  color: var(--yellow);
  opacity: 0.8;
  font-size: 10px;
}

.retry-btn {
  margin-top: 30px;
  padding: 10px 20px;
  background: #ff3333;
  color: $white;
  cursor: pointer;
  border: 2px solid $white;
  transition: all 0.2s;
}

.retry-btn:hover {
  transform: Scale(1.1);
  background: $white;
  color: #ff3333;
}

.session-lock-overlay {
  background: Rgba(0, 0, 0, 0.95);
  -webkit-will-change: opacity;
  will-change: opacity;
  border: 2px solid var(--blue);
  box-shadow: inset 0 0 50px Rgba(0, 150, 255, 0.2), 0 0 100px Rgba(0, 100, 255, 0.3);
  padding: 40px;
  
  .lock-icon-wrapper {
    margin-bottom: 30px;
  filter: Drop-Shadow(0 0 20px Rgba(0, 150, 255, 0.6));
    animation: lock-pulse 2s ease-in-out infinite;
  }

  .lock-emoji {
    font-size: 80px;
    display: block;
    line-height: 1;
  }
  
  .lock-title {
    color: var(--blue);
    font-size: 24px;
    letter-spacing: 2px;
    text-shadow: 0 0 15px Rgba(0, 150, 255, 0.8);
    margin-bottom: 25px;
  }

  .lock-content {
    max-width: 400px;
    margin-bottom: 35px;
    
    p {
      color: $white;
      font-size: 11px;
      line-height: 1.6;
      margin: 10px 0;
    }

    .warning-box {
      margin-top: 20px;
      padding: 12px;
      background: Rgba(0, 150, 255, 0.1);
      border: 1px dashed var(--blue);
      color: var(--blue);
      font-size: 10px;
      @include pixelated;
    }
  }

  .lock-actions {
    display: flex;
    flex-direction: column;
    gap: 15px;
    width: 100%;
    max-width: 350px;
  }
  
  .retry-btn {
    margin: 0;
    padding: 15px;
    background: Rgba(255, 255, 255, 0.1);
    font-size: 10px;
    font-weight: bold;
    border-radius: 4px;
    box-shadow: 0 4px 0 Rgba(0, 0, 0, 0.3);
    border: 1px solid Rgba(255, 255, 255, 0.2);
    
    &.primary {
      background: var(--blue);
      border-color: $white;
      color: $white;
    }

    &.reclaim-btn {
      background: var(--green);
      color: $dark;
      font-weight: 900;
    }
    
    &:hover {
      background: $white;
      color: var(--blue);
      transform: Translatey(-2px);
      box-shadow: 0 6px 0 Rgba(0, 0, 0, 0.2);
    }
  }

  .risk-btn {
    font-size: 8px;
    color: $white;
    opacity: 0.5;
    cursor: pointer;
    text-decoration: underline;
    transition: opacity 0.2s;
    
    &:hover {
      opacity: 1;
      color: #ff3333;
    }
  }
}

@keyframes lock-pulse {
  0%, 100% { transform: Scale(1); }
  50% { transform: Scale(1.05); }
}

</style>
