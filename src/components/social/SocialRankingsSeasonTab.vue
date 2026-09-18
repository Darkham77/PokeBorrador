<script setup lang="ts">
import type { EloTier } from '@/logic/pvp/rankedEngine'

interface DisplayTierItem {
  code: string
  tier: EloTier
  rewardsDesc: string
}

defineProps<{
  currentTier: EloTier
  currentElo: number
  nextTier: EloTier | null
  pointsToNextTier: number
  isSearching: boolean
  displayTiers: DisplayTierItem[]
}>()

const emit = defineEmits<{
  (e: 'search-ranked'): void
  (e: 'cancel-search'): void
}>()
</script>

<template>
  <div class="tab-pane season-pane">
    <div class="season-hero-card">
      <div class="season-header">
        <span class="emoji season-icon">🏆</span>
        <div class="season-title-box">
          <span class="season-label">TEMPORADA COMPETITIVA</span>
          <h3 class="season-name">
            TEMPORADA 1: RENACER DE KANTO
          </h3>
        </div>
      </div>

      <div class="player-rank-status">
        <div
          class="tier-badge-large"
          :style="{ borderColor: currentTier.color }"
        >
          <img
            v-if="currentTier.sprite"
            :src="currentTier.sprite"
            :alt="currentTier.name"
            class="tier-sprite-large"
          >
          <span
            v-else
            class="tier-icon emoji"
          >{{ currentTier.icon }}</span>
          <div class="tier-info">
            <span
              class="tier-name"
              :style="{ color: currentTier.color }"
            >{{ currentTier.name }}</span>
            <span class="tier-elo">{{ currentElo }} LP</span>
          </div>
        </div>
        <div
          v-if="nextTier"
          class="tier-progress-info"
        >
          <span class="progress-label">Siguiente Rango: <strong>{{ nextTier.name }}</strong></span>
          <span class="progress-sub">Faltan {{ pointsToNextTier }} LP para ascender</span>
        </div>
        <div
          v-else
          class="tier-progress-info"
        >
          <span class="progress-label max-rank">¡RANGO MÁXIMO ALCANZADO!</span>
          <span class="progress-sub">Compite por el Top 1 del Salón de la Fama</span>
        </div>
      </div>

      <!-- MATCHMAKING CTA -->
      <div class="matchmaking-cta-box">
        <button
          v-if="!isSearching"
          id="btn-start-ranked-matchmaking"
          v-gsap-hover="'button'"
          class="btn-ranked-search"
          type="button"
          @click="emit('search-ranked')"
        >
          <span class="emoji">⚔️</span> BUSCAR COMBATE RANKED
        </button>
        <div
          v-else
          class="searching-status-box"
        >
          <div
            v-gsap-loop="'spin'"
            class="searching-spinner"
          />
          <span class="searching-text">Buscando rival en tu rango...</span>
          <button
            id="btn-cancel-ranked-matchmaking"
            v-gsap-hover="'button'"
            class="btn-cancel-search"
            type="button"
            @click="emit('cancel-search')"
          >
            CANCELAR
          </button>
        </div>
      </div>

      <div class="season-rules-row">
        <div class="rule-box">
          <span class="rule-title">FORMATO</span>
          <span class="rule-val">6v6 Flat Level 50</span>
        </div>
        <div class="rule-box">
          <span class="rule-title">TIEMPO / TURNO</span>
          <span class="rule-val">60s</span>
        </div>
        <div class="rule-box">
          <span class="rule-title">ESCENARIO</span>
          <span class="rule-val">Gimnasio Celadon</span>
        </div>
      </div>
    </div>

    <!-- TIER REWARDS PREVIEW -->
    <div class="rewards-preview-card">
      <h4 class="rewards-title">
        <span class="emoji">🎁</span> RECOMPENSAS DE TEMPORADA
      </h4>
      <div class="tiers-rewards-grid">
        <div
          v-for="tier in displayTiers"
          :key="tier.code"
          class="tier-reward-row"
          :class="{ 'is-current': tier.tier.id === currentTier.id }"
        >
          <div class="tier-col">
            <img
              v-if="tier.tier.sprite"
              :src="tier.tier.sprite"
              :alt="tier.tier.name"
              class="tier-sprite-mini"
            >
            <span
              v-else
              class="tier-emoji"
            >{{ tier.tier.icon }}</span>
            <span
              class="tier-label"
              :style="{ color: tier.tier.color }"
            >{{ tier.tier.name }}</span>
          </div>
          <div class="reward-col">
            <span class="reward-desc">{{ tier.rewardsDesc }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./SocialRankings.styles.scss" lang="scss"></style>
