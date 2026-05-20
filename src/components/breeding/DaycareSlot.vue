<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { Pokemon } from '@/types/pokemon'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { NATURE_DATA } from '@/data/natures'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventory'
import { useUIStore } from '@/stores/ui'

interface Props {
  slotId: string
  pokemon?: Pokemon | null
  item?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  pokemon: null,
  item: null
})

const emit = defineEmits<{
  (e: 'deposit'): void
  (e: 'withdraw'): void
}>()

const gameStore = useGameStore()
const inventoryStore = useInventoryStore()
const uiStore = useUIStore()

const findPokemonLocation = (p: Pokemon) => {
  if (!p) return null
  const teamIndex = gameStore.state.team.findIndex(x => x && x.uid === p.uid)
  if (teamIndex !== -1) {
    return { context: 'team' as const, index: teamIndex }
  }
  const boxIndex = gameStore.state.box.findIndex(x => x && x.uid === p.uid)
  if (boxIndex !== -1) {
    return { context: 'box' as const, index: boxIndex }
  }
  return null
}

const handleItemClick = () => {
  const p = props.pokemon
  if (!p) return
  
  const loc = findPokemonLocation(p)
  if (!loc) {
    uiStore.notify('No se pudo localizar este Pokémon', '⚠️')
    return
  }
  
  if (p.heldItem) {
    const item = p.heldItem
    inventoryStore.unequipItem(loc.context, loc.index)
    uiStore.notify(`¡${item} retirado!`, '🎒')
  } else {
    uiStore.toggleInventory(loc.context, loc.index)
  }
}

const genderIcon = computed(() => {
  if (!props.pokemon?.gender) return ''
  return props.pokemon.gender === 'M' ? '♂' : '♀'
})

const getSprite = (id: string | number, isShiny: boolean) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny })
}

const getNatureDescription = (natureName: string) => {
  return (NATURE_DATA as Record<string, { desc: string }>)[natureName]?.desc || 'Sin efecto en estadísticas.'
}
</script>

