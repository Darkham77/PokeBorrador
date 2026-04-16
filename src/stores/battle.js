import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { calculateDamage, getTypeEffectiveness, calculateCatchRate } from '../logic/battle/battleEngine'

export const useBattleStore = defineStore('battle', () => {
  const gs = useGameStore()
  
  const activeBattle = ref(null)
  const battleLogs = ref([])
  const isBattleActive = ref(false)
  const isFinishing = ref(false)
  const battleEndCallback = ref(null)
  const isProcessing = ref(false)

  // Turn tracking
  const playerStages = ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 })
  const enemyStages = ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 })
  const participants = ref(new Set()) // UIDs of participated pokes for EXP sharing

  const player = computed(() => activeBattle.value?.player)
  const enemy = computed(() => activeBattle.value?.enemy)

  const syncFromLegacy = (battleData) => {
    activeBattle.value = battleData
    isBattleActive.value = !!battleData && !battleData.over
    if (!battleData || !battleData.over) {
      isFinishing.value = false
    }
  }

  const addLog = (msg, type = 'log-info') => {
    battleLogs.value.unshift({
      id: Date.now() + Math.random(),
      msg,
      type
    })
    if (battleLogs.value.length > 20) {
      battleLogs.value.pop()
    }
  }

  const clearLogs = () => {
    battleLogs.value = []
    participants.value.clear()
    playerStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }
    enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }
  }

  const executeMove = async (moveIndex) => {
    if (isProcessing.value || !isBattleActive.value) return
    isProcessing.value = true

    const p = activeBattle.value.player
    const e = activeBattle.value.enemy
    const move = p.moves[moveIndex]

    if (move.pp <= 0) {
      addLog(`¡No queda PP para ${move.name}!`, 'log-info')
      isProcessing.value = false
      return
    }

    // 1. Player Turn
    move.pp--
    addLog(`¡${p.name} usó ${move.name}!`, 'log-player')
    participants.value.add(p.uid)

    const result = calculateDamage(p, e, move, { 
      atkStages: playerStages.value.atk, 
      defStages: enemyStages.value.def,
      weather: activeBattle.value.weather
    })

    if (result.isNoEffect) {
      addLog('¡No afecta!', 'log-enemy')
    } else {
      e.hp = Math.max(0, e.hp - result.dmg)
      if (result.isCrit) addLog('¡Un golpe crítico!', 'log-player')
      if (result.isSuperEffective) addLog('¡Es muy eficaz!', 'log-player')
      if (result.isNotVeryEffective) addLog('No es muy eficaz...', 'log-player')
    }

    // Check Enemy Fainted
    if (e.hp <= 0) {
      addLog(`¡${e.name} salvaje fue derrotado!`, 'log-enemy')
      await endBattle(true)
      isProcessing.value = false
      return
    }

    // 2. Enemy Turn (Delay for fake feeling)
    await new Promise(r => setTimeout(r, 800))
    const enemyMove = e.moves[Math.floor(Math.random() * e.moves.length)]
    addLog(`¡${e.name} usó ${enemyMove.name}!`, 'log-enemy')

    const eResult = calculateDamage(e, p, enemyMove, {
      atkStages: enemyStages.value.atk,
      defStages: playerStages.value.def,
      weather: activeBattle.value.weather
    })

    if (eResult.isNoEffect) {
      addLog('¡No afecta!', 'log-player')
    } else {
      p.hp = Math.max(0, p.hp - eResult.dmg)
      if (eResult.isCrit) addLog('¡Un golpe crítico!', 'log-enemy')
      if (eResult.isSuperEffective) addLog('¡Es muy eficaz!', 'log-enemy')
      if (eResult.isNotVeryEffective) addLog('No es muy eficaz...', 'log-enemy')
    }

    // Check Player Fainted
    if (p.hp <= 0) {
      addLog(`¡${p.name} cayó debilitado!`, 'log-player')
      // Simple logic: if fainted, end battle for now (Stage 5 baseline)
      await endBattle(false)
    }

    isProcessing.value = false
  }

  const flee = async () => {
    if (isProcessing.value) return
    addLog('¡Huiste del combate!', 'log-info')
    await endBattle(false, true)
  }

  const endBattle = async (win, fled = false) => {
    isFinishing.value = true
    if (win && !fled) {
      calculateRewards()
    }
    
    // Sync back to gameStore team
    const teamIdx = gs.state.team.findIndex(p => p.uid === activeBattle.value.player.uid)
    if (teamIdx !== -1) {
      gs.state.team[teamIdx].hp = activeBattle.value.player.hp
      gs.state.team[teamIdx].exp = activeBattle.value.player.exp
    }
  }

  const calculateRewards = () => {
    const e = activeBattle.value.enemy
    const baseExp = Math.floor(e.level * 4) // Simplified baseline
    
    // Award exp to participants
    gs.state.team.forEach(p => {
      if (participants.value.has(p.uid) || p.heldItem === 'Compartir EXP') {
        const share = (p.uid === activeBattle.value.player.uid) ? 1 : 0.5
        const gained = Math.floor(baseExp * share)
        p.exp += gained
        addLog(`${p.name} ganó ${gained} EXP.`, 'log-player')
        
        // Level up check
        if (p.exp >= p.expNeeded) {
          p.level++
          p.exp -= p.expNeeded
          p.expNeeded = Math.floor(p.expNeeded * 1.2)
          addLog(`¡${p.name} subió al nivel ${p.level}!`, 'log-info')
        }
      }
    })

    const moneyGained = e.level * 10
    gs.state.money += moneyGained
    addLog(`¡Ganaste ₽${moneyGained}!`, 'log-info')
  }

  const setFinishing = (callback) => {
    isFinishing.value = true
    battleEndCallback.value = callback
  }

  const completeBattleFlow = () => {
    if (battleEndCallback.value) {
      battleEndCallback.value()
      battleEndCallback.value = null
    }
    isFinishing.value = false
    isBattleActive.value = false
    activeBattle.value = null
    clearLogs()
  }

  return {
    state: activeBattle,
    activeBattle,
    battleLogs,
    isBattleActive,
    isFinishing,
    isProcessing,
    player,
    enemy,
    syncFromLegacy,
    addLog,
    clearLogs,
    executeMove,
    flee,
    setFinishing,
    completeBattleFlow
  }
})
