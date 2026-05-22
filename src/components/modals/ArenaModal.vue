<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { usePvPStore } from '@/stores/pvp'
import { useLivePvPStore } from '@/stores/livePvP'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useWindowListener } from '@/composables/useWindowListener'
import { RANKED_REWARD_MILESTONES } from '@/data/rankedData'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getItemByName } from '@/data/items'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { gsap } from 'gsap'

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  close: []
}>()

const pvp = usePvPStore()
const livePvP = useLivePvPStore()
const auth = useAuthStore()
const ui = useUIStore()

// State and references
const listRef = ref<HTMLElement | null>(null)
const milestones = RANKED_REWARD_MILESTONES
const imageError = ref(false)

watch(() => pvp.eloTier?.id, () => {
  imageError.value = false
})

// Responsiveness setup
const isSmallScreen = ref(window.innerWidth <= 950)
const handleResize = () => {
  isSmallScreen.value = window.innerWidth <= 950
}
useWindowListener('resize', handleResize)

onMounted(async () => {
  await pvp.loadPvPData()
  animateList()
})

const allowedTypes = computed<string[]>(() => pvp.currentSeasonRules?.allowedTypes || [])

const getRankIcon = (tierId: string) => {
  return getAssetUrl(ASSET_TYPES.UI, `ranks/${tierId}`)
}

const getItemDesc = (itemName: string) => {
  const item = getItemByName(itemName)
  return item?.desc || 'Recompensa de la Arena de Batalla.'
}

const getItemSpriteUrl = (itemName: string) => {
  const item = getItemByName(itemName)
  const slug = item?.sprite || item?.id || itemName
  return getAssetUrl(ASSET_TYPES.ITEM, slug)
}

const seasonActive = computed(() => {
  const now = Temporal.Now.instant()
  const range = pvp.seasonRange || {}
  if (!range.start || !range.end) return false
  return Temporal.Instant.compare(now, range.start) >= 0 && Temporal.Instant.compare(now, range.end) <= 0
})

function isUnlocked(eloReq: number) {
  return (pvp.maxElo || 0) >= eloReq
}

function isClaimed(id: string | number) {
  return (pvp.rewardsClaimed || []).includes(id.toString())
}

function startSearch() {
  if (!seasonActive.value) {
    ui.notify('La temporada no está activa.', '🚫')
    return
  }
  if (livePvP.isSearching) {
    livePvP.cancelSearch()
  } else {
    livePvP.startSearch()
  }
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
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '620px'"
    :height="isSmallScreen ? '100dvh' : '780px'"
    variant="retro"
    padding="raw"
    accent-color="var(--blue-light)"
    @close="emit('close')"
  >
    <template #header>
      <div class="arena-modal-header">
        <div class="arena-title-group">
          <span class="title-icon">⚔️</span>
          <div class="title-text-wrap">
            <span class="main-title">ARENA DE BATALLA</span>
            <span class="sub-title">Compite en encuentros clasificatorios</span>
          </div>
        </div>
        <div class="header-stats">
          <div class="stat-node elo">
            <span class="label">ELO</span>
            <span class="value">{{ pvp.elo || 1000 }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="arena-modal-content-inner">
      <div
        v-if="auth.sessionMode === 'offline'"
        class="offline-mask"
      >
        <div class="lock-card">
          <span class="icon">📡</span>
          <h3>ARENA DESCONECTADA</h3>
          <p>Conéctate a la red global para participar en encuentros clasificatorios y defender tu posición en el ranking.</p>
        </div>
      </div>

      <main class="arena-main custom-scrollbar">
        <!-- Rank Card Info -->
        <section class="rank-card">
          <div class="tier-display">
            <div class="tier-icon-wrapper">
              <img
                v-if="!imageError"
                :src="getRankIcon(pvp.eloTier?.id || 'bronce')"
                :alt="pvp.eloTier?.name || 'Bronce'"
                class="tier-image"
                @error="imageError = true"
              >
              <div
                v-else
                class="tier-emoji-badge"
                :style="{ '--tier-color': pvp.eloTier?.color || '#888' }"
              >
                <span class="emoji">{{ pvp.eloTier?.icon || '🥉' }}</span>
              </div>
            </div>
            <div class="tier-info">
              <span class="tier-label">RANGO ACTUAL</span>
              <h2 :style="{ color: pvp.eloTier?.color || '#888' }">
                {{ pvp.eloTier?.name || 'Bronce' }}
              </h2>
              <div class="elo-badge">
                {{ pvp.elo || 1000 }} ELO
              </div>
            </div>
          </div>

          <div class="arena-stats">
            <div class="stat-item">
              <span class="val">{{ pvp.stats?.wins || 0 }}</span>
              <span class="lab">VICTORIAS</span>
            </div>
            <div class="stat-item">
              <span class="val">{{ pvp.stats?.losses || 0 }}</span>
              <span class="lab">DERROTAS</span>
            </div>
            <div class="stat-item">
              <span class="val">{{ (pvp.stats?.wins / (pvp.stats?.wins + pvp.stats?.losses || 1) * 100).toFixed(1) }}%</span>
              <span class="lab">WIN RATE</span>
            </div>
          </div>
        </section>

        <!-- Passive Defense -->
        <section class="passive-defense">
          <div class="def-header">
            <div class="title-group">
              <h3>DEFENSA PASIVA</h3>
              <p>Tu equipo actual defenderá tu posición mientras no estés en línea.</p>
            </div>
            <button
              :class="{ active: pvp.passiveTeamActive }"
              class="toggle-btn"
              @click.stop="pvp.togglePassiveTeam"
            >
              {{ pvp.passiveTeamActive ? 'ACTIVADO' : 'DESACTIVADO' }}
            </button>
          </div>

          <div
            v-if="pvp.passiveTeamActive"
            class="def-status active"
          >
            ¡Tu equipo de defensa está protegiendo tu ELO en la Arena!
          </div>
          <div
            v-else
            class="def-status inactive"
          >
            Advertencia: Sin defensa pasiva, tu ELO bajará más rápido si te derrotan.
          </div>
        </section>

        <!-- Seasons Rewards -->
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
                    <span class="m-prize-pill">
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

        <!-- Matchmaking Actions & Rules -->
        <section class="matchmaking-actions">
          <div class="rules-hint">
            <h4>REGLAS ACTUALES</h4>
            <div class="rules-summary">
              <span>Nivel Máx: {{ pvp.currentSeasonRules?.levelCap || 'Sin límite' }}</span>
              <span>Pokémon: {{ pvp.currentSeasonRules?.maxPokemon || 6 }}</span>
            </div>
            <div
              v-if="allowedTypes.length"
              class="types-list"
            >
              <PokemonTypeTag
                v-for="t in allowedTypes"
                :key="t"
                :type="t"
                size="sm"
              />
            </div>
            <div
              v-else
              class="all-types-allowed"
            >
              Todos los tipos permitidos
            </div>
          </div>

          <button
            class="search-btn"
            :disabled="!seasonActive"
            @click.stop="startSearch"
          >
            <span class="icon">{{ livePvP.isSearching ? '🛑' : '🔍' }}</span>
            {{ seasonActive ? (livePvP.isSearching ? 'CANCELAR BÚSQUEDA' : 'BUSCAR PARTIDA') : 'TEMPORADA CERRADA' }}
          </button>
        </section>
      </main>
    </div>
  </BaseModal>
</template>
