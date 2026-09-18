import type { BattleContext } from '@/types/battle/battleContext';
import { generateEncounter } from '@/logic/encounters/encounters';
import { useEventStore } from '@/stores/events';
import { useWarStore } from '@/stores/war';
import { requireMapRouteId, type MapRouteId } from '@/data/world/map-assets';
import { resolveCurrentWeather } from '@/logic/weather/weatherRegistry';
import { requireDayPhase, getDayCycle } from '@/logic/utils/timeUtils';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';

const BUG_ATTRACT_SPECIES: readonly PokemonSpeciesId[] = ['scyther', 'pinsir'];
const CAZABICHOS_SPECIAL_ENCOUNTER_CHANCE = 0.005;

function getDebugMultiplier(key: string): number {
  if (typeof window === 'undefined') return 1;
  const mults = window.__VITE_DEBUG__?.multipliers as Record<string, number> | undefined; // open-record: Generic key-value data dictionary container
  return mults?.[key] ?? 1;
}

function resolveMultiplier(globalVal: number | undefined, debugKey: string): number {
  const base = globalVal ?? 1;
  return base * getDebugMultiplier(debugKey);
}

function buildSearchEncounterOptions(
  eventStore: ReturnType<typeof useEventStore>,
  warStore: ReturnType<typeof useWarStore>
) {
  const global = eventStore.globalMultipliers;
  return {
    activeEvents: eventStore.activeEvents,
    dominanceData: warStore.mapDominance,
    shinyMultiplier: resolveMultiplier(global?.shiny, 'shiny'),
    eventTrainerBonus: resolveMultiplier(global?.trainer, 'trainer'),
    eventFishingBonus: resolveMultiplier(global?.fishing, 'fishing'),
    eventRivalBonus: resolveMultiplier(global?.rival, 'rival'),
    weather: resolveCurrentWeather(),
    cycle: requireDayPhase(getDayCycle())
  };
}

async function tryGenerateCazabichosEncounter(ctx: BattleContext, routeId: MapRouteId) {
  if (ctx.gs.state.playerClass !== 'cazabichos' || Math.random() >= CAZABICHOS_SPECIAL_ENCOUNTER_CHANCE) {
    return null;
  }
  const { makePokemon } = await import('@/logic/pokemon/pokemonFactory');
  const { pokemonDataProvider } = await import('@/logic/providers/pokemonDataProvider');
  const mapsList = pokemonDataProvider.getMaps();
  const currentMapData = mapsList.find(m => m.id === routeId);
  const minLv = currentMapData?.lv?.[0] ?? 5;
  const maxLv = currentMapData?.lv?.[1] ?? minLv;
  const level = Math.floor(Math.random() * (maxLv - minLv + 1)) + minLv;
  const chosenBug = BUG_ATTRACT_SPECIES[Math.floor(Math.random() * BUG_ATTRACT_SPECIES.length)]!;
  const generatedBug = makePokemon(chosenBug, level);
  if (generatedBug) {
    ctx.uiStore.notify(`¡Aroma Atractivo atrajo a un ${generatedBug.name} salvaje!`, '🐝');
    return { type: 'wild', pokemon: generatedBug };
  }
  return null;
}

export async function generateSearchLoopEncounter(ctx: BattleContext, locId: MapRouteId) {
  const routeId = requireMapRouteId(locId);
  const cazabichosEncounter = await tryGenerateCazabichosEncounter(ctx, routeId);
  if (cazabichosEncounter) {
    return cazabichosEncounter;
  }

  const eventStore = useEventStore();
  const warStore = useWarStore();
  const encounterOptions = buildSearchEncounterOptions(eventStore, warStore);
  return await generateEncounter(routeId, ctx.gs.state, encounterOptions);
}
