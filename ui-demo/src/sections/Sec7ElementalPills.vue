<script setup lang="ts">
const elementalTypes = [
  { id: 'fire', label: 'FUEGO' },
  { id: 'water', label: 'AGUA' },
  { id: 'grass', label: 'PLANTA' },
  { id: 'electric', label: 'ELÉCTRICO' },
  { id: 'psychic', label: 'PSÍQUICO' },
  { id: 'ice', label: 'HIELO' },
  { id: 'dragon', label: 'DRAGÓN' },
  { id: 'dark', label: 'SINIESTRO' },
  { id: 'fairy', label: 'HADA' },
  { id: 'normal', label: 'NORMAL' },
  { id: 'fighting', label: 'LUCHA' },
  { id: 'flying', label: 'VOLADOR' },
  { id: 'poison', label: 'VENENO' },
  { id: 'ground', label: 'TIERRA' },
  { id: 'rock', label: 'ROCA' },
  { id: 'bug', label: 'BICHO' },
  { id: 'ghost', label: 'FANTASMA' },
  { id: 'steel', label: 'ACERO' }
] as const

const statuses = [
  { id: 'par', label: 'PAR' },
  { id: 'psn', label: 'PSN' },
  { id: 'brn', label: 'BRN' },
  { id: 'frz', label: 'FRZ' },
  { id: 'slp', label: 'SLP' }
] as const
</script>

<template>
  <section class="pv-section">
    <h2 class="section-title">
      <span class="emoji">🏷️</span>
      <span>7. Pills de Tipos Elementales, Estados Alterados & Géneros</span>
    </h2>

    <div class="pv-panel-wrap has-cast-shadow">
      <div class="pv-frame-panel pv-panel-surface">
        <div class="sub-label">
          LOS 18 TIPOS ELEMENTALES (MICRO-BISEL PIXELADO NIVEL 1):
        </div>
        <div class="pill-cluster mb-16">
          <span
            v-for="t in elementalTypes"
            :key="t.id"
            v-gsap-hover="'pill'"
            class="pv-type-pill"
            :class="`type-${t.id}`"
          >
            {{ t.label }}
          </span>
        </div>

        <div class="sub-label">
          ESTADOS ALTERADOS & GLIFOS DE GÉNERO CENTRADOS:
        </div>
        <div class="pill-cluster">
          <span
            v-for="st in statuses"
            :key="st.id"
            v-gsap-hover="'pill'"
            class="pv-status-badge"
            :class="`status-${st.id}`"
          >
            {{ st.label }}
          </span>
          <span class="pv-gender-tag">
            <span>Macho:</span><span class="emoji gender-male">♂</span>
          </span>
          <span class="pv-gender-tag">
            <span>Hembra:</span><span class="emoji gender-female">♀</span>
          </span>
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
