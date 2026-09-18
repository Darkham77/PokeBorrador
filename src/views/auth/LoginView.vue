<script setup lang="ts">
declare const __APP_VERSION__: string

import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { LOGIN_LOGO_FLOAT_Y_PX, LOGIN_CARD_ENTER_Y_PX } from '@/logic/constants/animations.ts'
import { useAuthStore } from '@/stores/auth'
import { usePWA } from '@/composables/system/usePWA'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { logger } from '@/logic/utils/logger'
import { OFFICIAL_SERVERS, DEFAULT_SERVER } from '@/data/system/official_servers'
import { switchServer } from '@/logic/db/supabase'
import { safeStorage } from '@/logic/utils/storage'
import { getFriendlyErrorMessage } from '@/logic/utils/friendlyErrors'
import { useLoginHandlers } from '@/views/auth/useLoginHandlers'
import {
  resolveActiveAuthForm,
  parseBanStatus,
  resolveStandardErrorMessage
} from '@/views/auth/authFormHelper'

import AuthServerSelector from '@/components/auth/AuthServerSelector.vue'
import AuthOnlineLogin from '@/components/auth/AuthOnlineLogin.vue'
import AuthOnlineSignup from '@/components/auth/AuthOnlineSignup.vue'
import AuthLocalLogin from '@/components/auth/AuthLocalLogin.vue'
import AuthLocalSignup from '@/components/auth/AuthLocalSignup.vue'
import LoginExpiredNotice from '@/components/auth/LoginExpiredNotice.vue'
import LoginPwaUpdateBanner from '@/components/auth/LoginPwaUpdateBanner.vue'

const wallpaperUrl = computed(() => `url('${getAssetUrl(ASSET_TYPES.UI, '../fondo/WALLPAPER')}')`)
const logoUrl = computed(() => getAssetUrl(ASSET_TYPES.UI, '../fondo/logo 1'))

const authStore = useAuthStore()
const router = useRouter()

const authTab = ref('login') // 'login' | 'signup'
const serverMode = ref('online') // 'online' | 'local'
const { 
  canInstall, 
  installApp, 
  needRefresh, 
  isUpdating, 
  progress, 
  progressText, 
  handleUpdate 
} = usePWA()

const handleInstallApp = async () => {
  await installApp()
}

const username = ref('')
const email = ref('')
const password = ref('')
const gender = ref<'h' | 'm'>('h')
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const loading = ref(false)
const serverStatus = ref<'checking' | 'online' | 'offline'>('checking')
const serverStatusDetail = ref('')
const selectedServerId = ref('')
const isOnline = computed(() => authStore.isOnline)
const sessionExpired = ref(false)
const activeAuthForm = computed(() => resolveActiveAuthForm(serverMode.value, authTab.value))
const banStatus = computed(() => parseBanStatus(error.value))
const standardError = computed(() => resolveStandardErrorMessage(error.value))

const appVersion = __APP_VERSION__

const switchAuthTab = (tab: string) => {
  authTab.value = tab
  error.value = null
  success.value = null
  gsap.set('.auth-tab', { clearProps: 'all' })
}

const {
  handleLogin,
  handleSignup,
  handleLocalLogin,
  handleLocalSignup,
  checkServerHealth
} = useLoginHandlers({
  authStore,
  router,
  email,
  password,
  username,
  gender,
  selectedServerId,
  serverStatus,
  serverStatusDetail,
  error,
  success,
  loading,
  authTab,
  getFriendlyErrorMessage
})

