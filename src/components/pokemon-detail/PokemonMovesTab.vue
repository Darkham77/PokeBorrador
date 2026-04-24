<script setup>
import { useUIStore } from '@/stores/ui'
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'
import PVTooltip from '@/components/common/PVTooltip.vue'

defineProps({
  isInstance: { type: Boolean, default: false },
  currentMoves: { type: Array, default: () => [] },
  moveDetails: { type: Array, required: true }
})

const uiStore = useUIStore()

const hexToRgb = (hex) => {
  if (!hex) return '255, 255, 255'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
</script>

<template>
  <div class="pdex-moves-pane">
    <div
      v-if="isInstance"
      class="current-moves-section"
    >
      <h4 class="section-title">
        MOVIMIENTOS ACTUALES
      </h4>
      <div class="moves-grid-vicio">
        <div
          v-for="m in currentMoves"
          :key="m.name"
          class="move-card-vicio"
          :style="{ 
            '--m-type-color': PDEX_TYPE_COLORS[m.type?.toLowerCase() || 'normal'],
            '--m-type-rgb': hexToRgb(PDEX_TYPE_COLORS[m.type?.toLowerCase() || 'normal']),
            background: `linear-gradient(135deg, rgba(${hexToRgb(PDEX_TYPE_COLORS[m.type?.toLowerCase() || 'normal'])}, 0.1) 0%, rgba(255, 255, 255, 0.02) 100%)`,
            borderColor: `rgba(${hexToRgb(PDEX_TYPE_COLORS[m.type?.toLowerCase() || 'normal'])}, 0.15)`
          }"
          @click="uiStore.openMoveDetail(m.name)"
        >
          <div class="move-top">
            <span class="m-name pixelated">{{ m.name }}</span>
            <span
              class="m-type-tag pixelated"
              :style="{ background: PDEX_TYPE_COLORS[m.type?.toLowerCase() || 'normal'] }"
            >
              {{ (m.type || 'normal').toUpperCase() }}
            </span>
            <div class="m-pp-wrap">
              <span class="m-pp-label pixelated">PP</span>
              <span class="m-pp-val pixelated">{{ m.pp }}/{{ m.maxPP }}</span>
            </div>
          </div>
          
          <div class="move-details-row">
            <div class="detail-item">
              <span class="d-label pixelated">PODER:</span>
              <span class="d-val pixelated">{{ m.power || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="d-label pixelated">PREC:</span>
              <span class="d-val pixelated">{{ m.acc === 1000 ? '∞' : (m.acc || '-') }}</span>
            </div>
            <div class="detail-item">
              <span class="d-label pixelated">CAT:</span>
              <span class="d-val pixelated">{{ (m.cat || 'physical').toUpperCase() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <h4 class="section-title">
      APRENDIZAJE POR NIVEL
    </h4>
    <div class="moves-table-wrapper">
      <table class="moves-table">
        <thead>
          <tr>
            <th>
              <PVTooltip
                title="NIVEL"
                description="Nivel requerido para aprender el movimiento."
                position="bottom"
              >
                <span class="header-label">NV</span>
              </PVTooltip>
            </th>
            <th>
              <PVTooltip
                title="MOVIMIENTO"
                description="Nombre del ataque."
                position="bottom"
              >
                <span class="header-label">ATAQUE</span>
              </PVTooltip>
            </th>
            <th>
              <PVTooltip
                title="TIPO"
                description="Tipo elemental (afecta efectividad y bonificaciones)."
                position="bottom"
              >
                <span class="header-label">TIPO</span>
              </PVTooltip>
            </th>
            <th>
              <PVTooltip
                title="CATEGORÍA"
                description="Categoría del movimiento (Físico, Especial o Estado)."
                position="bottom"
              >
                <span class="header-label">CAT</span>
              </PVTooltip>
            </th>
            <th>
              <PVTooltip
                title="POTENCIA"
                description="Potencia base del ataque (Poder de daño)."
                position="bottom"
              >
                <span class="header-label">POT</span>
              </PVTooltip>
            </th>
            <th>
              <PVTooltip
                title="PRECISIÓN"
                description="Probabilidad de acierto del movimiento."
                position="bottom"
              >
                <span class="header-label">PREC</span>
              </PVTooltip>
            </th>
            <th>
              <PVTooltip
                title="PUNTOS PODER"
                description="Cantidad de usos permitidos."
                position="bottom"
              >
                <span class="header-label">PP</span>
              </PVTooltip>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="m in moveDetails"
            :key="m.name"
            class="clickable-row"
            @click="uiStore.openMoveDetail(m.name)"
          >
            <td class="move-lv pixelated">
              {{ m.level }}
            </td>
            <td class="move-name pixelated">
              {{ m.name }}
            </td>
            <td class="move-type">
              <span
                class="m-type-tag pixelated"
                :style="{ background: PDEX_TYPE_COLORS[m.type.toLowerCase()] }"
              >
                {{ m.type.toUpperCase() }}
              </span>
            </td>
            <td class="move-cat pixelated">
              {{ (m.cat || 'physical').substring(0, 4).toUpperCase() }}
            </td>
            <td class="move-power pixelated">
              {{ m.power }}
            </td>
            <td class="move-acc pixelated">
              {{ m.acc === 1000 ? '∞' : m.acc }}
            </td>
            <td class="move-pp pixelated">
              {{ m.pp }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/pokemon-detail/_vicio-panes.scss";
</style>
