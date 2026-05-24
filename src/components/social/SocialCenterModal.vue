<script setup lang="ts">

import { ref, onMounted, watch } from 'vue';
import { useSocialStore } from '@/stores/social';
import { useTradeStore } from '@/stores/trade';
import { useGameStore } from '@/stores/game';
import BaseModal from '@/components/common/BaseModal.vue';
import SocialFriendsTab from './SocialFriendsTab.vue';
import SocialRequestsTab from './SocialRequestsTab.vue';
import SocialSearchTab from './SocialSearchTab.vue';
import SocialTradesTab from './SocialTradesTab.vue';
import { useWindowListener } from '@/composables/useWindowListener';

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

const isSmallScreen = ref(window.innerWidth <= 950);
const handleResize = () => { isSmallScreen.value = window.innerWidth <= 950; };
useWindowListener('resize', handleResize);

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
          <span class="title-icon">🤝</span>
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
          :class="{ active: activeTab === 'friends' }" 
          @click.stop="activeTab = 'friends'"
        >
          AMIGOS
          <span
            v-if="socialStore.notifications.chats > 0"
            class="badge-notif"
          >{{ socialStore.notifications.chats }}</span>
          <span
            v-else-if="socialStore.friends.length"
            class="badge-mini"
          >{{ socialStore.friends.length }}</span>
        </button>
        <button 
          :class="{ active: activeTab === 'requests' }" 
          @click.stop="activeTab = 'requests'"
        >
          SOLICITUDES
          <span
            v-if="socialStore.notifications.friends > 0"
            class="badge-notif"
          >{{ socialStore.notifications.friends }}</span>
        </button>
        <button 
          :class="{ active: activeTab === 'search' }" 
          @click.stop="activeTab = 'search'"
        >
          BUSCAR
        </button>
        <button 
          :class="{ active: activeTab === 'trades' }" 
          @click.stop="activeTab = 'trades'"
        >
          INTERCAMBIOS
          <span
            v-if="(tradeStore.pendingCount + gameStore.state.claimQueue.length) > 0"
            class="badge-notif"
          >{{ tradeStore.pendingCount + gameStore.state.claimQueue.length }}</span>
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
        @extend .colored; 
        color: var(--purple-light);
        text-shadow: 0 0 15px Rgba(192, 132, 252, 0.25);
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
  background: Rgba(0, 0, 0, 0.3);
  padding: 8px;
  gap: 8px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);

  button {
    flex: 1;
    background: Rgba(255, 255, 255, 0.02);
    border: 1px solid Rgba(255, 255, 255, 0.05);
    padding: 12px 6px;
    color: Rgba(255, 255, 255, 0.5);
    @include pixelated;
    font-size: 8px;
    cursor: pointer;
    border-radius: 12px;
    
    position: relative;
    font-weight: bold;
    white-space: nowrap;

    @media (max-width: 580px) {
      font-size: 7px;
      padding: 10px 4px;
    }

    @media (max-width: 480px) {
      font-size: 6px;
      padding: 8px 2px;
    }

    &:hover:not(.active) {
      background: Rgba(255, 255, 255, 0.05);
      color: Rgba(255, 255, 255, 0.8);
      border-color: Rgba(199, 125, 255, 0.15);
      transform: Translatey(-1px);
    }

    &.active {
      background: Rgba(168, 85, 247, 0.15);
      color: var(--purple-light);
      border-color: Rgba(168, 85, 247, 0.3);
      box-shadow: 
        0 4px 15px Rgba(168, 85, 247, 0.1),
        inset 0 0 10px Rgba(168, 85, 247, 0.1);
    }

    .badge-mini {
      font-size: 9px;
      background: Rgba(168, 85, 247, 0.3);
      color: var(--purple-light);
      padding: 2px 6px;
      border-radius: 6px;
      margin-left: 6px;
      border: 1px solid Rgba(168, 85, 247, 0.2);
    }

    .badge-notif {
      position: absolute;
      top: -4px;
      right: -4px;
      background: Rgba(239, 68, 68, 1);
      color: var(--white);
      font-size: 8px;
      min-width: 14px;
      height: 14px;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 8px Rgba(239, 68, 68, 0.5);
      border: 1px solid Rgba(0, 0, 0, 0.2);
    }
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  scrollbar-gutter: stable;
  min-height: 380px;
  padding: 20px;
  background: Rgba(13, 10, 25, 0.2); // Premium purple tint overlay
}

.social-tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.tab-content-inner {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: Rgba(148, 163, 184, 0.7);
  
  .icon {
    font-size: 40px;
    margin-bottom: 15px;
    filter: Drop-Shadow(0 0 12px Rgba(168, 85, 247, 0.2));
  }
  
  p {
    font-size: 14px;
    margin-bottom: 0;
  }
}
</style>
