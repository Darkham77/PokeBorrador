<script setup lang="ts">
const GSAP_ANIM_Y_OFFSET_PX = 15;
const GSAP_ANIM_SCALE_START = 0.95;
const GSAP_ANIM_GRID_DURATION_SEC = 0.4;
const GSAP_ANIM_GRID_STAGGER_SEC = 0.04;
import { gsap } from 'gsap';
import { ref, computed, watch, nextTick } from 'vue';

import BaseModal from '@/components/common/BaseModal.vue';
import ShopSearchControls from '@/components/common/ShopSearchControls.vue';
import UnifiedSidebar from '@/components/common/UnifiedSidebar.vue';
import { compareShopItems } from '@/composables/inventory/useShopLogic';
import { getItemById, type ItemId } from '@/data/inventory/items';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import type { ItemTier } from '@/types/inventory/items';
import type { ItemSortKey } from '@/types/system/game';

import ReputationShopItemCard from './reputation-shop/ReputationShopItemCard.vue';

interface Props {
  show?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  show: false
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const gameStore = useGameStore();
const uiStore = useUIStore();

const isSmallScreen = computed(() => uiStore.isSmallScreen);

interface ReputationShopItem {
  id: string;
  repCost: number;
  givesId: ItemId;
  givesQty: number;
  tier: ItemTier;
  cat: string;
}

function resolveItemName(item: ReputationShopItem): string {
  const catalogItem = getItemById(item.givesId);
  return catalogItem.name;
}

function resolveItemDesc(item: ReputationShopItem): string {
  const catalogItem = getItemById(item.givesId);
  if (!catalogItem.desc) {
    throw new Error(
      `El objeto '${item.givesId}' de la Tienda de Reputación no tiene descripción configurada en el catálogo.`
    );
  }
  return catalogItem.desc;
}

function resolveItemSprite(item: ReputationShopItem): string {
  const catalogItem = getItemById(item.givesId);
  if (!catalogItem.sprite) {
    throw new Error(
      `El objeto '${item.givesId}' de la Tienda de Reputación no tiene sprite configurado en el catálogo.`
    );
  }
  return catalogItem.sprite;
}

const REP_COST_ULTRABALL = 15 as const;
const REP_COST_TM_EARTHQUAKE = 50 as const;
const REP_COST_REVIVE = 20 as const;
const REP_COST_FULL_HEAL = 15 as const;
const REP_COST_IV_SCANNER = 40 as const;
const REP_COST_STAR_PIECE = 30 as const;

const REPUTATION_SHOP_ITEMS: ReputationShopItem[] = [
  {
    id: 'repultraball',
    repCost: REP_COST_ULTRABALL,
    givesId: 'ultraball',
    givesQty: 3,
    tier: 'rare',
    cat: 'pokeballs'
  },
  {
    id: 'reptmearthquake',
    repCost: REP_COST_TM_EARTHQUAKE,
    givesId: 'tm26',
    givesQty: 1,
    tier: 'legend',
    cat: 'tms'
  },
  {
    id: 'reprevive',
    repCost: REP_COST_REVIVE,
    givesId: 'revive',
    givesQty: 5,
    tier: 'epic',
    cat: 'potions'
  },
  {
    id: 'repfullheal',
    repCost: REP_COST_FULL_HEAL,
    givesId: 'fullheal',
    givesQty: 3,
    tier: 'rare',
    cat: 'potions'
  },
  {
    id: 'repivscanner',
    repCost: REP_COST_IV_SCANNER,
    givesId: 'ivscanner',
    givesQty: 1,
    tier: 'epic',
    cat: 'tools'
  },
  {
    id: 'repstarpiece',
    repCost: REP_COST_STAR_PIECE,
    givesId: 'starpiece',
    givesQty: 3,
    tier: 'rare',
    cat: 'otros'
  }
];

const reputation = computed(() => {
  return Number(gameStore.state.classData?.reputation) || 0;
});

const activeTab = ref('todos');
const search = ref('');
const sortKey = ref<ItemSortKey>('name');
const sortOrder = ref<'asc' | 'desc'>('asc');
const gridRef = ref<HTMLElement | null>(null);

const filteredItems = computed<
  (ReputationShopItem & { name: string; desc: string; sprite: string })[]
>(() => {
  const items = REPUTATION_SHOP_ITEMS.filter((item) => {
    if (activeTab.value !== 'todos' && item.cat !== activeTab.value) return false;
    if (search.value && !resolveItemName(item).toLowerCase().includes(search.value.toLowerCase()))
      return false;
    return true;
  }).map((item) => ({
    ...item,
    name: resolveItemName(item),
    desc: resolveItemDesc(item),
    sprite: resolveItemSprite(item)
  }));

  return items.toSorted((a, b) =>
    compareShopItems(a, b, sortKey.value, sortOrder.value, (item) => item.repCost || 0)
  );
});

const availableCategories = computed<string[]>(() => {
  const cats = new Set<string>();
  for (const item of REPUTATION_SHOP_ITEMS) {
    cats.add(item.cat);
  }
  return Array.from(cats);
});

const animateGrid = async (): Promise<void> => {
  await nextTick();
  if (!gridRef.value) return;
  const cards = gridRef.value.querySelectorAll('.rep-shop-item-card');
  if (cards.length > 0) {
    gsap.killTweensOf(cards);
    gsap.fromTo(
      cards,
      { opacity: 0, y: GSAP_ANIM_Y_OFFSET_PX, scale: GSAP_ANIM_SCALE_START },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: GSAP_ANIM_GRID_DURATION_SEC,
        stagger: GSAP_ANIM_GRID_STAGGER_SEC,
        ease: 'power1.out',
        clearProps: 'transform,scale'
      }
    );
  }
};

