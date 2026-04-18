import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { calculateDamage, getTypeEffectiveness, calculateCatchRate, getEffectiveSpeed } from '../logic/battle/battleEngine'
import { useItemOnPokemon } from '../logic/providers/itemProvider'
import { dispatchMoveEffect } from '../logic/battle/actions/actionRegistry'
import { decideEnemyMove, shouldEnemySwitch, findBestSwitchIndex } from '../logic/battle/ai/battleAI'
import { tickStatus, tickLeechSeed } from '../logic/battle/battleStatus'
import { phaserBridge } from '@/logic/phaserBridge'
import { useWarStore } from './war'
import { useEventStore } from './events'
import { GuardianService } from '@/logic/providers/GuardianService'
import { usePlayerClassStore } from './playerClass'

export const useBattleStore = defineStore('battle', () => {
  const gs = useGameStore()
  const warStore = useWarStore()
  const eventStore = useEventStore()
  const classStore = usePlayerClassStore()
  
  const activeBattle = ref(null)
  const isBattleActive = ref(false)
  const isFinishing = ref(false)
  const battleLogs = ref([]) // Logs visibles en pantalla
  const logQueue = ref([]) // Cola de logs pendientes por mostrar
  const isProcessingLogs = ref(false)
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

  const startBattle = async (enemyPoke, options = {}) => {
    const { 
      isGym = false, 
      gymId = null, 
      locationId = 'plains', 
      isTrainer = false, 
      enemyTeam = null, 
      trainerName = 'Entrenador',
      battleOptions = {} 
    } = options

    const playerPoke = gs.state.team.find(p => p.hp > 0 && !p.onMission && !p.onDefense)
    if (!playerPoke) return

    // Reset volatile statuses
    playerPoke.confused = 0
    playerPoke.flinched = false
    enemyPoke.confused = 0
    enemyPoke.flinched = false

    isBattleActive.value = true
    isFinishing.value = false
    clearLogs()

    activeBattle.value = {
      enemy: enemyPoke,
      player: playerPoke,
      isGym,
      gymId,
      isTrainer,
      enemyTeam,
      trainerName,
      locationId,
      turn: 'player',
      turnCount: 1,
      over: false,
      weather: gs.state.weather || { type: 'clear', turns: 0 },
      playerTeamIndex: gs.state.team.indexOf(playerPoke),
      participants: [playerPoke.uid],
      learnQueue: [],
      ...battleOptions
    }

    // Auto-save for important battles
    if (isTrainer || isGym) {
      await gs.saveGame()
    }

    // Pokédex: Seen
    gs.registerSeen(enemyPoke.id)
    if (isTrainer && enemyTeam) {
      enemyTeam.forEach(p => gs.registerSeen(p.id))
    }

    // Start FX in Phaser
    phaserBridge.sendCommand('BattleScene', 'START_BATTLE', {
      player: playerPoke,
      enemy: enemyPoke,
      locationId
    })

    const startMsg = isTrainer 
      ? `¡${trainerName} te desafía!` 
      : isGym 
        ? `¡Combate de Gimnasio contra ${enemyPoke.name}!` 
        : `¡Un ${enemyPoke.name} salvaje apareció!`;
    
    addLog(startMsg, 'log-info')

    // Entry Abilities
    handleEntryAbilities(playerPoke, enemyPoke)
  }

  const handleEntryAbilities = (p, e) => {
    if (p.ability === 'Intimidación') {
      enemyStages.value.atk = Math.max(-6, enemyStages.value.atk - 1)
      addLog(`¡La Intimidación de ${p.name} bajó el ataque de ${e.name}!`, 'log-info')
    }
    if (e.ability === 'Intimidación') {
      playerStages.value.atk = Math.max(-6, playerStages.value.atk - 1)
      addLog(`¡La Intimidación de ${e.name} bajó el ataque de ${p.name}!`, 'log-info')
    }
  }

  const addLog = (msg, type = 'log-info') => {
    logQueue.value.push({
      id: Date.now() + Math.random(),
      msg,
      type
    })
    
    if (!isProcessingLogs.value) {
      processNextLog()
    }
  }

  const processNextLog = async () => {
    if (logQueue.value.length === 0) {
      isProcessingLogs.value = false
      return
    }

    isProcessingLogs.value = true
    const nextItem = logQueue.value.shift()
    
    // Unshift to show newest at top, or push for scroll-down style
    battleLogs.value.unshift(nextItem)
    
    if (battleLogs.value.length > 30) {
      battleLogs.value.pop()
    }

    // Delay between messages (Gen 3 feel)
    const delay = nextItem.type === 'log-info' ? 800 : 1200
    setTimeout(processNextLog, delay)
  }

  const clearLogs = () => {
    battleLogs.value = []
    logQueue.value = []
    isProcessingLogs.value = false
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

    // Determine Turn Order
    const pSpe = getEffectiveSpeed(p, playerStages.value, { getStatMultiplier: (s) => 1 + (0.5 * s) }) // Simple placeholder multiplier
    const eSpe = getEffectiveSpeed(e, enemyStages.value, { getStatMultiplier: (s) => 1 + (0.5 * s) })
    
    // Priority moves could be added here later
    const playerFirst = pSpe >= eSpe

    if (playerFirst) {
      await runPlayerTurn(moveIndex)
      if (e.hp > 0 && !activeBattle.value.over) {
        await new Promise(r => setTimeout(r, 800))
        await runEnemyTurn()
      }
    } else {
      await runEnemyTurn()
      if (p.hp > 0 && !activeBattle.value.over) {
        await new Promise(r => setTimeout(r, 800))
        await runPlayerTurn(moveIndex)
      }
    }

    // End of Turn Effects
    if (isBattleActive.value && !activeBattle.value.over) {
      await applyEndTurnEffects()
    }

    isProcessing.value = false
  }

  const runPlayerTurn = async (moveIndex) => {
    const p = activeBattle.value.player
    const e = activeBattle.value.enemy
    const move = p.moves[moveIndex]
    
    // Check Status (Sleep, Freeze, Flinch, Confuse)
    if (!canAttack(p, 'player')) return

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
      
      // Phaser FX
      phaserBridge.sendCommand('BattleScene', 'PLAY_MOVE', { side: 'player', type: move.type })
      await new Promise(r => setTimeout(r, 400))
      phaserBridge.sendCommand('BattleScene', 'PLAY_DAMAGE', { side: 'enemy' })

      // Apply Secondary Effects
      dispatchMoveEffect(move.effect, p, e, playerStages.value, enemyStages.value, addLog, activeBattle.value)
    }

    if (e.hp <= 0) {
      addLog(`¡${e.name} salvaje fue derrotado!`, 'log-enemy')
      phaserBridge.sendCommand('BattleScene', 'PLAY_FAINT', { side: 'enemy' })
      await endBattle(true)
    }
  }

  const runEnemyTurn = async () => {
    const p = activeBattle.value.player
    const e = activeBattle.value.enemy
    if (e.hp <= 0) return

    if (!canAttack(e, 'enemy')) return

    // 1. AI Decision: Switch/Item/Move
    const isWild = !activeBattle.value.isTrainer && !activeBattle.value.isGym
    
    // Switch check (Trainers only)
    if (!isWild && shouldEnemySwitch(e, p, activeBattle.value.enemyTeam)) {
      const bestIdx = findBestSwitchIndex(activeBattle.value.enemyTeam, p, e.uid)
      if (bestIdx !== -1) {
        const newPoke = activeBattle.value.enemyTeam[bestIdx]
        addLog(`¡${activeBattle.value.trainerName || 'El entrenador'} retira a ${e.name}!`, 'log-enemy')
        await new Promise(r => setTimeout(r, 600))
        activeBattle.value.enemy = newPoke
        newPoke._revealed = true
        addLog(`¡Envía a ${newPoke.name}!`, 'log-enemy')
        phaserBridge.sendCommand('BattleScene', 'PLAY_SEND_OUT', { side: 'enemy', pokemon: newPoke })
        return
      }
    }

    // Item check (Gym leaders / Hard trainers)
    if ((activeBattle.value.isGym) && e.hp < (e.maxHp * 0.25) && !activeBattle.value.enemyUsedItem) {
      activeBattle.value.enemyUsedItem = true
      const heal = Math.floor(e.maxHp * 0.5)
      e.hp = Math.min(e.maxHp, e.hp + heal)
      addLog(`¡El Líder usó una Hiper Poción!`, 'log-enemy')
      addLog(`¡${e.name} recuperó salud!`, 'log-info')
      return
    }

    const enemyMove = decideEnemyMove(e, p, playerStages.value, isWild)
    if (!enemyMove) {
      // Struggle if no PP
      addLog(`¡${e.name} no tiene más PP y usa Forcejeo!`, 'log-enemy')
      // ... logic for struggle omitted for brevity or implemented as actual move
      return
    }

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
      
      // Phaser FX
      phaserBridge.sendCommand('BattleScene', 'PLAY_MOVE', { side: 'enemy', type: enemyMove.type })
      await new Promise(r => setTimeout(r, 400))
      phaserBridge.sendCommand('BattleScene', 'PLAY_DAMAGE', { side: 'player' })

      // Apply Secondary Effects
      dispatchMoveEffect(enemyMove.effect, e, p, enemyStages.value, playerStages.value, addLog, activeBattle.value)
    }

    if (p.hp <= 0) {
      addLog(`¡${p.name} cayó debilitado!`, 'log-player')
      phaserBridge.sendCommand('BattleScene', 'PLAY_FAINT', { side: 'player' })
      await endBattle(false)
    }
  }

  const canAttack = (pokemon, role) => {
    if (pokemon.flinched) {
      addLog(`¡${pokemon.name} retrocedió!`, 'log-info')
      pokemon.flinched = false
      return false
    }
    if (pokemon.status === 'sleep') {
      if (pokemon.sleepTurns > 0) {
        pokemon.sleepTurns--
        addLog(`¡${pokemon.name} está profundamente dormido!`, 'log-info')
        return false
      } else {
        pokemon.status = null
        addLog(`¡${pokemon.name} se despertó!`, 'log-info')
      }
    }
    if (pokemon.status === 'freeze') {
      if (Math.random() < 0.8) {
        addLog(`¡${pokemon.name} está congelado!`, 'log-info')
        return false
      } else {
        pokemon.status = null
        addLog(`¡${pokemon.name} se descongeló!`, 'log-info')
      }
    }
    return true
  }

  const applyEndTurnEffects = async () => {
    const p = activeBattle.value.player
    const e = activeBattle.value.enemy

    // Ticks
    tickStatus(p, addLog, 'player')
    tickStatus(e, addLog, 'enemy')
    
    tickLeechSeed(p, e, addLog)
    tickLeechSeed(e, p, addLog)
    
    // Weather ticks (Sandstorm)
    if (activeBattle.value.weather?.type === 'sandstorm') {
      const isSandImmune = (poke) => ['rock', 'ground', 'steel'].includes(poke.type) || ['rock', 'ground', 'steel'].includes(poke.type2)
      if (!isSandImmune(p)) {
        const dmg = Math.floor(p.maxHp / 16)
        p.hp = Math.max(0, p.hp - dmg)
        addLog(`¡La tormenta de arena alcanza a ${p.name}!`, 'log-player')
      }
      if (!isSandImmune(e)) {
        const dmg = Math.floor(e.maxHp / 16)
        e.hp = Math.max(0, e.hp - dmg)
        addLog(`¡La tormenta de arena alcanza a ${e.name}!`, 'log-enemy')
      }
    }
  }

  const useItemInBattle = async (itemName) => {
    if (isProcessing.value || !isBattleActive.value) return
    isProcessing.value = true

    const p = activeBattle.value.player
    const e = activeBattle.value.enemy

    // 1. Check if it's a Pokéball
    const itemData = gs.state.inventory[itemName]
    if (!itemData && gs.state.inventory[itemName] === undefined) {
       isProcessing.value = false;
       return;
    }

    if (itemName.toLowerCase().includes('ball')) {
      addLog(`¡Has lanzado una ${itemName}!`, 'log-info')
      const caught = calculateCatchRate(itemName, e, activeBattle.value)
      
      // Simulate ball animation delay
      await new Promise(r => setTimeout(r, 1500))

      if (caught) {
        addLog(`¡Ya está! ¡${e.name} atrapado!`, 'log-catch')
        consumeItem(itemName)
        // Add to box/team logic would go here, for now end battle
        await endBattle(true, false, true) // isCapture = true
        isProcessing.value = false
        return
      } else {
        addLog(`¡Oh, no! ¡El Pokémon se ha escapado!`, 'log-info')
      }
    } else {
      // 2. Healing/Restoration
      const result = useItemOnPokemon(itemName, p)
      if (result) {
        addLog(`Usaste ${itemName}. ¡${p.name} ${result}!`, 'log-player')
        consumeItem(itemName)
      } else {
        addLog('No tuvo efecto.', 'log-info')
        isProcessing.value = false
        return
      }
    }

    // 3. Enemy Turn after item use
    await new Promise(r => setTimeout(r, 800))
    await runEnemyTurn()
    
    isProcessing.value = false
  }

  const consumeItem = (itemName) => {
    if (gs.state.inventory[itemName]) {
      gs.state.inventory[itemName]--
      if (gs.state.inventory[itemName] <= 0) delete gs.state.inventory[itemName]
    }
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

    // 🏆 Unified DB Triggers (War & Events)
    if (win && !fled) {
      const locationId = activeBattle.value.locationId
      const isTrainer = activeBattle.value.isTrainer || activeBattle.value.isGym
      
      // 1. War Points / Guardian Logic
      if (activeBattle.value.enemy.isGuardian) {
        // Points already handled by claimGuardianCapture or similarly in battle engine logic
        // But we ensure the record is updated
        await warStore.addPoints(locationId, 'guardian', true)
      } else {
        const warType = isTrainer ? 'trainer_win' : 'wild_win'
        await warStore.addPoints(locationId, warType, true)
      }

      // 2. Events / Competition Logic
      // Check if this was a capture (isCapture flag set when using ball)
      if (activeBattle.value.isCapture) {
        // EventStore will internally check for active competitions
        await eventStore.submitCompetitionEntry(activeBattle.value.enemy, 'hourly_competition')
      }
    }
  }

  const calculateRewards = () => {
    const e = activeBattle.value.enemy
    const baseExp = Math.floor(e.level * 4) // Simplified baseline
    
    // Award exp to participants
    gs.state.team.forEach(p => {
      if (participants.value.has(p.uid) || p.heldItem === 'Compartir EXP') {
        const share = (p.uid === activeBattle.value.player.uid) ? 1 : 0.5
        const classMult = classStore.getModifier('expMult', { isTrainer: activeBattle.value.isTrainer })
        const gained = Math.floor(baseExp * share * classMult)
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

    const moneyGained = Math.floor(e.level * 10 * classStore.getModifier('bcMult', { isGym: activeBattle.value.isGym }))
    gs.state.money += moneyGained
    addLog(`¡Ganaste ₽${moneyGained}!`, 'log-info')
  }

  const setFinishing = (callback) => {
    isFinishing.value = true
    battleEndCallback.value = callback
  }

  const executeSwitch = async (teamIndex, isForced = false) => {
    if (isProcessing.value && !isForced) return
    isProcessing.value = true

    const newPoke = gs.state.team[teamIndex]
    if (!newPoke || newPoke.hp <= 0) {
      isProcessing.value = false
      return
    }

    const oldPoke = activeBattle.value.player
    addLog(`¡Bien hecho, ${oldPoke.name}! ¡Regresa!`, 'log-info')
    phaserBridge.sendCommand('BattleScene', 'PLAY_WITHDRAW', { side: 'player' })
    await new Promise(r => setTimeout(r, 600))

    // Reset volatile statuses for exiting poke
    oldPoke.confused = 0
    oldPoke.flinched = false

    // Update state
    activeBattle.value.player = newPoke
    activeBattle.value.playerTeamIndex = teamIndex
    activeBattle.value.participants.push(newPoke.uid)
    
    // Reset stages if it's a normal switch (Gen 3 logic)
    playerStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }

    addLog(`¡Adelante, ${newPoke.name}!`, 'log-player')
    phaserBridge.sendCommand('BattleScene', 'PLAY_SEND_OUT', { side: 'player', pokemon: newPoke })
    await new Promise(r => setTimeout(r, 600))

    // Entry Abilities for the new poke
    handleEntryAbilities(newPoke, activeBattle.value.enemy)

    if (!isForced) {
      // Enemy gets a free turn if it was a voluntary switch
      await runEnemyTurn()
    } else {
      // If it was forced, the player just chose their next poke, now it's their turn again
      activeBattle.value.turn = 'player'
    }

    isProcessing.value = false
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
    completeBattleFlow,
    useItemInBattle
  }
})
