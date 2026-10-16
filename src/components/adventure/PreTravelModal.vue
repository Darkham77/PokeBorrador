<script setup lang="ts">
import { computed } from 'vue';
import type { ShopItemData } from '@/data/inventory/items';
import type { Inventory } from '@/types/inventory/items';
import BaseModal from '@/components/common/BaseModal.vue';
import {
  calculateActiveTravelModifiers,
  type TravelBuffItemId
} from '@/logic/utils/routeSpawnHelpers';

const props = defineProps<{
  show: boolean;
  hasBicycle: boolean;
  filteredBuffItems: Array<ShopItemData & { id: TravelBuffItemId }>;
  selectedTravelItems: Set<TravelBuffItemId>;
  inventory: Inventory;
}>();

const emit = defineEmits<{
  (e: 'toggleItem', itemId: TravelBuffItemId): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const NO_ENCOUNTER_RATE_SENTINEL = -100;

const activeTravelModifiers = computed(() => {
  return calculateActiveTravelModifiers(props.selectedTravelItems);
});

const encounterRateText = computed(() => {
  const mod = activeTravelModifiers.value.encounterRateMod;
  if (mod === NO_ENCOUNTER_RATE_SENTINEL) return 'Ninguno';
  if (mod < 0) return `${mod}%`;
  return 'Estándar';
});

const isEncounterRateReduced = computed(() => activeTravelModifiers.value.encounterRateMod < 0);
const isExpBoosted = computed(() => activeTravelModifiers.value.expMultiplier > 1);
const isMoneyBoosted = computed(() => activeTravelModifiers.value.moneyMultiplier > 1);
const isShinyBoosted = computed(() => activeTravelModifiers.value.shinyChanceMod > 1);
</script>

<template>
  <BaseModal
    :show="show"
    emoji="🚲"
    title="PREPARANDO VIAJE"
    title-color="var(--yellow)"
    max-width="600px"
    variant="retro"
    @close="emit('cancel')"
  >
    <div
      style="
        display: flex;
        flex-direction: column;
        gap: $spacing-md;
        font-family: var(--font-pixel);
      "
    >
      <div style="display: flex; gap: $spacing-md; overflow: hidden; flex: 1">
        <!-- Left Column: Active Buffs Preview -->
        <div
          style="
            display: flex;
            flex-direction: column;
            gap: $spacing-sm;
            padding: 10px;
            border: 2px solid #3c5aa6;
            border-radius: $radius-sm;
            background: rgb(0 0 0 / 30%);
            flex: 1;
          "
        >
          <h4
            class="adv-pixel-text"
            style="
              margin: 0 0 4px;
              color: var(--gold);
              font-size: var(--font-8);
              border-bottom: 1px solid #3c5aa6;
              padding-bottom: 4px;
            "
          >
            Buffs de Ruta Activos
          </h4>
          <div
            style="
              display: flex;
              flex-direction: column;
              gap: $spacing-sm-alt;
              font-size: var(--font-8);
              line-height: 1.4;
            "
          >
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span><span class="emoji">🚲</span> Velocidad:</span>
              <span :style="{ color: hasBicycle ? '#4caf50' : '#888' }">
                {{ hasBicycle ? 'Rápido' : 'Normal' }}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span><span class="emoji">🚫</span> Encuentros:</span>
              <span :style="{ color: isEncounterRateReduced ? '#ff9800' : '#fff' }">
                {{ encounterRateText }}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span><span class="emoji">🧠</span> Exp. Combate:</span>
              <span :style="{ color: isExpBoosted ? '#4caf50' : '#fff' }">
                x{{ activeTravelModifiers.expMultiplier.toFixed(1) }}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span><span class="emoji">💰</span> Recompensas:</span>
              <span :style="{ color: isMoneyBoosted ? '#4caf50' : '#fff' }">
                x{{ activeTravelModifiers.moneyMultiplier.toFixed(1) }}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span><span class="emoji">✨</span> Chance Shiny:</span>
              <span :style="{ color: isShinyBoosted ? '#e91e63' : '#fff' }">
                x{{ activeTravelModifiers.shinyChanceMod.toFixed(1) }}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span><span class="emoji">🔥</span> Tipo Foco:</span>
              <span
                :style="{
                  color: activeTravelModifiers.typeFocus ? '#00bcd4' : '#fff',
                  textTransform: activeTravelModifiers.typeFocus ? 'uppercase' : 'none'
                }"
              >
                {{ activeTravelModifiers.typeFocus ? activeTravelModifiers.typeFocus : 'Ninguno' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Right Column: Selectable Buff Consumibles -->
        <div style="display: flex; flex-direction: column; gap: $spacing-sm-alt; flex: 1.2">
          <h4
            class="adv-pixel-text"
            style="margin: 0; color: var(--gold); font-size: var(--font-8)"
          >
            Seleccionar Consumibles
          </h4>
          <div
            style="
              display: flex;
              flex-direction: column;
              gap: $spacing-xs;
              max-height: 180px;
              overflow-y: auto;
              flex: 1;
              padding-right: 4px;
            "
          >
            <div
              v-for="item in filteredBuffItems"
              id="pre-travel-modal-div-emit"
              :key="item.id"
              class="adv-toggle-control"
              style="
                display: flex;
                align-items: center;
                gap: $spacing-sm;
                margin: 0;
                padding: 4px 8px;
                border-radius: $radius-sm;
                background: rgb(255 255 255 / 5%);
                cursor: pointer;
              "
              role="button"
              tabindex="0"
              @click="emit('toggleItem', item.id)"
            >
              <input
                id="pre-travel-modal-input-1"
                type="checkbox"
                :checked="selectedTravelItems.has(item.id)"
                :aria-label="item.name"
                style="margin: 0; pointer-events: none"
              />
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  width: 100%;
                  font-size: var(--font-8);
                "
              >
                <span
                  ><span class="emoji">{{ item.icon }}</span> {{ item.name }}</span
                >
                <span style="color: var(--gold)">x{{ inventory?.[item.id] || 0 }}</span>
              </div>
            </div>
            <div
              v-if="filteredBuffItems.length === 0"
              style="
                color: var(--slate-400);
                font-size: var(--font-8);
                text-align: center;
                margin-top: 20px;
              "
            >
              No tienes consumibles de buffs en tu mochila. ¡Inyéctalos en el panel lateral para
              probar!
            </div>
          </div>
        </div>
      </div>

      <!-- Buttons -->
      <div
        style="
          display: flex;
          justify-content: flex-end;
          gap: $spacing-sm;
          margin-top: 8px;
          flex-shrink: 0;
        "
      >
        <button
          id="pre-travel-modal-btn-cancelar"
          class="btn-vicio-danger"
          style="min-width: auto; height: auto; padding: 6px 12px; font-size: var(--font-8)"
          @click="emit('cancel')"
        >
          Cancelar
        </button>
        <button
          id="pre-travel-modal-btn-confirmar-y-partir"
          class="btn-vicio-primary"
          style="min-width: auto; height: auto; padding: 6px 12px; font-size: var(--font-8)"
          @click="emit('confirm')"
        >
          Confirmar y Partir <span class="emoji">🚲</span>
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss" src="@/views/adventure/AdventureTestView.styles.scss"></style>
