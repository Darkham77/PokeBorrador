import { defineResilientAsyncComponent as defineAsyncComponent } from '@/logic/utils/resilientComponent';

export const POKEMON_MODAL_REGISTRY = {
  PokemonDetail: defineAsyncComponent(() => import('@/components/modals/UnifiedPokemonDetailModal.vue')),
  PokedexDetail: defineAsyncComponent(() => import('@/components/modals/UnifiedPokemonDetailModal.vue')),
  MoveDetail: defineAsyncComponent(() => import('@/components/modals/MoveDetailModal.vue')),
  Evolution: defineAsyncComponent(() => import('@/components/evolution/EvolutionScene.vue')),
  MoveLearning: defineAsyncComponent(() => import('@/components/modals/MoveLearningModal.vue')),
  MoveRelearner: defineAsyncComponent(() => import('@/components/modals/MoveRelearnerModal.vue')),
  PokemonSelection: defineAsyncComponent(() => import('@/components/modals/PokemonSelectionModal.vue')),
  HatchAnimation: defineAsyncComponent(() => import('@/components/breeding/HatchAnimationModal.vue')),
  Daycare: defineAsyncComponent(() => import('@/components/modals/DaycareModal.vue')),
  NaturePatch: defineAsyncComponent(() => import('@/components/modals/NaturePatchModal.vue')),
  PPUp: defineAsyncComponent(() => import('@/components/modals/PPUpModal.vue')),
  AbilityPill: defineAsyncComponent(() => import('@/components/modals/AbilityPillModal.vue')),
  StonePicker: defineAsyncComponent(() => import('@/components/modals/StonePickerModal.vue')),
  TeamManagement: defineAsyncComponent(() => import('@/components/modals/TeamManagementModal.vue')),
  BoxPokemonMenu: defineAsyncComponent(() => import('@/components/box/BoxPokemonMenu.vue')),
  BoxMove: defineAsyncComponent(() => import('@/components/box/BoxMoveModal.vue')),
};

export type PokemonModalKey = keyof typeof POKEMON_MODAL_REGISTRY;
