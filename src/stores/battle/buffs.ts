import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game.ts'
import { useEventStore } from '@/stores/events.ts'
import { isItemId, BUFF_FIELDS } from '@/data/inventory/items'
import type { ToolQualityTier, GameState } from '@/types/system/game'
import { getServerTime, getServerInstant, getGMT3Date } from '@/logic/utils/timeUtils'
import {
  buildActiveEventBuffs,
  buildActivePlayerItemBuffs,
  type ActiveBuffItem
} from './buffsHelper.ts'

export { type ActiveBuffItem }

const BUFF_TICK_INTERVAL_SEC = 1;
const BUFF_AUTOSAVE_INTERVAL_SECS = 30;

function decrementActiveBuffs(s: GameState): boolean {
  let changed = false;

  for (const k of BUFF_FIELDS) {
    if (s[k] > 0) {
      s[k]--;
      changed = true;
    }
  }

  if (s.fishingRodSecs <= 0 && s.fishingRodType !== null) {
    s.fishingRodType = null;
    changed = true;
  }
  if (s.pickaxeSecs <= 0 && s.pickaxeType !== null) {
    s.pickaxeType = null;
    changed = true;
  }
  if (s.brushSecs <= 0 && s.brushType !== null) {
    s.brushType = null;
    changed = true;
  }

  return changed;
}

function shouldAutoSaveBuffTimers(s: GameState): boolean {
  return BUFF_FIELDS.some(k => s[k] > 0 && s[k] % BUFF_AUTOSAVE_INTERVAL_SECS === 0);
}

export const useBuffsStore = defineStore('buffs', () => {
  const gameStore = useGameStore()
  const eventStore = useEventStore()
  
  const currentTick = ref(0)
  let tickInterval: gsap.core.Tween | null = null

  function initTick() {
    if (tickInterval) tickInterval.kill()
    
    const tick = () => {
      currentTick.value++
      // Pause timers if player is in an active battle
      if (gameStore.state.battle && !gameStore.state.battle.over) {
        tickInterval = gsap.delayedCall(BUFF_TICK_INTERVAL_SEC, tick)
        return
      }

      const s = gameStore.state
      const changed = decrementActiveBuffs(s)

      if (changed && shouldAutoSaveBuffTimers(s)) {
        gameStore.save(false)
      }
      
      tickInterval = gsap.delayedCall(BUFF_TICK_INTERVAL_SEC, tick)
    }

    tickInterval = gsap.delayedCall(BUFF_TICK_INTERVAL_SEC, tick)
  }

type StateCumulativeBuffField =
  | 'repelSecs'
  | 'shinyBoostSecs'
  | 'amuletCoinSecs'
  | 'luckyEggSecs'
  | 'safariTicketSecs'
  | 'ceruleanTicketSecs'
  | 'articunoTicketSecs'
  | 'mewtwoTicketSecs';

const CUMULATIVE_BUFF_FIELDS: Readonly<Record<string, StateCumulativeBuffField>> = {
  repel: 'repelSecs',
  shiny: 'shinyBoostSecs',
  amulet: 'amuletCoinSecs',
  'lucky-egg': 'luckyEggSecs',
  safari: 'safariTicketSecs',
  cerulean: 'ceruleanTicketSecs',
  articuno: 'articunoTicketSecs',
  mewtwo: 'mewtwoTicketSecs',
};

function applyCumulativeBuff(s: GameState, buffName: string, seconds: number): boolean {
  const field = CUMULATIVE_BUFF_FIELDS[buffName];
  if (field) {
    s[field] = (s[field] || 0) + seconds;
    return true;
  }
  return false;
}

function applyToolBuff(s: GameState, buffName: string, seconds: number, extraData: string | null): boolean {
  const tier = (extraData as ToolQualityTier | null) || 'standard';
  if (buffName === 'fishing-rod') {
    s.fishingRodSecs = seconds;
    s.fishingRodType = tier;
    return true;
  }
  if (buffName === 'pickaxe') {
    s.pickaxeSecs = seconds;
    s.pickaxeType = tier;
    s.brushSecs = 0;
    s.brushType = null;
    return true;
  }
  if (buffName === 'brush') {
    s.brushSecs = seconds;
    s.brushType = tier;
    s.pickaxeSecs = 0;
    s.pickaxeType = null;
    return true;
  }
  return false;
}

function applySpecialBuff(s: GameState, buffName: string, seconds: number, extraData: string | null): void {
  if (buffName === 'iv-scanner') {
    s.ivScannerSecs = seconds;
  } else if (buffName === 'incense') {
    s.incenseSecs = (s.incenseSecs || 0) + seconds;
    if (extraData) s.incenseType = isItemId(extraData) ? extraData : null;
  }
}

  function addBuff(buffName: string, seconds: number, extraData: string | null = null) {
    const s = gameStore.state;
    if (!applyCumulativeBuff(s, buffName, seconds) && !applyToolBuff(s, buffName, seconds, extraData)) {
      applySpecialBuff(s, buffName, seconds, extraData);
    }
    gameStore.save(false);
  }

  const activeBuffs = computed<ActiveBuffItem[]>(() => {
    void currentTick.value
    const nowMs = getServerTime()
    const nowInstant = getServerInstant()
    const zdt = getGMT3Date()

    const eventBuffs = buildActiveEventBuffs(eventStore.activeEvents, nowMs, nowInstant, zdt)
    const itemBuffs = buildActivePlayerItemBuffs(gameStore.state)

    return [...eventBuffs, ...itemBuffs]
  })

  return { initTick, addBuff, activeBuffs }
})

