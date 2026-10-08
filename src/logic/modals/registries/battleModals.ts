import { defineResilientAsyncComponent as defineAsyncComponent } from '@/logic/utils/resilientComponent';

export const BATTLE_MODAL_REGISTRY = {
  BattleReplay: defineAsyncComponent(() => import('@/components/battle/BattleReplayModal.vue')),
  Arena: defineAsyncComponent(() => import('@/components/modals/ArenaModal.vue')),
  BattleSwitch: defineAsyncComponent(() => import('@/components/modals/PokemonSelectionModal.vue')),
  PvPChallenge: defineAsyncComponent(() => import('@/components/modals/PvPChallengeModal.vue')),
  PvPOpponentOffline: defineAsyncComponent(() => import('@/components/modals/PvPOpponentOfflineModal.vue')),
  RankedSeasonReward: defineAsyncComponent(() => import('@/components/modals/RankedSeasonRewardModal.vue')),
};

export type BattleModalKey = keyof typeof BATTLE_MODAL_REGISTRY;
