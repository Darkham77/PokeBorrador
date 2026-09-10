<script setup lang="ts">
import { ref, watch } from 'vue'
import { gsap } from 'gsap'
import { logToInspector, updateSerializedFormData } from '../logic/useLiveInspector.ts'

// Group A & Controls
const serverSelected = ref('Servidor Oficial Pokémon Vicio 1 (Latam)')
const trainerName = ref('Ash Ketchum')
const passwordVal = ref('SuperSecretPassword123')
const searchVal = ref('Pikachu')

// Group B
const emailVal = ref('entrenador@pokevicio.com')
const telVal = ref('+34 600 123 456')
const urlVal = ref('https://pokevicio.online')
const numQty = ref(25)

const rememberMe = ref(true)
const musicEnabled = ref(true)
const stepperCount = ref(5)

const checkMarkRef = ref<SVGElement | null>(null)
const toggleThumbRef = ref<HTMLElement | null>(null)

watch(rememberMe, (checked) => {
  logToInspector(`Checkbox "Recordar": ${checked ? 'activado' : 'desactivado'}`)
  if (!checkMarkRef.value) return
  if (checked) {
    gsap.to(checkMarkRef.value, { scale: 1, opacity: 1, duration: 0.15, ease: 'back.out(2)' })
  } else {
    gsap.to(checkMarkRef.value, { scale: 0.5, opacity: 0, duration: 0.1 })
  }
})

watch(musicEnabled, (enabled) => {
  logToInspector(`Toggle "Música": ${enabled ? 'ON' : 'OFF'}`)
  if (!toggleThumbRef.value) return
  if (enabled) {
    gsap.to(toggleThumbRef.value, { left: 27, duration: 0.18, ease: 'power2.out' })
  } else {
    gsap.to(toggleThumbRef.value, { left: 3, duration: 0.18, ease: 'power2.out' })
  }
})

function onInputChange(name: string, val: string | number) {
  logToInspector(`Cambio en ${name}: "${val}"`)
  updateSerializedFormData({
    server: serverSelected.value,
    trainerName: trainerName.value,
    password: passwordVal.value ? '••••••••' : '',
    search: searchVal.value,
    email: emailVal.value,
    tel: telVal.value,
    url: urlVal.value,
    qty: numQty.value,
    stepper: stepperCount.value,
    rememberMe: rememberMe.value,
    musicEnabled: musicEnabled.value
  })
}

function step(delta: number) {
  stepperCount.value = Math.max(1, Math.min(99, stepperCount.value + delta))
  onInputChange('stepperCount', stepperCount.value)
}
</script>

