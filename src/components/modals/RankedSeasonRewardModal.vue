<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import BaseModal from '@/components/common/BaseModal.vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { RANKED_TIERS, type RankedTierCode } from '@/logic/pvp/rankedEngine'
import { calculateSoftResetElo } from '@/logic/pvp/eloRatingMath'

interface AwardItem {
  id: string
  prize: Record<string, unknown>
}

interface Props {
  id?: string
  show?: boolean
  seasonName?: string
  tier?: string
  rank?: number
  finalElo?: number
  awards?: AwardItem[]
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  show: true,
  seasonName: 'Temporada 1',
  tier: 'oro',
  rank: undefined,
  finalElo: 1650,
  awards: () => []
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'claimed'): void
}>()

const gameStore = useGameStore()
const uiStore = useUIStore()

const isClaiming = ref(false)
const isClaimed = ref(false)

const tierCode = computed(() => (props.tier || 'bronce').toUpperCase() as RankedTierCode)
const tierInfo = computed(() => RANKED_TIERS[tierCode.value] || RANKED_TIERS.BRONCE)
const softResetElo = computed(() => calculateSoftResetElo(props.finalElo))

const tierColor = computed(() => tierInfo.value.color)

function formatTierName(tier?: unknown): string {
  if (typeof tier !== 'string' || !tier) return ''
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()
}

