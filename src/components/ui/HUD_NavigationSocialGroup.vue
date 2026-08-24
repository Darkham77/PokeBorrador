<script setup lang="ts">
import type { useModalStore } from '@/stores/modals'
import type { useUIStore } from '@/stores/ui'
import type { useSocialStore } from '@/stores/social/social'
import type { useGameStore } from '@/stores/game'
import type { useEventStore } from '@/stores/events'
import PVHUDButton from '@/components/common/PVHUDButton.vue'

defineProps<{
  modalStore: ReturnType<typeof useModalStore>
  uiStore: ReturnType<typeof useUIStore>
  socialStore: ReturnType<typeof useSocialStore>
  gameStore: ReturnType<typeof useGameStore>
  eventStore: ReturnType<typeof useEventStore>
  totalSocialNotifications: number
  handleMouseEnter: (group: string) => void
  handleMouseLeave: (group: string) => void
  toggleGroupMenu: (name: string) => void
  handleTabChange: (tab: string, event?: Event) => void
  beforeEnter: (el: Element) => void
  enter: (el: Element, done: () => void) => void
  leave: (el: Element, done: () => void) => void
}>()

const emit = defineEmits<{
  (e: 'closeHudGroup'): void
}>()
</script>

<template>
  <div 
    class="hud-group relative-box"
    @mouseenter="handleMouseEnter('SOCIAL')"
    @mouseleave="handleMouseLeave('SOCIAL')"
  >
    <PVHUDButton
      id="nav-social-btn"
      custom-class="group-btn"
      :active="modalStore.isOpen('Arena') || modalStore.isOpen('Ranking') || uiStore.openHudGroup === 'SOCIAL' || modalStore.isOpen('SocialCenter') || modalStore.isOpen('WorldEvents') || modalStore.isOpen('FactionWar')"
      :badge-value="totalSocialNotifications"
      @click.stop="toggleGroupMenu('SOCIAL')"
    >
      <template #icon>
        👪
      </template>
      SOCIAL
    </PVHUDButton>

    <Transition
      :css="false"
      @before-enter="beforeEnter"
      @enter="enter"
      @leave="leave"
    >
      <div 
        v-if="uiStore.openHudGroup === 'SOCIAL'"
        class="hud-submenu"
      >
        <button
          id="nav-social-friends-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('SocialCenter') }"
          @click.stop="handleTabChange('friends'); emit('closeHudGroup')"
        >
          <span class="icon">🤝</span>
          <span class="nav-item-label">AMIGOS</span>
          <span
            v-if="(socialStore.notifications.chats + socialStore.notifications.friends + socialStore.notifications.trades + gameStore.state.claimQueue.length) > 0"
            class="hud-notification-badge"
          >
            {{ socialStore.notifications.chats + socialStore.notifications.friends + socialStore.notifications.trades + gameStore.state.claimQueue.length }}
          </span>
        </button>

        <button
          id="nav-social-arena-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('Arena') }"
          @click.stop="handleTabChange('arena'); emit('closeHudGroup')"
        >
          <span class="icon">🏟️</span>
          <span class="nav-item-label">ARENA</span>
          <span
            v-if="socialStore.notifications.battles > 0"
            class="hud-notification-badge"
          >
            {{ socialStore.notifications.battles }}
          </span>
        </button>
        <button
          id="nav-social-ranking-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('Ranking') }"
          @click.stop="handleTabChange('ranking'); emit('closeHudGroup')"
        >
          <span class="icon">🏅</span>
          <span class="nav-item-label">RANKING</span>
        </button>
        <button
          id="nav-social-dominance-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('FactionWar') }"
          @click.stop="modalStore.open('FactionWar'); emit('closeHudGroup')"
        >
          <span class="icon">⚔️</span>
          <span class="nav-item-label">DOMINANCIA</span>
        </button>
        <button
          id="nav-social-events-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('WorldEvents') }"
          @click.stop="modalStore.open('WorldEvents'); emit('closeHudGroup')"
        >
          <span class="icon">🎁</span>
          <span class="nav-item-label">EVENTOS</span>
          <span
            v-if="eventStore.pendingAwards.length > 0"
            class="hud-notification-badge"
          >
            {{ eventStore.pendingAwards.length }}
          </span>
        </button>
      </div>
    </Transition>
  </div>
</template>
