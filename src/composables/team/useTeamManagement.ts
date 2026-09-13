/**
 * src/composables/team/useTeamManagement.ts
 *
 * Composable managing multi-format team assembly, season rules evaluation,
 * drag-and-drop reordering, and slot selection for TeamManagementModal.
 */

import { ref, computed, watch } from 'vue';
import gsap from 'gsap';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { useBoxStore } from '@/stores/box';
import { useInventoryStore } from '@/stores/inventory/inventory';
import { usePvPStore } from '@/stores/pvp';
import { getItemById } from '@/data/inventory/items';
import type { Pokemon } from '@/types/pokemon/pokemon';
import {
  MAX_PVP_SLOTS,
  MAX_PVP6_SLOTS,
  type TeamManagementTab,
  type PvpTeamTab
} from '@/types/battle/pvp';
import { getSeasonalThemeForMonth } from '@/data/system/rankedData';
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils';
import {
  evaluatePokemonForSeason,
  buildAutoRankedTeam,
  type PokemonSeasonEvaluation
} from '@/logic/pvp/seasonTeamFilter';

export const MAX_ADVENTURE_SLOTS = 6;
export const DEFAULT_WAR_SLOTS = 6;
export const TOTAL_POKEMON_TYPES = 18;

interface UseTeamManagementOptions {
  initialTab?: TeamManagementTab;
}

