<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useSocialStore } from '@/stores/social/social'
import { useModalStore } from '@/stores/modals'
import { useGTSStore } from '@/stores/gts'
import { useBreedingStore } from '@/stores/breeding'
import { useEventStore } from '@/stores/events'
import { useGymsStore } from '@/stores/gyms'
import { getItemById } from '@/data/inventory/items'
import EggSprite from '@/components/common/EggSprite.vue'
import PVHUDButton from '@/components/common/PVHUDButton.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

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

const ballsList = computed(() => {
  const inventory = gameStore.state.inventory || {}
  return Object.entries(inventory)
    .map(([name, qty]) => {
      const count = qty as number
      if (count <= 0) return null
      let found = null
      try {
        found = getItemById(name)
      } catch {}
      if (found?.cat === 'pokeballs' || name.toLowerCase().includes('ball')) {
        return { name: found?.name || name, qty: count }
      }
      return null
    })
    .filter(Boolean) as { name: string, qty: number }[]
})

const materialItems = computed(() => {
  const inventory = gameStore.state.inventory || {}
  const list: { name: string; qty: number; tier: number; icon: string }[] = []
  
  for (const [key, qty] of Object.entries(inventory)) {
    const count = qty as number
    if (count <= 0) continue
    let found = null
    try {
      found = getItemById(key)
    } catch {}
    if (found) {
      let tier: number | null = null
      if (found.cat === 'raw_material' || found.sprite?.includes('crafting/tier0/')) {
        tier = 0
      } else if (found.cat === 'refined_material' || found.sprite?.includes('crafting/tier1/')) {
        tier = 1
      } else if (found.cat === 'component' || found.sprite?.includes('crafting/tier2/')) {
        tier = 2
      }
      
      if (tier !== null) {
        list.push({
          name: found.name,
          qty: count,
          tier,
          icon: found.icon || '📦'
        })
      }
    }
  }
  return list
})

const mochilaTooltipDescription = computed(() => {
  const lines: string[] = []
  
  // Section 1: Poké Balls first
  lines.push('🔴 POKÉ BALLS')
  if (ballsList.value.length === 0) {
    lines.push('• Ninguna')
  } else {
    ballsList.value.forEach(i => lines.push(`• ${i.name}: ${i.qty}`))
  }
  
  lines.push('') // empty line
  
  // Section 2: Materials second
  lines.push('📦 MATERIALES')
  const t0 = materialItems.value.filter(i => i.tier === 0)
  const t1 = materialItems.value.filter(i => i.tier === 1)
  const t2 = materialItems.value.filter(i => i.tier === 2)
  
  if (materialItems.value.length === 0) {
    lines.push('• Ninguno')
  } else {
    if (t0.length > 0) {
      t0.forEach(i => lines.push(`• ${i.icon} ${i.name}: ${i.qty}`))
    }
    if (t1.length > 0) {
      t1.forEach(i => lines.push(`• ${i.icon} ${i.name}: ${i.qty}`))
    }
    if (t2.length > 0) {
      t2.forEach(i => lines.push(`• ${i.icon} ${i.name}: ${i.qty}`))
    }
  }
  
  lines.push('')
  lines.push('Haz clic para abrir el inventario.')
  return lines.join('\n')
})

const gymsStore = useGymsStore()

const gymRematchesCount = computed(() => {
  const defeatedIds = gameStore.state.defeatedGyms || []
  return gymsStore.gyms.filter(g => !defeatedIds.includes(g.id)).length
})

const medalsBreakdown = computed(() => {
  const defeated = gameStore.state.defeatedGyms || []
  if (defeated.length === 0) {
    return 'No has ganado ninguna medalla todavía.\n¡Desafía a los Líderes de Gimnasio para obtenerlas!'
  }
  
  const earnedList = gymsStore.gyms
    .filter(g => defeated.includes(g.id))
    .map(g => `${g.badge} ${g.badgeName} (${g.leader})`)
    
  return `Medallas obtenidas (${defeated.length}/8):\n${earnedList.map(item => `• ${item}`).join('\n')}\n\nDesbloquean nuevas zonas y Pokémon.\n\nHaz clic para ver los Gimnasios.`
})

