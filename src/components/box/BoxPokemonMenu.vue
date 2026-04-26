// [PureVue-Ignore-Length]
<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBoxStore } from '@/stores/box'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { NATURE_DATA } from '@/data/natures'
import { ABILITY_DATA } from '@/data/abilities'
import PVTooltip from '@/components/common/PVTooltip.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'

const props = defineProps({
  show: { type: Boolean, default: true },
  boxIndex: { type: Number, required: true }
})

const emit = defineEmits(['close'])

const gameStore = useGameStore()
const uiStore = useUIStore()
const boxStore = useBoxStore()

const pokemon = computed(() => gameStore.state.box[props.boxIndex])
const team = computed(() => gameStore.state.team)

const handleMoveToTeam = () => {
  const res = boxStore.moveBoxToTeam(props.boxIndex)
  if (res.success) {
    uiStore.notify(res.msg, '➕')
    emit('close')
  } else {
    uiStore.notify(res.msg, '⚠️')
  }
}

const handleSwap = (teamIndex) => {
  const res = boxStore.swapBoxWithTeam(props.boxIndex, teamIndex)
  if (res.success) {
    uiStore.notify(res.msg, '↔️')
    emit('close')
  } else {
    uiStore.notify(res.msg, '⚠️')
  }
}

const handleDetail = () => {
  uiStore.openPokemonDetail(pokemon.value, props.boxIndex, 'box')
}

const handleUseItem = () => {
  uiStore.isInventoryOpen = true
  emit('close')
}

const handleMoveToBox = () => {
  uiStore.openPrompt({
    title: 'MOVER POKÉMON',
    message: `¿A qué caja querés mover a ${pokemon.value.name}? (1 a ${gameStore.state.boxCount})`,
    initialValue: (boxStore.currentBoxIndex + 1).toString(),
    type: 'number',
    onConfirm: (val) => {
      const boxNum = parseInt(val)
      if (isNaN(boxNum) || boxNum < 1 || boxNum > gameStore.state.boxCount) {
        uiStore.notify('Número de caja inválido.', '⚠️')
        return
      }
      
      const res = boxStore.movePokemonToBox(props.boxIndex, boxNum - 1)
      if (res.success) {
        uiStore.notify(res.msg, '📦')
        emit('close')
      }
    }
  })
}

const handleRelease = () => {
  if (pokemon.value.inDaycare) {
    uiStore.notify('No se puede soltar un Pokémon en la Guardería.', '⚠️')
    return
  }
  
  uiStore.openConfirm({
    title: 'SOLTAR POKÉMON',
    message: `¿Estás seguro de que querés soltar a ${pokemon.value.name}? Esta acción es permanente.`,
    onConfirm: () => {
      boxStore.boxReleaseSelected = [props.boxIndex]
      const names = boxStore.doBoxRelease()
      uiStore.notify(`¡${names[0]} fue soltado!`, '🌿')
      emit('close')
    }
  })
}

const handleToggleTag = (tag) => {
  boxStore.togglePokeTag(props.boxIndex, tag)
}

// Mobile detection for dynamic layout
const isMobile = computed(() => uiStore.windowWidth < 400)
</script>

