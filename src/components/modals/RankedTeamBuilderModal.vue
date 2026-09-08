<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { gsap } from 'gsap';
import BaseModal from '@/components/common/BaseModal.vue';
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue';
import { useGameStore } from '@/stores/game';
import { usePvPStore } from '@/stores/pvp';
import { useUIStore } from '@/stores/ui';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { toPokemonType, type PokemonType } from '@/data/battle/types';
import { getSeasonalThemeForMonth } from '@/data/system/rankedData';
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils';
import { evaluatePokemonForSeason, buildAutoRankedTeam, type PokemonSeasonEvaluation } from '@/logic/pvp/seasonTeamFilter';
import type { Pokemon } from '@/types/pokemon/pokemon';

interface Props {
  show?: boolean;
}

withDefaults(defineProps<Props>(), {
  show: true
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const gameStore = useGameStore();
const pvpStore = usePvPStore();
const uiStore = useUIStore();

const searchQuery = ref('');
const activeFilter = ref<'all' | 'eligible' | 'in_team'>('all');

// Current seasonal rules
const currentTheme = computed(() => {
  return getSeasonalThemeForMonth(Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE).month);
});

const currentRules = computed(() => {
  return pvpStore.currentSeasonRules || currentTheme.value;
});

const allowedTypes = computed<PokemonType[]>(() => {
  const types = currentRules.value.allowedTypes || [];
  return types.map(toPokemonType);
});

// All available Pokemon from team and box
const allAvailablePokemon = computed<Pokemon[]>(() => {
  const pokes: Pokemon[] = [];
  for (const p of gameStore.state.team || []) {
    if (p && !p.isIllegal && p.uid) pokes.push(p);
  }
  for (const p of gameStore.state.box || []) {
    if (p && !p.isIllegal && p.uid) pokes.push(p);
  }
  return pokes;
});

// Selected team slots (up to 6)
const selectedUids = ref<string[]>([]);

onMounted(() => {
  const existingUids = (gameStore.state.pvpTeam6 || []) as string[]; // no-domain: Non-domain utility collection or data structure
  const availableSet = new Set(allAvailablePokemon.value.map(p => p.uid));
  selectedUids.value = existingUids.filter(uid => availableSet.has(uid)).slice(0, 6);
});

const selectedTeamSlots = computed<(Pokemon | null)[]>(() => {
  const pokesByUid = new Map(allAvailablePokemon.value.map(p => [p.uid, p]));
  const slots: (Pokemon | null)[] = [];
  for (let i = 0; i < 6; i++) {
    const uid = selectedUids.value[i];
    slots.push(uid ? (pokesByUid.get(uid) || null) : null);
  }
  return slots;
});

// Evaluations cache for all available pokemon
const evaluationsMap = computed(() => {
  const map = new Map<string, PokemonSeasonEvaluation>();
  for (const p of allAvailablePokemon.value) {
    map.set(p.uid, evaluatePokemonForSeason(p, currentRules.value));
  }
  return map;
});

// Filtered pool list
const filteredPokemonList = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const selectedSet = new Set(selectedUids.value);

  return allAvailablePokemon.value.filter(p => {
    // Search filter
    if (q) {
      const name = p.name.toLowerCase();
      if (!name.includes(q)) return false;
    }

    const isInTeam = selectedSet.has(p.uid);
    const evalResult = evaluationsMap.value.get(p.uid) || { eligible: false };

    if (activeFilter.value === 'eligible') {
      return evalResult.eligible;
    }
    if (activeFilter.value === 'in_team') {
      return isInTeam;
    }
    return true;
  });
});

function togglePokemonSlot(pokemon: Pokemon) {
  const idx = selectedUids.value.indexOf(pokemon.uid);
  if (idx >= 0) {
    selectedUids.value.splice(idx, 1);
  } else {
    const evalResult = evaluationsMap.value.get(pokemon.uid);
    if (!evalResult?.eligible) {
      uiStore.notify(evalResult?.reason || 'Este Pokémon no cumple las reglas de la temporada.', '⚠️');
      return;
    }
    if (selectedUids.value.length >= 6) {
      uiStore.notify('El equipo competitivo ya tiene 6 Pokémon. Retira uno primero.', '⚠️');
      return;
    }
    selectedUids.value.push(pokemon.uid);
  }
}

