<script setup lang="ts">
import { computed } from 'vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { MarketListing, MarketItemData } from '@/logic/economy/market'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { formatCurrency } from '@/logic/utils/formatters'
import { formatDisplayDate } from '@/logic/utils/timeUtils'
import { getPokemonTotalPower } from '@/logic/pokemon/pokemonSelectionFilter.ts'
import PokemonSelectionItem from '@/components/modals/PokemonSelectionItem.vue'
import {
  resolveItemTier,
  resolveItemDisplayName,
  resolveTierLabel,
  resolveTierColor,
  resolveBuyButtonState
} from './marketExplorerHelper.ts'

const props = defineProps<{
  listing: MarketListing
  userMoney: number
  currentUserUid?: string
}>()

const emit = defineEmits<{
  (e: 'buy', listing: MarketListing): void
}>()

const pokemon = computed<Pokemon | null>(() =>
  props.listing.listing_type === 'pokemon' ? props.listing.data : null
)
const item = computed<MarketItemData | null>(() =>
  props.listing.listing_type === 'item' ? props.listing.data : null
)

const itemTier = computed(() => resolveItemTier(item.value?.name))
const tierColor = computed(() => resolveTierColor(itemTier.value))
const tierLabel = computed(() => resolveTierLabel(itemTier.value))
const itemDisplayName = computed(() => resolveItemDisplayName(item.value?.name))
const formattedTime = computed(() => formatDisplayDate(props.listing.created_at))
const itemQuantity = computed(() => item.value?.qty || 1)

const buyState = computed(() =>
  resolveBuyButtonState(props.listing.price, props.listing.seller_id, props.currentUserUid, props.userMoney)
)

function onImageError(e: Event) {
  (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.ITEM, 'potion')
}
</script>

<template>
  <div
    :id="'market-item-wrapper-' + listing.id"
    class="market-item-wrapper"
    :class="[
      listing.listing_type,
      item ? 'tier-' + itemTier : ''
    ]"
    :style="item ? { '--tier-color': tierColor } : {}"
  >
    <div class="seller-tag">
      <span class="s-name"><span class="emoji">👤</span> <span>{{ listing.seller_name }}</span></span>
      <span class="s-time">{{ formattedTime }}</span>
    </div>

    <template v-if="pokemon">
      <PokemonSelectionItem
        :item="{
          pokemon,
          _source: 'market',
          index: 0
        }"
        :total="getPokemonTotalPower(pokemon)"
        auto-confirm
        class="listing-card-override"
      />
    </template>
    <template v-else-if="item">
      <span
        class="tier-tag"
        :class="'tier-' + itemTier"
      >
        {{ tierLabel }}
      </span>

      <div class="explorer-item-card">
        <div class="item-visual">
          <img
            :src="getAssetUrl(ASSET_TYPES.ITEM, item.name || '')"
            :alt="itemDisplayName"
            class="i-sprite pixelated"
            @error="onImageError"
          >
        </div>
        <div class="item-details">
          <span class="i-name">{{ itemDisplayName }}</span>
          <div class="i-meta">
            <span class="i-qty">CANTIDAD: x{{ itemQuantity }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="listing-footer">
      <div class="price-info">
        <span class="price-label">PRECIO</span>
        <span class="price-val">₽{{ formatCurrency(listing.price) }}</span>
      </div>
      <button
        :id="'gts-buy-btn-' + listing.id"
        class="btn-vicio-primary btn-vicio-sm gts-buy-btn"
        :disabled="buyState.disabled"
        @click.stop="emit('buy', listing)"
      >
        {{ buyState.label }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.market-item-wrapper {
  @include shop-item-card($yellow);
  padding: 0;
  gap: 0;

  .seller-tag {
    display: flex;
    justify-content: space-between;
    padding: 10px 15px;
    background: Rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
    font-size: 8px;
    @include pixelated;
    color: $muted;

    .s-name {
      color: var(--blue);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      line-height: 1.35;

      .emoji {
        font-size: 9px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    }
  }

  .listing-card-override {
    background: transparent !important;
    padding: 15px !important;
    pointer-events: auto;
    box-shadow: none !important;
    width: 100%;
    cursor: pointer;

    :deep(.list-item) {
      transform: none;
      border: none !important;
      box-shadow: none !important;
      background: transparent !important;

      &:hover {
        transform: none;
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
      }
    }
  }

  .explorer-item-card {
    padding: 15px;
    display: flex;
    align-items: center;
    gap: 15px;

    .item-visual {
      width: 48px;
      height: 48px;
      background: Rgba(0, 0, 0, 0.2);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      .i-sprite { width: 36px; height: 36px; object-fit: contain; }
    }

    .item-details {
      flex: 1;
      .i-name {
        @include pixelated;
        font-size: 9px;
        font-weight: bold;
        color: var(--white);
        display: block;
        margin-bottom: 4px;
        line-height: 1.5;
        padding-top: 2px;
      }

      .i-meta {
        display: flex;
        align-items: center;
        gap: 8px;

        .i-qty {
          @include pixelated;
          font-size: 8px;
          color: $gray;
        }
      }
    }
  }

  .tier-tag {
    position: absolute;
    top: 38px;
    right: 12px;
    font-size: 7px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 4px;
    @include pixelated;
    letter-spacing: 0.5px;
    background: Rgba(0, 0, 0, 0.4);
    border: 1px solid var(--tier-color, #94a3b8);
    color: var(--tier-color, #94a3b8);
    z-index: calc(var(--z-base) + 2);
  }

  .listing-footer {
    padding: 12px 15px;
    background: Rgba(0, 0, 0, 0.3);
    border-top: 1px solid Rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;

    .price-info {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .price-label {
        font-size: 7px;
        color: $gray;
        @include pixelated;
      }

      .price-val {
        font-size: 11px;
        color: var(--yellow);
        font-weight: bold;
        @include pixelated;
      }
    }

    .gts-buy-btn {
      min-width: 90px;
    }
  }
}
</style>
