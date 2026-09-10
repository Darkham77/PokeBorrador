<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'

const _AUTH_MODES = ['login', 'signup'] as const
type AuthMode = typeof _AUTH_MODES[number]

const _SERVER_MODES = ['online', 'local'] as const
type ServerMode = typeof _SERVER_MODES[number]

const authMode = ref<AuthMode>('login')
const serverMode = ref<ServerMode>('online')
const selectedServer = ref('Poké Vicio Oficial (Global)')
const email = ref('')
const password = ref('')
const logoRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (logoRef.value) {
    gsap.to(logoRef.value, {
      y: -6,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    })
  }
})

function switchAuth(mode: AuthMode) {
  authMode.value = mode
}

function switchServer(mode: ServerMode) {
  serverMode.value = mode
}
</script>

<template>
  <section class="pv-section">
    <h2 class="section-title">
      <span class="emoji">🔐</span>
      <span>8. Demo Login Unificado (Estándar Canónico GBA 3px)</span>
    </h2>

    <div class="login-container">
      <!-- LOGO VICIO CON GSAP FLOTANTE -->
      <div
        ref="logoRef"
        class="login-logo"
      >
        <img
          src="/assets/fondo/logo 1.webp"
          alt="Poké Vicio"
          @error="($event.target as HTMLElement).style.display='none'"
        >
        <div class="logo-text-fallback">
          POKÉ VICIO
        </div>
      </div>

      <!-- CAJA DE LOGIN CON MARCO CANÓNICO GBA -->
      <div class="pv-panel-wrap has-cast-shadow">
        <div
          class="pv-frame-panel pv-panel-surface"
          style="padding: 44px 26px 26px;"
        >
          <div class="auth-sub">
            Te reto a dejar de jugarlo
          </div>

          <!-- TABS INICIAR SESIÓN / REGISTRO -->
          <div class="pv-tab-row">
            <button
              v-gsap-hover="'button'"
              type="button"
              class="pv-frame-control pv-tab-btn"
              :class="{ active: authMode === 'login' }"
              @click="switchAuth('login')"
            >
              <span>INICIAR SESIÓN</span>
            </button>
            <button
              v-gsap-hover="'button'"
              type="button"
              class="pv-frame-control pv-tab-btn"
              :class="{ active: authMode === 'signup' }"
              @click="switchAuth('signup')"
            >
              <span>REGISTRARSE</span>
            </button>
          </div>

          <!-- SELECTOR SERVIDOR MODO -->
          <div class="server-label">
            SERVIDOR
          </div>
          <div class="pv-server-row">
            <button
              v-gsap-hover="'button'"
              type="button"
              class="pv-frame-control pv-server-btn"
              :class="{ active: serverMode === 'online' }"
              @click="switchServer('online')"
            >
              <span class="emoji">🌐</span> <span>ONLINE</span>
            </button>
            <button
              v-gsap-hover="'button'"
              type="button"
              class="pv-frame-control pv-server-btn"
              :class="{ active: serverMode === 'local' }"
              @click="switchServer('local')"
            >
              <span class="emoji">💻</span> <span>LOCAL</span>
            </button>
          </div>

          <!-- DROPDOWN SELECCIONAR SERVIDOR -->
          <div style="margin-bottom: 12px;">
            <div class="server-meta-row">
              <span>SELECCIONAR SERVIDOR</span>
              <span class="server-status-red">
                <span>Inalcanzable</span>
                <span
                  class="emoji"
                  style="font-size: 11px;"
                >📡</span>
              </span>
            </div>
            <div class="pv-frame-control pv-input-wrap">
              <select
                v-model="selectedServer"
                class="pv-input pv-select"
              >
                <option>Poké Vicio Oficial (Global)</option>
                <option>Servidor Franco (Dev)</option>
                <option>Servidor Local (Offline)</option>
              </select>
            </div>
          </div>

          <!-- INPUT EMAIL -->
          <div class="pv-frame-control pv-input-wrap">
            <input
              v-model="email"
              type="email"
              class="pv-input"
              placeholder="Email"
              autocomplete="email"
            >
          </div>

          <!-- INPUT CONTRASEÑA -->
          <div class="pv-frame-control pv-input-wrap">
            <input
              v-model="password"
              type="password"
              class="pv-input"
              placeholder="Contraseña"
              autocomplete="current-password"
            >
          </div>

          <!-- BOTÓN ENTRAR -->
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-primary pv-btn-lg pv-btn-full"
          >
            <svg
              class="pokeball-pixel-svg"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="8"
                cy="8"
                r="7"
                stroke="#121214"
                stroke-width="2"
                fill="#ef4444"
              />
              <path
                d="M1 8H15V15H1V8Z"
                fill="#f4f4f5"
              />
              <line
                x1="1"
                y1="8"
                x2="15"
                y2="8"
                stroke="#121214"
                stroke-width="2"
              />
              <circle
                cx="8"
                cy="8"
                r="3"
                fill="#121214"
              />
              <circle
                cx="8"
                cy="8"
                r="1.5"
                fill="#f4f4f5"
              />
            </svg>
            <span class="text-outline">{{ authMode === 'signup' ? 'REGISTRARSE' : 'ENTRAR' }}</span>
          </button>

          <div class="auth-version">
            POKÉ VICIO ENGINE v0.5.0 — GBA THEME 3PX
          </div>
        </div>
      </div>
    </div>

    <!-- PANEL DE SHOWCASE DE BOTONES UNIFICADOS -->
    <div
      class="pv-panel-wrap has-cast-shadow"
      style="max-width: 820px; width: 100%; margin: 20px auto 0;"
    >
      <div
        class="pv-frame-panel pv-panel-surface"
        style="padding: 20px 24px;"
      >
        <h3 class="showcase-title">
          <span class="emoji">🔘</span> <span>SHOWCASE DE BOTONES PARAMETRIZABLES (7 VARIANTES):</span>
        </h3>

        <div class="sub-label">
          1. Variantes de Color Semánticas:
        </div>
        <div class="pill-cluster mb-16">
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-primary pv-btn-md"
          >
            Primary (Entrar)
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-secondary pv-btn-md"
          >
            Secondary (Opciones)
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-success pv-btn-md"
          >
            Success (Reclamar)
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-danger pv-btn-md"
          >
            Danger (Rendirse)
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-warning pv-btn-md"
          >
            Warning (Alerta)
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-info pv-btn-md"
          >
            Info (Pokédex)
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-ghost pv-btn-md"
          >
            Ghost (Subtle)
          </button>
        </div>

        <div class="sub-label">
          2. Escalas de Tamaño Parametrizables (XS, SM, MD, LG):
        </div>
        <div class="pill-cluster">
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-success pv-btn-xs"
          >
            XS (Chip)
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-success pv-btn-sm"
          >
            SM (Lista / Inventario)
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-success pv-btn-md"
          >
            MD (Modal Estándar)
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-success pv-btn-lg"
          >
            LG (Batalla / Iniciar)
          </button>
          <button
            type="button"
            class="pv-frame-btn pv-btn pv-btn-primary pv-btn-sm"
            disabled
          >
            Disabled State
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.pv-section {
  width: 100%;
}

.server-label {
  font-size: 7px;
  text-align: center;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
  font-family: var(--font-pixel);
  line-height: 1.35;
}

.showcase-title {
  font-size: 11px;
  color: var(--color-text-gold);
  margin-bottom: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  line-height: 1.35;
  font-family: var(--font-pixel);
}

.mb-16 {
  margin-bottom: 16px;
}
</style>
