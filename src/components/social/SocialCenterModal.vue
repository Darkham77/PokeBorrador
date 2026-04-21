<script setup>
import { ref, onMounted } from 'vue';
import { useSocialStore } from '@/stores/social';
import { useChatStore } from '@/stores/chat';
import { useTradeStore } from '@/stores/trade';
import { useAuthStore } from '@/stores/auth';
import { useLivePvPStore } from '@/stores/livePvP';
import TradeClaimStatus from '@/components/social/TradeClaimStatus.vue';
import { useGameStore } from '@/stores/game';
import SocialFriendsTab from './SocialFriendsTab.vue';
import SocialRequestsTab from './SocialRequestsTab.vue';
import SocialSearchTab from './SocialSearchTab.vue';

const socialStore = useSocialStore();
const chatStore = useChatStore();
const tradeStore = useTradeStore();
const _authStore = useAuthStore();
const livePvP = useLivePvPStore();
const gameStore = useGameStore();

const activeTab = ref('friends'); // 'friends', 'requests', 'search', 'claims'
const emit = defineEmits(['close']);

onMounted(() => {
  socialStore.loadSocialData();
});
</script>

<template>
  <div
    class="social-modal-overlay"
    @click.self="emit('close')"
  >
    <div class="social-modal-content animate-slide-up">
      <header class="modal-header">
        <div class="title">
          CENTRO SOCIAL
        </div>
        <button
          class="close-btn"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <nav class="modal-tabs">
        <button 
          :class="{ active: activeTab === 'friends' }" 
          @click="activeTab = 'friends'"
        >
          AMIGOS
          <span
            v-if="socialStore.friends.length"
            class="badge-mini"
          >{{ socialStore.friends.length }}</span>
        </button>
        <button 
          :class="{ active: activeTab === 'requests' }" 
          @click="activeTab = 'requests'"
        >
          SOLICITUDES
          <span
            v-if="socialStore.notifications.friends > 0"
            class="badge-notif"
          >{{ socialStore.notifications.friends }}</span>
        </button>
        <button 
          :class="{ active: activeTab === 'search' }" 
          @click="activeTab = 'search'"
        >
          BUSCAR
        </button>
        <button 
          :class="{ active: activeTab === 'claims' }" 
          @click="activeTab = 'claims'"
        >
          RECLAMOS
          <span
            v-if="gameStore.state.claimQueue.length > 0"
            class="badge-notif"
          >{{ gameStore.state.claimQueue.length }}</span>
        </button>
      </nav>

      <div class="modal-body custom-scrollbar">
        <!-- TABS: FRIENDS -->
        <SocialFriendsTab 
          v-if="activeTab === 'friends'" 
          @search-tab="activeTab = 'search'"
        />

        <!-- TABS: REQUESTS -->
        <SocialRequestsTab v-if="activeTab === 'requests'" />

        <!-- TABS: SEARCH -->
        <SocialSearchTab v-if="activeTab === 'search'" />

        <!-- TABS: CLAIMS -->
        <div
          v-if="activeTab === 'claims'"
          class="tab-content"
        >
          <TradeClaimStatus />
          
          <div
            v-if="gameStore.state.claimQueue.length === 0"
            class="empty-state"
          >
            <div class="icon">
              📦
            </div>
            <p>No tenés reclamos pendientes.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "sass:string";

.social-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  transform: translateZ(0);
}

.social-modal-content {
  width: min(500px, 100%);
  background: #101822;
  border: 1px solid rgba(199, 125, 255, 0.25);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.modal-header {
  padding: 20px;
  background: linear-gradient(90deg, #161e2e, #10172a);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title {
    font-family: 'Press Start 2P', cursive;
    font-size: 10px;
    color: var(--purple-light);
    letter-spacing: 1px;
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.05);
    border: none;
    color: #fff;
    font-size: 24px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover { background: rgba(239, 68, 68, 0.2); }
  }
}

.modal-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  gap: 4px;

  button {
    flex: 1;
    background: transparent;
    border: none;
    padding: 12px;
    color: #64748b;
    font-family: 'Press Start 2P', cursive;
    font-size: 7px;
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.2s;
    position: relative;

    &.active {
      background: rgba(157, 78, 221, 0.15);
      color: var(--purple-light);
      box-shadow: inset 0 0 10px rgba(157, 78, 221, 0.1);
    }

    .badge-mini {
      font-size: 9px;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 5px;
      border-radius: 6px;
      margin-left: 5px;
    }

    .badge-notif {
      position: absolute;
      top: 50%;
      right: 10px;
      transform: translateY(-50%);
      background: #ef4444;
      color: #fff;
      font-size: 9px;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
    }
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 20px;
}

.animate-slide-up {
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

</style>
