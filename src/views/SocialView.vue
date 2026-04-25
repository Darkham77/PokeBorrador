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
        @click="activeTab = 'friends'"
      >
        <span class="tab-label">AMIGOS</span>
      </button>
      <button 
        class="tab-link rankings" 
        :class="{ active: activeTab === 'rankings' }"
        @click="activeTab = 'rankings'"
      >
        <div class="glow-box" />
        <span class="tab-label">HALL</span>
      </button>
      <button 
        class="tab-link" 
        :class="{ active: activeTab === 'search' }"
        @click="activeTab = 'search'"
      >
        <span class="tab-label">BUSCAR</span>
      </button>
      <button 
        class="tab-link" 
        :class="{ active: activeTab === 'requests' }"
        @click="activeTab = 'requests'"
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
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  background: rgba(0,0,0,0.4);
  -webkit-backdrop-filter: Blur(5px); -webkit-backdrop-filter: Blur(5px); backdrop-filter: Blur(5px);
  position: sticky;
  top: 0;
  z-index: var(--z-base);
  @include gpu-layer;
}

.tab-link {
  flex: 1;
  background: none;
  border: none;
  padding: 20px 10px;
  color: #888;
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
    z-index: var(--z-base);
  }

  &.active {
    color: $white;
    &:after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 10%;
      width: 80%;
      height: 2px;
      background: $white;
      box-shadow: 0 0 10px $white;
    }
  }

  &.rankings {
    color: #fbbf24;
    &.active {
      &:after {
        background: #fbbf24;
        box-shadow: 0 0 10px #fbbf24;
      }
    }

    .glow-box {
      position: absolute;
      inset: 5px;
      background: rgba(251, 191, 36, 0.05);
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
    background: #ff4757;
    color: white;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    font-size: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: sans-serif;
    box-shadow: 0 2px 4px rgba(0,0,0,0.4);
  }
}

.social-view-content {
  padding: 15px var(--ui-h-padding);
  background: rgba(0,0,0,0.1);
  @include gpu-layer;
}

</style>
