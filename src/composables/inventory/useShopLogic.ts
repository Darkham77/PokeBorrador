import { gsap } from 'gsap';
import { ref, computed, watch, nextTick, type Ref, type ComputedRef } from 'vue';

import type { ItemId } from '@/data/inventory/items';
import { logger } from '@/logic/utils/logger.ts';
import { useShopStore } from '@/stores/inventory/shop';
import type { ItemTier, ShopMainTab } from '@/types/inventory/items';
import type { ItemSortKey } from '@/types/system/game';

interface ShopItem {
  id: ItemId;
  name: string;
  cat: string;
  price: number;
  bcPrice?: number;
  desc: string;
  sprite: string;
  unlockLv?: number;
  tier?: ItemTier;
  icon?: string;
  trainerShop?: boolean;
  market?: boolean;
  showInBCShop?: boolean;
  showInNormalShop?: boolean;
}

export interface UseShopLogicReturn {
  activeMainTab: Ref<ShopMainTab>;
  activeTab: Ref<string>;
  search: Ref<string>;
  sortKey: Ref<ItemSortKey>;
  sortOrder: Ref<'asc' | 'desc'>;
  filteredItems: ComputedRef<ShopItem[]>;
  availableCategories: ComputedRef<string[]>;
  animateGrid: () => void;
}

export function compareShopItems<T extends { name: string; tier?: ItemTier }>(
  a: T,
  b: T,
  sortKey: string,
  sortOrder: 'asc' | 'desc',
  getPrice: (item: T) => number
): number {
  let comp: number;
  if (sortKey === 'price') {
    comp = getPrice(a) - getPrice(b);
  } else if (sortKey === 'rarity') {
    const tiers: Record<ItemTier, number> = { common: 0, rare: 1, epic: 2, legend: 3 };
    const aT = tiers[a.tier || 'common'] ?? 0;
    const bT = tiers[b.tier || 'common'] ?? 0;
    comp = bT - aT;
  } else {
    comp = a.name.localeCompare(b.name);
  }
  return sortOrder === 'asc' ? comp : -comp;
}

export function useShopLogic(options: {
  isBCShop: boolean;
  initialCategory?: string;
  show: Ref<boolean>;
  cardSelector: string;
}): UseShopLogicReturn {
  const shopStore = useShopStore();

  const activeMainTab = ref<ShopMainTab>('productos');
  const activeTab = ref(options.initialCategory || 'todos');
  const search = ref('');
  const sortKey = ref<ItemSortKey>('name');
  const sortOrder = ref<'asc' | 'desc'>('asc');

  const filteredItems = computed<ShopItem[]>(() => {
    const items = (shopStore.SHOP_ITEMS as ShopItem[]).filter((item) => {
      const visibilityFlag = options.isBCShop ? item.showInBCShop : item.showInNormalShop;
      if (!visibilityFlag) return false;

      const resolvedCat = item.cat || 'otros';
      const isMaterialCat = (['raw_material', 'refined_material', 'component'] as const).includes(
        resolvedCat as never
      );
      if ((activeMainTab.value === 'materiales') !== isMaterialCat) return false;
      if (activeTab.value !== 'todos' && resolvedCat !== activeTab.value) return false;
      if (search.value && !item.name.toLowerCase().includes(search.value.toLowerCase()))
        return false; // text-ok: UI text display localization string
      return true;
    });

    return items.toSorted((a, b) =>
      compareShopItems(a, b, sortKey.value, sortOrder.value, (item) =>
        options.isBCShop ? (item.bcPrice ?? item.price ?? 0) : item.price || 0
      )
    );
  });

  const availableCategories = computed<string[]>(() => {
    const cats = new Set<string>();
    for (const item of shopStore.SHOP_ITEMS as ShopItem[]) {
      const visibilityFlag = options.isBCShop ? item.showInBCShop : item.showInNormalShop;
      if (!visibilityFlag) continue;
      cats.add(item.cat || 'otros');
    }
    return Array.from(cats);
  });

  const MAX_GRID_ANIMATED_CARDS = 24;

  const animateGrid = (): void => {
    nextTick(() => {
      const cards = document.querySelectorAll(options.cardSelector);
      if (cards.length > 0) {
        gsap.killTweensOf(cards);

        const maxAnimate = Math.min(cards.length, MAX_GRID_ANIMATED_CARDS);
        const cardsToAnimate = Array.from(cards).slice(0, maxAnimate);
        const remainingCards = Array.from(cards).slice(maxAnimate);

        if (remainingCards.length > 0) {
          gsap.set(remainingCards, { opacity: 1, y: 0, scale: 1 });
        }

        const GSAP_SHOP_CARD_Y_OFFSET_PX = 15;
        const GSAP_SHOP_CARD_INITIAL_SCALE = 0.95;

        gsap.fromTo(
          cardsToAnimate,
          { opacity: 0, y: GSAP_SHOP_CARD_Y_OFFSET_PX, scale: GSAP_SHOP_CARD_INITIAL_SCALE },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.2,
            stagger: 0.01,
            ease: 'power1.out',
            clearProps: 'transform,scale'
          }
        );
      }
    }).catch((err) => {
      logger.warn('Handled promise rejection:', { cause: err });
    });
  };

  watch([activeTab, search, activeMainTab], () => {
    animateGrid();
  });

  watch(
    () => options.show.value,
    (val) => {
      if (val) {
        activeTab.value = options.initialCategory || 'todos';
        search.value = '';
        animateGrid();
      }
    }
  );

  return {
    activeMainTab,
    activeTab,
    search,
    sortKey,
    sortOrder,
    filteredItems,
    availableCategories,
    animateGrid
  };
}
