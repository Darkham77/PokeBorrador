<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { useGameStore } from '@/stores/game'
import { useLivePvPStore } from '@/stores/livePvP'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getSeasonalThemeForMonth } from '@/data/system/rankedData'
import { isPokemonLegalForTheme, autoFillLegalTeamForTheme } from '@/logic/pvp/pvpTeamHelper'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'
import type { Friend } from '@/stores/social/social'
import type { PvpMatchFormat, PvpLevelRule, PvpChallengeConfig, PvpMatchMode } from '@/types/battle/pvp'
import type { Pokemon } from '@/types/pokemon/pokemon'

interface Props {
  id?: string
  show?: boolean
  friend?: Friend
  opponentId?: string
  opponentName?: string
}

const props = withDefaults(defineProps<Props>(), {
  id: '',
  show: true,
  friend: undefined,
  opponentId: '',
  opponentName: 'Rival'
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const livePvPStore = useLivePvPStore()
const uiStore = useUIStore()

const selectedMode = ref<PvpMatchMode>('ranked')
const selectedFormat = ref<PvpMatchFormat>('6v6')
const selectedLevelRule = ref<PvpLevelRule>('flat50')

const targetId = computed(() => props.friend?.id || props.opponentId)
const targetName = computed(() => props.friend?.username || props.opponentName || 'Rival')
const isOpponentOffline = computed(() => props.friend?.isOnline === false)

// Seasonal Monthly Theme
const currentMonth = Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE).month
const currentTheme = computed(() => getSeasonalThemeForMonth(currentMonth))

function setMode(mode: PvpMatchMode) {
  selectedMode.value = mode
  if (mode === 'ranked') {
    selectedFormat.value = '6v6'
    selectedLevelRule.value = 'flat50'
  }
}

const pokemonByUid = computed(() => {
  const map = new Map<string, Pokemon>()
  for (const p of gameStore.state.team || []) {
    if (p) map.set(p.uid, p)
  }
  for (const p of gameStore.state.box || []) {
    if (p) map.set(p.uid, p)
  }
  return map
})

const requiredCount = computed(() => (selectedFormat.value === '6v6' ? 6 : 3))

const activeTeam = computed<(Pokemon | null)[]>(() => {
  const uids = (selectedFormat.value === '6v6' ? gameStore.state.pvpTeam6 : gameStore.state.pvpTeam) || []
  const count = requiredCount.value
  const slots: (Pokemon | null)[] = []
  for (let i = 0; i < count; i++) {
    const uid = uids[i]
    slots.push((uid ? pokemonByUid.value.get(uid) : null) || null)
  }
  return slots
})

const hasIllegalPokemon = computed(() => {
  return activeTeam.value.some(p => p && p.isIllegal)
})

const isTeamComplete = computed(() => {
  const validPokes = activeTeam.value.filter((p): p is Pokemon => p !== null && p.hp > 0)
  return validPokes.length >= requiredCount.value
})

const teamLegality = computed(() => {
  if (selectedMode.value !== 'ranked') return { isLegal: true, illegalCount: 0 }
  const theme = currentTheme.value
  let illegalCount = 0
  for (const p of activeTeam.value) {
    if (p && !isPokemonLegalForTheme(p, theme)) {
      illegalCount++
    }
  }
  return {
    isLegal: illegalCount === 0,
    illegalCount
  }
})

const canSend = computed(() => {
  return Boolean(targetId.value)
    && isTeamComplete.value
    && !hasIllegalPokemon.value
    && (selectedMode.value !== 'ranked' || teamLegality.value.isLegal)
})

function handleAutoFillLegalTeam() {
  const allPokes = [
    ...((gameStore.state.team || []) as (Pokemon | null)[]),
    ...((gameStore.state.box || []) as (Pokemon | null)[])
  ].filter((p): p is Pokemon => p != null)

  const legalPokes = autoFillLegalTeamForTheme(allPokes, currentTheme.value, requiredCount.value)
  if (legalPokes.length < requiredCount.value) {
    uiStore.notify(`Solo se encontraron ${legalPokes.length}/${requiredCount.value} Pokémon legales para la temática.`, '⚠️')
  }

  const uids = legalPokes.map(p => p.uid)
  if (selectedFormat.value === '6v6') {
    gameStore.state.pvpTeam6 = uids
  } else {
    gameStore.state.pvpTeam = uids
  }
  gameStore.save(false)
  uiStore.notify('¡Equipo autocompletado con Pokémon legales!', '✨')
}

function getSpriteUrl(pokemon: Pokemon | null | undefined): string {
  if (!pokemon) return ''
  return getAssetUrl(ASSET_TYPES.POKEMON, pokemon.id)
}

function openTeamManagement() {
  emit('close')
  uiStore.toggleTeamManagement()
}

async function handleSendChallenge() {
  if (!canSend.value || !targetId.value) return

  const config: PvpChallengeConfig = {
    format: selectedFormat.value,
    levelRule: selectedLevelRule.value,
    arena: {
      gymId: 'celadon'
    },
    mode: selectedMode.value,
    isAsynchronous: isOpponentOffline.value
  }

  emit('close')
  await livePvPStore.sendInvite(targetId.value, targetName.value, config)
}
</script>

<template>
  <BaseModal
    :show="show"
    title="DESAFÍO PVP"
    max-width="520px"
    padding="compact"
    @close="emit('close')"
  >
    <div class="pvp-challenge-container">
      <div class="opponent-badge">
        <span class="label">DESAFIANDO A:</span>
        <span class="username">{{ targetName }}</span>
      </div>

      <div
        v-if="isOpponentOffline"
        class="offline-rival-banner"
      >
        <span class="emoji">🛡️</span>
        <div class="banner-text">
          <span class="banner-title">RIVAL DESCONECTADO (COMBATE ASÍNCRONO)</span>
          <span class="banner-desc">Competirás contra su equipo activo controlado por la IA competitiva.</span>
        </div>
      </div>

      <!-- MATCH MODE SELECTION -->
      <div class="pvp-section">
        <label class="section-title">MODO DE COMBATE</label>
        <div class="options-row">
          <button
            id="btn-pvp-mode-ranked"
            v-gsap-hover="'button'"
            class="option-pill"
            :class="{ active: selectedMode === 'ranked' }"
            @click="setMode('ranked')"
          >
            <span class="option-name"><span class="emoji">🏆</span> RANKED</span>
            <span class="option-desc">Suma ELO · Monedas Batalla</span>
          </button>
          <button
            id="btn-pvp-mode-casual"
            v-gsap-hover="'button'"
            class="option-pill"
            :class="{ active: selectedMode === 'casual' }"
            @click="setMode('casual')"
          >
            <span class="option-name"><span class="emoji">🎮</span> CASUAL</span>
            <span class="option-desc">Amistoso · Sin impacto ELO</span>
          </button>
        </div>
      </div>

      <!-- SEASONAL THEME BANNER -->
      <div
        v-if="selectedMode === 'ranked'"
        class="seasonal-theme-banner"
      >
        <img
          :src="currentTheme.bannerImage"
          :alt="currentTheme.name"
          class="theme-banner-img"
          @error="(e: Event) => { if (e.target) (e.target as HTMLElement).style.display = 'none' }"
        >
        <div class="theme-banner-overlay">
          <div class="theme-badge-row">
            <span class="theme-pill">TEMÁTICA DEL MES</span>
            <span class="theme-title">{{ currentTheme.name }}</span>
          </div>
          <p class="theme-desc">
            {{ currentTheme.description }}
          </p>
        </div>
      </div>

      <!-- FORMAT SELECTION -->
      <div class="pvp-section">
        <label class="section-title">FORMATO DE COMBATE</label>
        <div class="options-row">
          <button
            id="btn-pvp-format-3v3"
            v-gsap-hover="'button'"
            class="option-pill"
            :class="{ active: selectedFormat === '3v3' }"
            @click="selectedFormat = '3v3'"
          >
            <span class="option-name"><span class="emoji">⚔️</span> 3v3</span>
            <span class="option-desc">3 Pokémon · Ritmo Rápido</span>
          </button>
          <button
            id="btn-pvp-format-6v6"
            v-gsap-hover="'button'"
            class="option-pill"
            :class="{ active: selectedFormat === '6v6' }"
            @click="selectedFormat = '6v6'"
          >
            <span class="option-name"><span class="emoji">⚔️</span> 6v6</span>
            <span class="option-desc">6 Pokémon · Combate Completo</span>
          </button>
        </div>
      </div>

      <!-- LEVEL RULE SELECTION -->
      <div class="pvp-section">
        <label class="section-title">REGLAS DE NIVEL</label>
        <div class="options-row">
          <button
            id="btn-pvp-level-real"
            v-gsap-hover="'button'"
            class="option-pill"
            :class="{ active: selectedLevelRule === 'real' }"
            @click="selectedLevelRule = 'real'"
          >
            <span class="option-name">Nivel Real</span>
            <span class="option-desc">Sin ajustes de nivel</span>
          </button>
          <button
            id="btn-pvp-level-flat50"
            v-gsap-hover="'button'"
            class="option-pill"
            :class="{ active: selectedLevelRule === 'flat50' }"
            @click="selectedLevelRule = 'flat50'"
          >
            <span class="option-name">Nivel 50 Flat</span>
            <span class="option-desc">Escalado competitivo</span>
          </button>
        </div>
      </div>

      <!-- ARENA CONFIGURATION -->
      <div class="pvp-section">
        <label class="section-title">ESCENARIO DE COMBATE</label>
        <div class="arena-card">
          <span class="arena-icon emoji">🏛️</span>
          <div class="arena-info">
            <span class="arena-name">Gimnasio Celadon</span>
            <span class="arena-desc">Reglas oficiales · Bloqueo de clima natural</span>
          </div>
        </div>
      </div>

      <!-- TEAM PREVIEW & VALIDATION -->
      <div class="pvp-section">
        <div class="section-header-inline">
          <label class="section-title">EQUIPO SELECCIONADO ({{ activeTeam.filter(p => p && p.hp > 0).length }}/{{ requiredCount }})</label>
          <button
            class="link-btn"
            @click="openTeamManagement"
          >
            Gestionar Equipo <span class="emoji">✏️</span>
          </button>
        </div>

        <div class="team-slots-preview">
          <div
            v-for="index in requiredCount"
            :key="index"
            class="preview-slot"
            :class="{ filled: !!activeTeam[index - 1], empty: !activeTeam[index - 1] }"
          >
            <template v-if="activeTeam[index - 1]">
              <img
                :src="getSpriteUrl(activeTeam[index - 1])"
                :alt="activeTeam[index - 1]?.name || 'Pokemon'"
                class="slot-sprite"
              >
              <span class="slot-name">{{ activeTeam[index - 1]?.name }}</span>
            </template>
            <template v-else>
              <span class="slot-empty-icon"><span class="emoji">➕</span></span>
              <span class="slot-empty-text">Vacío</span>
            </template>
          </div>
        </div>

        <!-- THEME LEGALITY WARNING & AUTOFILL -->
        <div
          v-if="selectedMode === 'ranked' && !teamLegality.isLegal"
          class="theme-warning-banner"
        >
          <div class="warning-text-wrap">
            <span class="emoji">⚠️</span>
            <span>{{ teamLegality.illegalCount }} Pokémon no cumplen la temática {{ currentTheme.name }}.</span>
          </div>
          <button
            id="btn-pvp-autofill-legal"
            v-gsap-hover="'button'"
            class="autofill-btn"
            @click="handleAutoFillLegalTeam"
          >
            AUTOCOMPLETAR LEGAL
          </button>
        </div>

        <div
          v-if="!isTeamComplete"
          class="team-warning"
        >
          <span class="emoji">⚠️</span> Tu equipo de PvP {{ selectedFormat }} necesita {{ requiredCount }} Pokémon sanos para poder desafiar.
        </div>
        <div
          v-else-if="hasIllegalPokemon"
          class="team-warning danger"
        >
          <span class="emoji">⚠️</span> Tu equipo seleccionado contiene Pokémon ilegales.
        </div>
      </div>

      <!-- MODAL ACTIONS -->
      <div class="modal-footer-actions">
        <button
          id="btn-cancel-pvp-challenge"
          v-gsap-hover="'button'"
          class="btn-vicio-secondary"
          @click="emit('close')"
        >
          CANCELAR
        </button>
        <button
          id="btn-send-pvp-challenge"
          v-gsap-hover="'button'"
          class="btn-vicio-primary"
          :disabled="!canSend"
          @click="handleSendChallenge"
        >
          <span class="emoji">⚔️</span> ENVIAR DESAFÍO
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped src="./PvPChallengeModal.styles.scss" lang="scss"></style>