<template>
  <BaseModal
    :show="show"
    :title="pokemon?.nickname || pokemon?.name || 'POKÉMON'"
    variant="retro"
    max-width="650px"
    @close="emit('close')"
  >
    <div
      v-if="pokemon"
      class="box-menu-content"
    >
      <!-- Pokémon Header (Clickable to detail) -->
      <header 
        class="pokemon-summary is-interactive" 
        @click.stop="handleDetail"
      >
        <div class="summary-top">
          <div class="sprite-box">
            <PVSpriteFX
              :is-shiny="pokemon.isShiny"
              :is-guardian="pokemon.isGuardian"
            >
              <img
                :src="getAssetUrl(ASSET_TYPES.POKEMON, pokemon.id, { isShiny: pokemon.isShiny })"
                class="menu-sprite"
                @error="e => e.target.style.display = 'none'"
              >
            </PVSpriteFX>
          </div>
          <div class="meta-info">
            <span class="level">NV. {{ pokemon.level }}</span>
            <h3 class="p-name">
              {{ pokemon.nickname || pokemon.name }}
            </h3>
            <span
              v-if="pokemon.nickname"
              class="p-species"
            >#{{ pokemon.name }}</span>
            <div class="details">
              <PVTooltip
                :title="pokemon.nature"
                :description="NATURE_DATA[pokemon.nature]?.desc"
                position="top"
              >
                <span class="interactive-text">{{ pokemon.nature }}</span>
              </PVTooltip>
              <span class="sep"> · </span>
              <PVTooltip
                :title="pokemon.ability"
                :description="ABILITY_DATA[pokemon.ability]?.desc"
                position="top"
              >
                <span class="interactive-text">{{ pokemon.ability }}</span>
              </PVTooltip>
            </div>
          </div>

          <!-- Badges at the right, vertical and symmetric (Horizontal on mobile) -->
          <div class="header-badges">
            <UnifiedBadgePill 
              :pokemon="pokemon" 
              size="lg" 
              editable
              show-all
              :vertical="!isMobile"
              inline
              @toggle-tag="handleToggleTag"
            />
          </div>
        </div>
      </header>

      <div class="action-grid">
        <button 
          v-if="team.length < 6" 
          class="menu-action-btn secondary" 
          @click.stop="handleMoveToTeam"
        >
          <span class="icon">➕</span> AGREGAR AL EQUIPO
        </button>

        <!-- Swap Section - Grid 3x2 -->
        <div class="swap-section">
          <h4 class="section-title">
            INTERCAMBIAR POR
          </h4>
          <div class="team-swap-grid">
            <div
              v-for="(t, i) in team"
              :key="t.uid"
              class="team-swap-slot"
              @click.stop="handleSwap(i)"
            >
              <div class="slot-badges">
                <UnifiedBadgePill 
                  :pokemon="t" 
                  size="sm" 
                  :vertical="false"
                  inline
                />
              </div>
              <div class="ts-sprite-container">
                <PVSpriteFX
                  :is-shiny="t.isShiny"
                  :is-guardian="t.isGuardian"
                >
                  <img
                    :src="getAssetUrl(ASSET_TYPES.POKEMON, t.id, { isShiny: t.isShiny })"
                    class="ts-sprite"
                    @error="e => e.target.style.display = 'none'"
                  >
                </PVSpriteFX>
              </div>
              <span class="ts-name">{{ t.nickname || t.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- General Actions -->
      <div class="footer-actions">
        <button
          class="menu-action-btn warning"
          @click.stop="handleUseItem"
        >
          <span class="icon">🎒</span> USAR OBJETO
        </button>
        <button
          class="menu-action-btn warning"
          @click.stop="handleMoveToBox"
        >
          <span class="icon">📦</span> MOVER CAJA
        </button>
        <button
          class="menu-action-btn danger"
          @click.stop="handleRelease"
        >
          <span class="icon">🌿</span> SOLTAR
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.box-menu-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 320px;
  padding: 16px 24px;

  @media (max-width: 500px) {
    padding: 12px 8px;
    gap: 12px;
  }
}

.pokemon-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: Rgba(255, 255, 255, 0.03);
  padding: 12px 16px;
  border-radius: 20px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  position: relative;
  transition: all 0.2s;
  overflow: hidden;

  @media (max-width: 400px) {
    gap: 8px;
    padding: 12px 8px;
  }

  &.is-interactive {
    cursor: pointer;
    &:hover {
      background: Rgba(255, 255, 255, 0.06);
      border-color: Rgba(255, 255, 255, 0.15);
      transform: TranslateY(-2px);
    }
  }

  .summary-top {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    width: 100%;
    
    @media (max-width: 400px) {
      gap: 10px;
    }
  }

  .sprite-box {
    flex: 0 0 auto;
    width: 64px;
    height: 64px;
    @include flex-center;
    background: radial-gradient(circle, Rgba(255, 255, 255, 0.08) 0%, transparent 70%);
    
    .menu-sprite {
      width: 100%;
      height: 100%;
      @include sprite-render;
    }
  }

  .meta-info {
    flex: 0 1 auto;

    @media (max-width: 400px) {
      text-align: center;
    }

    .level { @include pixelated; font-size: 9px; color: var(--yellow); display: block; margin-bottom: 4px; }
    .p-name { @include pixelated; font-size: 18px; color: var(--white); text-transform: uppercase; margin: 2px 0; line-height: 1.2; }
    .p-species { @include pixelated; font-size: 10px; color: var(--gray); text-transform: uppercase; opacity: 0.6; display: block; margin: 4px 0; }
    .details { 
      font-size: 11px; 
      color: var(--gray); 
      margin-top: 8px; 
      opacity: 0.8;
      line-height: 1.4;
      
      .interactive-text {
        cursor: help;
        border-bottom: 1px dotted Rgba(255, 255, 255, 0.3);
        transition: all 0.2s;
        &:hover {
          color: var(--yellow);
          border-bottom-color: var(--yellow);
        }
      }
      .sep { opacity: 0.3; margin: 0 4px; }
    }
  }

  .header-badges {
    flex: 0 0 auto;
    @include flex-center;
  }
}

