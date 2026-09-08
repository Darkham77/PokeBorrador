<script setup lang="ts">
import PVHUDButton from "@/components/common/PVHUDButton.vue";
import { useNavigationState } from "@/composables/navigation/useNavigationState";

withDefaults(defineProps<{
  position?: string;
}>(), {
  position: "top"
});

const {
  uiStore,
  modalStore,
  socialStore,
  totalSocialNotifications,
  tradeClaimsCount,
  handleMouseEnter,
  handleMouseLeave,
  toggleGroupMenu,
  handleTabChange,
  beforeEnter,
  enter,
  leave
} = useNavigationState();
</script>

<template>
  <div 
    class="hud-group relative-box"
    :class="[`pos-${position}`]"
    @mouseenter="handleMouseEnter('SOCIAL')"
    @mouseleave="handleMouseLeave('SOCIAL')"
  >
    <PVHUDButton
      id="nav-social-btn"
      custom-class="group-btn"
      :active="modalStore.isOpen('Arena') || uiStore.openHudGroup === 'SOCIAL' || modalStore.isOpen('SocialCenter') || modalStore.isOpen('FactionWar')"
      :badge-value="totalSocialNotifications"
      @click.stop="toggleGroupMenu('SOCIAL')"
    >
      <template #icon>
        <span class="emoji">👪</span>
      </template>
      SOCIAL
    </PVHUDButton>

    <Transition
      :css="false"
      @before-enter="el => beforeEnter(el, position)"
      @enter="enter"
      @leave="(el, done) => leave(el, position, done)"
    >
      <div 
        v-if="uiStore.openHudGroup === 'SOCIAL'"
        class="hud-submenu"
      >
        <button
          id="nav-social-friends-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('SocialCenter') }"
          @click.stop="handleTabChange('friends'); uiStore.openHudGroup = null"
        >
          <span class="emoji">🤝</span>
          <span class="nav-item-label">AMIGOS</span>
          <span
            v-if="(socialStore.notifications.chats + socialStore.notifications.friends + socialStore.notifications.trades + tradeClaimsCount) > 0"
            class="hud-notification-badge"
          >
            {{ socialStore.notifications.chats + socialStore.notifications.friends + socialStore.notifications.trades + tradeClaimsCount }}
          </span>
        </button>

        <button
          id="nav-social-arena-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('Arena') }"
          @click.stop="handleTabChange('arena'); uiStore.openHudGroup = null"
        >
          <span class="emoji">🏟️</span>
          <span class="nav-item-label">COLISEO</span>
          <span
            v-if="socialStore.notifications.battles > 0"
            class="hud-notification-badge"
          >
            {{ socialStore.notifications.battles }}
          </span>
        </button>
        <button
          id="nav-social-dominance-btn"
          class="hud-nav-btn"
          :class="{ active: modalStore.isOpen('FactionWar') }"
          @click.stop="modalStore.open('FactionWar'); uiStore.openHudGroup = null"
        >
          <span class="emoji">⚔️</span>
          <span class="nav-item-label">DOMINANCIA</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_hud-navigation.scss"></style>
