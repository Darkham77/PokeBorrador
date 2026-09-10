<script setup lang="ts">
import { ref } from 'vue'
import { logToInspector } from '../logic/useLiveInspector.ts'

const activeTab = ref('ENTRENADOR')
const activePill = ref('OBJETOS')
const activeServer = ref('ONLINE')

interface MainTabEntry {
  id: string
  label: string
  badge?: string
}

const mainTabs: readonly MainTabEntry[] = [
  { id: 'ENTRENADOR', label: 'ENTRENADOR' },
  { id: 'POKÉMON', label: 'POKÉMON', badge: '(6)' },
  { id: 'INVENTARIO', label: 'INVENTARIO' },
  { id: 'AJUSTES', label: 'AJUSTES' }
]

const pillTabs = ['TODOS (48)', 'OBJETOS', 'POKÉ BALLS', 'BAYAS', 'MTS & MOS', 'CLAVE'] as const

// WAI-ARIA Tabs Pattern
const waiAriaActiveTab = ref(1)

const waiAriaTabs = [
  { id: 1, label: 'Tab 1: Perfil de Entrenador', icon: '👤' },
  { id: 2, label: 'Tab 2: Configuración', icon: '⚙️' },
  { id: 3, label: 'Tab 3: Notificaciones', icon: '🔔' },
  { id: 4, label: 'Tab 4: Estructura WAI-ARIA', icon: '📜' }
] as const

function selectTab(tab: string) {
  activeTab.value = tab
  logToInspector(`Pestaña seleccionada: "${tab}"`)
}

function selectPill(pill: string) {
  activePill.value = pill
  logToInspector(`Sub-pestaña seleccionada: "${pill}"`)
}

function selectServer(server: string) {
  activeServer.value = server
  logToInspector(`Servidor seleccionado: "${server}"`)
}

function switchWaiTab(tabId: number) {
  waiAriaActiveTab.value = tabId
  const found = waiAriaTabs.find(t => t.id === tabId)
  logToInspector(`WAI-ARIA Tab activada: "${found?.label || tabId}" (role="tab")`)
}

function onTabKeydown(e: KeyboardEvent, currentIdx: number) {
  let targetIdx: number | null = null
  const len = waiAriaTabs.length

  if (e.key === 'ArrowRight') {
    targetIdx = (currentIdx + 1) % len
  } else if (e.key === 'ArrowLeft') {
    targetIdx = (currentIdx - 1 + len) % len
  } else if (e.key === 'Home') {
    targetIdx = 0
  } else if (e.key === 'End') {
    targetIdx = len - 1
  }

  if (targetIdx !== null) {
    e.preventDefault()
    switchWaiTab(waiAriaTabs[targetIdx]!.id)
    const btn = document.getElementById(`wai-tab-btn-${waiAriaTabs[targetIdx]!.id}`)
    btn?.focus()
  }
}
</script>

