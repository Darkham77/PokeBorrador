import { defineResilientAsyncComponent as defineAsyncComponent } from '@/logic/utils/resilientComponent';

export const SHOP_MODAL_REGISTRY = {
  Shop: defineAsyncComponent(() => import('@/components/modals/ShopModal.vue')),
  GlobalMarket: defineAsyncComponent(() => import('@/components/modals/GlobalMarketModal.vue')),
  BCShop: defineAsyncComponent(() => import('@/components/modals/BCShopModal.vue')),
  ReputationShop: defineAsyncComponent(() => import('@/components/modals/ReputationShopModal.vue')),
  BlackMarket: defineAsyncComponent(() => import('@/components/modals/BlackMarketModal.vue')),
  WarShop: defineAsyncComponent(() => import('@/components/modals/war-shop/WarShopModal.vue')),
};

export type ShopModalKey = keyof typeof SHOP_MODAL_REGISTRY;
