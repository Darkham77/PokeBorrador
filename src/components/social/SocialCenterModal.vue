<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSocialStore } from '@/stores/social';
import TradeClaimStatus from '@/components/social/TradeClaimStatus.vue';
import { useGameStore } from '@/stores/game';
import BaseModal from '@/components/common/BaseModal.vue';
import SocialFriendsTab from './SocialFriendsTab.vue';
import SocialRequestsTab from './SocialRequestsTab.vue';
import SocialSearchTab from './SocialSearchTab.vue';

interface Props {
  show?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  show: false
});

const socialStore = useSocialStore() as any;
const gameStore = useGameStore() as any;

const activeTab = ref('friends'); // 'friends', 'requests', 'search', 'claims'

const emit = defineEmits<{
  (e: 'close'): void
}>();

onMounted(() => {
  socialStore.loadSocialData();
});
</script>

<template>
  <BaseModal
    :show="show"
    title="CENTRO SOCIAL"
    title-color="var(--purple-light)"
    header-background="Rgba(16, 24, 34, 1)"
    max-width="500px"
    padding="raw"
    @close="emit('close')"
  >
    <div class="social-modal-content-inner">
      <nav class="modal-tabs">
        <button 
          :class="{ active: activeTab === 'friends' }" 
          @click.stop="activeTab = 'friends'"
        >
          AMIGOS
          <span
            v-if="socialStore.friends.length"
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
          :class="{ active: activeTab === 'claims' }" 
          @click.stop="activeTab = 'claims'"
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
          class="tab-content-inner"
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
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "sass:string";

.social-modal-content-inner {
  display: flex;
  flex-direction: column;
  background: Rgba(16, 24, 34, 1);
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  overflow: hidden;
}

.modal-tabs {
  display: flex;
  background: Rgba(0, 0, 0, 0.2);
  padding: 4px;
  gap: 4px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);

  button {
    flex: 1;
    background: transparent;
    border: none;
    padding: 12px;
    color: Rgba(255, 255, 255, 0.5);
    @include pixelated;
    font-size: 7px;
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.2s;
    position: relative;

    &.active {
      background: Rgba(157, 78, 221, 0.15);
      color: var(--purple-light);
      box-shadow: inset 0 0 10px Rgba(157, 78, 221, 0.1);
    }

    .badge-mini {
      font-size: 9px;
      background: Rgba(255, 255, 255, 0.1);
      padding: 2px 5px;
      border-radius: 6px;
      margin-left: 5px;
    }

    .badge-notif {
      position: absolute;
      top: 50%;
      right: 10px;
      transform: TranslateY(-50%);
      background: Rgba(239, 68, 68, 1);
      color: var(--white);
      font-size: 9px;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px Rgba(239, 68, 68, 0.5);
    }
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 20px;
}

</style>
