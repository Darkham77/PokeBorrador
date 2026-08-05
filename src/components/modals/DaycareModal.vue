<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBreedingStore } from '@/stores/breeding'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import type { Pokemon } from '@/types/pokemon/pokemon'
import BaseModal from '@/components/common/BaseModal.vue'
import DaycareSlot from '@/components/breeding/DaycareSlot.vue'
import BreedingSummary from '@/components/breeding/BreedingSummary.vue'
import EggWarehouse from '@/components/breeding/EggWarehouse.vue'
import IncubatingEggs from '@/components/breeding/IncubatingEggs.vue'
import FossilCloning from '@/components/breeding/FossilCloning.vue'

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const breedingStore = useBreedingStore()
const uiStore = useUIStore()
const modalStore = useModalStore()

const isSmallScreen = computed(() => uiStore.isSmallScreen)

const openPicker = (slotIdx: number) => {
  modalStore.open('PokemonSelection', {
    title: `SELECCIONAR POKÉMON SLOT ${slotIdx + 1}`,
    isDaycareContext: true,
    daycareSlotIdx: slotIdx,
    autoConfirm: true,
    onConfirm: (selected: Pokemon[]) => {
      const first = selected?.[0]
      if (first) {
        breedingStore.deposit(first, slotIdx)
      }
    }
  })
}

const withdraw = (slotIdx: number) => {
  const pokemon = breedingStore.slots[slotIdx]?.pokemon
  if (!pokemon) return

  uiStore.openConfirm({
    title: 'RETIRAR POKÉMON',
    message: `¿Quieres retirar a ${pokemon.name} de la guardería?`,
    onConfirm: () => {
      breedingStore.withdraw(slotIdx)
    }
  })
}

onMounted(() => {
  breedingStore.loadDaycare()
  breedingStore.checkDailyReset()
})
</script>

<template>
  <BaseModal
    id="daycare-modal"
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '850px'"
    :height="isSmallScreen ? '100dvh' : 'auto'"
    title="GUARDERÍA POKÉMON"
    title-color="var(--pokecenter-pink)"
    header-background="linear-gradient(90deg, #1f0b18 0%, #0d030a 100%)"
    variant="retro"
    padding="raw"
    accent-color="var(--pokecenter-pink)"
    @close="emit('close')"
  >
    <div class="daycare-modal-container custom-scrollbar-vicio">
      <div class="daycare-header-hint">
        <span class="hint-icon">🔮</span>
        <p>Deposita dos Pokémon compatibles para conseguir huevos. Revisa su vigor y dales Piedra Eterna o Lazo Destino para heredar cualidades.</p>
      </div>

      <!-- Upper section: Crianza (Slots & Compatibility) -->
      <div class="breeding-section">
        <div class="slots-container">
          <DaycareSlot
            slot-id="a"
            class="daycare-slot-a"
            :pokemon="breedingStore.slots[0]?.pokemon"
            @deposit="openPicker(0)"
            @withdraw="withdraw(0)"
          />
          
          <div class="compat-summary-wrapper">
            <BreedingSummary />
          </div>

          <DaycareSlot
            slot-id="b"
            class="daycare-slot-b"
            :pokemon="breedingStore.slots[1]?.pokemon"
            @deposit="openPicker(1)"
            @withdraw="withdraw(1)"
          />
        </div>
      </div>

      <div class="divider-line" />

      <!-- Incubating section: Backpack Eggs -->
      <div class="incubating-section">
        <IncubatingEggs />
      </div>

      <div class="divider-line" />

      <!-- Lower section: Almacén (Egg Warehouse) -->
      <div class="warehouse-section">
        <EggWarehouse />
      </div>

      <div class="divider-line" />

      <!-- Fossil Cloning Section (Archaeology Warehouse) -->
      <div class="fossil-cloning-section">
        <FossilCloning />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.daycare-modal-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-height: 80dvh;
  overflow-y: auto;
  overflow-x: hidden;
  --daycare-pink: #ff3366;

  @media (max-width: 950px) {
    max-height: calc(100dvh - 64px);
    padding: 16px;
    gap: 16px;
  }
}

.daycare-header-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  background: Rgba(255, 51, 102, 0.06);
  border: 1px solid Rgba(255, 51, 102, 0.2);
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 0 10px Rgba(255, 51, 102, 0.02);
  
  .hint-icon {
    font-size: 18px;
  }
  p {
    margin: 0;
    font-size: 10px;
    color: Rgba(255, 255, 255, 0.75);
    line-height: 1.4;
    @include pixelated;
  }
}

.breeding-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slots-container {
  display: grid;
  grid-template-columns: 1fr 290px 1fr;
  grid-template-areas: "slot-a compat slot-b";
  gap: 12px;
  align-items: stretch;

  .daycare-slot-a {
    grid-area: slot-a;
  }
  
  .daycare-slot-b {
    grid-area: slot-b;
  }
  
  .compat-summary-wrapper {
    grid-area: compat;
  }
  
  @media (max-width: 950px) {
    grid-template-columns: 1fr 1fr;
    grid-template-areas: 
      "slot-a slot-b"
      "compat compat";
    
    .compat-summary-wrapper {
      width: 100%;
    }
  }

  @media (max-width: 550px) {
    grid-template-columns: 1fr;
    grid-template-areas: 
      "slot-a"
      "slot-b"
      "compat";
  }
  
  // Make Slot components flex-1
  & > :deep(.daycare-slot-legacy) {
    flex: 1;
    min-height: unset;
    background: Rgba(20, 10, 15, 0.55);
    border: 2px solid Rgba(255, 51, 102, 0.12);
    box-shadow: inset 0 0 15px Rgba(255, 51, 102, 0.02);
    
    &.empty {
      background: Rgba(0, 0, 0, 0.25);
      border-color: Rgba(255, 51, 102, 0.2);
      &:hover {
        border-color: var(--daycare-pink);
        box-shadow: 0 0 12px Rgba(255, 51, 102, 0.15);
        .plus-icon {
          color: var(--daycare-pink);
        }
      }
    }
  }
}

.compat-summary-wrapper {
  width: 290px;
  z-index: calc(var(--z-map-floor) + 1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: Rgba(255, 51, 102, 0.02);
  border: 1px solid Rgba(255, 51, 102, 0.1);
  border-radius: 16px;
  padding: 12px;
  box-shadow: inset 0 0 20px Rgba(255, 51, 102, 0.03);
  
  @media (max-width: 950px) {
    width: 100%;
  }
}

.divider-line {
  border-top: 1px solid Rgba(255, 51, 102, 0.35);
  width: 100%;
}

.warehouse-section {
  display: flex;
  flex-direction: column;
}
</style>
