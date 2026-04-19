import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'

export const useBoxStore = defineStore('box', () => {
  const gameStore = useGameStore()
  const uiStore = useUIStore()

  // --- BOX STATE ---
  const currentBoxIndex = ref(0)
  const boxSortMode = ref('none')
  const boxReleaseMode = ref(false)
  const boxReleaseSelected = ref([]) // Indices
  const boxRocketMode = ref(false)
  const boxRocketSelected = ref([]) // Indices

  // --- FILTER STATE ---
  const filters = ref({
    tier: 'all',
    type: 'all',
    levelMin: 1,
    levelMax: 100,
    ivTotalMin: 0,
    ivTotalMax: 186,
    ivAny31: false,
    search: '',
    isOpen: false
  })

  // --- TEAM STATE ---
  const teamReleaseMode = ref(false)
  const teamReleaseSelected = ref([]) // Indices
  const teamRocketMode = ref(false)
  const teamRocketSelected = ref([]) // Indices

  // --- COMPUTED ---
  const filteredBox = computed(() => {
    if (!gameStore.state.box) return []
    
    let list = gameStore.state.box.map((p, i) => ({ p, i }))

    // Apply Filters
    list = list.filter(({ p }) => {
      if (!p) return false // Skip empty slots
      const f = filters.value
      const ivs = p.ivs || {}
      const totalIv = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + 
                     (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
      
      if (f.tier !== 'all' && getPokemonTier(p).tier !== f.tier) return false
      if (f.type !== 'all' && p.type !== f.type) return false
      if (p.level < f.levelMin || p.level > f.levelMax) return false
      if (totalIv < f.ivTotalMin || totalIv > f.ivTotalMax) return false
      if (f.ivAny31 && !Object.values(ivs).some(v => v === 31)) return false
      if (f.search && !p.name.toLowerCase().includes(f.search.toLowerCase())) return false
      
      return true
    })

    // Apply Sorting
    if (boxSortMode.value !== 'none') {
      list.sort((a, b) => {
        if (boxSortMode.value === 'level') return b.p.level - a.p.level
        if (boxSortMode.value === 'tier') return getPokemonTier(b.p).total - getPokemonTier(a.p).total
        if (boxSortMode.value === 'type') return a.p.type.localeCompare(b.p.type)
        // Pokedex sorting would need the order array, we'll keep it simple for now or import it
        return 0
      })
    }

    // Paginate by current box if no filters are active (optional, matching legacy behavior)
    if (!hasActiveFilters.value && boxSortMode.value === 'none') {
      const start = currentBoxIndex.value * 50
      const end = start + 50
      return list.slice(start, end)
    }

    return list
  })

  const hasActiveFilters = computed(() => {
    const f = filters.value
    return f.tier !== 'all' || f.type !== 'all' || f.levelMin > 1 || f.levelMax < 100 ||
           f.ivTotalMin > 0 || f.ivTotalMax < 186 || f.ivAny31 || f.search !== ''
  })

  // --- ACTIONS ---
  function toggleFilters() {
    filters.value.isOpen = !filters.value.isOpen
  }

  function resetFilters() {
    filters.value = {
      tier: 'all',
      type: 'all',
      levelMin: 1,
      levelMax: 100,
      ivTotalMin: 0,
      ivTotalMax: 186,
      ivAny31: false,
      search: '',
      isOpen: filters.value.isOpen
    }
    boxSortMode.value = 'none'
  }

  function switchBox(index) {
    currentBoxIndex.value = index
  }

  function setBoxSort(mode) {
    boxSortMode.value = mode
  }

  function toggleBoxReleaseMode() {
    boxReleaseMode.value = !boxReleaseMode.value
    boxReleaseSelected.value = []
    if (boxReleaseMode.value) {
      boxRocketMode.value = false
      boxRocketSelected.value = []
    }
  }

  function toggleBoxReleaseSelect(index) {
    const idx = boxReleaseSelected.value.indexOf(index)
    if (idx > -1) {
      boxReleaseSelected.value.splice(idx, 1)
    } else {
      boxReleaseSelected.value.push(index)
    }
  }

  function doBoxRelease() {
    const indices = [...boxReleaseSelected.value].sort((a, b) => b - a)
    const releasedNames = []
    
    indices.forEach(i => {
      const p = gameStore.state.box[i]
      if (p) {
        releasedNames.push(p.name)
        returnHeldItem(p)
        gameStore.state.box.splice(i, 1)
      }
    })

    boxReleaseMode.value = false
    boxReleaseSelected.value = []
    gameStore.save()
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

  function toggleBoxRocketSelect(index) {
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
      if (!p) return
      const ivs = p.ivs || {}
      const totalIv = Object.values(ivs).reduce((s, v) => s + (v || 0), 0)
      // Legacy formula: Math.floor((p.level * 50 + (totalIv / 186) * 500) * 0.8)
      const price = Math.floor((p.level * 50 + (totalIv / 186) * 500) * 0.8)
      total += price
    })
    return total
  }

  function doBoxRocketSell() {
    const value = getRocketSellValue()
    const count = boxRocketSelected.value.length
    const indices = [...boxRocketSelected.value].sort((a, b) => b - a)

    indices.forEach(i => {
      const p = gameStore.state.box[i]
      if (p) {
        returnHeldItem(p)
        gameStore.state.box.splice(i, 1)
      }
    })

    gameStore.state.money += value
    gameStore.state.classData.blackMarketSales = (gameStore.state.classData.blackMarketSales || 0) + count
    
    boxRocketMode.value = false
    boxRocketSelected.value = []
    gameStore.save()
    return { value, count }
  }

  function movePokemonToBox(boxIndex, targetBoxIndex) {
    const p = gameStore.state.box[boxIndex]
    if (!p) return { success: false, msg: 'Pokémon no encontrado.' }
    
    const targetStart = targetBoxIndex * 50
    gameStore.state.box.splice(boxIndex, 1)
    
    // Ensure array is large enough to reach target box
    while (gameStore.state.box.length < targetStart) {
      gameStore.state.box.push(null)
    }
    
    gameStore.state.box.splice(targetStart, 0, p)
    
    gameStore.save()
    return { success: true, msg: `¡${p.name} movido a la Caja ${targetBoxIndex + 1}!` }
  }

  function togglePokeTag(boxIndex, tag) {
    const p = gameStore.state.box[boxIndex]
    if (!p) return
    
    if (!p.tags) p.tags = []
    const idx = p.tags.indexOf(tag)
    if (idx > -1) {
      p.tags.splice(idx, 1)
    } else {
      p.tags.push(tag)
    }
    gameStore.save()
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

  function toggleTeamReleaseSelect(index) {
    const idx = teamReleaseSelected.value.indexOf(index)
    if (idx > -1) {
      teamReleaseSelected.value.splice(idx, 1)
    } else {
      teamReleaseSelected.value.push(index)
    }
  }

  function confirmTeamRelease() {
    if (teamReleaseSelected.value.length === 0) return

    if (gameStore.state.team.length - teamReleaseSelected.value.length < 1) {
      uiStore.notify('No puedes soltar a todos tus Pokémon.', '⚠️')
      return
    }

    uiStore.openConfirm({
      title: 'Soltar Pokémon',
      message: `¿Estás seguro de que quieres soltar ${teamReleaseSelected.value.length} Pokémon?`,
      onConfirm: () => {
        const indices = [...teamReleaseSelected.value].sort((a, b) => b - a)
        const names = []
        
        indices.forEach(i => {
          const p = gameStore.state.team[i]
          if (p) {
            names.push(p.name)
            returnHeldItem(p)
            gameStore.state.team.splice(i, 1)
          }
        })

        uiStore.notify(`¡${names.join(', ')} fueron soltados!`, '🌿')
        teamReleaseMode.value = false
        teamReleaseSelected.value = []
        gameStore.save()
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

  function toggleTeamRocketSelect(index) {
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

    const totalGain = count * 1500

    uiStore.openConfirm({
      title: 'Vender Pokémon (Team Rocket)',
      message: `¿Vender ${count} Pokémon por ₽${totalGain.toLocaleString()}?`,
      onConfirm: () => {
        const indices = [...teamRocketSelected.value].sort((a, b) => b - a)
        const names = []
        
        indices.forEach(i => {
          const p = gameStore.state.team[i]
          if (p) {
            names.push(p.name)
            returnHeldItem(p)
            gameStore.state.team.splice(i, 1)
          }
        })

        gameStore.state.money += totalGain
        gameStore.state.classData.blackMarketSales = (gameStore.state.classData.blackMarketSales || 0) + count
        
        uiStore.notify(`¡${count} Pokémon vendidos por ₽${totalGain.toLocaleString()}! 🚀`, '🚀')
        teamRocketMode.value = false
        teamRocketSelected.value = []
        gameStore.save()
      }
    })
  }

  // Helpers
  function returnHeldItem(pokemon) {
    if (!pokemon || !pokemon.heldItem) return
    const item = pokemon.heldItem
    gameStore.state.inventory[item] = (gameStore.state.inventory[item] || 0) + 1
    pokemon.heldItem = null
    // gameStore.save() // Not saving here to allow batch operations to save once
  }

  function moveBoxToTeam(boxIndex) {
    const boxPoke = gameStore.state.box[boxIndex]
    if (!boxPoke) return { success: false, msg: 'Pokémon no encontrado.' }
    if (gameStore.state.team.length >= 6) return { success: false, msg: 'Equipo lleno.' }
    
    if (boxPoke.onMission) return { success: false, msg: 'En misión idle.' }
    if (boxPoke.inDaycare) return { success: false, msg: 'En la Guardería.' }
    
    gameStore.state.box.splice(boxIndex, 1)
    gameStore.state.team.push(boxPoke)
    gameStore.save()
    return { success: true, msg: `${boxPoke.name} se unió al equipo.` }
  }

  function swapBoxWithTeam(boxIndex, teamIndex) {
    const boxPoke = gameStore.state.box[boxIndex]
    const teamPoke = gameStore.state.team[teamIndex]
    if (!boxPoke || !teamPoke) return { success: false, msg: 'Pokémon no encontrado.' }
    
    if (boxPoke.onMission || boxPoke.inDaycare) return { success: false, msg: 'Pokémon ocupado.' }
    
    gameStore.state.box.splice(boxIndex, 1)
    const swapped = gameStore.state.team.splice(teamIndex, 1, boxPoke)[0]
    
    // Auto-heal on storage
    swapped.hp = swapped.maxHp
    swapped.status = null
    swapped.moves?.forEach(m => { m.pp = m.maxPP })
    
    gameStore.state.box.splice(boxIndex, 0, swapped)
    gameStore.save()
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
    gameStore.save()
    return { success: true, boxNum: gameStore.state.boxCount }
  }

  return {
    currentBoxIndex,
    boxSortMode,
    boxReleaseMode,
    boxReleaseSelected,
    boxRocketMode,
    boxRocketSelected,
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
