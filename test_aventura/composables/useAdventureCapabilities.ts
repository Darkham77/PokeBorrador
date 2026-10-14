import { computed } from 'vue';
import { useGameStore } from '@/stores/game.ts';
import type { MapNode } from '../logic/adventure/mapData.ts';

export function useAdventureCapabilities() {
  const gameStore = useGameStore();

  const hasSurf = computed(() => {
    const badges = gameStore.state.badges ?? 0;
    const hasMove = gameStore.state.team?.some(p => 
      p.moves?.some(m => m && (m.id === 'surf' || m.name?.toLowerCase() === 'surf'))
    ) ?? false;
    return badges >= 5 && hasMove;
  });

  const hasCut = computed(() => {
    const badges = gameStore.state.badges ?? 0;
    const hasMove = gameStore.state.team?.some(p => 
      p.moves?.some(m => m && (m.id === 'cut' || m.name?.toLowerCase() === 'cut'))
    ) ?? false;
    return badges >= 2 && hasMove;
  });

  const followerSpeciesId = computed(() => {
    const first = gameStore.state.team?.[0];
    return first?.id ?? first?.name?.toLowerCase() ?? null;
  });

  function checkNodePass(node: MapNode): { canPass: boolean; reason?: string } {
    if (node.requiresMO === 'Surf' && !hasSurf.value) {
      return { canPass: false, reason: node.blockMsg };
    }
    if (node.requiresMO === 'Cut' && !hasCut.value) {
      return { canPass: false, reason: node.blockMsg };
    }
    return { canPass: true };
  }

  return { hasSurf, hasCut, followerSpeciesId, checkNodePass };
}
