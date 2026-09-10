<script setup lang="ts">
// Sec4ActionButtons.vue
</script>

<template>
  <section class="pv-section">
    <h2 class="section-title">
      <span class="emoji">🔘</span>
      <span>4. Botones Parametrizables (7 Variantes, 4 Escalas & Icon Buttons)</span>
    </h2>

    <div class="pv-panel-wrap has-cast-shadow">
      <div class="pv-frame-panel pv-panel-surface">
        <div class="sub-label">
          VARIANTES DE COLOR SEMÁNTICAS (CON CONTORNO OSCURO 360°):
        </div>
        <div class="pill-cluster mb-16">
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-primary pv-btn-md"
          >
            PRIMARY
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-secondary pv-btn-md"
          >
            SECONDARY
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-success pv-btn-md"
          >
            SUCCESS
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-danger pv-btn-md"
          >
            DANGER
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-warning pv-btn-md"
          >
            WARNING
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-info pv-btn-md"
          >
            INFO
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-ghost pv-btn-md"
          >
            GHOST
          </button>
        </div>

        <div class="sub-label">
          ESCALAS XS, SM, MD, LG & BOTÓN DESHABILITADO:
        </div>
        <div class="pill-cluster mb-16">
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-success pv-btn-xs"
          >
            XS CHIP
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-success pv-btn-sm"
          >
            SM INVENTARIO
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-success pv-btn-md"
          >
            MD ESTÁNDAR
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-success pv-btn-lg"
          >
            LG INICIAR BATALLA
          </button>
          <button
            type="button"
            class="pv-frame-btn pv-btn pv-btn-primary pv-btn-md"
            disabled
          >
            DESHABILITADO
          </button>
        </div>

        <div class="sub-label">
          BOTONES DE ICONO CUADRADOS RETRO (HUD & MODALES):
        </div>
        <div class="pill-cluster">
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-secondary pv-icon-btn"
            title="Mochila"
          >
            <span class="emoji">🎒</span>
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-secondary pv-icon-btn"
            title="Equipo Pokémon"
          >
            <span class="emoji">🐾</span>
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-secondary pv-icon-btn"
            title="Guardar Partida"
          >
            <span class="emoji">💾</span>
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-secondary pv-icon-btn"
            title="Ajustes"
          >
            <span class="emoji">⚙️</span>
          </button>
          <button
            v-gsap-hover="'button'"
            type="button"
            class="pv-frame-btn pv-btn pv-btn-danger pv-icon-btn"
            title="Cerrar"
          >
            <svg
              viewBox="0 0 12 12"
              width="12"
              height="12"
              aria-hidden="true"
            >
              <line
                x1="2"
                y1="2"
                x2="10"
                y2="10"
                stroke="#ffffff"
                stroke-width="2"
                stroke-linecap="square"
              />
              <line
                x1="10"
                y1="2"
                x2="2"
                y2="10"
                stroke="#ffffff"
                stroke-width="2"
                stroke-linecap="square"
              />
            </svg>
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

.mb-16 {
  margin-bottom: 16px;
}
</style>
