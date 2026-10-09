<script setup lang="ts">
import { ref } from 'vue'
import { useSocialStore } from '@/stores/social/social'
import { useSocialDataLoader } from '@/loaders/socialDataLoader'
import { gsap } from 'gsap'
import { VIEW_TAB_FADE_OUT_DURATION_SEC, VIEW_TAB_FADE_IN_DURATION_SEC } from '@/logic/constants/animations.ts'

// Components
import SocialFriendsTab from '@/components/social/SocialFriendsTab.vue'
import SocialSearchTab from '@/components/social/SocialSearchTab.vue'
import SocialRequestsTab from '@/components/social/SocialRequestsTab.vue'
import SocialRankings from '@/components/social/SocialRankings.vue'

const socialStore = useSocialStore()
const { data: _socialSummary } = useSocialDataLoader()

const contentRef = ref<HTMLElement | null>(null)

// 'friends', 'rankings', 'search', 'requests'
const activeTab = ref('friends') 

function selectTab(tab: string) {
  if (activeTab.value === tab) return
  if (!contentRef.value) {
    activeTab.value = tab
    return
  }
  
  gsap.to(contentRef.value, {
    opacity: 0,
    y: 8,
    duration: VIEW_TAB_FADE_OUT_DURATION_SEC,
    ease: 'power2.inOut',
    onComplete: () => {
      activeTab.value = tab
      if (contentRef.value) {
        gsap.to(contentRef.value, {
          opacity: 1,
          y: 0,
          duration: VIEW_TAB_FADE_IN_DURATION_SEC,
          ease: 'power2.out'
        })
      }
    }
  })
}
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
        <span class="glow-box" />
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
    <div
      ref="contentRef"
      class="social-view-content"
    >
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
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 0;
  background: transparent;
}

.tabs-nav {
  @include gpu-layer;

  position: sticky;
  top: 0;
  z-index: var(--z-base);
  display: flex;
  background: rgb(0 0 0 / 95%);
  border-bottom: 2px solid rgb(255 255 255 / 10%);
}

.tab-link {
  @include pixelated;

  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 10px;
  border: none;
  background: none;
  color: var(--gray);
  font-size: 8px;
  flex: 1;
  cursor: pointer;

  .tab-label {
    position: relative;
    z-index: var(--z-base);
  }

  &.active {
    color: var(--white);
    &::after {
      position: absolute;
      bottom: -2px;
      left: 10%;
      width: 80%;
      height: 2px;
      background: var(--white);
      content: '';
      box-shadow: 0 0 10px var(--white);
    }
  }

  &.rankings {
    color: var(--yellow);

    &:hover .glow-box, &.active .glow-box {
      opacity: 1;
    }
    &.active {
      &::after {
        background: var(--yellow);
        box-shadow: 0 0 10px var(--yellow);
      }
    }

    .glow-box {
      position: absolute;
      border-radius: 8px;
      background: rgb(255 184 0 / 5%);
      opacity: 0;
      inset: 5px;
      
    }
  }

  .notif-dot {
    position: absolute;
    top: 8px;
    right: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--red);
    color: var(--white);
    font-family: sans-serif;
    font-size: 8px;
    box-shadow: 0 2px 4px rgb(0 0 0 / 40%);
  }
}

.social-view-content {
  @include gpu-layer;

  padding: 15px var(--ui-h-padding);
  background: rgb(0 0 0 / 10%);
}
</style>
