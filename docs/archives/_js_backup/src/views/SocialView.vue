<script setup>
import { ref, onMounted } from 'vue'
import { useSocialStore } from '@/stores/social.js'

// Components
import SocialFriends from '@/components/social/SocialFriends.vue'
import SocialSearch from '@/components/social/SocialSearch.vue'
import SocialRequests from '@/components/social/SocialRequests.vue'
import SocialRankings from '@/components/social/SocialRankings.vue'

const socialStore = useSocialStore()

// 'friends', 'rankings', 'search', 'requests'
const activeTab = ref('friends') 

onMounted(() => {
  socialStore.loadSocialData()
  socialStore.startPresence()
})
</script>

<template>
  <div class="social-view">
    <!-- Tabs Nav -->
    <div class="tabs-nav">
      <button 
        class="tab-link" 
        :class="{ active: activeTab === 'friends' }"
        @click.stop="activeTab = 'friends'"
      >
        <span class="tab-label">AMIGOS</span>
      </button>
      <button 
        class="tab-link rankings" 
        :class="{ active: activeTab === 'rankings' }"
        @click.stop="activeTab = 'rankings'"
      >
        <div class="glow-box" />
        <span class="tab-label">HALL</span>
      </button>
      <button 
        class="tab-link" 
        :class="{ active: activeTab === 'search' }"
        @click.stop="activeTab = 'search'"
      >
        <span class="tab-label">BUSCAR</span>
      </button>
      <button 
        class="tab-link" 
        :class="{ active: activeTab === 'requests' }"
        @click.stop="activeTab = 'requests'"
      >
        <span class="tab-label">PEDIDOS</span>
        <span
          v-if="socialStore.notifications.friends"
          class="notif-dot"
        >{{ socialStore.notifications.friends }}</span>
      </button>
    </div>

    <!-- Content Area -->
    <div class="social-view-content">
      <SocialFriends v-if="activeTab === 'friends'" />
      <SocialRankings v-if="activeTab === 'rankings'" />
      <SocialSearch v-if="activeTab === 'search'" />
      <SocialRequests v-if="activeTab === 'requests'" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.social-view {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  padding: 0;
}

.tabs-nav {
  display: flex;
  border-bottom: 2px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(0, 0, 0, 0.4);
  -webkit-backdrop-filter: Blur(5px);
  backdrop-filter: Blur(5px);
  @include gpu-layer;
  position: sticky;
  top: 0;
  z-index: Var(--z-base);
  @include gpu-layer;
}

.tab-link {
  flex: 1;
  background: none;
  border: none;
  padding: 20px 10px;
  color: Var(--gray);
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  .tab-label {
    position: relative;
    z-index: Var(--z-base);
  }

  &.active {
    color: Var(--white);
    &:after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 10%;
      width: 80%;
      height: 2px;
      background: Var(--white);
      box-shadow: 0 0 10px Var(--white);
    }
  }

  &.rankings {
    color: Var(--yellow);
    &.active {
      &:after {
        background: Var(--yellow);
        box-shadow: 0 0 10px Var(--yellow);
      }
    }

    .glow-box {
      position: absolute;
      inset: 5px;
      background: Rgba(255, 184, 0, 0.05);
      border-radius: 8px;
      opacity: 0;
      transition: opacity 0.3s;
    }

    &:hover .glow-box, &.active .glow-box {
      opacity: 1;
    }
  }

  .notif-dot {
    position: absolute;
    top: 8px;
    right: 4px;
    background: Var(--red);
    color: Var(--white);
    border-radius: 50%;
    width: 16px;
    height: 16px;
    font-size: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: sans-serif;
    box-shadow: 0 2px 4px Rgba(0,0,0,0.4);
  }
}

.social-view-content {
  padding: 15px Var(--ui-h-padding);
  background: Rgba(0,0,0,0.1);
  @include gpu-layer;
}

</style>