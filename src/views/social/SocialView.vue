<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSocialStore } from '@/stores/social/social'
import { gsap } from 'gsap'
import { VIEW_TAB_FADE_OUT_DURATION_SEC, VIEW_TAB_FADE_IN_DURATION_SEC } from '@/logic/constants/animations.ts'

// Components
import SocialFriendsTab from '@/components/social/SocialFriendsTab.vue'
import SocialSearchTab from '@/components/social/SocialSearchTab.vue'
import SocialRequestsTab from '@/components/social/SocialRequestsTab.vue'
import SocialRankings from '@/components/social/SocialRankings.vue'

const socialStore = useSocialStore()

// 'friends', 'rankings', 'search', 'requests'
const activeTab = ref('friends') 

function selectTab(tab: string) {
  if (activeTab.value === tab) return
  
  gsap.to('.social-view-content', {
    opacity: 0,
    y: 8,
    duration: VIEW_TAB_FADE_OUT_DURATION_SEC,
    ease: 'power2.inOut',
    onComplete: () => {
      activeTab.value = tab
      gsap.to('.social-view-content', {
        opacity: 1,
        y: 0,
        duration: VIEW_TAB_FADE_IN_DURATION_SEC,
        ease: 'power2.out'
      })
    }
  })
}

onMounted(async () => {
  await socialStore.loadSocialData()
  await socialStore.refreshFriendsPresence()
})
</script>

<template>
  <div class="social-view">
    <!-- Tabs Nav -->
    <div class="tabs-nav">
      <button 
        class="tab-link" 
        :class="{ active: activeTab === 'friends' }"
        @click.stop="selectTab('friends')"
      >
        <span class="tab-label">AMIGOS</span>
      </button>
      <button 
        class="tab-link rankings" 
        :class="{ active: activeTab === 'rankings' }"
        @click.stop="selectTab('rankings')"
      >
        <div class="glow-box" />
        <span class="tab-label">HALL</span>
      </button>
      <button 
        class="tab-link" 
        :class="{ active: activeTab === 'search' }"
        @click.stop="selectTab('search')"
      >
        <span class="tab-label">BUSCAR</span>
      </button>
      <button 
        class="tab-link" 
        :class="{ active: activeTab === 'requests' }"
        @click.stop="selectTab('requests')"
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
      <SocialFriendsTab 
        v-if="activeTab === 'friends'" 
        @search-tab="selectTab('search')"
      />
      <SocialRankings v-if="activeTab === 'rankings'" />
      <SocialSearchTab v-if="activeTab === 'search'" />
      <SocialRequestsTab v-if="activeTab === 'requests'" />
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
  background: Rgba(0, 0, 0, 0.95);
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
  color: var(--gray);
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
  position: relative;
  
  display: flex;
  align-items: center;
  justify-content: center;

  .tab-label {
    position: relative;
    z-index: var(--z-base);
  }

  &.active {
    color: var(--white);
    &:after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 10%;
      width: 80%;
      height: 2px;
      background: var(--white);
      box-shadow: 0 0 10px var(--white);
    }
  }

  &.rankings {
    color: var(--yellow);
    &.active {
      &:after {
        background: var(--yellow);
        box-shadow: 0 0 10px var(--yellow);
      }
    }

    .glow-box {
      position: absolute;
      inset: 5px;
      background: Rgba(255, 184, 0, 0.05);
      border-radius: 8px;
      opacity: 0;
      
    }

    &:hover .glow-box, &.active .glow-box {
      opacity: 1;
    }
  }

  .notif-dot {
    position: absolute;
    top: 8px;
    right: 4px;
    background: var(--red);
    color: var(--white);
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
  padding: 15px var(--ui-h-padding);
  background: Rgba(0,0,0,0.1);
  @include gpu-layer;
}
</style>
