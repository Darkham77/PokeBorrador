import { defineAsyncComponent } from 'vue'

/**
 * Modal Registry
 * Maps modal names to their lazy-loaded components.
 */
export const MODAL_REGISTRY = {
  Confirm: defineAsyncComponent(() => import('@/components/modals/ConfirmModal.vue')),
  Prompt: defineAsyncComponent(() => import('@/components/modals/PromptModal.vue')),
  Shop: defineAsyncComponent(() => import('@/components/modals/ShopModal.vue')),
  PokemonCenter: defineAsyncComponent(() => import('@/components/modals/HealModal.vue')),
  Inventory: defineAsyncComponent(() => import('@/components/modals/InventoryModal.vue')),
  PokemonDetail: defineAsyncComponent(() => import('@/components/PokemonDetailModal.vue')),
  MoveDetail: defineAsyncComponent(() => import('@/components/MoveDetailModal.vue')),
  Evolution: defineAsyncComponent(() => import('@/components/evolution/EvolutionScene.vue')),
  Settings: defineAsyncComponent(() => import('@/components/SettingsModal.vue')),
  Profile: defineAsyncComponent(() => import('@/components/ProfileModal.vue')),
  Library: defineAsyncComponent(() => import('@/components/LibraryModal.vue')),
  Cosmetics: defineAsyncComponent(() => import('@/components/modals/CosmeticsModal.vue')),
  FossilRevival: defineAsyncComponent(() => import('@/components/modals/FossilRevivalModal.vue')),
  ClassSelection: defineAsyncComponent(() => import('@/components/modals/ClassSelectionModal.vue')),
  ClassMissions: defineAsyncComponent(() => import('@/components/modals/ClassMissionsModal.vue')),
  MoveLearning: defineAsyncComponent(() => import('@/components/modals/MoveLearningModal.vue')),
  MoveRelearner: defineAsyncComponent(() => import('@/components/modals/MoveRelearnerModal.vue')),
  PokemonSelection: defineAsyncComponent(() => import('@/components/modals/PokemonSelectionModal.vue')),
  WarShop: defineAsyncComponent(() => import('@/components/modals/WarShopModal.vue')),
  PassiveTeamEditor: defineAsyncComponent(() => import('@/components/PassiveTeamEditorModal.vue')),
  FactionChoice: defineAsyncComponent(() => import('@/components/FactionChoiceModal.vue')),
  SocialCenter: defineAsyncComponent(() => import('@/components/social/SocialCenterModal.vue')),
  PokedexDetail: defineAsyncComponent(() => import('@/components/pokedex/PokedexDetailModal.vue')),
  HatchAnimation: defineAsyncComponent(() => import('@/components/breeding/HatchAnimationModal.vue')),
  BreedingPicker: defineAsyncComponent(() => import('@/components/BreedingPickerModal.vue')),
  BattleSwitch: defineAsyncComponent(() => import('@/components/battle/BattleSwitchModal.vue')),
  BattleInventory: defineAsyncComponent(() => import('@/components/battle/BattleInventoryModal.vue')),
  SessionConflict: defineAsyncComponent(() => import('@/components/auth/SessionConflictModal.vue')),
  EggScanner: defineAsyncComponent(() => import('@/components/EggScannerModal.vue')),
  Trade: defineAsyncComponent(() => import('@/components/TradeView.vue')),
  ItemTarget: defineAsyncComponent(() => import('@/components/modals/ItemTargetModal.vue')),
  HealOverlay: defineAsyncComponent(() => import('@/components/modals/HealModal.vue')),
  NaturePatch: defineAsyncComponent(() => import('@/components/modals/NaturePatchModal.vue')),
  PPUp: defineAsyncComponent(() => import('@/components/modals/PPUpModal.vue')),
  AbilityPill: defineAsyncComponent(() => import('@/components/modals/AbilityPillModal.vue')),
  StonePicker: defineAsyncComponent(() => import('@/components/modals/StonePickerModal.vue')),
  Fishing: defineAsyncComponent(() => import('@/components/modals/FishingModal.vue'))
}
