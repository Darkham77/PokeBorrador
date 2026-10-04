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
        <span class="emoji hint-icon">🔮</span>
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
  --daycare-pink: #f36;

  display: flex;
  flex-direction: column;
  gap: 24px;
  max-height: 80dvh;
  padding: 24px;
  overflow: hidden auto;

  @media (width <= 950px) {
    gap: 16px;
    max-height: calc(100dvh - 64px);
    padding: 16px;
  }
}

.daycare-header-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid rgb(255 51 102 / 20%);
  border-radius: 12px;
  background: rgb(255 51 102 / 6%);
  box-shadow: 0 0 10px rgb(255 51 102 / 2%);
  
  .hint-icon {
    font-size: 18px;
  }
  p {
    @include pixelated;

    margin: 0;
    color: rgb(255 255 255 / 75%);
    font-size: 10px;
    line-height: 1.4;
  }
}

.breeding-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slots-container {
  display: grid;
  align-items: stretch;
  gap: 12px;
  grid-template-columns: 1fr 290px 1fr;
  grid-template-areas: "slot-a compat slot-b";

  .daycare-slot-a {
    grid-area: slot-a;
  }
  
  .daycare-slot-b {
    grid-area: slot-b;
  }
  
  .compat-summary-wrapper {
    grid-area: compat;
  }
  
  @media (width <= 950px) {
    grid-template-columns: 1fr 1fr;
    grid-template-areas: 
      "slot-a slot-b"
      "compat compat";
    
    .compat-summary-wrapper {
      width: 100%;
    }
  }

  @media (width <= 550px) {
    grid-template-columns: 1fr;
    grid-template-areas: 
      "slot-a"
      "slot-b"
      "compat";
  }
  
  // Make Slot components flex-1
  & > :deep(.daycare-slot-legacy) {
    min-height: unset;
    border: 2px solid rgb(255 51 102 / 12%);
    background: rgb(20 10 15 / 55%);
    flex: 1;
    box-shadow: inset 0 0 15px rgb(255 51 102 / 2%);
    
    &.empty {
      background: rgb(0 0 0 / 25%);
      border-color: rgb(255 51 102 / 20%);
      &:hover {
        border-color: var(--daycare-pink);
        box-shadow: 0 0 12px rgb(255 51 102 / 15%);
        .plus-icon {
          color: var(--daycare-pink);
        }
      }
    }
  }
}

.compat-summary-wrapper {
  z-index: calc(var(--z-map-floor) + 1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 290px;
  padding: 12px;
  border: 1px solid rgb(255 51 102 / 10%);
  border-radius: 16px;
  background: rgb(255 51 102 / 2%);
  box-shadow: inset 0 0 20px rgb(255 51 102 / 3%);
  
  @media (width <= 950px) {
    width: 100%;
  }
}

.divider-line {
  width: 100%;
  border-top: 1px solid rgb(255 51 102 / 35%);
}

.warehouse-section {
  display: flex;
  flex-direction: column;
}
</style>
