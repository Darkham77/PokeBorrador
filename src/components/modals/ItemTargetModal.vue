<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getStatusIcon } from '@/logic/battle/battleStatus'
import BaseModal from '@/components/common/BaseModal.vue'

const gameStore = useGameStore()
const invStore = useInventoryStore()
const uiStore = useUIStore()

const isOpen = computed({
  get: () => invStore.isItemTargetModalOpen,
  set: (val) => { invStore.isItemTargetModalOpen = val }
})
const itemName = computed(() => invStore.activeItemToUse)
const team = computed(() => gameStore.state.team || [])

const close = () => {
  isOpen.value = false
}

const handleSelect = async (index) => {
  const result = invStore.useItem(itemName.value, 'team', index)
  if (result.success) {
    uiStore.notify(`¡${result.msg}!`, '✨')
    close()
  } else {
    uiStore.notify(result.msg, '⚠️')
  }
}

const getHpColor = (p) => {
  const pct = (p.hp / p.maxHp) * 100
  if (pct > 50) return 'Rgba(34, 197, 94, 1)'
  if (pct > 20) return 'Rgba(250, 204, 21, 1)'
  return 'Rgba(239, 68, 68, 1)'
}
</script>

<template>
  <BaseModal
    :show="isOpen"
    :title="`USAR ${itemName?.toUpperCase() || 'ÍTEM'}`"
    max-width="400px"
    @close="close"
  >
    <div class="item-target-inner">
      <p class="target-help-text">
        ¿Sobre qué Pokémon actuar?
      </p>

      <div class="team-list">
        <div 
          v-for="(p, index) in team" 
          :key="p.uid || index"
          class="target-row"
          @click.stop="handleSelect(index)"
        >
          <div class="poke-sprite">
            <img
              :src="getAssetUrl(ASSET_TYPES.POKEMON, p.id, { shiny: p.isShiny })"
              :alt="p.name"
              @error="e => e.target.style.display = 'none'"
            >
          </div>
          
          <div class="poke-info">
            <div class="name-line">
              <span class="p-name">{{ p.name }}</span>
              <span class="p-lv">Nv.{{ p.level }}</span>
              <span
                v-if="p.status"
                class="status-badge"
              >{{ getStatusIcon(p.status) }}</span>
            </div>
            
            <div class="hp-bar-container">
              <div 
                class="hp-bar-fill" 
                :style="{ 
                  width: (p.hp / p.maxHp * 100) + '%',
                  backgroundColor: getHpColor(p)
                }"
              />
            </div>
            
            <div class="hp-text">
              {{ p.hp }} / {{ p.maxHp }} HP
            </div>
          </div>

          <div class="select-hint">
            ELEGIR
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        class="cancel-btn-primary"
        @click.stop="close"
      >
        CANCELAR
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.item-target-inner {
  padding: 8px 0;
}

.target-help-text {
  font-size: 11px;
  color: Rgba(255, 255, 255, 0.5);
  margin-bottom: 20px;
  text-align: center;
}

.team-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  min-height: 0;
  padding: 4px;
}

.target-row {
  display: flex;
  align-items: center;
  gap: 16px;
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  &:hover {
    background: Rgba(255, 215, 0, 0.08);
    border-color: Rgba(255, 215, 0, 0.3);
    box-shadow: 0 0 0 1px Rgba(255, 215, 0, 0.3);
    transform: translateX(4px);
    .select-hint { opacity: 1; }
  }

  .poke-sprite img {
    width: 48px;
    height: 48px;
    image-rendering: pixelated;
  }

  .poke-info {
    flex: 1;
  }

  .name-line {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    .p-name { font-weight: 700; font-size: 14px; color: var(--white); }
    .p-lv { font-size: 10px; color: var(--gray); @include pixelated; }
  }

  .hp-bar-container {
    height: 6px;
    background: Rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 4px;
    border: 1px solid Rgba(255, 255, 255, 0.05);
  }

  .hp-bar-fill {
    height: 100%;
    transition: width 0.5s ease;
  }

  .hp-text {
    font-size: 10px;
    color: var(--gray);
    font-family: monospace;
  }

  .select-hint {
    @include pixelated;
    font-size: 7px;
    color: var(--yellow);
    opacity: 0;
    transition: opacity 0.2s;
  }
}

.cancel-btn-primary {
  width: 100%;
  padding: 16px;
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: var(--gray);
  @include pixelated;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: Rgba(255, 255, 255, 0.1);
    color: var(--white);
    transform: translateY(-2px);
  }
}
</style>
