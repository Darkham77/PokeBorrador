<script setup lang="ts">
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
        x: -15,
        scale: 0.97,
        duration: 0.45,
        stagger: 0.05,
        ease: 'back.out(1.15)',
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
    x: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
    duration: 0.25,
    ease: 'power2.out'
  })
}

function handleCardLeave(e: MouseEvent, isClaimed: boolean) {
  const bg = isClaimed ? 'rgba(34, 197, 94, 0.03)' : 'rgba(255, 255, 255, 0.02)'
  const border = isClaimed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.04)'
  gsap.to(e.currentTarget, {
    x: 0,
    backgroundColor: bg,
    borderColor: border,
    duration: 0.25,
    ease: 'power2.out'
  })
}

function handleSpriteEnter(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    y: -4,
    scale: 1.2,
    zIndex: Z_LAYERS.MAP_SPAWNS,
    duration: 0.2,
    ease: 'back.out(1.275)'
  })
}

function handleSpriteLeave(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    y: 0,
    scale: 1,
    zIndex: Z_LAYERS.MAP_FLOOR,
    duration: 0.2,
    ease: 'power2.out'
  })
}

function handlePillEnter(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    y: -1,
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