<template>
  <section class="pv-section">
    <h2 class="section-title">
      <span class="emoji">📑</span>
      <span>1. Pestañas de Navegación, Controles Segmentados & WAI-ARIA Tabs</span>
    </h2>

    <div class="pv-panel-wrap has-cast-shadow">
      <div class="pv-frame-panel pv-panel-surface">
        <!-- TABS PRINCIPALES (NIVEL 2) -->
        <div class="sub-label">
          PESTAÑAS PRINCIPALES (NIVEL 2):
        </div>
        <div class="pv-tab-row">
          <button
            v-for="tab in mainTabs"
            :key="tab.id"
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-control pv-tab-btn"
            :class="{ active: activeTab === tab.id }"
            @click="selectTab(tab.id)"
          >
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.badge"
              class="tab-badge"
            >{{ tab.badge }}</span>
          </button>
        </div>

        <!-- SUB-PESTAÑAS DE CATEGORÍA (PILLS NIVEL 1) -->
        <div class="sub-label gold-label">
          SUB-PESTAÑAS DE CATEGORÍA (PILLS NIVEL 1 - SIMETRÍA MATEMÁTICA):
        </div>
        <div class="pv-pill-tabs">
          <button
            v-for="pill in pillTabs"
            :key="pill"
            v-gsap-hover="'pill'"
            type="button"
            class="pv-frame-pill pv-pill-tab"
            :class="{ active: activePill === pill }"
            @click="selectPill(pill)"
          >
            {{ pill }}
          </button>
        </div>

        <!-- SELECTOR SEGMENTADO DE SERVIDOR -->
        <div class="sub-label">
          SELECTOR SEGMENTADO DE SERVIDOR:
        </div>
        <div
          class="pv-server-row"
          style="max-width: 320px;"
        >
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-control pv-server-btn"
            :class="{ active: activeServer === 'ONLINE' }"
            @click="selectServer('ONLINE')"
          >
            <span class="emoji">🌐</span> <span>ONLINE</span>
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-control pv-server-btn"
            :class="{ active: activeServer === 'LOCAL' }"
            @click="selectServer('LOCAL')"
          >
            <span class="emoji">💾</span> <span>LOCAL</span>
          </button>
        </div>

        <!-- SISTEMA OFICIAL DE TABS WAI-ARIA CON NAVEGACIÓN POR TECLADO -->
        <div
          class="sub-label"
          style="margin-top: 16px;"
        >
          SISTEMA WAI-ARIA OFICIAL (ACCESIBLE CON FLECHAS, HOME Y END):
        </div>
        <div
          class="pv-frame-control"
          style="background: rgba(0, 0, 0, 0.25); padding: 12px; --frame-border: rgba(255, 255, 255, 0.1);"
        >
          <!-- Tablist Header -->
          <div
            role="tablist"
            aria-label="Pestañas de demostración WAI-ARIA"
            style="display: flex; gap: 4px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; margin-bottom: 10px;"
          >
            <button
              v-for="(t, idx) in waiAriaTabs"
              :id="`wai-tab-btn-${t.id}`"
              :key="t.id"
              role="tab"
              :aria-selected="waiAriaActiveTab === t.id"
              :aria-controls="`wai-tab-panel-${t.id}`"
              :tabindex="waiAriaActiveTab === t.id ? 0 : -1"
              class="pv-frame-control"
              :style="{
                padding: '6px 10px',
                fontSize: '7.5px',
                fontFamily: 'var(--font-pixel)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: waiAriaActiveTab === t.id ? 'var(--color-control-focus)' : 'transparent',
                color: waiAriaActiveTab === t.id ? '#ffd60a' : 'var(--color-text-muted)',
                '--frame-border': waiAriaActiveTab === t.id ? '#ffd60a' : 'transparent',
                fontWeight: waiAriaActiveTab === t.id ? 'bold' : 'normal'
              }"
              @click="switchWaiTab(t.id)"
              @keydown="onTabKeydown($event, idx)"
            >
              <span>{{ t.icon }}</span>
              <span>{{ t.label }}</span>
            </button>
          </div>

          <!-- Tab Panels -->
          <div style="min-height: 80px; padding: 4px;">
            <!-- Panel 1 -->
            <div
              v-if="waiAriaActiveTab === 1"
              id="wai-tab-panel-1"
              role="tabpanel"
              aria-labelledby="wai-tab-btn-1"
              tabindex="0"
            >
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <div
                  class="pv-frame-pill"
                  style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #3b82f6; color: #ffffff; font-weight: bold; font-size: 11px;"
                >
                  PK
                </div>
                <div>
                  <div style="font-size: 8.5px; font-weight: bold; color: var(--color-text-main);">
                    Ash Ketchum (Maestro Pokémon)
                  </div>
                  <div style="font-size: 7px; color: var(--color-text-muted);">
                    Pueblo Paleta, Kanto • Sesión Activa WAI-ARIA
                  </div>
                </div>
              </div>
              <p style="font-size: 7px; color: var(--color-text-muted); line-height: 1.4;">
                Este panel demuestra el vínculo entre <code style="color: #ffd60a;">aria-controls</code> y <code style="color: #ffd60a;">aria-labelledby</code>. El tab activo mantiene <code style="color: #ffd60a;">tabindex="0"</code> para recibir foco directo.
              </p>
            </div>

            <!-- Panel 2 -->
            <div
              v-if="waiAriaActiveTab === 2"
              id="wai-tab-panel-2"
              role="tabpanel"
              aria-labelledby="wai-tab-btn-2"
              tabindex="0"
            >
              <div style="font-size: 8px; font-weight: bold; color: var(--color-text-gold, #ffd60a); margin-bottom: 6px;">
                PREFERENCIAS DEL SISTEMA
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px; font-size: 7px; color: var(--color-text-muted);">
                <div>✓ Modo alto contraste activado con contorno negro 360°</div>
                <div>✓ Foco automático en primer elemento del modal</div>
                <div>✓ Animaciones optimizadas con GSAP</div>
              </div>
            </div>

            <!-- Panel 3 -->
            <div
              v-if="waiAriaActiveTab === 3"
              id="wai-tab-panel-3"
              role="tabpanel"
              aria-labelledby="wai-tab-btn-3"
              tabindex="0"
            >
              <div style="font-size: 8px; font-weight: bold; color: #38bdf8; margin-bottom: 6px;">
                CENTRO DE NOTIFICACIONES
              </div>
              <div
                class="pv-frame-control"
                style="padding: 6px 10px; background: rgba(56, 189, 248, 0.1); --frame-border: #38bdf8; font-size: 7px; color: #ffffff;"
              >
                🔔 Tienes 3 formularios pendientes de sincronizar con el backend de batalla.
              </div>
            </div>

            <!-- Panel 4 -->
            <div
              v-if="waiAriaActiveTab === 4"
              id="wai-tab-panel-4"
              role="tabpanel"
              aria-labelledby="wai-tab-btn-4"
              tabindex="0"
            >
              <div style="font-size: 8px; font-weight: bold; color: #c084fc; margin-bottom: 6px;">
                ESTRUCTURA W3C WAI-ARIA
              </div>
              <pre
                class="pv-frame-control"
                style="font-size: 6.5px; color: #c084fc; background: #04070d; padding: 6px; margin: 0; line-height: 1.3;"
              >&lt;div role="tablist" aria-label="..."&gt;
  &lt;button role="tab" aria-selected="true" aria-controls="panel-1" tabindex="0"&gt;Tab 1&lt;/button&gt;
  &lt;button role="tab" aria-selected="false" aria-controls="panel-2" tabindex="-1"&gt;Tab 2&lt;/button&gt;
&lt;/div&gt;</pre>
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

.gold-label {
  color: var(--color-text-gold);
}

.tab-badge {
  font-size: 7px;
  color: var(--color-text-gold);
}
</style>