watch([activeTab, search], () => {
  animateGrid();
});

watch(
  () => props.show,
  (val) => {
    if (val) {
      activeTab.value = 'todos';
      search.value = '';
      animateGrid();
    }
  }
);

const close = (): void => {
  emit('close');
};
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '900px'"
    variant="retro"
    padding="raw"
    accent-color="#3b82f6"
    @close="close"
  >
    <!-- Header -->
    <template #header>
      <div class="rep-shop-modal-header">
        <div class="rep-shop-title-group">
          <span class="emoji">🎖️</span>
          <div class="title-text-wrap">
            <span class="main-title">TIENDA DE REPUTACIÓN</span>
            <span class="sub-title">EXCLUSIVO PARA EL ENTRENADOR DE RUTA</span>
          </div>
        </div>

        <div class="header-stats">
          <div class="stat-node reputation">
            <span class="shop-stat-label">MI REPUTACIÓN</span>
            <span class="value">
              <span class="emoji rep-star-icon">★</span>
              {{ reputation }}
            </span>
          </div>

          <div class="stat-node level">
            <span class="shop-stat-label">NIVEL ENTRENADOR</span>
            <span class="value">Nv. {{ gameStore.state.trainerLevel }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="shop-modal-container">
      <!-- Sidebar de Categorías -->
      <UnifiedSidebar
        v-model:active-category="activeTab"
        main-tab="productos"
        :available-categories="availableCategories"
        accent-color="#3b82f6"
      />

      <!-- Contenido Principal -->
      <div class="shop-main">
        <!-- Buscador de Objetos -->
        <ShopSearchControls
          v-model:search="search"
          v-model:sort-key="sortKey"
          v-model:sort-order="sortOrder"
          placeholder="Buscar objeto por reputación..."
          accent-color="#3b82f6"
        >
          <template #price-icon>
            <!-- Center star vertically using SVG -->
            <svg
              viewBox="0 0 24 24"
              style="display: block; width: 10px; height: 10px"
              fill="currentColor"
            >
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              />
            </svg>
          </template>
        </ShopSearchControls>

        <!-- Rejilla de Objetos -->
        <div class="rep-shop-grid-wrapper custom-scrollbar">
          <div v-if="filteredItems.length > 0" class="rep-shop-premium-grid">
            <ReputationShopItemCard v-for="item in filteredItems" :key="item.id" :item="item" />
          </div>

          <!-- Empty State -->
          <div v-else class="shop-empty-state">
            <span class="emoji empty-icon">🔍</span>
            <div class="empty-text">
              <h3>Sin resultados</h3>
              <p>Prueba con otros términos de búsqueda en esta sección</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use '@/styles/core/_mixins' as *;
@use '@/styles/components/shop' as *;
</style>
