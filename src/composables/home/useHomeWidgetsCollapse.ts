import { ref } from 'vue';
import { safeStorage } from '@/logic/utils/storage';

export const HOME_WIDGET_IDS = [
  'pending_rewards',
  'events',
  'events_schedule',
  'events_history',
  'gyms',
  'ranked',
  'defense',
  'missions',
  'class',
  'breeding',
  'economy',
  'black_market',
  'buffs',
  'faction',
  'notifications'
] as const;

export type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number];

const HOME_WIDGET_ID_SET: ReadonlySet<string> = new Set(HOME_WIDGET_IDS);

export function isHomeWidgetId(value: unknown): value is HomeWidgetId {
  return typeof value === 'string' && HOME_WIDGET_ID_SET.has(value);
}

const STORAGE_KEY = 'pokevicio_home_collapsed_widgets';

const DEFAULT_COLLAPSED_STATE: Record<HomeWidgetId, boolean> = {
  pending_rewards: false,
  events: false,
  events_schedule: true,
  events_history: true,
  gyms: false,
  ranked: false,
  defense: false,
  missions: false,
  class: false,
  breeding: false,
  economy: false,
  black_market: false,
  buffs: false,
  faction: false,
  notifications: false
};

function loadInitialState(): Record<HomeWidgetId, boolean> {
  const initial = { ...DEFAULT_COLLAPSED_STATE };
  const raw = safeStorage.getItem(STORAGE_KEY);
  if (!raw) return initial;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [key, val] of Object.entries(parsed)) {
        if (isHomeWidgetId(key) && typeof val === 'boolean') {
          initial[key] = val;
        }
      }
    }
  } catch {
    // Fallback to default in case of corrupted JSON
  }

  return initial;
}

const collapsedMap = ref<Record<HomeWidgetId, boolean>>(loadInitialState());

function persistState() {
  safeStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedMap.value));
}

export function useHomeWidgetsCollapse() {
  function isCollapsed(id: HomeWidgetId): boolean {
    return collapsedMap.value[id] ?? false;
  }

  function toggleCollapse(id: HomeWidgetId) {
    const current = isCollapsed(id);
    collapsedMap.value[id] = !current;
    persistState();
  }

  function setCollapsed(id: HomeWidgetId, value: boolean) {
    collapsedMap.value[id] = value;
    persistState();
  }

  function resetCollapseState() {
    collapsedMap.value = { ...DEFAULT_COLLAPSED_STATE };
    persistState();
  }

  return {
    isCollapsed,
    toggleCollapse,
    setCollapsed,
    resetCollapseState
  };
}