.menu-action-btn {
  @include btn-vicio('neutral', 'sm', true);
  margin-bottom: 8px;
  
  &.primary { @include btn-vicio-secondary('sm', true); }
  &.secondary { @include btn-vicio-success('sm', true); }
  &.danger { @include btn-vicio-danger('sm', true); margin-top: 12px; }
  &.warning { @include btn-vicio('warning', 'sm', true); }
  &.rocket { @include btn-vicio-danger('sm', true); }
  &.flat { @include btn-vicio('neutral', 'sm', true); }
}

.swap-section {
  margin: 12px 0;
  .section-title { @include pixelated; font-size: 7px; color: var(--gray); margin-bottom: 8px; opacity: 0.6; letter-spacing: 1px; text-align: center; }
}

.team-swap-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 2px;

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
}

.team-swap-slot {
  aspect-ratio: 1.2;
  background: Rgba(0, 0, 0, 0.3);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 10px;
  @include flex-center;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: visible;

  @media (max-width: 768px) {
    aspect-ratio: auto;
    padding: 8px 10px;
  }

  @media (max-width: 500px) {
    padding: 6px;
    flex-direction: row;
    gap: 12px;
    justify-content: flex-start;
  }

  &:hover {
    background: Rgba(199, 125, 255, 0.15);
    border-color: var(--purple);
    transform: TranslateY(-4px);
    box-shadow: 0 8px 25px Rgba(0, 0, 0, 0.5);

    @media (max-width: 480px) {
      transform: none;
    }
  }

  .slot-badges {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-bottom: 6px;
    min-height: 14px;

    @media (max-width: 500px) {
      position: absolute;
      top: 4px;
      right: 8px;
      width: auto;
      margin-bottom: 0;
    }
  }

  .ts-sprite-container {
    width: 48px;
    height: 48px;
    @include flex-center;

    @media (max-width: 500px) {
      width: 32px;
      height: 32px;
    }
    
    .ts-sprite { 
      width: 100%; 
      height: 100%; 
      @include sprite-render;
    }
  }

  .ts-name { 
    font-size: 8px; 
    @include pixelated; 
    color: var(--white); 
    margin-top: 6px; 
    text-align: center; 
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 1px 1px 0 Rgba(0,0,0,0.8);

    @media (max-width: 500px) {
      margin-top: 0;
      text-align: left;
      font-size: 10px;
    }
  }
}

.footer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
  
  @media (max-width: 400px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .menu-action-btn { margin-bottom: 0; }
  .danger { grid-column: span 2; }
}
</style>
