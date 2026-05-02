import { useUIStore } from '@/stores/ui'

export function useTeamActions(state, scheduleSave) {
  function autoFillPvpTeam() {
    const uiStore = useUIStore()
    if (uiStore.pvpAutoFillDisabled) return
    
    const allPokes = [...state.team, ...(state.box || [])].filter(p => p != null)
    if (allPokes.length === 0) {
      state.pvpTeam = []
      return
    }

    const existingUids = new Set(allPokes.map(p => p.uid))
    state.pvpTeam = (state.pvpTeam || []).filter(uid => existingUids.has(uid))

    const targetCount = Math.min(3, allPokes.length)
    if (state.pvpTeam.length < targetCount) {
      for (const p of allPokes) {
        if (state.pvpTeam.length >= targetCount) break
        if (!state.pvpTeam.includes(p.uid)) {
          state.pvpTeam.push(p.uid)
        }
      }
    }
    
    if (state.pvpTeam.length > 3) {
      state.pvpTeam = state.pvpTeam.slice(0, 3)
    }
  }

  function swapPvpSlot(slotIndex, newPokemonUid) {
    if (slotIndex < 0 || slotIndex >= 3) return
    const allPokes = [...state.team, ...(state.box || [])]
    const exists = allPokes.some(p => p.uid === newPokemonUid)
    const pvpTeam = state.pvpTeam || []
    const alreadyIn = pvpTeam.includes(newPokemonUid)

    if (exists && !alreadyIn) {
      if (!state.pvpTeam) state.pvpTeam = []
      state.pvpTeam[slotIndex] = newPokemonUid
      scheduleSave()
    }
  }

  function reorderPvpTeam(draggedIndex, targetIndex) {
    if (draggedIndex === targetIndex) return
    const newPvpTeam = [...(state.pvpTeam || [])]
    const [moved] = newPvpTeam.splice(draggedIndex, 1)
    newPvpTeam.splice(targetIndex, 0, moved)
    state.pvpTeam = newPvpTeam
    scheduleSave()
  }

  function autoFillWarTeam() {
    const allPokes = [...state.team, ...(state.box || [])].filter(p => p != null)
    if (allPokes.length === 0) {
      state.warTeam = []
      return
    }

    const existingUids = new Set(allPokes.map(p => p.uid))
    state.warTeam = (state.warTeam || []).filter(uid => existingUids.has(uid))

    const targetCount = Math.min(state.warSlots || 6, allPokes.length)
    if (state.warTeam.length < targetCount) {
      for (const p of allPokes) {
        if (state.warTeam.length >= targetCount) break
        if (!state.warTeam.includes(p.uid)) {
          state.warTeam.push(p.uid)
        }
      }
    }
    
    if (state.warTeam.length > (state.warSlots || 6)) {
      state.warTeam = state.warTeam.slice(0, state.warSlots || 6)
    }
  }

  function swapWarSlot(slotIndex, newPokemonUid) {
    const maxSlots = state.warSlots || 6
    if (slotIndex < 0 || slotIndex >= maxSlots) return
    
    const allPokes = [...state.team, ...(state.box || [])]
    const exists = allPokes.some(p => p.uid === newPokemonUid)
    const warTeam = state.warTeam || []
    const alreadyIn = warTeam.includes(newPokemonUid)

    if (exists && !alreadyIn) {
      if (!state.warTeam) state.warTeam = []
      state.warTeam[slotIndex] = newPokemonUid
      scheduleSave()
    }
  }

  function reorderWarTeam(draggedIndex, targetIndex) {
    if (draggedIndex === targetIndex) return
    const newWarTeam = [...(state.warTeam || [])]
    const [moved] = newWarTeam.splice(draggedIndex, 1)
    newWarTeam.splice(targetIndex, 0, moved)
    state.warTeam = newWarTeam
    scheduleSave()
  }

  return { autoFillPvpTeam, swapPvpSlot, reorderPvpTeam, autoFillWarTeam, swapWarSlot, reorderWarTeam }
}
