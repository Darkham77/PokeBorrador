import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useGameStore } from '@/stores/game.ts'
import { calculateRocketSellPrice as calculatePrice } from '@/logic/pokemon/pokemonUtils'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { usePlayerClassStore } from '@/stores/player/playerClass.ts'
import { BLACK_MARKET_CRIMINALITY_PER_SALE, BOX_BASE_BUY_COST, BOX_ADVANCED_BUY_COST } from '@/logic/constants/gameplay'

export const useBoxStore = defineStore('box', () => {
  const gameStore = useGameStore()

  // --- BOX STATE ---
  const currentBoxIndex = ref(0)
  const boxReleaseMode = ref(false)
  const boxReleaseSelected = ref<number[]>([]) // Indices
  const boxRocketMode = ref(false)
  const boxRocketSelected = ref<number[]>([]) // Indices

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
    const releasedNames: string[] = [] // no-domain
    
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

    const classStore = usePlayerClassStore()
    if (soldCount > 0) {
      classStore.addCriminality(soldCount * BLACK_MARKET_CRIMINALITY_PER_SALE)
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
      gameStore.state.box.push(null as unknown as Pokemon) // domain-ok
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
    
    gameStore.state.box.splice(boxIndex, 0, swapped)
    gameStore.autoFillPvpTeam()
    gameStore.scheduleSave()
    return { success: true, msg: 'Intercambio realizado.' }
  }

  function getBoxBuyCost() {
    const count = gameStore.state.boxCount || 4
    if (count < 4) return BOX_BASE_BUY_COST
    if (count === 4) return BOX_BASE_BUY_COST
    if (count === 5) return BOX_ADVANCED_BUY_COST
    return BOX_ADVANCED_BUY_COST * Math.pow(2, count - 5)
  }

  function buyNewBox() {
    const cost = getBoxBuyCost()
    if (gameStore.state.money < cost) return { success: false, msg: 'Dinero insuficiente.' }
    
    gameStore.state.money -= cost
    gameStore.state.boxCount = (gameStore.state.boxCount || 4) + 1
    gameStore.scheduleSave()
    return { success: true, boxNum: gameStore.state.boxCount }
  }



  return {
    currentBoxIndex,
    boxReleaseMode,
    boxReleaseSelected,
    boxRocketMode,
    boxRocketSelected,
    switchBox,
    toggleBoxReleaseMode,
    toggleBoxReleaseSelect,
    doBoxRelease,
    toggleBoxRocketMode,
    toggleBoxRocketSelect,
    toggleSelection,
    getRocketSellValue,
    doBoxRocketSell,
    movePokemonToBox,
    moveBoxToTeam,
    swapBoxWithTeam,
    togglePokeTag,
    getBoxBuyCost,
    buyNewBox
  }
})