export function useTeamManagement(options: UseTeamManagementOptions = {}) {
  const gameStore = useGameStore();
  const uiStore = useUIStore();
  const boxStore = useBoxStore();
  const inventoryStore = useInventoryStore();
  const pvpStore = usePvPStore();

  const activeTab = ref<TeamManagementTab>(options.initialTab || 'adventure');

  watch(() => options.initialTab, (newTab) => {
    if (newTab) {
      activeTab.value = newTab;
    }
  });

  const adventureTeam = computed(() => {
    const team = gameStore.state.team || [];
    const slots: (Pokemon | null)[] = [];
    for (let i = 0; i < MAX_ADVENTURE_SLOTS; i++) {
      slots.push(team[i] || null);
    }
    return slots;
  });

  const pvpTeam = computed(() => {
    const pvpUids = (gameStore.state.pvpTeam || []) as string[]; // no-domain: Non-domain utility collection or data structure
    const allPokes = [
      ...((gameStore.state.team || []) as (Pokemon | null)[]),
      ...((gameStore.state.box || []) as (Pokemon | null)[])
    ].filter((p): p is Pokemon => p !== null);
    const slots: (Pokemon | null)[] = [];
    for (let i = 0; i < MAX_PVP_SLOTS; i++) {
      const uid = pvpUids[i];
      slots.push(allPokes.find(p => p.uid === uid) || null);
    }
    return slots;
  });

  const pvpTeam6 = computed(() => {
    const pvpUids = (gameStore.state.pvpTeam6 || []) as string[]; // no-domain: Non-domain utility collection or data structure
    const allPokes = [
      ...((gameStore.state.team || []) as (Pokemon | null)[]),
      ...((gameStore.state.box || []) as (Pokemon | null)[])
    ].filter((p): p is Pokemon => p !== null);
    const slots: (Pokemon | null)[] = [];
    for (let i = 0; i < MAX_PVP6_SLOTS; i++) {
      const uid = pvpUids[i];
      slots.push(allPokes.find(p => p.uid === uid) || null);
    }
    return slots;
  });

  const warTeam = computed(() => {
    const warUids = (gameStore.state.warTeam || []) as string[]; // no-domain: Non-domain utility collection or data structure
    const maxSlots = gameStore.state.warSlots || DEFAULT_WAR_SLOTS;
    const allPokes = [
      ...((gameStore.state.team || []) as (Pokemon | null)[]),
      ...((gameStore.state.box || []) as (Pokemon | null)[])
    ].filter((p): p is Pokemon => p !== null);
    const slots: (Pokemon | null)[] = [];
    for (let i = 0; i < maxSlots; i++) {
      const uid = warUids[i];
      slots.push(allPokes.find(p => p.uid === uid) || null);
    }
    return slots;
  });

  const adventureCount = computed(() => (gameStore.state.team || []).filter(Boolean).length);
  const pvpCount = computed(() => (gameStore.state.pvpTeam || []).length);
  const pvp6Count = computed(() => (gameStore.state.pvpTeam6 || []).length);
  const warCount = computed(() => (gameStore.state.warTeam || []).length);
  const maxWarSlots = computed(() => gameStore.state.warSlots || DEFAULT_WAR_SLOTS);

  const currentRules = computed(() => {
    if (pvpStore.currentSeasonRules) return pvpStore.currentSeasonRules;
    const month = Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE).month;
    return getSeasonalThemeForMonth(month);
  });

  const tournamentThemeName = computed<string>(() => {
    const r = currentRules.value;
    const tName = 'themeName' in r && typeof r.themeName === 'string' ? r.themeName : '';
    const name = 'name' in r && typeof r.name === 'string' ? r.name : '';
    return tName || name || 'TEMPORADA COMPETITIVA';
  });

  const tournamentLevelCap = computed<number | null>(() => {
    const r = currentRules.value;
    return 'levelCap' in r && typeof r.levelCap === 'number' && r.levelCap > 0 ? r.levelCap : null;
  });

  const tournamentIsLittleCup = computed<boolean>(() => {
    const r = currentRules.value;
    return 'isLittleCup' in r && Boolean(r.isLittleCup);
  });

  const tournamentAllowedTypes = computed<string | null>(() => {
    const r = currentRules.value;
    if ('allowedTypes' in r && Array.isArray(r.allowedTypes) && r.allowedTypes.length > 0 && r.allowedTypes.length < TOTAL_POKEMON_TYPES) {
      return (r.allowedTypes as readonly string[]).join(', '); // no-domain: Non-domain utility collection or data structure
    }
    return null;
  });

  const pvpEvaluations = computed(() => {
    const map = new Map<string, PokemonSeasonEvaluation>();
    const rules = currentRules.value;
    for (const p of pvpTeam.value) {
      if (p) map.set(p.uid, evaluatePokemonForSeason(p, rules));
    }
    return map;
  });

  const pvp6Evaluations = computed(() => {
    const map = new Map<string, PokemonSeasonEvaluation>();
    const rules = currentRules.value;
    for (const p of pvpTeam6.value) {
      if (p) map.set(p.uid, evaluatePokemonForSeason(p, rules));
    }
    return map;
  });

  function runAutoFillTeam(tab: PvpTeamTab) {
    const allPokes = [
      ...((gameStore.state.team || []) as (Pokemon | null)[]),
      ...((gameStore.state.box || []) as (Pokemon | null)[])
    ].filter((p): p is Pokemon => p !== null);

    const slotsCount = tab === 'pvp' ? 3 : 6;
    const autoTeam = buildAutoRankedTeam(allPokes, currentRules.value, slotsCount);

    if (autoTeam.length === 0) {
      uiStore.notify('No se encontraron Pokémon elegibles para esta temporada.', '⚠️');
      return;
    }

    gameStore.setRankedTeam(tab, autoTeam.map(p => p.uid));

    gsap.fromTo('.slots-grid .team-slot',
      { scale: 0.9, opacity: 0.6 },
      { scale: 1, opacity: 1, duration: 0.35, stagger: 0.05, ease: 'back.out(1.7)' }
    );

    uiStore.notify(`¡Equipo auto-ajustado con ${autoTeam.length} Pokémon elegibles!`, '⚡');
  }

  // Drag and Drop Logic
  const draggedIndex = ref<number | null>(null);
  const touchOverIndex = ref<number | null>(null);
  const isDragging = ref(false);

  function handleDragStart(index: number) {
    draggedIndex.value = index;
    isDragging.value = true;
  }

  function handleDragEnd() {
    isDragging.value = false;
    draggedIndex.value = null;
    touchOverIndex.value = null;
  }

  function handleDropDirect(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    if (activeTab.value === 'adventure') {
      if (gameStore.state.team[fromIndex]) {
        gameStore.reorderTeam(fromIndex, toIndex);
      }
    } else if (activeTab.value === 'pvp') {
      gameStore.reorderPvpTeam(fromIndex, toIndex);
    } else if (activeTab.value === 'pvp6') {
      gameStore.reorderPvp6Team(fromIndex, toIndex);
    } else if (activeTab.value === 'war') {
      gameStore.reorderWarTeam(fromIndex, toIndex);
    }
  }

  function handleDrop(targetIndex: number) {
    const from = draggedIndex.value;
    handleDragEnd();
    if (from === null || from === targetIndex) return;
    handleDropDirect(from, targetIndex);
  }

  function openDetail(pokemon: Pokemon | null) {
    if (!pokemon) return;
    const team = (gameStore.state.team || []) as (Pokemon | null)[];
    const idx = team.findIndex((p) => p && p.uid === pokemon.uid);
    uiStore.openPokemonDetail(pokemon, idx, idx > -1 ? 'team' : 'box');
  }

  function openItem(pokemon: Pokemon | null) {
    if (!pokemon) return;
    const team = (gameStore.state.team || []) as (Pokemon | null)[];
    let idx = team.findIndex((p) => p && p.uid === pokemon.uid);
    if (idx > -1) {
      uiStore.toggleInventory('team', idx);
      return;
    }
    const box = (gameStore.state.box || []) as (Pokemon | null)[];
    idx = box.findIndex((p) => p && p.uid === pokemon.uid);
    if (idx > -1) {
      uiStore.toggleInventory('box', idx);
    }
  }

  function unequipItem(pokemon: Pokemon | null) {
    if (!pokemon) return;
    const team = (gameStore.state.team || []) as (Pokemon | null)[];
    let idx = team.findIndex((p) => p && p.uid === pokemon.uid);
    if (idx > -1) {
      const unequipped = inventoryStore.unequipItem('team', idx);
      if (unequipped) {
        const itemData = getItemById(unequipped);
        const displayName = itemData ? itemData.name : unequipped.toUpperCase().replace(/_/g, ' ');
        uiStore.notify(`¡Se ha quitado el objeto: ${displayName}!`, '🎒');
      }
      return;
    }
    const box = (gameStore.state.box || []) as (Pokemon | null)[];
    idx = box.findIndex((p) => p && p.uid === pokemon.uid);
    if (idx > -1) {
      const unequipped = inventoryStore.unequipItem('box', idx);
      if (unequipped) {
        const itemData = getItemById(unequipped);
        const displayName = itemData ? itemData.name : unequipped.toUpperCase().replace(/_/g, ' ');
        uiStore.notify(`¡Se ha quitado el objeto: ${displayName}!`, '🎒');
      }
    }
  }

  function sendToBox(pokemon: Pokemon | null) {
    if (!pokemon) return;
    const team = (gameStore.state.team || []) as (Pokemon | null)[];
    const idx = team.findIndex((p) => p && p.uid === pokemon.uid);
    if (idx > -1) {
      gameStore.sendToBox(idx);
    }
  }

  function selectPvp(slotIndex: number) {
    const pvpTeamUids = (gameStore.state.pvpTeam || []) as string[]; // no-domain: Non-domain utility collection or data structure
    const allPokes = [...((gameStore.state.team || []) as (Pokemon | null)[]), ...((gameStore.state.box || []) as (Pokemon | null)[])];
    const available = allPokes.filter((p): p is Pokemon => p !== null && !pvpTeamUids.includes(p.uid));

    if (available.length === 0) {
      uiStore.notify('No tienes más Pokémon disponibles para asignar al equipo PVP.', '⚠️');
      return;
    }

    uiStore.open('PokemonSelection', {
      title: '⚡ SELECCIONAR POKÉMON',
      subtitle: 'Elige un Pokémon para tu equipo de combate.',
      excludeUids: pvpTeamUids,
      seasonRules: currentRules.value,
      callbackConfirm: (selected: Pokemon[]) => {
        if (selected && selected.length > 0 && selected[0]) {
          gameStore.swapPvpSlot(slotIndex, selected[0].uid);
        }
      }
    });
  }

  function selectPvp6(slotIndex: number) {
    const currentPvpTeam6 = (gameStore.state.pvpTeam6 || []) as string[]; // no-domain: Non-domain utility collection or data structure
    const allPokes = [...((gameStore.state.team || []) as (Pokemon | null)[]), ...((gameStore.state.box || []) as (Pokemon | null)[])];
    const available = allPokes.filter((p): p is Pokemon => p !== null && !currentPvpTeam6.includes(p.uid));

    if (available.length === 0) {
      uiStore.notify('No tienes más Pokémon disponibles para asignar al equipo PVP 6v6.', '⚠️');
      return;
    }

    uiStore.open('PokemonSelection', {
      title: '⚡ SELECCIONAR POKÉMON',
      subtitle: 'Elige un Pokémon para tu equipo de combate 6v6.',
      excludeUids: currentPvpTeam6,
      seasonRules: currentRules.value,
      callbackConfirm: (selected: Pokemon[]) => {
        if (selected && selected.length > 0 && selected[0]) {
          gameStore.swapPvp6Slot(slotIndex, selected[0].uid);
        }
      }
    });
  }

  function selectWar(slotIndex: number) {
    const warTeamUids = (gameStore.state.warTeam || []) as string[]; // no-domain: Non-domain utility collection or data structure
    const allPokes = [...((gameStore.state.team || []) as (Pokemon | null)[]), ...((gameStore.state.box || []) as (Pokemon | null)[])];
    const available = allPokes.filter((p): p is Pokemon => p !== null && !warTeamUids.includes(p.uid));

    if (available.length === 0) {
      uiStore.notify('No tienes más Pokémon disponibles para asignar al equipo de Guerra.', '⚠️');
      return;
    }

    uiStore.open('PokemonSelection', {
      title: '⚡ SELECCIONAR POKÉMON',
      subtitle: 'Elige un Pokémon para tu equipo de guerra.',
      excludeUids: warTeamUids,
      callbackConfirm: (selected: Pokemon[]) => {
        if (selected && selected.length > 0 && selected[0]) {
          gameStore.swapWarSlot(slotIndex, selected[0].uid);
        }
      }
    });
  }

  function selectAdventure(_slotIndex: number) {
    const currentTeamUids = (gameStore.state.team || []).map((p: Pokemon | null) => p?.uid).filter(Boolean) as string[]; // no-domain: Non-domain utility collection or data structure

    uiStore.open('PokemonSelection', {
      title: '⚡ SELECCIONAR POKÉMON',
      subtitle: 'Selecciona un Pokémon de tu caja para añadir al equipo.',
      excludeUids: currentTeamUids,
      includeTeam: false,
      callbackConfirm: (selected: Pokemon[]) => {
        if (selected && selected.length > 0) {
          const selectedPoke = selected[0];
          if (!selectedPoke) return;

          const box = (gameStore.state.box || []) as (Pokemon | null)[];
          const boxIdx = box.findIndex((p) => p && p.uid === selectedPoke.uid);

          if (boxIdx > -1) {
            const team = (gameStore.state.team || []) as (Pokemon | null)[];
            const currentTeamPoke = team[_slotIndex];

            if (currentTeamPoke) {
              boxStore.swapBoxWithTeam(boxIdx, _slotIndex);
            } else {
              boxStore.moveBoxToTeam(boxIdx);
            }
          } else {
            const team = (gameStore.state.team || []) as (Pokemon | null)[];
            const teamIdx = team.findIndex((p) => p && p.uid === selectedPoke.uid);
            if (teamIdx > -1) {
              uiStore.notify('Este Pokémon ya está en tu equipo.', '⚠️');
            }
          }
        }
      }
    });
  }

  function handleSlotSelect(index: number) {
    if (activeTab.value === 'adventure') {
      selectAdventure(index);
    } else if (activeTab.value === 'pvp') {
      selectPvp(index);
    } else if (activeTab.value === 'pvp6') {
      selectPvp6(index);
    } else if (activeTab.value === 'war') {
      selectWar(index);
    }
  }

  return {
    activeTab,
    adventureTeam,
    pvpTeam,
    pvpTeam6,
    warTeam,
    adventureCount,
    pvpCount,
    pvp6Count,
    warCount,
    maxWarSlots,
    currentRules,
    tournamentThemeName,
    tournamentLevelCap,
    tournamentIsLittleCup,
    tournamentAllowedTypes,
    pvpEvaluations,
    pvp6Evaluations,
    draggedIndex,
    touchOverIndex,
    isDragging,
    runAutoFillTeam,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    handleDropDirect,
    handleSlotSelect,
    openDetail,
    openItem,
    unequipItem,
    sendToBox
  };
}
