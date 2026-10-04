<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

import { ref, onMounted, watch, computed } from 'vue';
import { useSocialStore } from '@/stores/social/social';
import { useTradeStore } from '@/stores/trade';
import { useGameStore } from '@/stores/game';
import BaseModal from '@/components/common/BaseModal.vue';
import type { ClaimItem } from '@/types/system/game';
import SocialFriendsTab from './SocialFriendsTab.vue';
import SocialRequestsTab from './SocialRequestsTab.vue';
import SocialSearchTab from './SocialSearchTab.vue';
import SocialTradesTab from './SocialTradesTab.vue';

interface Props {
  show?: boolean;
  initialTab?: string;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  initialTab: 'friends'
});

const socialStore = useSocialStore();
const gameStore = useGameStore();
const tradeStore = useTradeStore();

const tradeClaimsCount = computed(() =>
  (gameStore.state.claimQueue ?? []).filter(
    (c: ClaimItem) => c.source_type === 'trade' || c.source_type === 'trade_refund'
  ).length
);

const activeTab = ref(props.initialTab === 'claims' ? 'trades' : props.initialTab);
const bodyRef = ref<HTMLElement | null>(null);

watch(() => props.initialTab, (val) => {
  if (val) activeTab.value = val === 'claims' ? 'trades' : val;
});

watch(activeTab, () => {
  if (bodyRef.value) {
    bodyRef.value.scrollTop = 0;
  }
});

const ui = useUIStore()
const isSmallScreen = computed(() => ui.isSmallScreen)

const emit = defineEmits<{
  close: []
}>()

onMounted(() => {
  socialStore.loadSocialData();
  tradeStore.refreshPendingTrades();
});
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '650px'"
    :height="isSmallScreen ? '100dvh' : '520px'"
    variant="retro"
    padding="raw"
    accent-color="var(--purple-light)"
    @close="emit('close')"
  >
    <!-- Premium Header Slot -->
    <template #header>
      <div class="social-modal-header">
        <div class="social-title-group">
          <span class="emoji">🤝</span>
          <div class="title-text-wrap">
            <span class="main-title">AMIGOS</span>
            <span class="sub-title">CENTRO SOCIAL</span>
          </div>
        </div>

        <div class="header-stats">
          <div class="stat-node">
            <span class="shop-stat-label">MIS AMIGOS</span>
            <span class="value">{{ socialStore.friends.length }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="social-modal-content-inner">
      <nav class="modal-tabs">
        <button 
          v-gsap-hover
          :class="{ active: activeTab === 'friends' }" 
          @click.stop="activeTab = 'friends'"
        >
          AMIGOS
          <span
            v-if="socialStore.notifications.chats > 0"
            class="hud-notification-badge"
          >{{ socialStore.notifications.chats }}</span>
          <span
            v-else-if="socialStore.friends.length"
            class="badge-mini"
          >{{ socialStore.friends.length }}</span>
        </button>
        <button 
          v-gsap-hover
          :class="{ active: activeTab === 'requests' }" 
          @click.stop="activeTab = 'requests'"
        >
          SOLICITUDES
          <span
            v-if="socialStore.notifications.friends > 0"
            class="hud-notification-badge"
          >{{ socialStore.notifications.friends }}</span>
        </button>
        <button 
          v-gsap-hover
          :class="{ active: activeTab === 'search' }" 
          @click.stop="activeTab = 'search'"
        >
          BUSCAR
        </button>
        <button 
          v-gsap-hover
          :class="{ active: activeTab === 'trades' }" 
          @click.stop="activeTab = 'trades'"
        >
          INTERCAMBIOS
          <span
            v-if="(tradeStore.pendingCount + tradeClaimsCount) > 0"
            class="hud-notification-badge"
          >{{ tradeStore.pendingCount + tradeClaimsCount }}</span>
        </button>
      </nav>

      <div
        ref="bodyRef"
        class="modal-body custom-scrollbar"
      >
        <!-- TABS: FRIENDS -->
        <SocialFriendsTab 
          v-if="activeTab === 'friends'" 
          @search-tab="activeTab = 'search'"
        />

        <!-- TABS: REQUESTS -->
        <SocialRequestsTab v-if="activeTab === 'requests'" />

        <!-- TABS: SEARCH -->
        <SocialSearchTab v-if="activeTab === 'search'" />

        <!-- TABS: TRADES -->
        <SocialTradesTab v-if="activeTab === 'trades'" />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.social-modal-header {
  @include shop-header;

  .social-title-group {
    @include shop-header-title(var(--purple-light));
  }

  .header-stats {
    display: flex;
    gap: 24px;

    .stat-node {
      @include shop-header-stat(var(--purple-light));
      
      &.level .value { 
        color: var(--purple-light);
        text-shadow: 0 0 15px Rgb(192 132 252 / 25%);
      }
    }
  }
}

.social-modal-content-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  box-sizing: border-box;
}

.modal-tabs {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: Rgb(0 0 0 / 30%);
  border-bottom: 1px solid Rgb(255 255 255 / 5%);

  button {
    @include pixelated;
    
    position: relative;
    padding: 12px 6px;
    border: 1px solid Rgb(255 255 255 / 5%);
    border-radius: 12px;
    background: Rgb(255 255 255 / 2%);
    color: Rgb(255 255 255 / 50%);
    font-size: 8px;
    font-weight: bold;
    flex: 1;
    cursor: pointer;
    white-space: nowrap;

    &:hover:not(.active) {
      background: Rgb(255 255 255 / 5%);
      color: Rgb(255 255 255 / 80%);
      border-color: Rgb(199 125 255 / 15%);
    }

    &.active {
      background: Rgb(168 85 247 / 15%);
      color: var(--purple-light);
      border-color: Rgb(168 85 247 / 30%);
      box-shadow: 
        0 4px 15px Rgb(168 85 247 / 10%),
        inset 0 0 10px Rgb(168 85 247 / 10%);
    }

    .badge-mini {
      padding: 2px 6px;
      border: 1px solid Rgb(168 85 247 / 20%);
      border-radius: 6px;
      background: Rgb(168 85 247 / 30%);
      color: var(--purple-light);
      font-size: 9px;
      margin-left: 6px;
    }

    @media (width <= 580px) {
      padding: 10px 4px;
      font-size: 7px;
    }

    @media (width <= 480px) {
      padding: 8px 2px;
      font-size: 6px;
    }
  }
}

.modal-body {
  min-height: 380px;
  padding: 20px;
  background: Rgb(13 10 25 / 20%); // Premium purple tint overlay
  flex: 1;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.social-tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.empty-state {
  padding: 60px 20px;
  color: Rgb(148 163 184 / 70%);
  text-align: center;
  
  .icon {
    font-size: 40px;
    margin-bottom: 15px;
    filter: Drop-Shadow(0 0 12px Rgb(168 85 247 / 20%));
  }
  
  p {
    font-size: 14px;
    margin-bottom: 0;
  }
}
</style>
