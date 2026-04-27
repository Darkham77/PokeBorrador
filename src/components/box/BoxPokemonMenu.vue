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
import { useModalStore } from '@/stores/modals'
import { calculateTotalPower, getPokemonTier } from '@/logic/pokemonUtils'
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'

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
const totalPower = computed(() => calculateTotalPower(pokemon.value))
const tierInfo = computed(() => getPokemonTier(pokemon.value))

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
  // Set target context directly in uiStore and open modal via modalStore 
  // to avoid circular dependency issues with uiStore.toggleInventory
  uiStore.inventoryTarget = { context: 'box', index: props.boxIndex }
  useModalStore().open('Inventory')
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

const getTypeColor = (type) => PDEX_TYPE_COLORS[type?.toLowerCase()] || 'Rgba(170, 170, 170, 1)'

</script>

<template>
  <BaseModal
    :show="show"
    variant="retro"
    max-width="500px"
    hide-header
    padding="raw"
    @close="emit('close')"
  >
    <div
      v-if="pokemon"
      class="box-menu-content"
    >
      <!-- Pokémon Header (Clickable to detail) -->
      <header 
        class="pokemon-summary is-interactive" 
        :style="{ '--type-color': getTypeColor(pokemon.types?.[0] || pokemon.type) }"
        @click.stop="handleDetail"
      >
        <div class="summary-badges-right">
          <div
            class="tier-badge m-badge-tier"
            :style="{ color: tierInfo.color, background: tierInfo.bg }"
          >
            {{ tierInfo.tier }}
          </div>
        </div>

        <div class="summary-top">
          <div 
            class="sprite-box"
            :style="{ '--glow-color': getTypeColor(pokemon.types?.[0] || pokemon.type) }"
          >
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
            <div class="info-main">
              <span
                v-if="pokemon.nickname"
                class="p-nickname-prefix"
              >{{ pokemon.nickname }}</span>
              <h3 class="p-name">
                {{ pokemon.name }}
                <span
                  v-if="pokemon.gender"
                  :class="['gender-icon m-badge-gender', pokemon.gender === 'M' ? 'male' : 'female']"
                >
                  {{ pokemon.gender === 'M' ? '♂' : '♀' }}
                </span>
              </h3>
              <div class="level-row">
                <span class="level-badge m-badge-level">Nv. {{ pokemon.level }}</span>
                <span class="tot-badge m-badge-tot ivs">IV {{ Object.values(pokemon.ivs || {}).reduce((s,v)=>s+(v||0),0) }}</span>
                <span class="tot-badge m-badge-tot">TOT {{ totalPower }}</span>
              </div>
              
              <div class="types-row-header">
                <span 
                  v-for="t in pokemon.types || [pokemon.type]" 
                  :key="t"
                  class="type-pill-mini"
                  :style="{ background: getTypeColor(t) }"
                >
                  {{ t?.toUpperCase() }}
                </span>
              </div>
            </div>

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

            <div class="header-badges">
              <UnifiedBadgePill 
                :pokemon="pokemon" 
                size="md" 
                :vertical="false"
                inline
              />
            </div>
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
              :class="{ 'has-pokemon': !!t }"
              @click.stop="handleSwap(i)"
            >
              <div
                v-if="t"
                class="slot-rank m-badge-tier"
                :style="{ color: getPokemonTier(t).color, background: getPokemonTier(t).bg }"
              >
                {{ getPokemonTier(t).tier }}
              </div>
              <div class="slot-badges">
                <UnifiedBadgePill 
                  v-if="t"
                  :pokemon="t" 
                  size="sm" 
                  :vertical="false"
                  inline
                />
              </div>
              <div 
                class="ts-sprite-container"
                :style="{ '--glow-color': getTypeColor(t?.types?.[0] || t?.type) }"
              >
                <PVSpriteFX
                  v-if="t"
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
              <span
                v-if="t"
                class="ts-name"
              >{{ t.nickname || t.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- General Actions -->
      <div class="footer-actions">
        <button
          class="menu-action-btn"
          @click.stop="handleUseItem"
        >
          <span class="icon">🎒</span> USAR OBJETO
        </button>
        <button
          class="menu-action-btn"
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
  gap: 10px;
  min-width: 300px;
  padding: 10px 12px;

  @media (max-width: 500px) {
    padding: 8px 10px;
    gap: 8px;
  }
}

.pokemon-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: Rgba(255, 255, 255, 0.03);
  padding: 12px;
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

  &::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: var(--type-color, var(--purple));
    box-shadow: 0 0 10px var(--type-color);
    opacity: 0.6;
  }

  .summary-top {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    width: 100%;
    
    @media (max-width: 450px) {
      flex-direction: column;
      gap: 10px;
    }
  }

  .sprite-box {
    flex: 0 0 auto;
    width: 112px;
    height: 112px;
    @include flex-center;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: Radial-Gradient(circle, var(--glow-color, white) 0%, transparent 65%);
      opacity: 0.25;
      z-index: var(--z-base);
    }
    
    .menu-sprite {
      width: 140px;
      height: 140px;
      @include sprite-render;
      filter: Drop-Shadow(0 10px 20px Rgba(0,0,0,0.4));
    }
  }

  .meta-info {
    flex: 0 1 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-align: center;

    .info-main {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .p-nickname-prefix {
      @include pixelated;
      font-size: 8px;
      color: var(--yellow);
      opacity: 0.8;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .p-name { 
      @include pixelated; 
      font-size: 18px; 
      color: var(--white); 
      text-transform: uppercase; 
      margin: 0; 
      line-height: 1; 
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .level-row {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }

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

  .types-row-header {
    display: flex;
    gap: 4px;
    margin-top: 6px;

    .type-pill-mini {
      @include type-pill-mini;
    }
  }

  .summary-badges-right {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    z-index: var(--z-low);
  }
}

.menu-action-btn {
  @include btn-vicio('primary', 'sm', true);
  margin-bottom: 8px;
  
  &.secondary { @include btn-vicio-success('sm', true); }
  &.danger { @include btn-vicio-danger('sm', true); margin-top: 12px; }
}

.swap-section {
  margin: 12px 0;
  .section-title { @include pixelated; font-size: 7px; color: var(--gray); margin-bottom: 8px; opacity: 0.6; letter-spacing: 1px; text-align: center; }
}

.team-swap-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 0;

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
}

.team-swap-slot {
  background: Rgba(0, 0, 0, 0.3);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 6px;
  @include flex-center;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: visible;

  .slot-rank {
    position: absolute;
    bottom: 12px;
    left: 8px;
    z-index: calc(var(--z-base) + 5);
  }

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
    margin-bottom: 2px;
    min-height: 10px;

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
    position: relative;
    @include flex-center;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: Radial-Gradient(circle, var(--glow-color, white) 0%, transparent 75%);
      opacity: 0.35;
      z-index: var(--z-base);
    }

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
  gap: 10px;
  margin-top: 8px;
  
  @media (max-width: 400px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .menu-action-btn { margin-bottom: 0; }
  .danger { grid-column: span 2; }
}
</style>
