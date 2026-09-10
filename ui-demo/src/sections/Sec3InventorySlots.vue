<script setup lang="ts">
import { ref } from 'vue'

const selectedSlot = ref(0)

function selectSlot(index: number) {
  selectedSlot.value = index
}
</script>

<template>
  <section class="pv-section">
    <h2 class="section-title">
      <span class="emoji">🎒</span>
      <span>3. Ranuras de Inventario, PC Storage & Movimientos de Batalla</span>
    </h2>

    <div class="pv-panel-wrap has-cast-shadow">
      <div class="pv-frame-panel pv-panel-surface">
        <h4 class="gold-subtitle">
          RANURAS DE MOCHILA (CAVIDADES RETRO EMPOTRADAS CONTINUAS):
        </h4>
        <div class="inventory-shelf mb-18">
          <!-- Poké Ball -->
          <div
            v-gsap-hover="'pill'"
            class="pv-frame-control pv-slot-recessed"
            :class="{ selected: selectedSlot === 0 }"
            @click="selectSlot(0)"
          >
            <svg
              class="slot-item-icon"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle
                cx="8"
                cy="8"
                r="7"
                stroke="#000"
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
                stroke="#000"
                stroke-width="2"
              />
              <circle
                cx="8"
                cy="8"
                r="3"
                fill="#000"
              />
              <circle
                cx="8"
                cy="8"
                r="1.5"
                fill="#f4f4f5"
              />
            </svg>
            <span class="slot-qty-tag">x99</span>
          </div>

          <!-- Super Ball -->
          <div
            v-gsap-hover="'pill'"
            class="pv-frame-control pv-slot-recessed"
            :class="{ selected: selectedSlot === 1 }"
            @click="selectSlot(1)"
          >
            <svg
              class="slot-item-icon"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle
                cx="8"
                cy="8"
                r="7"
                stroke="#000"
                stroke-width="2"
                fill="#3b82f6"
              />
              <rect
                x="4"
                y="2"
                width="8"
                height="2"
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
                stroke="#000"
                stroke-width="2"
              />
              <circle
                cx="8"
                cy="8"
                r="3"
                fill="#000"
              />
              <circle
                cx="8"
                cy="8"
                r="1.5"
                fill="#f4f4f5"
              />
            </svg>
            <span class="slot-qty-tag">x25</span>
          </div>

          <!-- Poción -->
          <div
            v-gsap-hover="'pill'"
            class="pv-frame-control pv-slot-recessed"
            :class="{ selected: selectedSlot === 2 }"
            @click="selectSlot(2)"
          >
            <svg
              class="slot-item-icon"
              viewBox="0 0 16 16"
              fill="none"
            >
              <rect
                x="6"
                y="2"
                width="4"
                height="3"
                fill="#94a3b8"
                stroke="#000"
              />
              <rect
                x="4"
                y="5"
                width="8"
                height="9"
                fill="#a855f7"
                stroke="#000"
                stroke-width="1.5"
              />
              <rect
                x="6"
                y="7"
                width="4"
                height="5"
                fill="#c084fc"
              />
            </svg>
            <span class="slot-qty-tag">x10</span>
          </div>

          <!-- Piedra Fuego -->
          <div
            v-gsap-hover="'pill'"
            class="pv-frame-control pv-slot-recessed"
            :class="{ selected: selectedSlot === 3 }"
            @click="selectSlot(3)"
          >
            <svg
              class="slot-item-icon"
              viewBox="0 0 16 16"
              fill="none"
            >
              <polygon
                points="8,1 15,8 8,15 1,8"
                fill="#f97316"
                stroke="#000"
                stroke-width="1.5"
              />
              <polygon
                points="8,4 12,8 8,12 4,8"
                fill="#fde047"
              />
            </svg>
            <span class="slot-qty-tag">x02</span>
          </div>

          <!-- Slot Vacío -->
          <div
            v-gsap-hover="'pill'"
            class="pv-frame-control pv-slot-recessed slot-empty"
            :class="{ selected: selectedSlot === 4 }"
            @click="selectSlot(4)"
          >
            <span class="plus-icon">+</span>
          </div>
        </div>

        <!-- GRID DE ATAQUES DE COMBATE -->
        <h4 class="gold-subtitle">
          GRID DE 4 MOVIMIENTOS DE BATALLA (SIMETRÍA MATEMÁTICA IZQUIERDA/DERECHA):
        </h4>
        <div class="move-slots-grid">
          <div
            v-gsap-hover="'card'"
            class="pv-frame-control pv-move-slot"
          >
            <div class="move-info">
              <div class="move-name">
                HIDROBOMBA
              </div>
              <span class="pv-type-pill type-water">AGUA</span>
            </div>
            <div class="move-pp">
              PP 05/05
            </div>
          </div>

          <div
            v-gsap-hover="'card'"
            class="pv-frame-control pv-move-slot"
          >
            <div class="move-info">
              <div class="move-name">
                TRUENO
              </div>
              <span class="pv-type-pill type-electric">ELÉCTRICO</span>
            </div>
            <div class="move-pp">
              PP 10/10
            </div>
          </div>

          <div
            v-gsap-hover="'card'"
            class="pv-frame-control pv-move-slot"
          >
            <div class="move-info">
              <div class="move-name">
                LLAMARADA
              </div>
              <span class="pv-type-pill type-fire">FUEGO</span>
            </div>
            <div class="move-pp">
              PP 05/05
            </div>
          </div>

          <div
            v-gsap-hover="'card'"
            class="pv-frame-control pv-move-slot"
          >
            <div class="move-info">
              <div class="move-name">
                DANZA ESPADA
              </div>
              <span class="pv-type-pill type-normal">NORMAL</span>
            </div>
            <div class="move-pp">
              PP 20/20
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

.gold-subtitle {
  font-size: 9px;
  color: var(--color-text-gold);
  margin-bottom: 8px;
  font-family: var(--font-pixel);
  line-height: 1.35;
}

.mb-18 {
  margin-bottom: 18px;
}

.slot-empty {
  opacity: 0.35;

  .plus-icon {
    font-size: 14px;
    color: #475569;
  }
}
</style>
