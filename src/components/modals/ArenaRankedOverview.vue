<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { gsap } from "gsap";
import { usePvPStore } from "@/stores/pvp";
import { useLivePvPStore } from "@/stores/livePvP";
import { useUIStore } from "@/stores/ui";
import { useModalStore } from "@/stores/modals";
import { getAssetUrl, ASSET_TYPES } from "@/logic/services/assetService";
import PokemonTypeTag from "@/components/shared/PokemonTypeTag.vue";
import { toPokemonType, type PokemonType } from "@/data/battle/types";
import { getSeasonalThemeForMonth, type RankedTierId } from "@/data/system/rankedData";
import { validateTeamForRanked, normalizeRankedRules } from "@/logic/pvp/rankedEngine";
import { GAME_TIMEZONE } from "@/logic/utils/timeUtils";
import { ARENA_TIER_ICON_FLOAT_Y_PX, TIER_ICON_FLOAT_DURATION_SEC } from "@/logic/constants/animations";

const pvp = usePvPStore();
const livePvP = useLivePvPStore();
const ui = useUIStore();
const modalStore = useModalStore();

const tierIconRef = ref<HTMLElement | null>(null);
const imageError = ref(false);

const EMOJI_HOVER_SCALE = 1.15;
const EMOJI_HOVER_ROTATE_DEG = 5;
const EMOJI_HOVER_DURATION_SEC = 0.3;
const EMOJI_OVERSHOOT_EASE = 1.275;

watch(() => pvp.eloTier?.id, () => {
  imageError.value = false;
});

onMounted(() => {
  if (tierIconRef.value) {
    gsap.to(tierIconRef.value, {
      y: ARENA_TIER_ICON_FLOAT_Y_PX,
      duration: TIER_ICON_FLOAT_DURATION_SEC,
      yoyo: true,
      repeat: -1,
      ease: "power1.inOut"
    });
  }
});

const currentTheme = computed(() => {
  return getSeasonalThemeForMonth(Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE).month);
});

const allowedTypes = computed<PokemonType[]>(() =>
  (pvp.currentSeasonRules?.allowedTypes || currentTheme.value.allowedTypes || []).map(toPokemonType)
);

const getRankIcon = (tierId?: RankedTierId) => {
  const id = tierId || "bronce";
  return getAssetUrl(ASSET_TYPES.RANK, id);
};

const getPokemonRewardSprite = (species: string, isShiny = true) => {
  return getAssetUrl(ASSET_TYPES.POKEMON, species, { isShiny });
};

const seasonActive = computed(() => {
  const now = Temporal.Now.instant();
  const range = pvp.seasonRange || {};
  if (!range.start || !range.end) return false;
  return Temporal.Instant.compare(now, range.start) >= 0 && Temporal.Instant.compare(now, range.end) <= 0;
});

function startSearch() {
  if (!seasonActive.value) {
    ui.notify("La temporada no está activa.", "🚫");
    return;
  }
  if (livePvP.isSearching) {
    livePvP.cancelSearch();
    return;
  }
  if (pvp.currentSeasonRules) {
    const rules = normalizeRankedRules(pvp.currentSeasonRules, pvp.currentSeasonRules.name);
    const format = rules.maxPokemon <= 3 ? "3v3" : "6v6";
    const team = livePvP.resolvePvpTeam(format);
    const validation = validateTeamForRanked(team, rules);
    if (!validation.ok) {
      ui.notify(validation.reason || "Tu equipo no cumple las reglas de la temporada.", "⚠️");
      return;
    }
  }
  livePvP.startSearch();
}

function openTeamBuilder() {
  modalStore.open('RankedTeamBuilder');
}

function handleEmojiEnter(e: MouseEvent) {
  const emoji = (e.currentTarget as HTMLElement).querySelector(".emoji");
  if (emoji) {
    gsap.to(emoji, {
      scale: EMOJI_HOVER_SCALE,
      rotate: EMOJI_HOVER_ROTATE_DEG,
      duration: EMOJI_HOVER_DURATION_SEC,
      ease: `back.out(${EMOJI_OVERSHOOT_EASE})`
    });
  }
}

function handleEmojiLeave(e: MouseEvent) {
  const emoji = (e.currentTarget as HTMLElement).querySelector(".emoji");
  if (emoji) {
    gsap.to(emoji, {
      scale: 1,
      rotate: 0,
      duration: EMOJI_HOVER_DURATION_SEC,
      ease: "power2.out"
    });
  }
}
</script>

