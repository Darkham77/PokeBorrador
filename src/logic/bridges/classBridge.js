import { useUIStore } from '@/stores/ui'
import { usePlayerClassStore } from '@/stores/playerClass'

/**
 * initClassBridge: Redirige llamadas legacy de clases a los nuevos Stores y Componentes de Vue.
 */
export function initClassBridge() {
  const uiStore = useUIStore()
  const classStore = usePlayerClassStore()

  // --- Selección de Clase ---
  window.openClassModal = (forced = false) => {
    uiStore.isClassSelectionOpen = true
  }
  
  window.closeClassModal = () => {
    uiStore.isClassSelectionOpen = false
  }

  window.selectClass = (classId) => {
    classStore.selectClass(classId)
  }

  // --- Misiones Idle ---
  window.openClassMissionsPanel = () => {
    uiStore.isClassMissionsOpen = true
  }

  window.startClassMission = (mid) => {
    classStore.startMission(mid)
  }

  window.collectClassMission = () => {
    classStore.collectMission()
  }

  // --- Progresión y HUD ---
  window.addClassXP = (amount) => {
    classStore.addXP(amount)
  }

  window.addCriminality = (amount) => {
    classStore.addCriminality(amount)
  }

  // Legacy fallback: no hace nada ahora porque Vue lo maneja reactivamente
  window.updateClassHud = () => {
    console.log('[ClassBridge] HUD updated via Vue reactivity.')
  }

  window.updateCriminalityBar = () => {
    console.log('[ClassBridge] Criminality bar updated via Vue reactivity.')
  }

  // --- Modificadores (Usados por el motor de batalla legacy) ---
  window.getClassModifier = (type, context = {}) => {
    return classStore.getModifier(type, context)
  }

  console.log('[ClassBridge] Legacy class system redirects initialized.')
}
