<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { gsap } from 'gsap'
import { logToInspector } from '../logic/useLiveInspector.ts'

const arrowRef = ref<HTMLElement | null>(null)
const nativeDialogRef = ref<HTMLDialogElement | null>(null)
const isDrawerOpen = ref(false)

onMounted(() => {
  if (arrowRef.value) {
    gsap.to(arrowRef.value, {
      y: 3,
      duration: 0.6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    })
  }
})

function openNativeDialog() {
  if (nativeDialogRef.value) {
    nativeDialogRef.value.showModal()
    logToInspector('dialog.showModal(): Ventana modal nativa abierta')
  }
}

function closeNativeDialog(action: string) {
  if (nativeDialogRef.value) {
    nativeDialogRef.value.close()
    logToInspector(`dialog.close(): Modal cerrado (${action})`)
  }
}

function openDrawer() {
  isDrawerOpen.value = true
  logToInspector('Panel lateral <aside> (Slide-Over Drawer) abierto')
}

function closeDrawer() {
  isDrawerOpen.value = false
  logToInspector('Panel lateral <aside> cerrado')
}

function onAccordionToggle(panelNum: number, event: Event) {
  const details = event.target as HTMLDetailsElement
  const chevron = details.querySelector('.accordion-chevron')
  if (chevron) {
    gsap.to(chevron, {
      rotation: details.open ? 180 : 0,
      duration: 0.25,
      ease: 'power2.out'
    })
  }
  if (details.open) {
    logToInspector(`<details name="faq-group">: Panel ${panelNum} abierto (acordeón exclusivo)`)
  }
}
</script>