const warehouseEggsCount = computed(() => breedingStore.warehouseEggs?.length || 0)
const walkingEggsCount = computed(() => (gameStore.state.eggs || []).length)
const freeEggSlots = computed(() => Math.max(0, 6 - walkingEggsCount.value))

const crianzaBadgeValue = computed(() => {
  const ready = readyEggsCount.value
  if (ready > 0) return ready

  // If there are free slots in the backpack and eggs in the warehouse, show how many can be walked
  if (freeEggSlots.value > 0 && warehouseEggsCount.value > 0) {
    return Math.min(freeEggSlots.value, warehouseEggsCount.value)
  }
  return 0
})

const eggsBreakdown = computed(() => {
  const incubating = gameStore.state.eggs || []
  const warehouse = breedingStore.warehouseEggs || []
  
  const lines: string[] = []
  
  if (incubating.length === 0 && warehouse.length === 0) {
    return 'No tienes huevos en incubación ni en la guardería.\n¡Haz clic para ir a la Guardería!'
  }
  
  if (incubating.length > 0) {
    lines.push(`Incubando: ${incubating.length} / 6 huevos`)
    incubating.forEach((egg, idx) => {
      if (egg.ready || egg.steps <= 0) {
        lines.push(`• Huevo ${idx + 1}: ¡Listo para nacer!🐣`)
      } else {
        const total = egg.totalSteps ?? egg.steps
        const walked = Math.max(0, total - egg.steps)
        lines.push(`• Huevo ${idx + 1}: ${Math.floor(walked).toLocaleString()} / ${total.toLocaleString()} pasos`)
      }
    })
  } else {
    lines.push('No hay huevos en incubación.')
  }
  
  lines.push('') // Separador de secciones
  
  if (warehouse.length > 0) {
    lines.push(`En Guardería: ${warehouse.length} huevos sin reclamar🥚`)
  } else {
    lines.push('No hay huevos pendientes en la Guardería.')
  }
  
  lines.push('')
  lines.push('Haz clic para abrir la Guardería.')
  
  return lines.join('\n')
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

  if (tab === 'reputation-shop') {
    modalStore.open('ReputationShop')
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
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('TeamManagement') }"
            @click.stop="handleTabChange('team', $event); uiStore.openHudGroup = null"
          >
            <span class="icon">⚡</span>
            <span class="nav-item-label">EQUIPO</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: activeTab === 'box' }"
            @click.stop="handleTabChange('box', $event); uiStore.openHudGroup = null"
          >
            <span class="icon">📦</span>
            <span class="nav-item-label">CAJA PC</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('EventMissions') || modalStore.isOpen('DaycareMissions') }"
            @click.stop="handleTabChange('missions'); uiStore.openHudGroup = null"
          >
            <span class="icon">📜</span>
            <span class="nav-item-label">MISIONES</span>
            <span
              v-if="breedingStore.fulfillableMissionsCount > 0"
              class="hud-notification-badge"
            >
              {{ breedingStore.fulfillableMissionsCount }}
            </span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: activeTab === 'pokedex' }"
            @click.stop="handleTabChange('pokedex', $event); uiStore.openHudGroup = null"
          >
            <span class="icon">📖</span>
            <span class="nav-item-label">POKÉDEX</span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- 3. MOCHILA -->
    <PVTooltip
      title="🎒 MOCHILA"
      :description="mochilaTooltipDescription"
      position="top"
    >
      <PVHUDButton
        :active="modalStore.isOpen('Inventory')"
        @click.stop="handleTabChange('bag')"
      >
        <template #icon>
          🎒
        </template>
        MOCHILA
      </PVHUDButton>
    </PVTooltip>
    
    <!-- 4. GIMS -->
    <PVTooltip
      title="🏆 GIMNASIOS"
      :description="medalsBreakdown"
      position="top"
    >
      <PVHUDButton
        :active="activeTab === 'gyms'"
        :badge-value="gymRematchesCount > 0 ? gymRematchesCount : 0"
        @click.stop="handleTabChange('gyms')"
      >
        <template #icon>
          🏆
        </template>
        GIMS
      </PVHUDButton>
    </PVTooltip>

    <!-- 5. CRIANZA -->
    <PVTooltip
      title="🥚 CRIANZA"
      :description="eggsBreakdown"
      position="top"
    >
      <PVHUDButton
        :active="activeTab === 'daycare'"
        :badge-value="crianzaBadgeValue"
        @click.stop="handleTabChange('daycare')"
      >
        <template #icon>
          <span style="display: inline-flex; justify-content: center; align-items: center; width: 100%;">
            <EggSprite size="20" />
          </span>
        </template>
        CRIANZA
      </PVHUDButton>
    </PVTooltip>

    <!-- 6. MARKET (Grupo) -->
    <div 
      class="hud-group relative-box"
      @mouseenter="handleMouseEnter('MARKET')"
      @mouseleave="handleMouseLeave('MARKET')"
    >
      <PVHUDButton
        custom-class="group-btn"
        :active="uiStore.openHudGroup === 'MARKET' || modalStore.isOpen('GlobalMarket') || modalStore.isOpen('Shop') || modalStore.isOpen('BCShop') || modalStore.isOpen('WarShop') || modalStore.isOpen('ReputationShop')"
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
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('GlobalMarket') }"
            @click.stop="handleTabChange('online-market'); uiStore.openHudGroup = null"
          >
            <span class="icon">🌎</span>
            <span class="nav-item-label">GLOBAL</span>
            <span
              v-if="gtsStore.unseenSalesCount > 0"
              class="hud-notification-badge"
            >
              {{ gtsStore.unseenSalesCount }}
            </span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('Shop') }"
            @click.stop="handleTabChange('market'); uiStore.openHudGroup = null"
          >
            <span class="icon">🛒</span>
            <span class="nav-item-label">LOCAL</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('BCShop') }"
            @click.stop="handleTabChange('trainer-shop'); uiStore.openHudGroup = null"
          >
            <span class="icon">🎖️</span>
            <span class="nav-item-label">BC SHOP</span>
          </button>
          <button
            v-if="gameStore.state.playerClass === 'entrenador'"
            class="hud-nav-btn rep-shop-nav-btn"
            :class="{ active: modalStore.isOpen('ReputationShop') }"
            @click.stop="handleTabChange('reputation-shop'); uiStore.openHudGroup = null"
          >
            <span class="icon">★</span>
            <span class="nav-item-label">REPUTACIÓN</span>
          </button>
          <button
            class="hud-nav-btn war-shop-nav-btn"
            :class="{ active: modalStore.isOpen('WarShop') }"
            @click.stop="handleTabChange('war-shop'); uiStore.openHudGroup = null"
          >
            <span class="icon">🚩</span>
            <span class="nav-item-label">GUERRA</span>
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
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('SocialCenter') }"
            @click.stop="handleTabChange('friends'); uiStore.openHudGroup = null"
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
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('Arena') }"
            @click.stop="handleTabChange('arena'); uiStore.openHudGroup = null"
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
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('Ranking') }"
            @click.stop="handleTabChange('ranking'); uiStore.openHudGroup = null"
          >
            <span class="icon">🏅</span>
            <span class="nav-item-label">RANKING</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('FactionWar') }"
            @click.stop="modalStore.open('FactionWar'); uiStore.openHudGroup = null"
          >
            <span class="icon">⚔️</span>
            <span class="nav-item-label">DOMINANCIA</span>
          </button>
          <button
            class="hud-nav-btn"
            :class="{ active: modalStore.isOpen('WorldEvents') }"
            @click.stop="modalStore.open('WorldEvents'); uiStore.openHudGroup = null"
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
  </div>
</template>


<!-- HMR Touch comment to force reload styles v4 -->
<style scoped lang="scss" src="@/styles/components/_hud-navigation.scss"></style>