function removeSlot(index: number) {
  if (index >= 0 && index < selectedUids.value.length) {
    selectedUids.value.splice(index, 1);
  }
}

function runAutoFillTeam() {
  const autoTeam = buildAutoRankedTeam(allAvailablePokemon.value, currentRules.value, 6);
  if (autoTeam.length === 0) {
    uiStore.notify('No se encontraron Pokémon elegibles para esta temporada.', '⚠️');
    return;
  }

  selectedUids.value = autoTeam.map(p => p.uid);

  // GSAP bounce on slot items
  gsap.fromTo('.ranked-team-slot.has-pokemon', 
    { scale: 0.8, opacity: 0.5 }, 
    { scale: 1, opacity: 1, duration: 0.35, stagger: 0.05, ease: 'back.out(1.7)' }
  );

  uiStore.notify(`¡Equipo auto-configurado con ${autoTeam.length} Pokémon elegibles!`, '⚡');
}

function saveTeam() {
  if (selectedUids.value.length === 0) {
    uiStore.notify('Debes asignar al menos 1 Pokémon al equipo competitivo.', '⚠️');
    return;
  }

  // Validate all selected members
  const pokesByUid = new Map(allAvailablePokemon.value.map(p => [p.uid, p]));
  for (const uid of selectedUids.value) {
    const poke = pokesByUid.get(uid);
    const evalRes = poke ? evaluatePokemonForSeason(poke, currentRules.value) : { eligible: false };
    if (!evalRes.eligible) {
      uiStore.notify(`Tu equipo contiene a ${poke?.name || 'un Pokémon'} que no cumple las reglas.`, '⚠️');
      return;
    }
  }

  gameStore.state.pvpTeam6 = [...selectedUids.value];
  gameStore.state.pvpTeam = selectedUids.value.slice(0, 3);
  gameStore.save(false);

  uiStore.notify('¡Equipo competitivo guardado exitosamente!', '✅');
  emit('close');
}

function getPokemonSprite(pokemon: Pokemon) {
  return getAssetUrl(ASSET_TYPES.POKEMON, pokemon.species, { isShiny: pokemon.isShiny });
}
</script>

