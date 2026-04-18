import { useBreedingStore } from '@/stores/breeding'
import { useUIStore } from '@/stores/ui'
import * as breedingData from '@/data/breedingData'
import * as breedingLogic from '@/logic/breeding'
import * as breedingUI from '@/logic/breedingUI'

export function initBreedingBridge() {
  const breedingStore = useBreedingStore()
  const uiStore = useUIStore()

  // Data & Constant Bindings
  window.EGG_GROUPS = breedingData.EGG_GROUPS;
  window.EGG_MOVES_DB = breedingData.EGG_MOVES_DB;
  window.EGG_SPAWN_INTERVAL_MS = breedingData.EGG_SPAWN_INTERVAL_MS;

  // Logic Bindings
  window.checkCompatibility = breedingLogic.checkCompatibility;
  window.calculateInheritance = breedingLogic.calculateInheritance;
  window.calculateBreedingCost = breedingLogic.calculateBreedingCost;
  window.getBabyOrBase = breedingLogic.getBabyOrBase;

  // UI & Render Bindings
  window.renderDaycareBreedingSummary = breedingUI.renderDaycareBreedingSummary;
  window.renderPickerHtml = breedingUI.renderPickerHtml;

  window.openDaycare = () => {
    uiStore.currentView = 'daycare'
    breedingStore.loadDaycareData()
  }

  // legacy scripts calling renderDaycareUI to refresh, we just re-load data
  window.renderDaycareUI = () => {
    breedingStore.loadDaycareData()
  }

  window.openEggScannerMenu = () => {
    uiStore.isEggScannerOpen = true
  }

  window.reduceHatchTimer = async (pid, activity) => {
    console.log(`[BreedingBridge] Reducing hatch timer: ${activity}`)
  }

  // Realtime Subscriptions (Optional/Not implemented in Pinia yet)
  
  console.log('[BreedingBridge] Breeding and Daycare bindings initialized.')
}
