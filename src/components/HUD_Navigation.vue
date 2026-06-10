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
import EggSprite from '@/components/common/EggSprite.vue'
import PVHUDButton from '@/components/common/PVHUDButton.vue'

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
    transformOrigin: '50% 50%'
  })
}

const enter = (el: Element, done: () => void) => {
  gsap.to(el, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.2,
    ease: 'back.out(1.2)',
    onComplete: done
  })
}

const leave = (el: Element, done: () => void) => {
  gsap.to(el, {
    opacity: 0,
    y: props.position === 'top' ? -15 : 15,
    scale: 0.85,
    duration: 0.15,
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
    <PVHUDButton
      custom-class="map-btn"
      :active="activeTab === 'map'"
      data-tab="map"
      @click.stop="handleTabChange('map')"
    >
      <template #icon>
        🗺️
      </template>
      MAPA
    </PVHUDButton>

    <!-- 2. POKÉMON (Grupo) -->
    <div 
      class="hud-group relative-box"
      @mouseenter="handleMouseEnter('POKEMON')"
      @mouseleave="handleMouseLeave('POKEMON')"
    >
      <PVHUDButton
        custom-class="group-btn"
        :active="['box', 'pokedex'].includes(activeTab) || uiStore.openHudGroup === 'POKEMON' || modalStore.isOpen('TeamManagement') || modalStore.isOpen('EventMissions') || modalStore.isOpen('DaycareMissions')"
        :badge-value="breedingStore.fulfillableMissionsCount"
        @click.stop="toggleGroupMenu('POKEMON')"
      >
        <template #icon>
          ⚡
        </template>
        POKÉMON
      </PVHUDButton>
      
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
          <PVHUDButton
            :active="modalStore.isOpen('TeamManagement')"
            @click.stop="handleTabChange('team', $event); uiStore.openHudGroup = null"
          >
            <template #icon>
              ⚡
            </template>
            EQUIPO
          </PVHUDButton>
          <PVHUDButton
            :active="activeTab === 'box'"
            @click.stop="handleTabChange('box', $event); uiStore.openHudGroup = null"
          >
            <template #icon>
              📦
            </template>
            CAJA PC
          </PVHUDButton>
          <PVHUDButton
            :active="modalStore.isOpen('EventMissions') || modalStore.isOpen('DaycareMissions')"
            :badge-value="breedingStore.fulfillableMissionsCount"
            @click.stop="handleTabChange('missions'); uiStore.openHudGroup = null"
          >
            <template #icon>
              📜
            </template>
            MISIONES
          </PVHUDButton>
          <PVHUDButton
            :active="activeTab === 'pokedex'"
            @click.stop="handleTabChange('pokedex', $event); uiStore.openHudGroup = null"
          >
            <template #icon>
              📖
            </template>
            POKÉDEX
          </PVHUDButton>
        </div>
      </Transition>
    </div>

    <!-- 3. MOCHILA -->
    <PVHUDButton
      :active="modalStore.isOpen('Inventory')"
      @click.stop="handleTabChange('bag')"
    >
      <template #icon>
        🎒
      </template>
      MOCHILA
    </PVHUDButton>
    
    <!-- 4. GIMS -->
    <PVHUDButton
      :active="activeTab === 'gyms'"
      @click.stop="handleTabChange('gyms')"
    >
      <template #icon>
        🏆
      </template>
      GIMS
    </PVHUDButton>

    <!-- 5. CRIANZA -->
    <PVHUDButton
      :active="activeTab === 'daycare'"
      :badge-value="readyEggsCount"
      @click.stop="handleTabChange('daycare')"
    >
      <template #icon>
        <span style="display: inline-flex; justify-content: center; align-items: center; width: 100%;">
          <EggSprite size="20" />
        </span>
      </template>
      CRIANZA
    </PVHUDButton>

    <!-- 6. MARKET (Grupo) -->
    <div 
      class="hud-group relative-box"
      @mouseenter="handleMouseEnter('MARKET')"
      @mouseleave="handleMouseLeave('MARKET')"
    >
      <PVHUDButton
        custom-class="group-btn"
        :active="uiStore.openHudGroup === 'MARKET' || modalStore.isOpen('GlobalMarket') || modalStore.isOpen('Shop') || modalStore.isOpen('BCShop') || modalStore.isOpen('WarShop')"
        :badge-value="gtsStore.unseenSalesCount"
        @click.stop="toggleGroupMenu('MARKET')"
      >
        <template #icon>
          🏪
        </template>
        MARKET
      </PVHUDButton>
      
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
          <PVHUDButton
            :active="modalStore.isOpen('GlobalMarket')"
            :badge-value="gtsStore.unseenSalesCount"
            @click.stop="handleTabChange('online-market'); uiStore.openHudGroup = null"
          >
            <template #icon>
              🌎
            </template>
            GLOBAL
          </PVHUDButton>
          <PVHUDButton
            :active="modalStore.isOpen('Shop')"
            @click.stop="handleTabChange('market'); uiStore.openHudGroup = null"
          >
            <template #icon>
              🛒
            </template>
            LOCAL
          </PVHUDButton>
          <PVHUDButton
            :active="modalStore.isOpen('BCShop')"
            @click.stop="handleTabChange('trainer-shop'); uiStore.openHudGroup = null"
          >
            <template #icon>
              🎖️
            </template>
            BC SHOP
          </PVHUDButton>
          <PVHUDButton
            custom-class="war-shop-nav-btn"
            :active="modalStore.isOpen('WarShop')"
            @click.stop="handleTabChange('war-shop'); uiStore.openHudGroup = null"
          >
            <template #icon>
              🚩
            </template>
            GUERRA
          </PVHUDButton>
        </div>
      </Transition>
    </div>

    <!-- 7. SOCIAL (Grupo) -->
    <div 
      class="hud-group relative-box"
      @mouseenter="handleMouseEnter('SOCIAL')"
      @mouseleave="handleMouseLeave('SOCIAL')"
    >
      <PVHUDButton
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
          <PVHUDButton
            :active="modalStore.isOpen('SocialCenter')"
            :badge-value="socialStore.notifications.chats + socialStore.notifications.friends + socialStore.notifications.trades + gameStore.state.claimQueue.length"
            @click.stop="handleTabChange('friends'); uiStore.openHudGroup = null"
          >
            <template #icon>
              🤝
            </template>
            AMIGOS
          </PVHUDButton>

          <PVHUDButton
            :active="modalStore.isOpen('Arena')"
            :badge-value="socialStore.notifications.battles"
            @click.stop="handleTabChange('arena'); uiStore.openHudGroup = null"
          >
            <template #icon>
              🏟️
            </template>
            ARENA
          </PVHUDButton>
          <PVHUDButton
            :active="modalStore.isOpen('Ranking')"
            @click.stop="handleTabChange('ranking'); uiStore.openHudGroup = null"
          >
            <template #icon>
              🏅
            </template>
            RANKING
          </PVHUDButton>
          <PVHUDButton
            :active="modalStore.isOpen('FactionWar')"
            @click.stop="modalStore.open('FactionWar'); uiStore.openHudGroup = null"
          >
            <template #icon>
              ⚔️
            </template>
            DOMINANCIA
          </PVHUDButton>
          <PVHUDButton
            :active="modalStore.isOpen('WorldEvents')"
            :badge-value="eventStore.pendingAwards.length"
            @click.stop="modalStore.open('WorldEvents'); uiStore.openHudGroup = null"
          >
            <template #icon>
              🎁
            </template>
            EVENTOS
          </PVHUDButton>
        </div>
      </Transition>
    </div>
  </div>
</template>


<style scoped lang="scss" src="@/styles/components/_hud-navigation.scss"></style>