<template>
  <BaseModal
    :show="show"
    title="CONFIGURADOR DE EQUIPO RANKED"
    title-color="#fde047"
    type="center"
    max-width="780px"
    :show-close-button="true"
    @close="emit('close')"
  >
    <div class="ranked-builder-container">
      <!-- Season Rules Summary Banner -->
      <section class="season-rules-strip">
        <div class="rules-info-header">
          <span class="season-pill">TEMPORADA: {{ currentRules.name }}</span>
          <span class="rule-tag">6 vs 6</span>
          <span class="rule-tag">Nivel Máx: {{ currentRules.levelCap || 50 }}</span>
          <span
            v-if="currentRules.isLittleCup"
            class="rule-tag highlight"
          ><span class="emoji">🐣</span> Little Cup</span>
          <span
            v-if="currentRules.requiresMonotype"
            class="rule-tag highlight"
          ><span class="emoji">🧬</span> Monotipo</span>
          <span
            v-if="currentRules.requiresDualType"
            class="rule-tag highlight"
          ><span class="emoji">⚡</span> Doble Tipo</span>
        </div>
        <div
          v-if="allowedTypes.length"
          class="allowed-types-list"
        >
          <span class="types-label">Tipos Permitidos:</span>
          <div class="types-pills">
            <PokemonTypeTag
              v-for="t in allowedTypes"
              :key="t"
              :type="t"
              size="ssm"
            />
          </div>
        </div>
      </section>

      <!-- Active Team Slots (6 slots) -->
      <section class="team-slots-section">
        <div class="section-title-row">
          <h4 class="section-title">
            EQUIPO ACTIVO ({{ selectedUids.length }}/6)
          </h4>
          <button
            id="btn-ranked-auto-fill"
            class="auto-fill-btn"
            @click="runAutoFillTeam"
          >
            <span class="emoji">⚡</span> AUTO-CONFIGURAR
          </button>
        </div>

        <div class="slots-grid">
          <div
            v-for="(poke, idx) in selectedTeamSlots"
            :key="idx"
            class="ranked-team-slot"
            :class="{ 'has-pokemon': Boolean(poke), 'is-empty': !poke }"
            @click="poke && removeSlot(idx)"
          >
            <template v-if="poke">
              <img
                :src="getPokemonSprite(poke)"
                :alt="poke.name"
                class="slot-sprite pixel-art"
              >
              <div class="slot-info">
                <span class="slot-name">{{ poke.name }}</span>
                <span class="slot-lvl">Nv. {{ poke.level }}</span>
              </div>
              <button
                :id="'btn-ranked-slot-remove-' + idx"
                class="slot-remove-btn"
                title="Quitar del equipo"
              >
                <span class="emoji">✕</span>
              </button>
            </template>
            <template v-else>
              <span class="empty-icon">+</span>
              <span class="empty-text">Slot {{ idx + 1 }}</span>
            </template>
          </div>
        </div>
      </section>

      <!-- Pokemon Pool & Filter Bar -->
      <section class="pokemon-pool-section">
        <div class="filter-controls-bar">
          <div class="tabs-group">
            <button
              id="btn-ranked-filter-all"
              class="tab-btn"
              :class="{ active: activeFilter === 'all' }"
              @click="activeFilter = 'all'"
            >
              TODOS ({{ allAvailablePokemon.length }})
            </button>
            <button
              id="btn-ranked-filter-eligible"
              class="tab-btn"
              :class="{ active: activeFilter === 'eligible' }"
              @click="activeFilter = 'eligible'"
            >
              ELEGIBLES
            </button>
            <button
              id="btn-ranked-filter-in-team"
              class="tab-btn"
              :class="{ active: activeFilter === 'in_team' }"
              @click="activeFilter = 'in_team'"
            >
              EN EQUIPO ({{ selectedUids.length }})
            </button>
          </div>

          <input
            id="input-ranked-search-query"
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Buscar por nombre..."
          >
        </div>

        <!-- Available Pokemon List -->
        <div class="pokemon-pool-scroll">
          <div
            v-for="poke in filteredPokemonList"
            :key="poke.uid"
            class="poke-card-item"
            :class="{
              'is-ineligible': !evaluationsMap.get(poke.uid)?.eligible,
              'is-selected': selectedUids.includes(poke.uid)
            }"
            @click="togglePokemonSlot(poke)"
          >
            <img
              :src="getPokemonSprite(poke)"
              :alt="poke.name"
              class="card-sprite pixel-art"
            >
            <div class="card-details">
              <div class="card-top-line">
                <span class="card-name">{{ poke.name }}</span>
                <span class="card-lvl">Nv. {{ poke.level }}</span>
                <span
                  v-if="poke.isShiny"
                  class="shiny-tag"
                ><span class="emoji">✨</span></span>
              </div>
              <div
                v-if="!evaluationsMap.get(poke.uid)?.eligible"
                class="ineligible-reason"
              >
                {{ evaluationsMap.get(poke.uid)?.reason }}
              </div>
              <div
                v-else
                class="eligible-badge"
              >
                <span v-if="selectedUids.includes(poke.uid)"><span class="emoji">✓</span> EN EQUIPO</span>
                <span v-else>+ ELEGIBLE</span>
              </div>
            </div>
          </div>
          <div
            v-if="filteredPokemonList.length === 0"
            class="empty-pool-msg"
          >
            No se encontraron Pokémon con los filtros actuales.
          </div>
        </div>
      </section>

      <!-- Footer Action -->
      <footer class="builder-footer">
        <button
          id="btn-ranked-save-team"
          class="save-team-btn"
          @click="saveTeam"
        >
          <span class="emoji">💾</span> GUARDAR EQUIPO COMPETITIVO
        </button>
      </footer>
    </div>
  </BaseModal>
</template>

<style scoped src="./RankedTeamBuilderModal.styles.scss" lang="scss"></style>

