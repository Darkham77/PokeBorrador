<script setup lang="ts">
const MILESTONE_CARD_ENTER_X_PX = 4
const MILESTONE_SPRITE_ENTER_Y_PX = -4
const MILESTONE_SPRITE_ENTER_SCALE = 1.2
const MILESTONE_PILL_ENTER_Y_PX = -1
const MILESTONE_LIST_ENTER_X_PX = 4
const MILESTONE_LIST_INITIAL_SCALE = 0.95
const MILESTONE_LIST_DURATION_SEC = 0.4
const MILESTONE_LIST_STAGGER_SEC = 0.05
const MILESTONE_HOVER_DURATION_SEC = 0.2
const MILESTONE_SPRITE_DURATION_SEC = 0.3
import { ref, onMounted, nextTick } from 'vue'
import { usePvPStore } from '@/stores/pvp'
import { RANKED_REWARD_MILESTONES } from '@/data/system/rankedData'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { SHOP_ITEMS } from '@/data/inventory/items'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { Z_LAYERS } from '@/logic/constants/visuals'
import { gsap } from 'gsap'

const pvp = usePvPStore()
const listRef = ref<HTMLElement | null>(null)
const milestones = RANKED_REWARD_MILESTONES

onMounted(() => {
  animateList()
})

const getItemDesc = (itemName: string) => {
  const item = SHOP_ITEMS.find(i => i.id === itemName || i.name === itemName)
  return item?.desc || 'Recompensa de la Arena de Batalla.'
}

const getItemSpriteUrl = (itemName: string) => {
  const item = SHOP_ITEMS.find(i => i.id === itemName || i.name === itemName)
  const slug = item?.sprite || item?.id || itemName
  return getAssetUrl(ASSET_TYPES.ITEM, slug)
}

function isUnlocked(eloReq: number) {
  return (pvp.maxElo || 0) >= eloReq
}

function isClaimed(id: string | number) {
  return (pvp.rewardsClaimed || []).includes(id.toString())
}

const GSAP_EASE_OVERSHOOT_LIST = 1.15
const GSAP_EASE_OVERSHOOT_SPRITE = 1.275

// GSAP Stagger Entrance Animations for Milestone Cards
const animateList = () => {
  nextTick(() => {
    if (!listRef.value) return
    const cards = listRef.value.querySelectorAll('.milestone-card')
    if (cards.length > 0) {
      listRef.value.classList.add('list-animating')
      gsap.killTweensOf(cards)
      gsap.from(cards, {
        opacity: 0,
        x: MILESTONE_LIST_ENTER_X_PX,
        scale: MILESTONE_LIST_INITIAL_SCALE,
        duration: MILESTONE_LIST_DURATION_SEC,
        stagger: MILESTONE_LIST_STAGGER_SEC,
        ease: `back.out(${GSAP_EASE_OVERSHOOT_LIST})`,
        clearProps: 'all',
        onComplete: () => {
          listRef.value?.classList.remove('list-animating')
        }
      })
    }
  })
}

// ── GSAP HOVER HANDLERS ──────────────────────────────────────────────────────

function handleCardEnter(e: MouseEvent, isLocked: boolean) {
  if (isLocked) return
  gsap.to(e.currentTarget, {
    x: MILESTONE_CARD_ENTER_X_PX,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
    duration: MILESTONE_HOVER_DURATION_SEC,
    ease: 'power2.out'
  })
}

function handleCardLeave(e: MouseEvent, isClaimed: boolean) {
  const bg = isClaimed ? 'rgba(34, 197, 94, 0.03)' : 'rgba(255, 255, 255, 0.04)'
  const border = isClaimed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.04)'
  gsap.to(e.currentTarget, {
    x: 0,
    backgroundColor: bg,
    borderColor: border,
    duration: MILESTONE_HOVER_DURATION_SEC,
    ease: 'power2.out'
  })
}

function handleSpriteEnter(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    y: MILESTONE_SPRITE_ENTER_Y_PX,
    scale: MILESTONE_SPRITE_ENTER_SCALE,
    zIndex: Z_LAYERS.MAP_SPAWNS,
    duration: MILESTONE_SPRITE_DURATION_SEC,
    ease: `back.out(${GSAP_EASE_OVERSHOOT_SPRITE})`
  })
}

function handleSpriteLeave(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    y: 0,
    scale: 1,
    zIndex: Z_LAYERS.MAP_FLOOR,
    duration: MILESTONE_SPRITE_DURATION_SEC,
    ease: 'power2.out'
  })
}

function handlePillEnter(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    y: MILESTONE_PILL_ENTER_Y_PX,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    color: 'var(--white)',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
    duration: 0.2,
    ease: 'power2.out'
  })
}

function handlePillLeave(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    y: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: 'rgba(241, 245, 249, 0.9)',
    boxShadow: 'none',
    duration: 0.2,
    ease: 'power2.out'
  })
}
</script>

<template>
  <section class="milestone-track">
    <div class="header-with-timer">
      <h3>RECOMPENSAS DE TEMPORADA</h3>
      <span class="season-timer">
        {{ (pvp.seasonRange?.daysLeft || 0) > 0 ? `Termina en ${pvp.seasonRange.daysLeft}d` : 'Temporada Finalizada' }}
      </span>
    </div>

    <div
      ref="listRef"
      class="track-list custom-scrollbar"
    >
      <div
        v-for="m in milestones"
        :key="m.id"
        class="milestone-card"
        :class="{ locked: !isUnlocked(m.elo), claimed: isClaimed(m.id) }"
        @mouseenter="e => handleCardEnter(e, !isUnlocked(m.elo))"
        @mouseleave="e => handleCardLeave(e, isClaimed(m.id))"
      >
        <div class="m-icon">
          <div class="m-icon-sprites">
            <img
              v-for="[name] in Object.entries(m.rewards)"
              :key="name"
              :src="getItemSpriteUrl(name)"
              class="pixel-art milestone-sprite"
              :alt="name"
              @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
              @mouseenter="handleSpriteEnter"
              @mouseleave="handleSpriteLeave"
            >
          </div>
        </div>
        <div class="m-info">
          <span class="m-elo">{{ m.elo }} ELO</span>
          <div class="m-prizes-list">
            <PVTooltip
              v-for="[name, qty] in Object.entries(m.rewards)"
              :key="name"
              :title="name.toUpperCase()"
              :description="getItemDesc(name)"
              position="top"
            >
              <span
                class="m-prize-pill"
                @mouseenter="handlePillEnter"
                @mouseleave="handlePillLeave"
              >
                <img
                  :src="getItemSpriteUrl(name)"
                  class="pixel-art pill-sprite"
                  :alt="name"
                  @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
                >
                {{ name }} <span class="qty">x{{ qty }}</span>
              </span>
            </PVTooltip>
          </div>
        </div>
        <button
          v-if="isUnlocked(m.elo) && !isClaimed(m.id)"
          class="claim-btn"
          @click.stop="pvp.claimReward(m.id)"
        >
          RECLAMAR
        </button>
        <div
          v-else-if="isClaimed(m.id)"
          class="claimed-badge"
        >
          ✓
        </div>
        <div
          v-else
          class="lock-badge"
        >
          🔒
        </div>
      </div>
    </div>
  </section>
</template>