// Corregir bucle infinito si ya se está logueado
onMounted(() => {
  // Sincronizar servidor seleccionado
  const storedServer = safeStorage.getItem('pokevicio_selected_server_id')
  selectedServerId.value = storedServer || DEFAULT_SERVER.id
  switchServer(selectedServerId.value)
  checkServerHealth()

  // CHECK LOGOUT REASON
  const logoutReason = sessionStorage.getItem('pokevicio_logout_reason')
  if (logoutReason) {
    sessionStorage.removeItem('pokevicio_logout_reason')
    if (logoutReason === 'session_invalidated') {
      sessionExpired.value = true
    }
  }

  if (authStore.user) {
    logger.warn('Login', 'Usuario ya logueado detectado en ruta /login. Forzando logout para resetear estado.')
    authStore.logout()
  }

  if (typeof window !== 'undefined' && window.__E2E__) {
    // Skip intro animations in E2E to prevent elements from staying at opacity:0
    // under high CPU congestion when requestAnimationFrame is throttled by Chromium.
    return
  }

  gsap.from('.login-header-logo', {
    y: -100,
    opacity: 0,
    duration: 1.5,
    ease: 'back.out(1.2)',
    onComplete: () => {
      gsap.set('.login-header-logo', { clearProps: 'transform' })
    }
  })

  gsap.to('.login-header-logo img', {
    y: LOGIN_LOGO_FLOAT_Y_PX,
    duration: 3,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  })

  gsap.from('.auth-card', {
    y: LOGIN_CARD_ENTER_Y_PX,
    opacity: 0,
    duration: 1,
    delay: 0.5,
    ease: 'power3.out'
  })
})

function handleTabEnter(e: MouseEvent) {
  const tab = e.currentTarget as HTMLElement
  if (!tab.classList.contains('active')) {
    gsap.to(tab, {
      color: 'var(--white)',
      duration: 0.2
    })
  }
}

function handleTabLeave(e: MouseEvent) {
  const tab = e.currentTarget as HTMLElement
  if (!tab.classList.contains('active')) {
    gsap.to(tab, {
      color: 'var(--gray)',
      duration: 0.2
    })
  }
}



watch(authTab, (newTab) => {
  nextTick(() => {
    const tabs = document.querySelectorAll('.auth-tab')
    tabs.forEach(tab => {
      const tabText = tab.textContent?.trim().toLowerCase().replace(/\s+/g, '')
      const expectedText = newTab === 'login' ? 'iniciarsesión' : 'registrarse'
      const isTabActive = tabText === expectedText
      if (isTabActive) {
        gsap.to(tab, {
          color: '#ffffff',
          backgroundColor: '#bf5af2',
          duration: 0.3
        })
      } else {
        gsap.to(tab, {
          color: '#86868b',
          backgroundColor: 'transparent',
          duration: 0.3
        })
      }
    })
  })
}, { immediate: true })

watch(error, (newVal) => {
  if (newVal && newVal.startsWith('BAN:')) {
    nextTick(() => {
      const card = document.querySelector('.auth-ban-card')
      if (card) {
        gsap.killTweensOf(card)
        const BAN_SHAKE_STEP_SEC = 0.05;
        const tl = gsap.timeline()
        tl.to(card, { x: -4, duration: BAN_SHAKE_STEP_SEC })
          .to(card, { x: 4, duration: BAN_SHAKE_STEP_SEC })
          .to(card, { x: -4, duration: BAN_SHAKE_STEP_SEC })
          .to(card, { x: 4, duration: BAN_SHAKE_STEP_SEC })
          .to(card, { x: -2, duration: BAN_SHAKE_STEP_SEC })
          .to(card, { x: 2, duration: BAN_SHAKE_STEP_SEC })
          .to(card, { x: 0, duration: BAN_SHAKE_STEP_SEC })
      }
    })
  }
})

watch(isOnline, (online) => {
  if (!online) {
    nextTick(() => {
      const alert = document.querySelector('.internet-alert')
      if (alert) {
        gsap.killTweensOf(alert)
        gsap.to(alert, {
          opacity: 0.6,
          duration: 1,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut'
        })
      }
    })
  } else {
    gsap.killTweensOf('.internet-alert')
  }
}, { immediate: true })

const animatedProgress = ref(0)
watch(progress, (newVal) => {
  gsap.to(animatedProgress, {
    value: newVal,
    duration: 0.3,
    overwrite: 'auto'
  })
})

const handleServerChange = () => {
  switchServer(selectedServerId.value)
  checkServerHealth()
}
</script>