<template>
  <section class="pv-section">
    <h2 class="section-title">
      <span class="emoji">📝</span>
      <span>2. Formularios Básicos & Grupos A y B (HTML Living Standard)</span>
    </h2>

    <div class="pv-panel-wrap has-cast-shadow">
      <div class="pv-frame-panel pv-panel-surface">
        <!-- GRUPO A: TEXTO, PASSWORD Y BÚSQUEDA -->
        <fieldset class="pv-frame-control pv-fieldset">
          <legend class="pv-frame-pill pv-legend">
            <span>🔤</span>
            <span>GRUPO A: TEXTO, CREDENCIALES Y BÚSQUEDA</span>
          </legend>

          <div class="input-grid-cols-3">
            <!-- 1. text -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>1. TEXTO ESTÁNDAR</span>
                <span class="type-pill-tag">type="text"</span>
              </div>
              <div class="pv-frame-control pv-input-wrap">
                <input
                  v-model="trainerName"
                  type="text"
                  class="pv-input"
                  placeholder="Nombre de Entrenador..."
                  @input="onInputChange('trainerName', trainerName)"
                >
              </div>
              <span class="field-desc">Entrada de texto plano en una línea.</span>
            </div>

            <!-- 2. password -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>2. CONTRASEÑA</span>
                <span class="type-pill-tag">type="password"</span>
              </div>
              <div class="pv-frame-control pv-input-wrap">
                <input
                  v-model="passwordVal"
                  type="password"
                  class="pv-input"
                  placeholder="Contraseña..."
                  @input="onInputChange('password', '••••••••')"
                >
              </div>
              <span class="field-desc">Caracteres ofuscados nativamente.</span>
            </div>

            <!-- 3. search -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>3. BÚSQUEDA</span>
                <span class="type-pill-tag">type="search"</span>
              </div>
              <div class="pv-frame-control pv-input-wrap">
                <input
                  v-model="searchVal"
                  type="search"
                  class="pv-input"
                  placeholder="Buscar Pokémon..."
                  @input="onInputChange('search', searchVal)"
                >
              </div>
              <span class="field-desc">Búsqueda rápida con borrado nativo.</span>
            </div>
          </div>
        </fieldset>

        <!-- GRUPO B: CONTACTO, VALIDACIÓN Y CANTIDADES -->
        <fieldset class="pv-frame-control pv-fieldset">
          <legend class="pv-frame-pill pv-legend">
            <span>📫</span>
            <span>GRUPO B: CONTACTO, VALIDACIÓN Y NÚMEROS</span>
          </legend>

          <div class="input-grid-cols-4">
            <!-- 4. email -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>4. CORREO</span>
                <span class="type-pill-tag">type="email"</span>
              </div>
              <div class="pv-frame-control pv-input-wrap">
                <input
                  v-model="emailVal"
                  type="email"
                  class="pv-input"
                  placeholder="usuario@dominio.com"
                  @input="onInputChange('email', emailVal)"
                >
              </div>
              <span class="field-desc">Validación estándar RFC.</span>
            </div>

            <!-- 5. tel -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>5. TELÉFONO</span>
                <span class="type-pill-tag">type="tel"</span>
              </div>
              <div class="pv-frame-control pv-input-wrap">
                <input
                  v-model="telVal"
                  type="tel"
                  class="pv-input"
                  placeholder="+54 9 11..."
                  @input="onInputChange('tel', telVal)"
                >
              </div>
              <span class="field-desc">Dispara teclado numérico móvil.</span>
            </div>

            <!-- 6. url -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>6. URL WEB</span>
                <span class="type-pill-tag">type="url"</span>
              </div>
              <div class="pv-frame-control pv-input-wrap">
                <input
                  v-model="urlVal"
                  type="url"
                  class="pv-input"
                  placeholder="https://..."
                  @input="onInputChange('url', urlVal)"
                >
              </div>
              <span class="field-desc">Exige protocolo formal http/https.</span>
            </div>

            <!-- 7. number -->
            <div class="pv-input-field-block">
              <div class="field-top-label">
                <span>7. NÚMERO</span>
                <span class="type-pill-tag">type="number"</span>
              </div>
              <div class="pv-frame-control pv-input-wrap">
                <input
                  v-model.number="numQty"
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  class="pv-input"
                  @input="onInputChange('numQty', numQty)"
                >
              </div>
              <span class="field-desc">Soporta min (0), max (100) y step (5).</span>
            </div>
          </div>
        </fieldset>

        <!-- CONTROLES RETRO EXTRAS: SELECTOR, CHECKBOX, TOGGLE, STEPPER -->
        <div
          class="grid-2"
          style="margin-top: 10px;"
        >
          <div>
            <div class="sub-label">
              SELECTOR DE SERVIDOR (SELECT):
            </div>
            <div class="pv-frame-control pv-input-wrap">
              <select
                v-model="serverSelected"
                class="pv-input pv-select"
                @change="onInputChange('server', serverSelected)"
              >
                <option>Servidor Oficial Pokémon Vicio 1 (Latam)</option>
                <option>Servidor Oficial Pokémon Vicio 2 (Europa)</option>
                <option>Servidor Local (127.0.0.1:5432)</option>
              </select>
            </div>

            <div class="sub-label">
              CANTIDAD / STEPPER NUMÉRICO:
            </div>
            <div class="pv-frame-control pv-stepper-wrap">
              <button
                v-gsap-hover="'button'"
                type="button"
                class="pv-stepper-btn"
                aria-label="Disminuir"
                @click="step(-1)"
              >
                -
              </button>
              <div class="pv-stepper-value">
                {{ String(stepperCount).padStart(2, '0') }}
              </div>
              <button
                v-gsap-hover="'button'"
                type="button"
                class="pv-stepper-btn"
                aria-label="Aumentar"
                @click="step(1)"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <div class="sub-label">
              CHECKBOX RETRO:
            </div>
            <div>
              <label class="pv-checkbox-row">
                <input
                  v-model="rememberMe"
                  type="checkbox"
                >
                <div class="pv-frame-pill pv-pixel-checkbox">
                  <svg
                    ref="checkMarkRef"
                    class="pv-checkbox-mark"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="#ffffff"
                      stroke-width="2"
                      stroke-linecap="square"
                    />
                  </svg>
                </div>
                <span>Recordar mi cuenta en este dispositivo</span>
              </label>
            </div>

            <div class="sub-label">
              INTERRUPTOR TOGGLE (ON/OFF - CÁPSULA 100% CERRADA):
            </div>
            <div>
              <label class="pv-toggle-row">
                <input
                  v-model="musicEnabled"
                  type="checkbox"
                >
                <div class="pv-frame-pill pv-toggle-track">
                  <div
                    ref="toggleThumbRef"
                    class="pv-frame-pill pv-toggle-thumb"
                    :style="{ left: musicEnabled ? '27px' : '3px' }"
                  />
                </div>
                <span
                  class="toggle-status-text"
                  :class="{ active: musicEnabled }"
                >
                  {{ musicEnabled ? 'MÚSICA ACTIVADA' : 'MÚSICA DESACTIVADA' }}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.pv-section {
  width: 100%;
}

.toggle-status-text {
  font-size: 8.5px;
  font-weight: bold;
  color: var(--color-text-muted);

  &.active {
    color: #4ade80;
  }
}
</style>
