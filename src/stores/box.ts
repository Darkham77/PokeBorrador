import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game.ts'
import { useUIStore } from './ui.ts'
import { calculateRocketSellPrice as calculatePrice } from '@/logic/pokemonUtils'
import { useBoxFilters } from '@/composables/useBoxFilters'
import type { Pokemon } from '@/types/pokemon'

export const useBoxStore = defineStore('box', () => {
  const gameStore = useGameStore()
  const uiStore = useUIStore()

  // --- BOX STATE ---
  const currentBoxIndex = ref(0)
  const boxReleaseMode = ref(false)
  const boxReleaseSelected = ref<number[]>([]) // Indices
  const boxRocketMode = ref(false)
  const boxRocketSelected = ref<number[]>([]) // Indices

  // --- TEAM STATE ---
  const teamReleaseMode = ref(false)
  const teamReleaseSelected = ref<number[]>([]) // Indices
  const teamRocketMode = ref(false)
  const teamRocketSelected = ref<number[]>([]) // Indices

  // --- FILTERS & SORTING COMPOSABLE ---
  const boxDataRef = computed(() => gameStore.state.box || [])
  const {
    filters,
    sortMode: boxSortMode,
    processedBoxList: filteredBox,
    hasActiveFilters,
    toggleFilters,
    resetFilters,
    setBoxSort
  } = useBoxFilters(boxDataRef)

  // --- COMPUTED ---
  const boxRocketSellValue = computed(() => getRocketSellValue())

  // --- ACTIONS ---
  function switchBox(index: number) {
    currentBoxIndex.value = index
  }

  function toggleBoxReleaseMode() {
    boxReleaseMode.value = !boxReleaseMode.value
    boxReleaseSelected.value = []
    if (boxReleaseMode.value) {
      boxRocketMode.value = false
      boxRocketSelected.value = []
    }
  }

  function toggleBoxReleaseSelect(index: number) {
    const p = gameStore.state.box[index]
    if (p && (p.onMission || p.inDaycare || p.onDefense)) return

    const idx = boxReleaseSelected.value.indexOf(index)
    if (idx > -1) {
      boxReleaseSelected.value.splice(idx, 1)
    } else {
      boxReleaseSelected.value.push(index)
    }
  }

  function doBoxRelease() {
    const indices = [...boxReleaseSelected.value].sort((a, b) => b - a)
    const releasedNames: string[] = []
    
    indices.forEach(i => {
      const p = gameStore.state.box[i]
      if (p) {
        if (p.onMission || p.inDaycare || p.onDefense) return
        releasedNames.push(p.name)
        returnHeldItem(p)
        gameStore.state.box.splice(i, 1)
      }
    })

    boxReleaseMode.value = false
    boxReleaseSelected.value = []
    gameStore.autoFillPvpTeam()
    gameStore.scheduleSave()
    return releasedNames
  }

  function toggleBoxRocketMode() {
    if (gameStore.state.playerClass !== 'rocket') return
    boxRocketMode.value = !boxRocketMode.value
    boxRocketSelected.value = []
    if (boxRocketMode.value) {
      boxReleaseMode.value = false
      boxReleaseSelected.value = []
    }
  }

  function toggleSelection(index: number) {
    if (boxReleaseMode.value) toggleBoxReleaseSelect(index)
    else if (boxRocketMode.value) toggleBoxRocketSelect(index)
  }

  function toggleBoxRocketSelect(index: number) {
    const p = gameStore.state.box[index]
    if (p && (p.onMission || p.inDaycare || p.onDefense)) return

    const idx = boxRocketSelected.value.indexOf(index)
    if (idx > -1) {
      boxRocketSelected.value.splice(idx, 1)
    } else {
      boxRocketSelected.value.push(index)
    }
  }

  function getRocketSellValue() {
    let total = 0
    boxRocketSelected.value.forEach(i => {
      const p = gameStore.state.box[i]
      if (!p || p.onMission || p.inDaycare || p.onDefense) return
      total += calculatePrice(p)
    })
    return total
  }

  function doBoxRocketSell() {
    const value = getRocketSellValue()
    const indices = [...boxRocketSelected.value].sort((a, b) => b - a)
    let soldCount = 0

    indices.forEach(i => {
      const p = gameStore.state.box[i]
      if (p) {
        if (p.onMission || p.inDaycare || p.onDefense) return
        soldCount++
        returnHeldItem(p)
        gameStore.state.box.splice(i, 1)
      }
    })

    gameStore.state.money += value
    if (gameStore.state.classData) {
      gameStore.state.classData.blackMarketSales = (gameStore.state.classData.blackMarketSales || 0) + soldCount
    }
    
    boxRocketMode.value = false
    boxRocketSelected.value = []
    gameStore.autoFillPvpTeam()
    gameStore.scheduleSave()
    return { value, count: soldCount }
  }

  function movePokemonToBox(boxIndex: number, targetBoxIndex: number) {
    const p = gameStore.state.box[boxIndex]
    if (!p) return { success: false, msg: 'Pokémon no encontrado.' }
    
    const targetStart = targetBoxIndex * 50
    gameStore.state.box.splice(boxIndex, 1)
    
    // Ensure array is large enough to reach target box
    while (gameStore.state.box.length < targetStart) {
      gameStore.state.box.push(null as unknown as Pokemon)
    }
    
    gameStore.state.box.splice(targetStart, 0, p)
    
    gameStore.scheduleSave()
    return { success: true, msg: `¡${p.name} movido a la Caja ${targetBoxIndex + 1}!` }
  }

  function togglePokeTag(boxIndex: number, tag: string) {
    const p = gameStore.state.box[boxIndex]
    if (!p) return
    if (!p.tags) p.tags = []
    const idx = p.tags.indexOf(tag)
    if (idx > -1) p.tags.splice(idx, 1)
    else p.tags.push(tag)
    gameStore.scheduleSave()
  }

  // --- TEAM ACTIONS ---
  function toggleTeamReleaseMode() {
    teamReleaseMode.value = !teamReleaseMode.value
    teamReleaseSelected.value = []
    if (teamReleaseMode.value) {
      teamRocketMode.value = false
      teamRocketSelected.value = []
    }
  }

  function toggleTeamReleaseSelect(index: number) {
    const idx = teamReleaseSelected.value.indexOf(index)
    if (idx > -1) {
      teamReleaseSelected.value.splice(idx, 1)
    } else {
      teamReleaseSelected.value.push(index)
    }
  }

  function confirmTeamRelease() {
    if (teamReleaseSelected.value.length === 0) return

    const team = gameStore.state.team || []
    if (team.length - teamReleaseSelected.value.length < 1) {
      uiStore.notify('No puedes soltar a todos tus Pokémon.', '⚠️')
      return
    }

    uiStore.openConfirm({
      title: 'Soltar Pokémon',
      message: `¿Estás seguro de que quieres soltar ${teamReleaseSelected.value.length} Pokémon?`,
      onConfirm: () => {
        const indices = [...teamReleaseSelected.value].sort((a, b) => b - a)
        const names: string[] = []
        
        indices.forEach(i => {
          const p = team[i]
          if (p) {
            names.push(p.name)
            returnHeldItem(p)
            team.splice(i, 1)
          }
        })

        uiStore.notify(`¡${names.join(', ')} fueron soltados!`, '🌿')
        teamReleaseMode.value = false
        teamReleaseSelected.value = []
        gameStore.autoFillPvpTeam()
        gameStore.scheduleSave()
      }
    })
  }

  function toggleTeamRocketMode() {
    if (gameStore.state.playerClass !== 'rocket') return
    teamRocketMode.value = !teamRocketMode.value
    teamRocketSelected.value = []
    if (teamRocketMode.value) {
      teamReleaseMode.value = false
      teamReleaseSelected.value = []
    }
  }

  // Helpers
  function returnHeldItem(pokemon: Pokemon) {
    if (!pokemon || !pokemon.heldItem) return
    const item = pokemon.heldItem
    const inv = gameStore.state.inventory
    inv[item] = (inv[item] || 0) + 1;
    pokemon.heldItem = null
  }

  function moveBoxToTeam(boxIndex: number) {
    const boxPoke = gameStore.state.box[boxIndex]
    if (!boxPoke) return { success: false, msg: 'Pokémon no encontrado.' }
    if (gameStore.state.team.length >= 6) return { success: false, msg: 'Equipo lleno.' }
    
    if (boxPoke.onMission) return { success: false, msg: 'En misión idle.' }
    if (boxPoke.inDaycare) return { success: false, msg: 'En la Guardería.' }
    if (boxPoke.onDefense) return { success: false, msg: 'En Defensa Pasiva.' }
    
    gameStore.state.box.splice(boxIndex, 1)
    gameStore.state.team.push(boxPoke)
    gameStore.autoFillPvpTeam()
    gameStore.scheduleSave()
    return { success: true, msg: `${boxPoke.name} se unió al equipo.` }
  }

  function swapBoxWithTeam(boxIndex: number, teamIndex: number) {
    const boxPoke = gameStore.state.box[boxIndex]
    const teamPoke = gameStore.state.team[teamIndex]
    if (!boxPoke || !teamPoke) return { success: false, msg: 'Pokémon no encontrado.' }
    
    if (boxPoke.onMission || boxPoke.inDaycare || boxPoke.onDefense) return { success: false, msg: 'Pokémon ocupado.' }
    
    gameStore.state.box.splice(boxIndex, 1)
    const swapped = gameStore.state.team.splice(teamIndex, 1, boxPoke)[0]!
    
    // Auto-heal on storage
    swapped.hp = swapped.maxHp
    swapped.status = null
    swapped.moves?.forEach((m) => { if (m) m.pp = m.maxPP })
    
    gameStore.state.box.splice(boxIndex, 0, swapped)
    gameStore.autoFillPvpTeam()
    gameStore.scheduleSave()
    return { success: true, msg: 'Intercambio realizado.' }
  }

  function getBoxBuyCost() {
    const count = gameStore.state.boxCount || 4
    if (count < 4) return 500000
    if (count === 4) return 500000
    if (count === 5) return 1000000
    return 1000000 * Math.pow(2, count - 5)
  }

  function buyNewBox() {
    const cost = getBoxBuyCost()
    if (gameStore.state.money < cost) return { success: false, msg: 'Dinero insuficiente.' }
    
    gameStore.state.money -= cost
    gameStore.state.boxCount = (gameStore.state.boxCount || 4) + 1
    gameStore.scheduleSave()
    return { success: true, boxNum: gameStore.state.boxCount }
  }

  function toggleTeamRocketSelect(index: number) {
    const idx = teamRocketSelected.value.indexOf(index)
    if (idx > -1) {
      teamRocketSelected.value.splice(idx, 1)
    } else {
      teamRocketSelected.value.push(index)
    }
  }

  function confirmTeamRocketSell() {
    const count = teamRocketSelected.value.length
    if (count === 0) return

    const team = gameStore.state.team || []
    let totalGain = 0
    teamRocketSelected.value.forEach(i => {
      const p = team[i]
      if (p) totalGain += calculatePrice(p)
    })

    uiStore.openConfirm({
      title: 'Vender Pokémon (Team Rocket)',
      message: `¿Vender ${count} Pokémon por ₽${totalGain.toLocaleString()}?`,
      onConfirm: () => {
        const indices = [...teamRocketSelected.value].sort((a, b) => b - a)
        const names: string[] = []
        
        indices.forEach(i => {
          const p = team[i]
          if (p) {
            names.push(p.name)
            returnHeldItem(p)
            team.splice(i, 1)
          }
        })

        gameStore.state.money += totalGain
        if (gameStore.state.classData) {
          gameStore.state.classData.blackMarketSales = (gameStore.state.classData.blackMarketSales || 0) + count
        }
        
        uiStore.notify(`¡${count} Pokémon vendidos por ₽${totalGain.toLocaleString()}! 🚀`, '🚀')
        teamRocketMode.value = false
        teamRocketSelected.value = []
        gameStore.autoFillPvpTeam()
        gameStore.scheduleSave()
      }
    })
  }

  return {
    currentBoxIndex,
    boxSortMode,
    boxReleaseMode,
    boxReleaseSelected,
    boxRocketMode,
    boxRocketSelected,
    boxRocketSellValue,
    filters,
    filteredBox,
    hasActiveFilters,
    teamReleaseMode,
    teamReleaseSelected,
    teamRocketMode,
    teamRocketSelected,
    toggleFilters,
    resetFilters,
    switchBox,
    setBoxSort,
    toggleBoxReleaseMode,
    toggleBoxReleaseSelect,
    doBoxRelease,
    toggleBoxRocketMode,
    toggleBoxRocketSelect,
    toggleSelection,
    getRocketSellValue,
    doBoxRocketSell,
    movePokemonToBox,
    toggleTeamReleaseMode,
    toggleTeamReleaseSelect,
    confirmTeamRelease,
    toggleTeamRocketMode,
    toggleTeamRocketSelect,
    confirmTeamRocketSell,
    moveBoxToTeam,
    swapBoxWithTeam,
    togglePokeTag,
    getBoxBuyCost,
    buyNewBox
  }
})