<template>
  <div id="auth-screen">
    <div class="login-background-stars" />
    
    <div class="login-header-logo">
      <img
        :src="logoUrl"
        alt="Poké Vicio Logo"
      >
    </div>

    <div class="auth-card">
      <div class="auth-sub">
        Te reto a dejar de jugarlo
      </div>

      <!-- CARTEL DE SESIÓN EXPIRADA / RESTAURADA -->
      <LoginExpiredNotice
        v-if="sessionExpired"
        @dismiss="sessionExpired = false"
      />

      <!-- CARTEL DE ACTUALIZACIÓN MANUAL EN LOGIN -->
      <LoginPwaUpdateBanner
        v-else-if="needRefresh"
        :is-updating="isUpdating"
        :animated-progress="animatedProgress"
        :progress-text="progressText"
        @update="handleUpdate({ forceNoSave: true })"
      />

      <template v-else>
        <div class="auth-tabs">
          <button
            id="login-auth-tab-login"
            class="auth-tab"
            :class="{ active: authTab === 'login' }"
            @click.stop="switchAuthTab('login')"
            @mouseenter="handleTabEnter"
            @mouseleave="handleTabLeave"
          >
            Iniciar Sesión
          </button>
          <button
            id="login-auth-tab-signup"
            class="auth-tab"
            :class="{ active: authTab === 'signup' }"
            @click.stop="switchAuthTab('signup')"
            @mouseenter="handleTabEnter"
            @mouseleave="handleTabLeave"
          >
            Registrarse
          </button>
        </div>

        <div
          v-if="standardError"
          class="auth-error show"
        >
          {{ standardError }}
        </div>

        <div
          v-if="banStatus.isBanned"
          class="auth-ban-card show"
        >
          <div class="ban-title">
            <span class="emoji">🚫</span> ACCESO DENEGADO
          </div>
          <div class="ban-reason">
            {{ banStatus.reason }}
          </div>
          <div class="ban-hint">
            Si crees que esto es un error, contacta al soporte.
          </div>
        </div>

        <div
          v-if="success"
          class="auth-success show"
        >
          {{ success }}
        </div>

        <AuthServerSelector
          v-model="serverMode"
          @update:model-value="error = null"
        />

        <div class="auth-forms">
          <!-- ONLINE LOGIN -->
          <AuthOnlineLogin
            v-if="activeAuthForm === 'online-login'"
            v-model:selected-server-id="selectedServerId"
            v-model:email-value="email"
            v-model:password-value="password"
            :loading="loading"
            :is-online="isOnline"
            :server-status="serverStatus"
            :server-status-detail="serverStatusDetail"
            :official-servers="OFFICIAL_SERVERS"
            @server-change="handleServerChange"
            @login="handleLogin"
          />

          <!-- LOCAL LOGIN -->
          <AuthLocalLogin
            v-else-if="activeAuthForm === 'local-login'"
            v-model:username-value="username"
            :loading="loading"
            @local-login="handleLocalLogin"
          />

          <!-- LOCAL SIGNUP -->
          <AuthLocalSignup
            v-else-if="activeAuthForm === 'local-signup'"
            v-model:username-value="username"
            v-model:gender-value="gender"
            :loading="loading"
            @local-signup="handleLocalSignup"
          />

          <!-- SIGNUP -->
          <AuthOnlineSignup
            v-else-if="activeAuthForm === 'online-signup'"
            v-model:username-value="username"
            v-model:email-value="email"
            v-model:password-value="password"
            v-model:gender-value="gender"
            :loading="loading"
            @signup="handleSignup"
          />

          <div
            v-if="loading"
            class="auth-loading-text"
          >
            Cargando partida... <span class="emoji">⌛</span>
          </div>
        </div>
      </template>

      <div class="auth-version-footer">
        <div
          v-if="canInstall"
          class="auth-pwa-install"
        >
          <button
            id="login-pwa-install-btn"
            class="pwa-install-btn"
            @click.stop="handleInstallApp"
          >
            <span class="emoji">📲</span> INSTALAR APP (FULLSCREEN)
          </button>
        </div>
        {{ appVersion }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
@use "@/styles/views/login";

#auth-screen {
  background-image: v-bind(wallpaperUrl);
}
</style>