<template>
  <div
    class="daycare-slot-legacy"
    :class="{ empty: !pokemon }"
    @click.stop="!pokemon ? emit('deposit') : null"
  >
    <div class="slot-marker">
      RANURA {{ slotId.toUpperCase() }}
    </div>

    <!-- Empty State -->
    <div
      v-if="!pokemon"
      class="slot-empty"
    >
      <div class="plus-icon">
        +
      </div>
      <div class="hint">
        ⚡ DEPOSITAR POKÉMON
      </div>
    </div>

    <!-- Occupied State -->
    <div
      v-else
      class="slot-filled"
    >
      <div class="poke-header">
        <div class="sprite-box">
          <img
            :src="getSprite(pokemon.id, !!pokemon.isShiny)"
            class="pixel-sprite"
            @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
          >
        </div>
        <div class="poke-info">
          <div class="p-name-stack-daycare">
            <span class="name">{{ pokemon.nickname || pokemon.name.toUpperCase() }}</span>
            <span
              v-if="pokemon.nickname"
              class="species-subtitle"
            >{{ pokemon.name.toUpperCase() }}</span>
          </div>
          <div class="lv-gender-line">
            <span class="m-badge-level">NV.{{ pokemon.level }}</span>
            <span
              v-if="pokemon.gender"
              class="m-badge-gender mini"
              :class="pokemon.gender === 'M' ? 'male' : 'female'"
            >{{ genderIcon }}</span>
          </div>
          <div class="stats-line">
            IVS: <span class="stats-values">{{ pokemon.ivs.hp }}/{{ pokemon.ivs.atk }}/{{ pokemon.ivs.def }}/{{ pokemon.ivs.spa }}/{{ pokemon.ivs.spd }}/{{ pokemon.ivs.spe }}</span>
          </div>
          <div class="nature-line">
            <PVTooltip
              :title="`NATURALEZA: ${pokemon.nature.toUpperCase()}`"
              :description="getNatureDescription(pokemon.nature)"
            >
              <span class="nature-text">{{ pokemon.nature.toUpperCase() }}</span>
            </PVTooltip>
          </div>
        </div>
      </div>

      <div class="vigor-status">
        <div class="label">
          VIGOR: {{ pokemon.vigor || 0 }}/10
        </div>
        <div class="vigor-bar-bg">
          <div
            class="vigor-fill"
            :style="{ width: ((pokemon.vigor || 0) * 10) + '%', background: ((pokemon.vigor || 0) <= 2 ? 'Rgba(239, 68, 68, 1)' : 'Rgba(34, 197, 94, 1)') }"
          />
        </div>
      </div>

      <div
        class="item-status"
        @click.stop="handleItemClick"
      >
        <div
          v-if="pokemon.heldItem"
          class="item-badge active"
        >
          📦 {{ pokemon.heldItem.toUpperCase() }}
        </div>
        <div
          v-else
          class="item-badge none"
        >
          SIN OBJETO
        </div>
      </div>

      <button
        class="withdraw-btn-retro"
        @click.stop="emit('withdraw')"
      >
        RETIRAR
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/components/_badges.scss" as badges;
.daycare-slot-legacy {
  background: $card-dark;
  border: 2px solid Rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 20px;
  min-height: 250px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.2s;

  @media (max-width: 950px) {
    min-height: 180px;
    padding: 12px;
  }

  &.empty {
    border-style: dashed;
    cursor: pointer;
    justify-content: center;
    align-items: center;
    background: Rgba(0,0,0,0.2);
    &:hover { border-color: $coin-gold; .plus-icon { color: $coin-gold; transform: #{'Scale(1.1)'}; } }
  }

  &:not(.empty):hover { border-color: Rgba(255,255,255,0.15); }
}

.slot-marker {
  @include pixelated;
  font-size: 7px;
  color: $muted;
  margin-bottom: 20px;

  @media (max-width: 950px) {
    margin-bottom: 8px;
  }
}

.slot-empty {
  text-align: center;
  .plus-icon { font-size: 30px; color: Rgba(51, 65, 85, 1); margin-bottom: 10px; transition: all 0.2s; }
  .hint { @include pixelated; font-size: 7px; color: Rgba(71, 85, 105, 1); }
}

.slot-filled {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.poke-header {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;

  @media (max-width: 950px) {
    gap: 10px;
    margin-bottom: 10px;
  }
}

.sprite-box {
  width: 64px; height: 64px;
  background: Rgba(0,0,0,0.3);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  .pixel-sprite { width: 56px; height: 56px; @include pixelated; }
}


.poke-info {
  flex: 1;
  display: flex;
  flex-direction: column;

  .p-name-stack-daycare {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    margin-bottom: 6px;

    .name {
      @include pixelated;
      font-size: 11px;
      font-weight: 900;
      color: $white;
      text-transform: uppercase;
      text-shadow: 1px 1px 0 #000;
    }

    .species-subtitle {
      @include pixel-perfect(6.5px);
      color: var(--yellow);
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  .lv-gender-line {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    
    .m-badge-gender.mini {
      @include badges.badge-gender(12px);
      font-size: 12px;
    }
  }

  .stats-line {
    @include pixelated;
    font-size: 8px;
    color: $muted;
    margin-bottom: 4px;
    
    .stats-values {
      color: $green;
      font-family: monospace;
      font-size: 9px;
      font-weight: bold;
    }
  }

  .nature-line {
    @include pixelated;
    font-size: 8px;
    color: $coin-gold;
    font-weight: bold;
    
    .nature-text {
      border-bottom: 1px dashed Rgba($coin-gold, 0.5);
      cursor: help;
      padding-bottom: 1px;
    }
  }
}

.vigor-status {
  margin-bottom: 15px;
  .label { font-size: 9px; font-weight: bold; color: $muted; margin-bottom: 6px; }
  .vigor-bar-bg { height: 4px; background: Rgba(0,0,0,0.4); border-radius: 2px; overflow: hidden; }
  .vigor-fill { height: 100%; transition: width 0.3s; }
}

.item-status {
  margin-bottom: 20px;
  cursor: pointer;
  transition: transform 0.2s, filter 0.2s;
  user-select: none;

  &:hover {
    transform: Scale(1.02);
    filter: Brightness(1.15);
  }

  &:active {
    transform: Scale(0.98);
  }

  .item-badge {
    padding: 8px 12px; border-radius: 10px; font-size: 10px;
    text-align: center;
    @include pixelated;
    &.active { background: Rgba($pokecenter-pink, 0.08); border: 1px solid Rgba($pokecenter-pink, 0.2); color: $white; }
    &.none { background: Rgba(0,0,0,0.2); color: Rgba(148, 163, 184, 0.6); font-style: italic; border: 1px dashed Rgba(255,255,255,0.08); }
  }
}

.withdraw-btn-retro {
  margin-top: auto;
  @include btn-vicio('danger', 'sm', true);
  width: 100%;
}
</style>
