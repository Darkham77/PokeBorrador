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
import { calculateTotalPower, getPokemonTier, calculateRocketSellPrice as calculatePrice } from '@/logic/pokemonUtils'
import { PDEX_TYPE_COLORS } from '@/logic/pokedexConstants'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'

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
const totalPower = computed(() => pokemon.value ? calculateTotalPower(pokemon.value) : 0)
const tierInfo = computed(() => pokemon.value ? getPokemonTier(pokemon.value) : getPokemonTier(null))
const isRocketMode = computed(() => gameStore.state.playerClass === 'rocket')

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
    uiStore.notify('No se puede liberar un Pokémon en la Guardería.', '⚠️')
    return
  }
  
  uiStore.openConfirm({
    title: 'LIBERAR POKÉMON',
    message: `¿Estás seguro de que querés liberar a ${pokemon.value.name}? Esta acción es permanente.`,
    onConfirm: () => {
      boxStore.boxReleaseSelected = [props.boxIndex]
      const names = boxStore.doBoxRelease()
      uiStore.notify(`¡${names[0]} fue liberado!`, '🌿')
      emit('close')
    }
  })
}

const handleSellRocket = () => {
  if (!pokemon.value) return
  const price = calculatePrice(pokemon.value)

  uiStore.openConfirm({
    title: 'VENTA MERCADO NEGRO',
    message: `¿Estás seguro de que querés vender a ${pokemon.value.name} al Mercado Negro por ₽${price.toLocaleString()}? Esta acción es permanente.`,
    onConfirm: () => {
      boxStore.boxRocketSelected = [props.boxIndex]
      const { value } = boxStore.doBoxRocketSell()
      uiStore.notify(`¡Vendido por ₽${value.toLocaleString()}! 💀`, '🚀')
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
      <!-- Premium Header Section -->
      <header class="menu-header">
        <div class="header-left">
          <div
            v-if="tierInfo"
            class="m-badge-tier giant"
            :style="{ '--tier-color': tierInfo.color, '--tier-bg': tierInfo.bg }"
          >
            {{ tierInfo.tier }}
          </div>
        </div>

        <div class="header-center">
          <div class="p-name-stack">
            <h3 class="p-name">
              {{ pokemon?.nickname || pokemon?.name }}
            </h3>
            <span
              v-if="pokemon?.nickname"
              class="p-species-subtitle"
            >
              {{ pokemon?.name }}
            </span>
          </div>

          <div class="header-badges">
            <span
              v-if="pokemon?.gender"
              :class="['m-badge-gender', pokemon?.gender === 'M' ? 'male' : 'female']"
            >
              {{ pokemon?.gender === 'M' ? '♂' : '♀' }}
            </span>
            <span class="m-badge-level">Nv. {{ pokemon?.level }}</span>
            <span class="m-badge-iv">IV {{ Object.values(pokemon?.ivs || {}).reduce((s,v)=>s+(v||0),0) }}</span>
            <span class="m-badge-tot">TOT {{ totalPower }}</span>
          </div>
        </div>

        <!-- Spacer to balance header since BaseModal provides the close button via inheritance -->
        <div class="header-right-spacer" />
      </header>

      <!-- Pokémon Summary (Sprite & Types) -->
      <div 
        class="pokemon-summary-card" 
        @click.stop="handleDetail"
      >
        <div 
          class="sprite-box"
        >
          <PVSpriteFX
            :is-shiny="pokemon?.isShiny"
            :is-guardian="pokemon?.isGuardian"
          >
            <img
              :src="getAssetUrl(ASSET_TYPES.POKEMON, pokemon?.id, { isShiny: pokemon?.isShiny })"
              class="menu-sprite"
              @error="e => e.target.style.display = 'none'"
            >
          </PVSpriteFX>
        </div>

        <div class="summary-meta">
          <div class="types-row">
            <span 
              v-for="t in pokemon?.types || [pokemon?.type]" 
              :key="t"
              class="type-pill-mini"
              :style="{ background: getTypeColor(t) }"
            >
              {{ t?.toUpperCase() }}
            </span>
          </div>

          <div class="nature-ability">
            <PVTooltip
              v-if="pokemon?.nature"
              :title="pokemon?.nature"
              :description="NATURE_DATA[pokemon?.nature]?.desc"
              position="top"
            >
              <span class="interactive-text">{{ pokemon?.nature }}</span>
            </PVTooltip>
            <span
              v-if="pokemon?.nature && pokemon?.ability"
              class="sep"
            >|</span>
            <PVTooltip
              v-if="pokemon?.ability"
              :title="pokemon?.ability"
              :description="ABILITY_DATA[pokemon?.ability]?.desc"
              position="top"
            >
              <span class="interactive-text">{{ pokemon?.ability }}</span>
            </PVTooltip>
          </div>

          <div class="tags-row">
            <UnifiedBadgePill 
              v-if="pokemon"
              :pokemon="pokemon" 
              size="md" 
              :vertical="false"
              inline
            />
          </div>
        </div>
      </div>

      <!-- Action Grid -->
      <div class="action-grid">
        <button 
          v-if="team.length < 6" 
          class="menu-action-btn success-btn" 
          @click.stop="handleMoveToTeam"
        >
          <span class="icon">➕</span> AGREGAR AL EQUIPO
        </button>

        <!-- Swap Section -->
        <div class="swap-section">
          <h4 class="section-title">
            INTERCAMBIAR POR
          </h4>
          <div class="team-swap-grid">
            <div
              v-for="(t, i) in team"
              :key="t.uid"
              class="team-swap-card"
              @click.stop="handleSwap(i)"
            >
              <!-- Tier Badge (Top Left) -->
              <div 
                class="slot-rank m-badge-tier" 
                :style="{ '--tier-color': getPokemonTier(t).color, '--tier-bg': getPokemonTier(t).bg }"
              >
                {{ getPokemonTier(t).tier }}
              </div>
              
              <span class="ts-name">{{ t.nickname || t.name }}</span>
              
              <PokemonTypePills 
                :pokemon="t" 
                size="xs"
                class="ts-types"
              />

              <!-- Sprite (Center) -->
              <div 
                class="ts-sprite-box"
              >
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

              <!-- Tags (Bottom) -->
              <div class="slot-tags">
                <UnifiedBadgePill 
                  :pokemon="t" 
                  size="sm" 
                  :vertical="false"
                  inline
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
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
          class="menu-action-btn secondary-btn"
          @click.stop="handleRelease"
        >
          <span class="icon">🌿</span> LIBERAR
        </button>
        <button
          v-if="isRocketMode"
          class="menu-action-btn danger-btn"
          @click.stop="handleSellRocket"
        >
          <span class="icon">💀</span> VENDER MERCADO NEGRO
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
.box-menu-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 340px;
  padding: 16px;

  @include responsive(768px) {
    min-width: 100%;
    padding: 12px;
    gap: 12px;
  }
}

.menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  position: relative;

  .header-left {
    flex: 0 0 50px;
  }

  .header-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;

    .p-name-stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .p-name {
      @include pixelated;
      font-size: 20px;
      color: var(--white);
      text-transform: uppercase;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      text-shadow: 0 2px 10px Rgba(0,0,0,0.5);
    }

    .p-species-subtitle {
      @include pixel-perfect(8px);
      color: var(--yellow);
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .header-badges {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  .header-right-spacer {
    flex: 0 0 50px;
  }
}

.pokemon-summary-card {
  @include glass-solid(Rgba(255, 255, 255, 0.03));
  border-radius: 24px;
  padding: 20px 24px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 32px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;

  @include responsive(768px) {
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  &:hover {
    background: Rgba(255, 255, 255, 0.06);
    transform: TranslateY(-2px);
    box-shadow: 0 10px 30px Rgba(0, 0, 0, 0.4);
  }

  .sprite-box {
    width: 100px;
    height: 100px;
    @include flex-center;
    position: relative;
    z-index: var(--z-base);

    .menu-sprite {
      width: 130px;
      height: 130px;
      @include sprite-render;
      filter: Drop-Shadow(0 15px 25px Rgba(0,0,0,0.5));
    }
  }

  .summary-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    z-index: var(--z-base);

    .types-row {
      display: flex;
      gap: 6px;
      .type-pill-mini { @include type-pill-mini(8px); padding: 2px 10px; }
    }

    .nature-ability {
      font-size: 11px;
      color: Rgba(255, 255, 255, 0.4);
      display: flex;
      gap: 8px;
      align-items: center;
      @include pixelated;

      .interactive-text {
        color: Rgba(255, 255, 255, 0.6);
        border-bottom: 1px dotted Rgba(255, 255, 255, 0.2);
        &:hover { color: var(--yellow); border-bottom-color: var(--yellow); }
      }
      .sep { opacity: 0.2; }
    }

    .tags-row {
      margin-top: 4px;
    }
  }
}

.action-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .menu-action-btn {
    @include btn-vicio('primary', 'sm', true);
    
    &.success-btn { @include btn-vicio('primary', 'sm', true); }
  }
}

.secondary-btn { @include btn-vicio('secondary', 'sm', true); }
.danger-btn { @include btn-vicio('danger', 'sm', true); }

.swap-section {
  .section-title {
    @include pixel-perfect(7px);
    color: Rgba(255, 255, 255, 0.3);
    text-align: center;
    margin-bottom: 12px;
    letter-spacing: 2px;
  }
}

.team-swap-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  @include responsive(768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.team-swap-card {
  background: Linear-Gradient(180deg, Rgba(255, 255, 255, 0.05) 0%, Rgba(0, 0, 0, 0.2) 100%);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  box-shadow: 0 4px 15px Rgba(0, 0, 0, 0.3);

  &:hover {
    border-color: var(--purple);
    background: Rgba(124, 58, 237, 0.1);
    transform: scale3d(1.05, 1.05, 1) translateY(-4px);
    box-shadow: 0 12px 30px Rgba(0, 0, 0, 0.5);
    z-index: var(--z-low);
  }

  .slot-rank {
    position: absolute;
    top: 6px;
    left: 6px;
    z-index: var(--z-low);
    transform: Scale(0.85);
  }

  .ts-name {
    @include pixelated;
    font-size: 8px;
    color: var(--white);
    text-align: center;
    margin-bottom: 8px;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 0 2px 4px Rgba(0,0,0,0.5);
  }
  
  .ts-types {
    margin-bottom: 4px;
    transform: Scale(0.8);
    height: 12px;
  }

  .ts-sprite-box {
    width: 48px;
    height: 48px;
    @include flex-center;
    position: relative;
    transform: TranslateY(10px);

    .ts-sprite {
      width: 100%;
      height: 100%;
      @include sprite-render;
      filter: Drop-Shadow(0 4px 8px Rgba(0,0,0,0.4));
    }
  }

  .slot-tags {
    margin-top: 8px;
    transform: Scale(0.9);
  }
}

.footer-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 8px;

  .menu-action-btn {
    @include btn-vicio('primary', 'sm', true);
    margin: 0;

    &.secondary-btn { @include btn-vicio('secondary', 'sm', true); }
    &.danger-btn { @include btn-vicio('danger', 'sm', true); }
  }

  @include responsive(480px) {
    grid-template-columns: 1fr;
  }
}
</style>
