import type { DisplayText } from '@francogp/auditor';
import { ref, computed, watch, type ComputedRef, type Ref } from 'vue';

import { SHOP_ITEMS, requireItemId, type ItemId, type ShopItemData } from '@/data/inventory/items';
import { isMapRouteId } from '@/data/world/map-assets';
import { MAPS_BY_ROUTE_ID } from '@/data/world/maps';
import {
  TRAVEL_BUFF_REPEL_DURATION_SEC,
  TRAVEL_BUFF_SUPER_REPEL_DURATION_SEC,
  TRAVEL_BUFF_MAX_REPEL_DURATION_SEC,
  TRAVEL_BUFF_LONG_DURATION_SEC
} from '@/logic/constants/gameplay';
import {
  TRAVEL_INCENSE_TYPES,
  isTravelBuffItemId,
  isTravelIncenseItemId,
  calculateActiveTravelModifiers,
  type TravelBuffItemId
} from '@/logic/utils/routeSpawnHelpers';
import { useBuffsStore } from '@/stores/battle/buffs';
import { type useGameStore } from '@/stores/game';
import { type useInventoryStore } from '@/stores/inventory/inventory';
import { type useShopStore } from '@/stores/inventory/shop';
import { type useMapStore } from '@/stores/map';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';

import {
  findShortestPath,
  requireAdventureNodeId,
  type AdventureNodeId
} from '../../../test_aventura/logic/adventure/kantoGraph.ts';

const REPEL_ITEM_ID_VALUES = ['repel', 'superrepel', 'maxrepel'] as const;
const REPEL_ITEM_IDS_SET: ReadonlySet<string> = new Set<string>(REPEL_ITEM_ID_VALUES);

export interface UseAdventureRoutingReturn {
  originMap: Ref<AdventureNodeId>;
  destinationMap: Ref<AdventureNodeId>;
  activeHMs: Ref<Set<string>>;
  showPreTravelModal: Ref<boolean>;
  selectedTravelItems: Ref<Set<TravelBuffItemId>>;
  pendingManualDestination: Ref<AdventureNodeId | null>;
  activeSweetScent: Ref<boolean>;
  isTraveling: Ref<boolean>;
  calculatedPath: Ref<AdventureNodeId[]>;
  hasBicycle: ComputedRef<boolean>;
  isBikeActive: ComputedRef<boolean>;
  toggleTravelItem: (item: TravelBuffItemId) => void;
  activeTravelModifiers: ComputedRef<ReturnType<typeof calculateActiveTravelModifiers>>;
  availableActiveMoves: ComputedRef<
    {
      pokemonUid: string;
      pokemonName: string;
      moveName: string;
      pp: number;
      maxPP: number;
    }[]
  >;
  useActiveRouteMove: (pokemonUid: string, moveName: string) => void;
  startManualTravel: (destId: AdventureNodeId) => void;
  cancelPreTravel: () => void;
  confirmPreTravel: () => void;
  filteredBuffItems: ComputedRef<Array<ShopItemData & { id: TravelBuffItemId }>>;
  toggleHM: (hm: string) => void;
  calculateRoute: () => void;
}

