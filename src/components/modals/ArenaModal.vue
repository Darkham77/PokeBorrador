<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { usePvPStore } from '@/stores/pvp'
import { useLivePvPStore } from '@/stores/livePvP'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ArenaMilestoneTrack from '@/components/modals/ArenaMilestoneTrack.vue'
import { gsap } from 'gsap'

const TIER_ICON_FLOAT_Y = -6;
const TIER_ICON_FLOAT_DURATION_SEC = 2;
const EMOJI_HOVER_SCALE = 1.15;
const EMOJI_HOVER_ROTATE_DEG = 5;
const EMOJI_HOVER_DURATION_SEC = 0.3;
const TOGGLE_BTN_HOVER_DURATION_SEC = 0.25;
import { useGsapTransition } from '@/composables/ui/useGsapTransition'
import { toPokemonType, type PokemonType } from '@/data/battle/types'

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
const tierIconRef = ref<HTMLElement | null>(null)
const imageError = ref(false)

watch(() => pvp.eloTier?.id, () => {
  imageError.value = false
})

// Responsiveness setup
const isSmallScreen = computed(() => ui.isSmallScreen)

onMounted(async () => {
  await pvp.loadPvPData()
  
  if (tierIconRef.value) {
    gsap.to(tierIconRef.value, {
      y: TIER_ICON_FLOAT_Y,
      duration: TIER_ICON_FLOAT_DURATION_SEC,
      yoyo: true,
      repeat: -1,
      ease: 'power1.inOut'
    })
  }
})

const offlineTransitionHooks = useGsapTransition({
  type: 'fade',
  duration: EMOJI_HOVER_DURATION_SEC
})

const allowedTypes = computed<PokemonType[]>(() => (pvp.currentSeasonRules?.allowedTypes || []).map(toPokemonType))

const getRankIcon = (tierId: string) => {
  return getAssetUrl(ASSET_TYPES.UI, `ranks/${tierId}`)
}

const seasonActive = computed(() => {
  const now = Temporal.Now.instant()
  const range = pvp.seasonRange || {}
  if (!range.start || !range.end) return false
  return Temporal.Instant.compare(now, range.start) >= 0 && Temporal.Instant.compare(now, range.end) <= 0
})

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

// NOTE: claim-btn and search-btn use @include btn-vicio mixin.
// Per ui_ux_standards.md (GSAP Hover Clash rule), btn-vicio manages
// its own hover via native CSS transitions. No GSAP handlers needed.

const EMOJI_OVERSHOOT_EASE = 1.275;

function handleEmojiEnter(e: MouseEvent) {
  const emoji = (e.currentTarget as HTMLElement).querySelector('.emoji')
  if (emoji) {
    gsap.to(emoji, {
      scale: EMOJI_HOVER_SCALE,
      rotate: EMOJI_HOVER_ROTATE_DEG,
      duration: EMOJI_HOVER_DURATION_SEC,
      ease: `back.out(${EMOJI_OVERSHOOT_EASE})`
    })
  }
}

function handleEmojiLeave(e: MouseEvent) {
  const emoji = (e.currentTarget as HTMLElement).querySelector('.emoji')
  if (emoji) {
    gsap.to(emoji, {
      scale: 1,
      rotate: 0,
      duration: EMOJI_HOVER_DURATION_SEC,
      ease: 'power2.out'
    })
  }
}

function handleToggleBtnEnter(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: 'var(--white)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    duration: TOGGLE_BTN_HOVER_DURATION_SEC,
    ease: 'power2.out'
  })
}

function handleToggleBtnLeave(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    backgroundColor: '',
    color: '',
    borderColor: '',
    duration: TOGGLE_BTN_HOVER_DURATION_SEC,
    ease: 'power2.out'
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
          <span class="emoji">⚔️</span>
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
      <Transition
        :css="false"
        v-on="offlineTransitionHooks"
      >
        <div
          v-if="auth.sessionMode === 'offline'"
          class="offline-mask"
        >
          <div class="lock-card">
            <span
              v-gsap-loop="{ effect: 'float', duration: 4, y: -5, rotation: 3 }"
              class="emoji icon"
            >📡</span>
            <h3>ARENA DESCONECTADA</h3>
            <p>Conéctate a la red global para participar en encuentros clasificatorios y defender tu posición en el ranking.</p>
          </div>
        </div>
      </Transition>

      <main class="arena-main custom-scrollbar">
        <!-- Rank Card Info -->
        <section class="rank-card">
          <div class="tier-display">
            <div
              ref="tierIconRef"
              class="tier-icon-wrapper"
            >
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
                @mouseenter="handleEmojiEnter"
                @mouseleave="handleEmojiLeave"
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
              @mouseenter="handleToggleBtnEnter"
              @mouseleave="handleToggleBtnLeave"
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
        <ArenaMilestoneTrack />

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
            <span class="emoji icon">{{ livePvP.isSearching ? '🛑' : '🔍' }}</span>
            {{ seasonActive ? (livePvP.isSearching ? 'CANCELAR BÚSQUEDA' : 'BUSCAR PARTIDA') : 'TEMPORADA CERRADA' }}
          </button>
        </section>
      </main>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss" src="@/styles/components/_arena.scss"></style>

