import { useUIStore } from '@/stores/ui'
import type { GameState } from '@/types/system/game'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { MAX_PVP_SLOTS, MAX_PVP6_SLOTS, type PvpTeamTab } from '@/types/battle/pvp'

import { ensurePvpTeamsFilled } from '@/logic/pvp/pvpTeamHelper.ts'

export function useTeamActions(state: GameState, scheduleSave: () => Promise<void>) {
  function autoFillPvpTeam() {
    const uiStore = useUIStore()
    if (uiStore.pvpAutoFillDisabled) return
    ensurePvpTeamsFilled(state)
  }

  function swapPvpSlot(slotIndex: number, newPokemonUid: string) {
    if (slotIndex < 0 || slotIndex >= MAX_PVP_SLOTS) return
    const allPokes = [...state.team, ...(state.box || [])]
    const poke = allPokes.find(p => p?.uid === newPokemonUid)
    if (!poke || poke.isIllegal) return
    const pvpTeam = state.pvpTeam || []
    const alreadyIn = pvpTeam.includes(newPokemonUid)

    if (!alreadyIn) {
      const updated = [...(state.pvpTeam || [])]
      updated[slotIndex] = newPokemonUid
      state.pvpTeam = updated
      scheduleSave()
    }
  }

  function reorderPvpTeam(draggedIndex: number, targetIndex: number) {
    if (draggedIndex === targetIndex) return
    const newPvpTeam = [...(state.pvpTeam || [])]
    const moved = newPvpTeam[draggedIndex]
    if (!moved) return
    newPvpTeam.splice(draggedIndex, 1)
    newPvpTeam.splice(targetIndex, 0, moved)
    state.pvpTeam = newPvpTeam
    scheduleSave()
  }

  function removePvpSlot(slotIndex: number) {
    if (slotIndex < 0 || slotIndex >= MAX_PVP_SLOTS) return
    const newPvpTeam = [...(state.pvpTeam || [])]
    if (slotIndex < newPvpTeam.length) {
      newPvpTeam.splice(slotIndex, 1)
      state.pvpTeam = newPvpTeam
      scheduleSave()
    }
  }

  function autoFillPvpTeam6() {
    const uiStore = useUIStore()
    if (uiStore.pvpAutoFillDisabled) return
    
    const allPokes = [...state.team, ...(state.box || [])].filter((p): p is Pokemon => p != null && !p.isIllegal)
    if (allPokes.length === 0) {
      state.pvpTeam6 = []
      return
    }

    const existingUids = new Set(allPokes.map(p => p.uid))
    state.pvpTeam6 = (state.pvpTeam6 || []).filter(uid => existingUids.has(uid))

    const targetCount = Math.min(MAX_PVP6_SLOTS, allPokes.length)
    if (state.pvpTeam6.length < targetCount) {
      for (const p of allPokes) {
        if (state.pvpTeam6.length >= targetCount) break
        if (!state.pvpTeam6.includes(p.uid)) {
          state.pvpTeam6.push(p.uid)
        }
      }
    }
    
    if (state.pvpTeam6.length > MAX_PVP6_SLOTS) {
      state.pvpTeam6 = state.pvpTeam6.slice(0, MAX_PVP6_SLOTS)
    }
  }

  function swapPvp6Slot(slotIndex: number, newPokemonUid: string) {
    if (slotIndex < 0 || slotIndex >= MAX_PVP6_SLOTS) return
    const allPokes = [...state.team, ...(state.box || [])]
    const poke = allPokes.find(p => p?.uid === newPokemonUid)
    if (!poke || poke.isIllegal) return
    const pvpTeam6 = state.pvpTeam6 || []
    const alreadyIn = pvpTeam6.includes(newPokemonUid)

    if (!alreadyIn) {
      const updated = [...(state.pvpTeam6 || [])]
      updated[slotIndex] = newPokemonUid
      state.pvpTeam6 = updated
      scheduleSave()
    }
  }

  function reorderPvp6Team(draggedIndex: number, targetIndex: number) {
    if (draggedIndex === targetIndex) return
    const newPvpTeam6 = [...(state.pvpTeam6 || [])]
    const moved = newPvpTeam6[draggedIndex]
    if (!moved) return
    newPvpTeam6.splice(draggedIndex, 1)
    newPvpTeam6.splice(targetIndex, 0, moved)
    state.pvpTeam6 = newPvpTeam6
    scheduleSave()
  }

  function removePvp6Slot(slotIndex: number) {
    if (slotIndex < 0 || slotIndex >= MAX_PVP6_SLOTS) return
    const newPvpTeam6 = [...(state.pvpTeam6 || [])]
    if (slotIndex < newPvpTeam6.length) {
      newPvpTeam6.splice(slotIndex, 1)
      state.pvpTeam6 = newPvpTeam6
      scheduleSave()
    }
  }

  function unequipFromTeam(uid: string) {
    const p = state.team.find(x => x?.uid === uid)
    if (!p || !p.heldItem) return
    const item = p.heldItem
    state.inventory[item] = (state.inventory[item] || 0) + 1
    p.heldItem = null
    scheduleSave()
  }

  function unequipFromBox(uid: string) {
    const p = state.box.find(x => x?.uid === uid)
    if (!p || !p.heldItem) return
    const item = p.heldItem
    state.inventory[item] = (state.inventory[item] || 0) + 1
    p.heldItem = null
    scheduleSave()
  }

  function autoFillWarTeam() {
    const allPokes = [...state.team, ...(state.box || [])].filter((p): p is Pokemon => p != null && !p.isIllegal)
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

  function swapWarSlot(slotIndex: number, newPokemonUid: string) {
    const maxSlots = state.warSlots || 6
    if (slotIndex < 0 || slotIndex >= maxSlots) return
    
    const allPokes = [...state.team, ...(state.box || [])]
    const poke = allPokes.find(p => p?.uid === newPokemonUid)
    if (!poke || poke.isIllegal) return
    const warTeam = state.warTeam || []
    const alreadyIn = warTeam.includes(newPokemonUid)

    if (!alreadyIn) {
      const updated = [...(state.warTeam || [])]
      updated[slotIndex] = newPokemonUid
      state.warTeam = updated
      scheduleSave()
    }
  }

  function reorderWarTeam(draggedIndex: number, targetIndex: number) {
    if (draggedIndex === targetIndex) return
    const newWarTeam = [...(state.warTeam || [])]
    const moved = newWarTeam[draggedIndex]
    if (!moved) return
    newWarTeam.splice(draggedIndex, 1)
    newWarTeam.splice(targetIndex, 0, moved)
    state.warTeam = newWarTeam
    scheduleSave()
  }

  function setRankedTeam(tab: PvpTeamTab, uids: string[]) {
    if (tab === 'pvp') {
      state.pvpTeam = uids.slice(0, MAX_PVP_SLOTS)
    } else {
      state.pvpTeam6 = uids.slice(0, MAX_PVP6_SLOTS)
    }
    scheduleSave()
  }

  return {
    autoFillPvpTeam,
    swapPvpSlot,
    reorderPvpTeam,
    removePvpSlot,
    autoFillPvpTeam6,
    swapPvp6Slot,
    reorderPvp6Team,
    removePvp6Slot,
    unequipFromTeam,
    unequipFromBox,
    autoFillWarTeam,
    swapWarSlot,
    reorderWarTeam,
    setRankedTeam
  }
}
