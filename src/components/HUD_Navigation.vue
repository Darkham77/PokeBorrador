<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useSocialStore } from '@/stores/social'
import { useModalStore } from '@/stores/modals'
import { useGTSStore } from '@/stores/gts'
import { useBreedingStore } from '@/stores/breeding'
import { useEventStore } from '@/stores/events'

interface Props {
  position?: string
}

const props = withDefaults(defineProps<Props>(), {
  position: 'top'
})

const gameStore = useGameStore()
const uiStore = useUIStore()
const socialStore = useSocialStore()
const modalStore = useModalStore()
const gtsStore = useGTSStore()
const breedingStore = useBreedingStore()
const eventStore = useEventStore()
const navRef = ref<HTMLElement | null>(null)

const activeTab = computed({
  get: () => uiStore.activeTab,
  set: (val: string) => { uiStore.activeTab = val }
})

const totalSocialNotifications = computed(() => {
  return socialStore.notifications.total +
         gameStore.state.claimQueue.length +
         eventStore.pendingAwards.length
})

const readyEggsCount = computed(() => {
  return (gameStore.state.eggs || []).filter(egg => egg.ready === true || egg.steps <= 0).length
})

const handleMouseEnter = (group: string) => {
  if (window.matchMedia('(hover: hover)').matches) {
    uiStore.openHudGroup = group
  }
}

const handleMouseLeave = (group: string) => {
  if (window.matchMedia('(hover: hover)').matches) {
    if (uiStore.openHudGroup === group) {
      uiStore.openHudGroup = null
    }
  }
}

const handleTabChange = (tab: string, _event?: Event) => {
  if (tab === 'bag') {
    modalStore.open('Inventory')
    return
  }

  if (tab === 'market') {
    modalStore.open('Shop')
    return
  }

  if (tab === 'online-market') {
    modalStore.open('GlobalMarket')
    return
  }

  if (tab === 'trainer-shop') {
    modalStore.open('BCShop')
    return
  }

  if (tab === 'war-shop') {
    uiStore.isWarShopOpen = true
    return
  }

  if (tab === 'team') {
    modalStore.open('TeamManagement')
    return
  }

  if (tab === 'daycare') {
    modalStore.open('Daycare')
    return
  }

  if (['social', 'friends'].includes(tab)) {
    const initialTab = (socialStore.notifications.trades > 0 && (socialStore.notifications.chats + socialStore.notifications.friends) === 0)
      ? 'trades'
      : (socialStore.notifications.friends > 0 && socialStore.notifications.chats === 0)
        ? 'requests'
        : 'friends'
    modalStore.open('SocialCenter', { initialTab })
    return
  }

  if (tab === 'missions') {
    modalStore.open('EventMissions')
    return
  }

  if (tab === 'ranking') {
    modalStore.open('Ranking')
    return
  }

  if (tab === 'arena') {
    modalStore.open('Arena')
    return
  }
  
  activeTab.value = tab
  uiStore.openHudGroup = null // Close any open group when switching tabs
}

const toggleGroupMenu = (name: string) => {
  uiStore.toggleHudGroup(name)
}

const handleClickOutside = (event: MouseEvent) => {
  if (navRef.value && !navRef.value.contains(event.target as Node)) {
    uiStore.openHudGroup = null
  }
}

// GSAP Animations
const beforeEnter = (el: Element) => {
  gsap.set(el, { 
    opacity: 0, 
    xPercent: -50,
    y: props.position === 'top' ? -20 : 20,
    scale: 0.8,
    transformOrigin: props.position === 'top' ? 'top center' : 'bottom center'
  })
}

const enter = (el: Element, done: () => void) => {
  gsap.to(el, { 
    opacity: 1, 
    xPercent: -50,
    y: 0,
    scale: 1,
    duration: 0.12, 
    ease: 'power2.out',
    onComplete: done 
  })
}

