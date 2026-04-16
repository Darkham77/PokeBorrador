import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { PLAYER_CLASSES, CLASS_MISSIONS } from '@/data/playerClasses'

export const usePlayerClassStore = defineStore('playerClass', () => {
  const gameStore = useGameStore()
  const uiStore = useUIStore()

  // --- Getters ---
  const playerClass = computed(() => gameStore.state.playerClass)
  const classLevel = computed(() => gameStore.state.classLevel || 1)
  const classXP = computed(() => gameStore.state.classXP || 0)
  const classData = computed(() => gameStore.state.classData || {})
  
  const currentClassDef = computed(() => {
    if (!playerClass.value) return null
    return PLAYER_CLASSES[playerClass.value]
  })

  const activeMission = computed(() => classData.value.activeMission || null)

  /**
   * Obtiene modificadores de clase para batalla o economía.
   * Centraliza la lógica de getClassModifier() de legacy.
   */
  function getModifier(type, context = {}) {
    // PvP Balance: Sin modificadores en PvP
    if (gameStore.state.activeBattle?.isPvP) {
      return type === 'shopDiscount' ? 0 : 1.0
    }

    if (!playerClass.value || !currentClassDef.value) return 1.0
    const m = currentClassDef.value.modifiers

    switch (type) {
      case 'expMult':
        if (playerClass.value === 'cazabichos' && context.isTrainer) return m.expMultTrainer || 1.0
        return m.expMult || 1.0
      case 'bcMult':
        if (playerClass.value === 'entrenador' && context.isGym) return m.bcGymMult || 1.0
        return m.bcMult || 1.0
      case 'healCostMult':
        return m.healCostMult || 1.0
      case 'daycareCostMult':
        return m.daycareCostMult || 1.0
      case 'catchMult':
        return m.catchMult || 1.0
      case 'shopDiscount':
        return m.shopDiscount || 0
      default:
        return 1.0
    }
  }

  // --- Actions ---

  /**
   * Selecciona o cambia la clase del jugador.
   */
  async function selectClass(classId) {
    const cls = PLAYER_CLASSES[classId]
    if (!cls) return { success: false, msg: 'Clase no válida' }

    const isChange = !!playerClass.value
    if (isChange) {
      const cost = 10000
      if ((gameStore.state.battleCoins || 0) < cost) {
        return { success: false, msg: `Necesitas ${cost.toLocaleString()} Battle Coins para cambiar.` }
      }
      gameStore.state.battleCoins -= cost
    }

    // Reset de datos específicos y liberación de Pokémon en misión
    [...(gameStore.state.team || []), ...(gameStore.state.box || [])].forEach(p => {
      if (p.onMission) p.onMission = false
    })

    gameStore.state.playerClass = classId
    gameStore.state.classLevel = 1
    gameStore.state.classXP = 0
    gameStore.state.classData = {
      captureStreak: 0,
      longestStreak: 0,
      reputation: 0,
      blackMarketSales: 0,
      criminality: 0,
      extortedRouteId: null,
      officialRouteId: null,
      kitCaptures: 0
    }

    uiStore.notify(`¡Elegiste ser ${cls.name}!`, cls.icon)
    await gameStore.save(false)
    return { success: true }
  }

  /**
   * Incrementa XP de clase (se sincroniza con el nivel de entrenador por ahora, como en legacy).
   */
  function addXP(amount) {
    if (!playerClass.value || amount <= 0) return
    // Nota: en PokeBorrador, addClassXP llamaba a addTrainerExp
    // Mantendremos esa coherencia llamando a una futura acción de gameStore si existe,
    // o simplemente sumando a classXP si queremos que sean independientes.
    // El legacy hacía: window.addTrainerExp(amount)
    if (typeof window.addTrainerExp === 'function') {
      window.addTrainerExp(amount)
    } else {
      gameStore.state.classXP = (gameStore.state.classXP || 0) + amount
    }
  }

  /**
   * Maneja el nivel de criminalidad del Rocket.
   */
  function addCriminality(amount) {
    if (playerClass.value !== 'rocket' || amount <= 0) return
    const prev = classData.value.criminality || 0
    gameStore.state.classData.criminality = Math.min(100, prev + amount)
    
    if (prev < 100 && gameStore.state.classData.criminality >= 100) {
      uiStore.notify("¡Nivel de criminalidad máximo! La policía te busca.", "🚔")
    }
  }

  /**
   * Inicia una misión idle.
   */
  async function startMission(missionId, extraData = {}) {
    const m = CLASS_MISSIONS.find(x => x.id === missionId)
    if (!m) return

    // Marcar pokemon como ocupado
    if (extraData.targetPokemonIdx !== undefined) {
      const p = gameStore.state.box[extraData.targetPokemonIdx]
      if (p) p.onMission = true
    }

    gameStore.state.classData.activeMission = {
      id: missionId,
      startedAt: Date.now(),
      endsAt: Date.now() + (m.durationHs * 3600 * 1000),
      ...extraData
    }
    
    uiStore.notify(`¡Misión iniciada! (${m.durationHs}h)`, '📋')
    await gameStore.save(false)
  }

  /**
   * Finaliza y cobra una misión. (Implementación de Phase 21).
   */
  async function collectMission() {
    const mission = activeMission.value
    if (!mission) return

    const cls = playerClass.value
    let msg = 'Misión completada. '
    
    if (cls === 'rocket') {
      // Recompensa en dinero (el Pokémon ya no está)
      const reward = mission.projectedReward || 0
      gameStore.state.battleCoins = (gameStore.state.battleCoins || 0) + reward
      msg += `¡Recibiste ₽${reward.toLocaleString()}! 🚀`
      
      // Eliminar el Pokémon de la caja (sacrificio)
      if (mission.targetPokemonIdx !== undefined) {
        const p = gameStore.state.box[mission.targetPokemonIdx]
        if (p) {
          // Devolver el objeto que llevaba
          if (p.heldItem) {
            const invStore = (await import('./inventoryStore')).useInventoryStore()
            invStore.addItem(p.heldItem, 1)
          }
          gameStore.state.box.splice(mission.targetPokemonIdx, 1)
        }
      }
    } else if (cls === 'cazabichos') {
      // Aquí iría la lógica de generar encuentros salvajes bicho o recompensas de IVs
      msg += '¡Nuevos Pokémon Bicho avistados!'
    } else if (cls === 'entrenador') {
      // Recompensa en EXP para el Pokémon enviado
      if (mission.targetPokemonIdx !== undefined) {
        const p = gameStore.state.box[mission.targetPokemonIdx]
        if (p) {
          const blocks = (mission.endsAt - mission.startedAt) / (3600000 * 6) // bloques de 6h
          const expGain = (25000 + (p.level || 1) * 1000) * blocks
          p.exp = (p.exp || 0) + expGain
          if (typeof window.checkLevelUp === 'function') window.checkLevelUp(p)
          p.onMission = false
          msg += `¡${p.name} ganó ${expGain.toLocaleString()} EXP! 🏅`
        }
      }
    } else if (cls === 'criador') {
      // Recompensa en IVs aleatorios a cambio de Vigor
      if (mission.targetPokemonIdx !== undefined) {
        const p = gameStore.state.box[mission.targetPokemonIdx]
        if (p) {
          const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
          const stat = stats[Math.floor(Math.random() * stats.length)]
          const gain = Math.floor(Math.random() * 3) + 1
          p.ivs[stat] = Math.min(31, (p.ivs[stat] || 0) + gain)
          p.vigor = Math.max(0, (p.vigor || 20) - 5)
          p.onMission = false
          msg += `¡${p.name} mejoró su ${stat.toUpperCase()} (+${gain})! 🧬`
        }
      }
    } else {
      // Liberar al Pokémon que estaba en misión
      if (mission.targetPokemonIdx !== undefined) {
        const p = gameStore.state.box[mission.targetPokemonIdx]
        if (p) p.onMission = false
      }
      msg += 'Tus Pokémon han regresado con éxito.'
    }

    gameStore.state.classData.activeMission = null
    uiStore.notify(msg, '🎁')
    await gameStore.save()
  }

  return {
    playerClass,
    classLevel,
    classXP,
    classData,
    currentClassDef,
    activeMission,
    getModifier,
    selectClass,
    addXP,
    addCriminality,
    startMission,
    clearMission
  }
})