<template>
  <div class="arena-ranked-overview">
    <!-- 1. Top Section: Seasonal Tournament Banner & Official Rules (EventCard style) -->
    <section class="season-tournament-card">
      <div class="tournament-banner-wrapper">
        <img
          :src="currentTheme.bannerImage"
          :alt="currentTheme.name"
          class="tournament-banner-img allow-aliasing"
          @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
        >
      </div>

      <div class="tournament-details">
        <div class="tournament-header-row">
          <span class="season-badge">TORNEO DE TEMPORADA</span>
          <h3 class="tournament-name text-outline">
            {{ currentTheme.name }}
          </h3>
        </div>

        <p class="tournament-desc">
          {{ currentTheme.description }}
        </p>

        <div class="tournament-badges-row">
          <span class="rule-badge text-outline">
            <span class="emoji">⚔️</span> 6 vs 6 (Single)
          </span>
          <span class="rule-badge text-outline">
            <span class="emoji">⭐</span> Nivel Máx: {{ pvp.currentSeasonRules?.levelCap || '50' }}
          </span>
          <span
            v-if="currentTheme.isLittleCup"
            class="rule-badge special-rule text-outline"
          >
            <span class="emoji">🐣</span> Little Cup
          </span>
          <span
            v-if="currentTheme.requiresMonotype"
            class="rule-badge special-rule text-outline"
          >
            <span class="emoji">🧬</span> Monotipo
          </span>
          <span
            v-if="currentTheme.requiresDualType"
            class="rule-badge special-rule text-outline"
          >
            <span class="emoji">⚡</span> Doble Tipo
          </span>

          <!-- Allowed Types Badges -->
          <div
            v-if="allowedTypes.length"
            class="types-pills-row"
          >
            <PokemonTypeTag
              v-for="t in allowedTypes"
              :key="t"
              :type="t"
              size="ssm"
            />
          </div>
          <span
            v-else
            class="rule-badge all-types text-outline"
          >
            Todos los tipos permitidos
          </span>
        </div>

        <!-- Shiny Reward Preview for Diamante / Maestro -->
        <div class="tournament-reward-preview">
          <img
            :src="getPokemonRewardSprite(currentTheme.rewardPokemon.maestro.species, true)"
            :alt="currentTheme.rewardPokemon.maestro.species"
            class="reward-sprite pixel-art"
          >
          <div class="reward-text-group">
            <span class="reward-tag text-outline">RECOMPENSA EXCLUSIVA MAESTRO</span>
            <span class="reward-name text-outline">
              <span class="emoji">✨</span> {{ currentTheme.rewardPokemon.maestro.species }} SHINY (IVs 31x4)
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. Center Section: Rank Medal, ELO & Matchmaking Action Buttons -->
    <section class="rank-card">
      <div class="rank-summary-row">
        <div class="tier-display">
          <div
            ref="tierIconRef"
            class="tier-icon-wrapper"
          >
            <img
              v-if="!imageError"
              :src="getRankIcon(pvp.eloTier?.id)"
              :alt="pvp.eloTier?.name || 'Bronce'"
              class="tier-image allow-aliasing"
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
            <span class="tier-label text-outline">RANGO ACTUAL</span>
            <h2
              :style="{ color: pvp.eloTier?.color || '#888' }"
              class="text-outline"
            >
              {{ pvp.eloTier?.name || 'Bronce' }}
            </h2>
            <div class="elo-badge text-outline">
              {{ pvp.elo || 1000 }} ELO
            </div>
          </div>
        </div>

        <div class="arena-stats">
          <div class="stat-item">
            <span class="val text-outline">{{ pvp.stats?.wins || 0 }}</span>
            <span class="lab text-outline">VICTORIAS</span>
          </div>
          <div class="stat-item">
            <span class="val text-outline">{{ pvp.stats?.losses || 0 }}</span>
            <span class="lab text-outline">DERROTAS</span>
          </div>
          <div class="stat-item">
            <span class="val text-outline">{{ (pvp.stats?.wins / (pvp.stats?.wins + pvp.stats?.losses || 1) * 100).toFixed(1) }}%</span>
            <span class="lab text-outline">WIN RATE</span>
          </div>
        </div>
      </div>

      <!-- Matchmaking Search Indicator -->
      <div
        v-if="livePvP.isSearching"
        class="search-status-box"
      >
        <span class="emoji icon">⏳</span>
        <span class="status-msg">
          {{ livePvP.searchPhase === 'passive_fallback' 
            ? 'Buscando defensa pasiva...' 
            : `Buscando rival humano... (${livePvP.searchSecondsRemaining}s)` 
          }}
        </span>
      </div>

      <!-- Action Buttons -->
      <div class="actions-buttons-group">
        <button
          v-if="!livePvP.isSearching"
          v-gsap-hover
          class="config-team-btn"
          @click.stop="openTeamBuilder"
        >
          <span class="emoji icon">⚙️</span>
          CONFIGURAR EQUIPO
        </button>
        <button
          v-if="!livePvP.isSearching"
          class="search-btn"
          :disabled="!seasonActive"
          @click.stop="startSearch"
        >
          <span class="emoji icon">🔍</span>
          {{ seasonActive ? 'BUSCAR PARTIDA RANKED' : 'TEMPORADA CERRADA' }}
        </button>
        <button
          v-else
          class="search-btn is-searching"
          @click.stop="startSearch"
        >
          <span class="emoji icon">🛑</span>
          CANCELAR BÚSQUEDA
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_arena.scss"></style>
<style scoped lang="scss">
.arena-ranked-overview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.actions-buttons-group {
  display: flex;
  gap: 8px;
  width: 100%;

  .config-team-btn {
    flex: 1;
    min-height: 32px;
    padding: 6px 12px;
    background: Rgba(30, 41, 59, 0.9);
    border: 1px solid Rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #fff;
    font-size: 10px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;

    &:hover {
      background: Rgba(51, 65, 85, 0.95);
      border-color: #38bdf8;
    }
  }

  .search-btn {
    flex: 1.5;
  }
}
</style>