<template>
  <section class="pv-section">
    <h2 class="section-title">
      <span class="emoji">💬</span>
      <span>5. Diálogos, Paneles, Modales & Acordeón Nativo (HTML Living Standard)</span>
    </h2>

    <div class="grid-2">
      <!-- Cuadro de Diálogo Retro -->
      <div class="pv-frame-panel pv-dialog-box">
        <div class="pv-frame-pill dialog-speaker">
          PROFESOR OAK
        </div>
        <div class="dialog-text">
          "¡Hola, entrenador! El mundo de los Pokémon está repleto de misterios. ¡Prepárate para forjar tu propia leyenda!"
        </div>
        <div
          ref="arrowRef"
          class="dialog-arrow"
        >
          ▼
        </div>
      </div>

      <!-- Ventana Modal Preview -->
      <div class="pv-frame-panel pv-window-frame">
        <div class="pv-window-header">
          <div class="pv-window-title">
            <span class="emoji">🏆</span> <span>FICHA DE ENTRENADOR</span>
          </div>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-pill pv-window-close"
            title="Cerrar Ficha"
          >
            ✕
          </button>
        </div>
        <div class="pv-window-body">
          <div class="data-rows-col">
            <div
              class="pv-data-row"
              style="border-left-color: #3b82f6;"
            >
              <span class="data-key">ENTRENADOR:</span>
              <span class="data-val">SATOSHI</span>
            </div>
            <div
              class="pv-data-row"
              style="border-left-color: var(--color-text-gold);"
            >
              <span class="data-key">DINERO:</span>
              <span class="data-val gold-val">₽999,999</span>
            </div>
            <div
              class="pv-data-row"
              style="border-left-color: #22c55e;"
            >
              <span class="data-key">POKÉDEX KANTO:</span>
              <span class="data-val">151 / 151</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PANELES NATIVOS: ACORDEÓN DETAILS Y TRIGGERS DE DIALOG / POPOVER / DRAWER -->
    <div
      class="grid-2"
      style="margin-top: 14px;"
    >
      <!-- Acordeón Nativo <details> con name="faq-group" -->
      <div class="pv-frame-panel pv-panel-surface">
        <div class="sub-label">
          <span>ACORDEÓN NATIVO &lt;details&gt; (CON NAME EXCLUSIVO):</span>
        </div>
        <div class="pv-details-accordion">
          <details
            name="faq-group"
            open
            class="pv-frame-control pv-accordion-item"
            @toggle="onAccordionToggle(1, $event)"
          >
            <summary class="pv-accordion-summary">
              <span class="summary-title-group">
                <span style="color: #22c55e;">●</span>
                <span>Panel 1: ¿Cómo funciona sin Javascript?</span>
              </span>
              <span class="accordion-chevron">▼</span>
            </summary>
            <div class="accordion-content">
              El navegador gestiona el estado abierto/cerrado internamente mediante el atributo booleano <code style="color: #ffd60a;">open</code>. Es 100% accesible por teclado.
            </div>
          </details>

          <details
            name="faq-group"
            class="pv-frame-control pv-accordion-item"
            @toggle="onAccordionToggle(2, $event)"
          >
            <summary class="pv-accordion-summary">
              <span class="summary-title-group">
                <span style="color: #3b82f6;">●</span>
                <span>Panel 2: Atributo `name` exclusivo</span>
              </span>
              <span class="accordion-chevron">▼</span>
            </summary>
            <div class="accordion-content">
              Al compartir <code style="color: #ffd60a;">name="faq-group"</code>, abrir un panel cierra automáticamente los demás de forma nativa en Chromium, Firefox y Safari.
            </div>
          </details>

          <details
            name="faq-group"
            class="pv-frame-control pv-accordion-item"
            @toggle="onAccordionToggle(3, $event)"
          >
            <summary class="pv-accordion-summary">
              <span class="summary-title-group">
                <span style="color: #a855f7;">●</span>
                <span>Panel 3: Personalización Pixel-Art</span>
              </span>
              <span class="accordion-chevron">▼</span>
            </summary>
            <div class="accordion-content">
              Ocultamos la flecha nativa con <code style="color: #ffd60a;">summary::-webkit-details-marker { display:none }</code> e integramos marcos Bresenham.
            </div>
          </details>
        </div>
      </div>

      <!-- Diálogos y Popover Nativo -->
      <div class="pv-frame-panel pv-panel-surface">
        <div class="sub-label">
          <span>SUPERPOSICIONES NATIVAS (&lt;dialog&gt;, POPOVER & &lt;aside&gt;):</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <!-- Trigger Dialog -->
          <button
            id="btn-open-native-dialog"
            v-gsap-hover="'button'"
            type="button"
            class="pv-curve-xs pv-btn pv-btn-primary"
            style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; font-size: 7.5px;"
            @click="openNativeDialog"
          >
            <span>🪟 ABRIR MODAL NATIVO &lt;dialog&gt;</span>
            <span style="color: #ffd60a;">dialog.showModal()</span>
          </button>

          <!-- Trigger Popover -->
          <button
            id="btn-open-native-popover"
            v-gsap-hover="'button'"
            type="button"
            popovertarget="demo-native-popover"
            class="pv-curve-xs pv-btn pv-btn-secondary"
            style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; font-size: 7.5px;"
          >
            <span>💬 ABRIR POPOVER NATIVO (API HTML5)</span>
            <span style="color: #22c55e;">popovertarget="id"</span>
          </button>

          <!-- Trigger Drawer Lateral -->
          <button
            id="btn-open-slide-drawer"
            v-gsap-hover="'button'"
            type="button"
            class="pv-curve-xs pv-btn"
            style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; font-size: 7.5px; background: rgba(168, 85, 247, 0.2); --frame-border: #a855f7; color: #ffffff;"
            @click="openDrawer"
          >
            <span>📑 MOSTRAR PANEL LATERAL (&lt;aside&gt; DRAWER)</span>
            <span style="color: #c084fc;">Slide-Over</span>
          </button>
        </div>
      </div>
    </div>

    <!-- DIALOG MODAL NATIVO HTML5 -->
    <dialog
      id="native-modal-dialog"
      ref="nativeDialogRef"
      class="pv-frame-panel"
      style="max-width: 440px; width: 90%; background: #121829; --frame-border: #ffd60a; padding: 16px; font-family: var(--font-pixel); color: var(--color-text-main); margin: auto; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9);"
    >
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px; margin-bottom: 10px;">
        <span style="font-size: 9px; font-weight: 900; color: #ffd60a;">VENTANA &lt;dialog&gt; NATIVA</span>
        <button
          type="button"
          class="pv-frame-pill"
          style="width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.1); color: #ffffff; cursor: pointer;"
          @click="closeNativeDialog('cancelado')"
        >
          ✕
        </button>
      </div>
      <p style="font-size: 7.5px; line-height: 1.4; color: var(--color-text-muted); margin-bottom: 12px;">
        Este modal nativo utiliza <code style="color: #ffd60a;">dialog.showModal()</code> con trampa de foco, backdrop configurable y tecla Escape nativa.
      </p>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button
          type="button"
          class="pv-curve-xs pv-btn pv-btn-secondary"
          style="font-size: 7.5px; padding: 6px 12px;"
          @click="closeNativeDialog('cerrado')"
        >
          CERRAR
        </button>
        <button
          type="button"
          class="pv-curve-xs pv-btn pv-btn-primary"
          style="font-size: 7.5px; padding: 6px 12px;"
          @click="closeNativeDialog('confirmado')"
        >
          CONFIRMAR
        </button>
      </div>
    </dialog>

    <!-- POPOVER NATIVO HTML5 -->
    <div
      id="demo-native-popover"
      popover
      class="pv-frame-panel"
      style="max-width: 320px; background: #121829; --frame-border: #22c55e; padding: 14px; font-family: var(--font-pixel); color: var(--color-text-main); margin: auto; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);"
    >
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 8.5px; font-weight: 900; color: #22c55e;">POPOVER API OFICIAL</span>
        <button
          popovertarget="demo-native-popover"
          popovertargetaction="hide"
          class="pv-frame-pill"
          style="cursor: pointer; background: rgba(255, 255, 255, 0.1); color: #ffffff; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 8px;"
        >
          ✕
        </button>
      </div>
      <p style="font-size: 7px; color: var(--color-text-muted); line-height: 1.4; margin-bottom: 10px;">
        Declarado simplemente con el atributo <code style="color: #4ade80;">popover</code>. Se ubica en el Top Layer del navegador sin z-index hacks y se auto-cierra con "light dismiss".
      </p>
      <button
        popovertarget="demo-native-popover"
        popovertargetaction="hide"
        class="pv-curve-xs pv-btn pv-btn-success"
        style="width: 100%; font-size: 7.5px; padding: 6px;"
      >
        ENTENDIDO
      </button>
    </div>

    <!-- DRAWER LATERAL SLIDE-OVER CON <aside> -->
    <Teleport to="body">
      <div
        v-if="isDrawerOpen"
        class="pv-slide-drawer-backdrop"
        @click="closeDrawer"
      />
      <aside
        v-if="isDrawerOpen"
        class="pv-frame-panel pv-slide-drawer-aside"
      >
        <div class="drawer-header">
          <div class="drawer-title">
            <span>📑</span> <span>PANEL LATERAL (&lt;aside&gt;)</span>
          </div>
          <button
            type="button"
            class="pv-frame-pill"
            style="width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.1); color: #ffffff; cursor: pointer;"
            @click="closeDrawer"
          >
            ✕
          </button>
        </div>
        <div class="drawer-body">
          <p style="margin-bottom: 12px;">
            El elemento semántico <code style="color: #ffd60a;">&lt;aside&gt;</code> representa contenido secundario tangencial, ideal para barras laterales de herramientas, configuraciones o navegación rápida.
          </p>
          <div
            class="pv-frame-control"
            style="padding: 8px; background: rgba(0, 0, 0, 0.3); --frame-border: rgba(255, 255, 255, 0.1);"
          >
            <div style="font-size: 7px; color: #ffd60a; font-weight: bold; margin-bottom: 4px;">
              ATAJOS RÁPIDOS
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <button
                type="button"
                class="pv-btn pv-btn-secondary pv-btn-sm"
                style="font-size: 6.5px; text-align: left; justify-content: flex-start;"
                @click="closeDrawer"
              >
                • Volver al catálogo principal
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          class="pv-curve-xs pv-btn pv-btn-primary"
          style="width: 100%; font-size: 7.5px; padding: 8px; margin-top: 12px;"
          @click="closeDrawer"
        >
          CERRAR PANEL
        </button>
      </aside>
    </Teleport>
  </section>
</template>

<style scoped lang="scss">
.pv-section {
  width: 100%;
}

.data-rows-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.data-key {
  color: var(--color-text-muted);
}

.data-val {
  color: var(--color-text-main);
  font-weight: bold;

  &.gold-val {
    color: var(--color-text-gold);
  }
}
</style>