const leave = (el: Element, done: () => void) => {
  gsap.to(el, { 
    opacity: 0, 
    xPercent: -50,
    y: props.position === 'top' ? -10 : 10,
    scale: 0.9,
    duration: 0.1, 
    ease: 'power2.in',
    onComplete: done 
  })
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    ref="navRef"
    class="hud-nav"
    :class="[`pos-${position}`]"
  >
    <!-- 1. MAPA -->
    <button
      class="hud-nav-btn map-btn"
      :class="{ active: activeTab === 'map' }"
      data-tab="map"
      @click.stop="handleTabChange('map')"
    >
      <span class="icon">🗺️</span>
      <span class="nav-item-label">MAPA</span>
    </button>

    <!-- 2. POKÉMON (Grupo) -->
    <div 
      class="hud-group relative-box"
      @mouseenter="handleMouseEnter('POKEMON')"
      @mouseleave="handleMouseLeave('POKEMON')"
    >
      <button
        class="hud-nav-btn group-btn"
        :class="{ active: ['box', 'pokedex'].includes(activeTab) || uiStore.openHudGroup === 'POKEMON' || modalStore.isOpen('TeamManagement') || modalStore.isOpen('EventMissions') || modalStore.isOpen('DaycareMissions') }"
        @click.stop="toggleGroupMenu('POKEMON')"
      >
        <span class="icon">⚡</span>
        <span class="nav-item-label">POKÉMON</span>
        <span
          v-if="breedingStore.fulfillableMissionsCount > 0"
          class="badge-pill"
        >{{ breedingStore.fulfillableMissionsCount }}</span>
      </button>
      
      <Transition
        :css="false"
        @before-enter="beforeEnter"
        @enter="enter"
        @leave="leave"
      >
        <div 
          v-if="uiStore.openHudGroup === 'POKEMON'"
          class="hud-submenu"
        >
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('TeamManagement') }"
            @click.stop="handleTabChange('team', $event); uiStore.openHudGroup = null"
          >
            <span class="icon">⚡</span><span class="nav-item-label">EQUIPO</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: activeTab === 'box' }"
            @click.stop="handleTabChange('box', $event); uiStore.openHudGroup = null"
          >
            <span class="icon">📦</span><span class="nav-item-label">CAJA PC</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('EventMissions') || modalStore.isOpen('DaycareMissions') }"
            @click.stop="handleTabChange('missions'); uiStore.openHudGroup = null"
          >
            <span class="icon">📜</span><span class="nav-item-label">MISIONES</span>
            <span
              v-if="breedingStore.fulfillableMissionsCount > 0"
              class="badge-pill"
            >{{ breedingStore.fulfillableMissionsCount }}</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: activeTab === 'pokedex' }"
            @click.stop="handleTabChange('pokedex', $event); uiStore.openHudGroup = null"
          >
            <span class="icon">📖</span><span class="nav-item-label">POKÉDEX</span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- 3. MOCHILA -->
    <button
      class="hud-nav-btn"
      :class="{ active: modalStore.isOpen('Inventory') }"
      @click.stop="handleTabChange('bag')"
    >
      <span class="icon">🎒</span>
      <span class="nav-item-label">MOCHILA</span>
    </button>
    
    <!-- 4. GIMS -->
    <button
      class="hud-nav-btn"
      :class="{ active: activeTab === 'gyms' }"
      @click.stop="handleTabChange('gyms')"
    >
      <span class="icon">🏆</span>
      <span class="nav-item-label">GIMS</span>
    </button>

    <!-- 5. CRIANZA -->
    <button
      class="hud-nav-btn relative-box"
      :class="{ active: activeTab === 'daycare' }"
      @click.stop="handleTabChange('daycare')"
    >
      <span class="icon">🥚</span>
      <span class="nav-item-label">CRIANZA</span>
      <span
        v-if="readyEggsCount > 0"
        class="badge-pill"
      >{{ readyEggsCount }}</span>
    </button>

    <!-- 6. MARKET (Grupo) -->
    <div 
      class="hud-group relative-box"
      @mouseenter="handleMouseEnter('MARKET')"
      @mouseleave="handleMouseLeave('MARKET')"
    >
      <button
        class="hud-nav-btn group-btn"
        :class="{ active: uiStore.openHudGroup === 'MARKET' || modalStore.isOpen('GlobalMarket') || modalStore.isOpen('Shop') || modalStore.isOpen('BCShop') || modalStore.isOpen('WarShop') }"
        @click.stop="toggleGroupMenu('MARKET')"
      >
        <span class="icon">🏪</span>
        <span class="nav-item-label">MARKET</span>
        <span
          v-if="gtsStore.unseenSalesCount > 0"
          class="badge-pill"
        >{{ gtsStore.unseenSalesCount }}</span>
      </button>
      
      <Transition
        :css="false"
        @before-enter="beforeEnter"
        @enter="enter"
        @leave="leave"
      >
        <div 
          v-if="uiStore.openHudGroup === 'MARKET'"
          class="hud-submenu"
        >
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('GlobalMarket') }"
            @click.stop="handleTabChange('online-market'); uiStore.openHudGroup = null"
          >
            <span class="icon">🌎</span><span class="nav-item-label">GLOBAL</span>
            <span
              v-if="gtsStore.unseenSalesCount > 0"
              class="badge-pill"
            >{{ gtsStore.unseenSalesCount }}</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('Shop') }"
            @click.stop="handleTabChange('market'); uiStore.openHudGroup = null"
          >
            <span class="icon">🛒</span><span class="nav-item-label">LOCAL</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('BCShop') }"
            @click.stop="handleTabChange('trainer-shop'); uiStore.openHudGroup = null"
          >
            <span class="icon">🎖️</span><span class="nav-item-label">BC SHOP</span>
          </button>
          <button
            class="hud-nav-btn war-shop-nav-btn"
            :class="{ active: modalStore.isOpen('WarShop') }"
            @click.stop="handleTabChange('war-shop'); uiStore.openHudGroup = null"
          >
            <span class="icon">🚩</span><span class="nav-item-label">GUERRA</span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- 7. SOCIAL (Grupo) -->
    <div 
      class="hud-group relative-box"
      @mouseenter="handleMouseEnter('SOCIAL')"
      @mouseleave="handleMouseLeave('SOCIAL')"
    >
      <button
        class="hud-nav-btn group-btn"
        :class="{ active: modalStore.isOpen('Arena') || modalStore.isOpen('Ranking') || uiStore.openHudGroup === 'SOCIAL' || modalStore.isOpen('SocialCenter') || modalStore.isOpen('WorldEvents') || modalStore.isOpen('FactionWar') }"
        @click.stop="toggleGroupMenu('SOCIAL')"
      >
        <span class="icon">👪</span>
        <span class="nav-item-label">SOCIAL</span>
        <span
          v-if="totalSocialNotifications > 0"
          class="badge-pill"
        >{{ totalSocialNotifications }}</span>
      </button>

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
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('SocialCenter') }"
            @click.stop="handleTabChange('friends'); uiStore.openHudGroup = null"
          >
            <span class="icon">🤝</span><span class="nav-item-label">AMIGOS</span>
            <span
              v-if="(socialStore.notifications.chats + socialStore.notifications.friends + socialStore.notifications.trades + gameStore.state.claimQueue.length) > 0"
              class="badge-pill"
            >{{ socialStore.notifications.chats + socialStore.notifications.friends + socialStore.notifications.trades + gameStore.state.claimQueue.length }}</span>
          </button>

          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('Arena') }"
            @click.stop="handleTabChange('arena'); uiStore.openHudGroup = null"
          >
            <span class="icon">🏟️</span><span class="nav-item-label">ARENA</span>
            <span
              v-if="socialStore.notifications.battles > 0"
              class="badge-pill"
            >{{ socialStore.notifications.battles }}</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('Ranking') }"
            @click.stop="handleTabChange('ranking'); uiStore.openHudGroup = null"
          >
            <span class="icon">🏅</span><span class="nav-item-label">RANKING</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('FactionWar') }"
            @click.stop="modalStore.open('FactionWar'); uiStore.openHudGroup = null"
          >
            <span class="icon">⚔️</span><span class="nav-item-label">DOMINANCIA</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('WorldEvents') }"
            @click.stop="modalStore.open('WorldEvents'); uiStore.openHudGroup = null"
          >
            <span class="icon">🎁</span><span class="nav-item-label">EVENTOS</span>
            <span
              v-if="eventStore.pendingAwards.length > 0"
              class="badge-pill"
            >{{ eventStore.pendingAwards.length }}</span>
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_hud-navigation.scss"></style>

