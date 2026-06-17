<script setup lang="ts">
import { ref } from 'vue'
import { useWindowListener } from '@/composables/ui/useWindowListener'
import PVTooltip from '@/components/common/PVTooltip.vue'
import MoveTooltip from '@/components/battle/MoveTooltip.vue'
import BattleMovesGrid from '@/components/battle/BattleMovesGrid.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'

import type { Move } from '@/types/pokemon/pokemon'

interface MoveDetail extends Move {
  level?: number
}

interface Props {
  isInstance?: boolean
  currentMoves?: (Move | null)[]
  moveDetails: MoveDetail[]
  canReorder?: boolean
}

withDefaults(defineProps<Props>(), {
  isInstance: false,
  currentMoves: () => [],
  canReorder: true
})

const emit = defineEmits<{
  (e: 'reorder-moves', fromIndex: number, toIndex: number): void
}>()

const isSmallScreen = ref(typeof window !== 'undefined' ? window.innerWidth <= 600 : false)
const handleResize = () => {
  isSmallScreen.value = window.innerWidth <= 600
}
useWindowListener('resize', handleResize)

function handleReorder(fromIndex: number, toIndex: number) {
  emit('reorder-moves', fromIndex, toIndex)
}
</script>

<template>
  <div class="pdex-moves-pane">
    <div
      v-if="isInstance"
      class="current-moves-section"
    >
      <h4 class="vp-section-title">
        MOVIMIENTOS ACTUALES
      </h4>
      
      <BattleMovesGrid 
        :moves="currentMoves"
        :can-reorder="canReorder"
        @reorder-moves="handleReorder"
      />
    </div>

    <h4 class="vp-section-title">
      APRENDIZAJE POR NIVEL
    </h4>
    <div class="table-responsive-wrapper">
      <div class="vp-moves-list-grid">
        <!-- Header -->
        <div class="grid-header">
          <div class="h-col">
            NV
          </div>
          <div class="h-col">
            ATAQUE
          </div>
          <div class="h-col">
            TIPO
          </div>
          <div class="h-col">
            CAT
          </div>
          <div class="h-col">
            POT
          </div>
          <div class="h-col">
            PREC
          </div>
          <div class="h-col">
            PP
          </div>
        </div>

        <!-- Rows -->
        <div class="grid-body">
          <PVTooltip 
            v-for="m in moveDetails" 
            :key="m.name"
            tag="div"
            class="grid-row"
            position="top"
            :delay="150"
          >
            <template #content>
              <MoveTooltip :move="m" />
            </template>

            <div class="grid-cell vp-move-lv pixelated">
              {{ m.level }}
            </div>
            <div class="grid-cell vp-move-name pixelated">
              {{ m.name }}
            </div>
            <div class="grid-cell move-type">
              <PokemonTypeTag
                :type="m.type || 'normal'"
                :size="isSmallScreen ? 'ssm' : 'sm'"
              />
            </div>
            <div class="grid-cell move-cat pixelated">
              {{ (m.cat === 'physical' ? '⚔️ FÍSICO' : m.cat === 'special' ? '✨ ESPECIAL' : '🔮 ESTADO') }}
            </div>
            <div class="grid-cell move-power pixelated">
              {{ m.power }}
            </div>
            <div class="grid-cell move-acc pixelated">
              <span
                v-if="m.acc === 1000"
                class="infinity-emoji"
              >♾️</span>
              <template v-else>
                {{ m.acc }}
              </template>
            </div>
            <div class="grid-cell move-pp pixelated">
              {{ m.pp }}
            </div>
          </PVTooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/pokemon-detail/_vicio-panes.scss";

:deep(.pv-tooltip-wrapper) {
  width: 100%;
  display: block;
}
</style>