export function useAdventureRouting(options: {
  gameStore: ReturnType<typeof useGameStore>;
  mapStore: ReturnType<typeof useMapStore>;
  shopStore: ReturnType<typeof useShopStore>;
  inventoryStore: ReturnType<typeof useInventoryStore>;
  travelLog: Ref<string[]>;
  hasHealthyTeam: Ref<boolean>;
  startTravel: () => void;
  cancelTravel: () => void;
}): UseAdventureRoutingReturn {
  const originMap = ref<AdventureNodeId>('route1');
  const destinationMap = ref<AdventureNodeId>('route3');
  const activeHMs = ref<Set<string>>(new Set());
  const showPreTravelModal = ref(false);
  const selectedTravelItems = ref<Set<TravelBuffItemId>>(new Set());
  const pendingManualDestination = ref<AdventureNodeId | null>(null);
  const activeSweetScent = ref(false);
  const isTraveling = ref(false);
  const calculatedPath = ref<AdventureNodeId[]>([]);

  const hasBicycle = computed(() => {
    const inv = options.gameStore.state.inventory || {};
    return (inv['bicycle'] || 0) > 0;
  });

  const isBikeActive = computed({
    get() {
      return hasBicycle.value;
    },
    set(val) {
      if (val && !hasBicycle.value) {
        options.travelLog.value.push(
          '⚠️ No tienes la Bicicleta en tu mochila de pruebas para activarla.'
        );
      }
    }
  });

  const toggleTravelItem = (itemId: ItemId): void => {
    const travelItemId = requireItemId(itemId);
    if (!isTravelBuffItemId(travelItemId)) {
      throw new Error(`[useAdventureRouting] Invalid travel buff item id: ${itemId}`);
    }
    const next = new Set(selectedTravelItems.value);
    if (next.has(travelItemId)) {
      next.delete(travelItemId);
    } else {
      if (REPEL_ITEM_IDS_SET.has(travelItemId)) {
        next.delete('repel');
        next.delete('superrepel');
        next.delete('maxrepel');
      }
      if (isTravelIncenseItemId(travelItemId)) {
        next.forEach((id) => {
          if (isTravelIncenseItemId(id)) next.delete(id);
        });
      }
      next.add(travelItemId);
    }
    selectedTravelItems.value = next;
  };

  const activeTravelModifiers = computed(() => {
    return calculateActiveTravelModifiers(selectedTravelItems.value);
  });

  const availableActiveMoves = computed(() => {
    const team = options.gameStore.state.team || [];
    const list: {
      pokemonUid: string;
      pokemonName: string;
      moveName: string;
      pp: number;
      maxPP: number;
    }[] = [];

    team.forEach((pkmn: Pokemon) => {
      if (pkmn && pkmn.hp > 0) {
        pkmn.moves.forEach((move: Move | null) => {
          if (move) {
            if (move.id === 'teleport' || move.id === 'sweetscent') {
              list.push({
                pokemonUid: pkmn.uid,
                pokemonName: pkmn.name,
                moveName: move.name,
                pp: move.pp,
                maxPP: move.maxPP
              });
            }
          }
        });
      }
    });

    return list;
  });

  const useActiveRouteMove = (pokemonUid: string, moveName: string): void => {
    const team = options.gameStore.state.team || [];
    const pkmn = team.find((p: Pokemon) => p.uid === pokemonUid);
    if (!pkmn) return;

    const move = pkmn.moves.find((m: Move | null) => m && m.name === moveName);
    if (!move) return;

    if (move.pp <= 0) {
      options.travelLog.value.push(`⚠️ ${pkmn.name} no tiene PP en ${moveName} para usarlo.`);
      return;
    }

    move.pp -= 1;
    options.gameStore.scheduleSave();

    if (move.id === 'teleport') {
      options.travelLog.value.push(
        `🔮 ¡${pkmn.name} usó ${moveName}! Cancelando viaje y regresando instantáneamente al Centro Pokémon de origen.`
      );
      options.cancelTravel();

      const originNode = originMap.value;
      if (isMapRouteId(originNode)) options.mapStore.currentMap = originNode;
      options.shopStore.healAllPokemon(0);
      const originName =
        (MAPS_BY_ROUTE_ID as Record<DisplayText, { name: string }>)[originNode]?.name || originNode; // open-record: Generic key-value data dictionary container
      options.travelLog.value.push(
        `🏥 ¡Llegada segura a ${originName}! Tu equipo ha sido completamente curado.`
      );
    } else if (move.id === 'sweetscent') {
      activeSweetScent.value = true;
      options.travelLog.value.push(
        `🌸 ¡${pkmn.name} usó ${moveName}! Un aroma dulce inunda el sendero: la tasa de combates ha aumentado.`
      );
    }
  };

  const startManualTravel = (targetId: string): void => {
    if (isTraveling.value) return;
    const targetMapId = requireAdventureNodeId(targetId);

    if (!options.hasHealthyTeam.value) {
      options.travelLog.value.push(
        '⚠️ No puedes iniciar un viaje o ruta: Necesitas al menos 1 Pokémon con vida en tu equipo.'
      );
      return;
    }

    pendingManualDestination.value = targetMapId;

    const path = findShortestPath(originMap.value, targetMapId, activeHMs.value);
    if (!path || path.length === 0) {
      options.travelLog.value.push(
        `❌ Ruta bloqueada: Faltan MOs necesarias para avanzar hacia allí.`
      );
      return;
    }

    selectedTravelItems.value.clear();
    showPreTravelModal.value = true;
  };

  const cancelPreTravel = (): void => {
    showPreTravelModal.value = false;
    pendingManualDestination.value = null;
    selectedTravelItems.value.clear();
  };

  const calculateRoute = (): void => {
    const path = findShortestPath(originMap.value, destinationMap.value, activeHMs.value);
    if (path) {
      calculatedPath.value = path;
      const pathNames = path.map((nodeId) => {
        if (isMapRouteId(nodeId)) {
          const mapData = MAPS_BY_ROUTE_ID[nodeId];
          if (mapData) return mapData.name;
        }
        return nodeId;
      });
      options.travelLog.value = [`Ruta calculada: ${pathNames.join(' → ')}`];
    } else {
      calculatedPath.value = [];
      options.travelLog.value = ['⚠️ No hay ruta transitable con las MOs actuales.'];
    }
  };

  const confirmPreTravel = (): void => {
    if (!pendingManualDestination.value) return;
    destinationMap.value = pendingManualDestination.value;

    calculateRoute();
    if (calculatedPath.value.length === 0) {
      options.travelLog.value.push(
        `❌ Ruta bloqueada: Faltan MOs necesarias para avanzar hacia allí.`
      );
      cancelPreTravel();
      return;
    }

    selectedTravelItems.value.forEach((itemId) => {
      options.inventoryStore.removeItem(itemId, 1);
      options.travelLog.value.push(`🎒 Consumido: -1x ${itemId} de tu mochila real.`);

      const buffsStore = useBuffsStore();
      if (itemId === 'repel') buffsStore.addBuff('repel', TRAVEL_BUFF_REPEL_DURATION_SEC);
      else if (itemId === 'superrepel')
        buffsStore.addBuff('repel', TRAVEL_BUFF_SUPER_REPEL_DURATION_SEC);
      else if (itemId === 'maxrepel')
        buffsStore.addBuff('repel', TRAVEL_BUFF_MAX_REPEL_DURATION_SEC);
      else if (itemId === 'luckyegg')
        buffsStore.addBuff('lucky-egg', TRAVEL_BUFF_MAX_REPEL_DURATION_SEC);
      else if (itemId === 'amuletcoin') buffsStore.addBuff('amulet', TRAVEL_BUFF_LONG_DURATION_SEC);
      else if (itemId === 'ticketshiny') buffsStore.addBuff('shiny', TRAVEL_BUFF_LONG_DURATION_SEC);
      else if (isTravelIncenseItemId(itemId)) {
        buffsStore.addBuff(
          'incense',
          TRAVEL_BUFF_MAX_REPEL_DURATION_SEC,
          TRAVEL_INCENSE_TYPES[itemId]
        );
      }
    });

    selectedTravelItems.value.clear();

    showPreTravelModal.value = false;
    pendingManualDestination.value = null;

    options.startTravel();
  };

  const filteredBuffItems = computed<Array<ShopItemData & { id: TravelBuffItemId }>>(() => {
    return SHOP_ITEMS.flatMap((item) => {
      const itemId = requireItemId(item.id);
      if (!isTravelBuffItemId(itemId)) return [];
      if ((options.gameStore.state.inventory?.[itemId] || 0) <= 0) return [];
      return [{ ...item, id: itemId }];
    });
  });

  const toggleHM = (hmName: string): void => {
    const next = new Set(activeHMs.value);
    if (next.has(hmName)) {
      next.delete(hmName);
    } else {
      next.add(hmName);
    }
    activeHMs.value = next;
  };

  watch(
    [activeHMs, originMap, destinationMap],
    () => {
      if (!isTraveling.value) {
        calculateRoute();
      }
    },
    { deep: true }
  );

  return {
    originMap,
    destinationMap,
    activeHMs,
    showPreTravelModal,
    selectedTravelItems,
    pendingManualDestination,
    activeSweetScent,
    isTraveling,
    calculatedPath,
    hasBicycle,
    isBikeActive,
    toggleTravelItem,
    activeTravelModifiers,
    availableActiveMoves,
    useActiveRouteMove,
    startManualTravel,
    cancelPreTravel,
    confirmPreTravel,
    filteredBuffItems,
    toggleHM,
    calculateRoute
  };
}