// Animation on modal show
watch(
  () => props.show,
  (val) => {
    if (val) {
      nextTick(() => {
        const badge = document.querySelector('.reward-tier-badge')
        const items = document.querySelectorAll('.reward-prize-item')
        if (badge) {
          gsap.fromTo(badge, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' })
        }
        if (items.length > 0) {
          gsap.fromTo(items, { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.08, ease: 'power2.out' })
        }
      })
    }
  },
  { immediate: true }
)

async function handleClaimAll() {
  if (isClaiming.value || isClaimed.value) return

  isClaiming.value = true
  try {
    if (gameStore.db) {
      for (const award of props.awards) {
        if (award.id && !award.id.startsWith('local_')) {
          await gameStore.db.rpc('claim_award', { p_award_id: award.id })
        }
      }
    }

    isClaimed.value = true
    uiStore.notify('¡Recompensas de temporada reclamadas con éxito!', '🎉')
    emit('claimed')
    emit('close')
  } catch (_err) {
    uiStore.notify('Error al reclamar recompensas.', '❌')
  } finally {
    isClaiming.value = false
  }
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <BaseModal
    :show="props.show"
    title="PREMIOS DE TEMPORADA RANKED"
    title-color="#fde047"
    type="center"
    max-width="460px"
    :show-close-button="true"
    @close="handleClose"
  >
    <div class="ranked-season-reward-content">
      <!-- Season Header & Tier Badge -->
      <div class="season-celebration-header">
        <h3
          id="ranked-reward-title"
          class="season-title"
        >
          {{ props.seasonName }}
        </h3>
        <p class="season-subtitle">
          ¡Temporada clasificada concluida!
        </p>

        <div
          class="reward-tier-badge"
          :style="{ borderColor: tierColor }"
        >
          <img
            v-if="tierInfo.sprite"
            :src="tierInfo.sprite"
            :alt="tierInfo.name"
            class="tier-sprite-badge"
          >
          <span
            v-else
            class="emoji tier-icon"
          >{{ tierInfo.icon }}</span>
          <div class="tier-details">
            <span
              class="tier-name"
              :style="{ color: tierColor }"
            >{{ tierInfo.name }}</span>
            <span class="final-elo">{{ props.finalElo }} LP</span>
          </div>
          <div
            v-if="props.rank && props.rank <= 10"
            class="top-podium-pill podium-tag"
          >
            PODIO #{{ props.rank }}
          </div>
        </div>
      </div>

      <!-- Soft Reset Info Banner -->
      <div class="soft-reset-banner soft-reset-preview">
        <span class="emoji reset-icon">⚖️</span>
        <div class="reset-text">
          <span>Soft Reset Proporcional:</span>
          <strong>Tu ELO para la próxima temporada será {{ softResetElo }} LP</strong>
        </div>
      </div>

      <!-- Unlocked Prizes Shelf -->
      <div class="unlocked-prizes-section">
        <h4 class="section-heading">
          RECOMPENSAS DESBLOQUEADAS ({{ props.awards.length }})
        </h4>

        <div class="prizes-list awards-grid">
          <div
            v-for="award in props.awards"
            :key="award.id"
            class="reward-prize-item"
          >
            <!-- Pokémon Prize -->
            <template v-if="award.prize.type === 'pokemon'">
              <span class="emoji prize-icon">🐣</span>
              <div class="prize-info">
                <span class="prize-title">
                  {{ String(award.prize.species || '').toUpperCase() }}
                  <template v-if="award.prize.shiny">
                    <span class="emoji">✨</span> SHINY
                  </template>
                </span>
                <span class="prize-sub">Nivel {{ award.prize.level }} • Genética Competitiva</span>
              </div>
            </template>

            <!-- Item / Ticket Prize -->
            <template v-else-if="award.prize.type === 'item'">
              <span class="emoji prize-icon">🎫</span>
              <div class="prize-info">
                <span class="prize-title">{{ award.prize.item }}</span>
                <span class="prize-sub">Cantidad: x{{ award.prize.qty }}</span>
              </div>
            </template>

            <!-- Battle Coins Prize -->
            <template v-else-if="award.prize.type === 'bc' || award.prize.type === 'battle_coins'">
              <span class="emoji prize-icon">🪙</span>
              <div class="prize-info">
                <span class="prize-title">{{ award.prize.amount }} Battle Coins ({{ award.prize.amount }} Monedas de Batalla)</span>
                <span class="prize-sub">Moneda de Torneo y Tienda BC</span>
              </div>
            </template>

            <!-- Ranked Medal Prize -->
            <template v-else-if="award.prize.type === 'ranked_medal'">
              <span class="emoji prize-icon">🎖️</span>
              <div class="prize-info">
                <span class="prize-title">Medalla {{ formatTierName(award.prize.tier) }} (Medalla de Temporada {{ award.prize.season }})</span>
                <span class="prize-sub">Rango {{ String(award.prize.tier).toUpperCase() }}</span>
              </div>
            </template>

            <!-- Generic fallback -->
            <template v-else>
              <span class="emoji prize-icon">🎁</span>
              <div class="prize-info">
                <span class="prize-title">Premio Especial</span>
                <span class="prize-sub">{{ JSON.stringify(award.prize) }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="reward-modal-footer">
        <button
          id="btn-claim-ranked-season-rewards"
          class="claim-rewards-btn"
          :disabled="isClaiming || isClaimed || props.awards.length === 0"
          @click="handleClaimAll"
        >
          <span
            v-if="isClaiming"
            class="emoji"
          >⏳ RECLAMANDO...</span>
          <span
            v-else-if="isClaimed"
            class="emoji"
          >✓ RECLAMADO</span>
          <span
            v-else
            class="emoji"
          >🎁 RECLAMAR RECOMPENSAS</span>
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/components/_profile-shared.scss";

.ranked-season-reward-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 8px 4px;
}

.season-celebration-header {
  text-align: center;

  .season-title {
    font-size: 1.15rem;
    font-weight: 800;
    color: #fde047;
    margin: 0;
    text-transform: uppercase;
    text-shadow: 0 0 8px Rgba(234, 179, 8, 0.4);
  }

  .season-subtitle {
    font-size: 0.8rem;
    color: #94a3b8;
    margin: 3px 0 10px 0;
  }
}

.reward-tier-badge {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 18px;
  background: Rgba(15, 23, 42, 0.8);
  border: 2px solid;
  border-radius: 12px;
  margin: 0 auto;

  .tier-icon {
    font-size: 1.8rem;
  }

  .tier-sprite-badge {
    width: 36px;
    height: 36px;
    object-fit: contain;
    image-rendering: pixelated;
    filter: Drop-Shadow(0 2px 6px Rgba(0, 0, 0, 0.5));
    flex-shrink: 0;
  }

  .tier-details {
    display: flex;
    flex-direction: column;
    text-align: left;

    .tier-name {
      font-size: 1rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .final-elo {
      font-size: 0.8rem;
      color: #cbd5e1;
      font-weight: 600;
    }
  }

  .top-podium-pill {
    padding: 3px 8px;
    background: Rgba(234, 179, 8, 0.3);
    border: 1px solid #eab308;
    color: #fef08a;
    font-size: 0.7rem;
    font-weight: 800;
    border-radius: 6px;
  }
}

.soft-reset-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: Rgba(30, 41, 59, 0.6);
  border: 1px solid Rgba(148, 163, 184, 0.2);
  border-radius: 8px;

  .reset-icon {
    font-size: 1.4rem;
  }

  .reset-text {
    display: flex;
    flex-direction: column;
    font-size: 0.75rem;
    color: #94a3b8;

    strong {
      color: #38bdf8;
      font-size: 0.8rem;
      margin-top: 1px;
    }
  }
}

.unlocked-prizes-section {
  .section-heading {
    font-size: 0.8rem;
    font-weight: 700;
    color: #cbd5e1;
    margin: 0 0 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .prizes-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 200px;
    overflow-y: auto;
  }
}

.reward-prize-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: Rgba(15, 23, 42, 0.6);
  border: 1px solid Rgba(148, 163, 184, 0.2);
  border-radius: 8px;

  .prize-icon {
    font-size: 1.3rem;
  }

  .prize-info {
    display: flex;
    flex-direction: column;

    .prize-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: #f8fafc;
      text-transform: uppercase;
    }

    .prize-sub {
      font-size: 0.7rem;
      color: #94a3b8;
    }
  }
}

.reward-modal-footer {
  margin-top: 6px;

  .claim-rewards-btn {
    width: 100%;
    padding: 12px;
    font-size: 0.85rem;
    font-weight: 800;
    color: #0f172a;
    background: linear-gradient(135deg, #fde047 0%, #eab308 100%);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 0 10px Rgba(234, 179, 8, 0.4);

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }
  }
}
</style>
