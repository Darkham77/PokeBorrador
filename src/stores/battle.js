import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { handleEntryAbilities, applyEndTurnWeather } from '../logic/battle/battleFlow'
import { calculateBaseExp, processExpGain, calculateMoneyGain } from '../logic/battle/battleRewards'
import { handleItemUsage } from '../logic/battle/battleItems'
import { phaserBridge } from '@/logic/phaserBridge'
import { useWarStore } from './war'
import { useEventStore } from './events'
import { usePlayerClassStore } from './playerClass'
import { useUIStore } from './ui'
import { useAudioStore } from './audio'
import { getBattleRewardModifiers } from '@/logic/war/bonusEngine'
import { tickStatus, tickLeechSeed } from '../logic/battle/battleStatus'
import { executeTurn, runEnemyAction } from '../logic/battle/battleTurn'

export const useBattleStore = defineStore('battle', () => {
  const gs = useGameStore()
  const warStore = useWarStore()
  const eventStore = useEventStore()
  const classStore = usePlayerClassStore()
  const audio = useAudioStore()
  
  const activeBattle = ref(null)
  const isBattleActive = ref(false)
  const isFinishing = ref(false)
  const battleLogs = ref([])
  const logQueue = ref([])
  const isProcessingLogs = ref(false)
  const battleEndCallback = ref(null)
  const isProcessing = ref(false)

  const playerStages = ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 })
  const enemyStages = ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 })
  const participants = ref(new Set())

  const player = computed(() => activeBattle.value?.player)
  const enemy = computed(() => activeBattle.value?.enemy)

  const syncFromLegacy = (battleData) => {
    activeBattle.value = battleData
    isBattleActive.value = !!battleData && !battleData.over
    if (!battleData || !battleData.over) isFinishing.value = false
  }

  const _startBattle = async (enemyPoke, options = {}) => {
    const { 
      isGym = false, gymId = null, locationId = 'plains', 
      isTrainer = false, enemyTeam = null, trainerName = 'Entrenador',
      battleOptions = {} 
    } = options

    const playerPoke = gs.state.team.find(p => p.hp > 0 && !p.onMission && !p.onDefense)
    if (!playerPoke) return

    playerPoke.confused = 0; playerPoke.flinched = false
    enemyPoke.confused = 0; enemyPoke.flinched = false

    isBattleActive.value = true; isFinishing.value = false; clearLogs()

    activeBattle.value = {
      enemy: enemyPoke, player: playerPoke, isGym, gymId, isTrainer, enemyTeam,
      trainerName, locationId, turn: 'player', turnCount: 1, over: false,
      weather: gs.state.weather || { type: 'clear', turns: 0 },
      playerTeamIndex: gs.state.team.indexOf(playerPoke),
      participants: [playerPoke.uid], learnQueue: [], ...battleOptions
    }

    if (isTrainer || isGym) await gs.saveGame()
    gs.registerSeen(enemyPoke.id)
    if (isTrainer && enemyTeam) enemyTeam.forEach(p => gs.registerSeen(p.id))

    phaserBridge.sendCommand('BattleScene', 'START_BATTLE', { player: playerPoke, enemy: enemyPoke, locationId })
    enemyPoke.isShiny ? audio.shiny() : (isTrainer || isGym) ? audio.rival() : null

    const startMsg = isTrainer ? `¡${trainerName} te desafía!` : isGym ? `¡Combate de Gimnasio contra ${enemyPoke.name}!` : `¡Un ${enemyPoke.name} salvaje apareció!`
    addLog(startMsg, 'log-info')
    handleEntryAbilities(playerPoke, enemyPoke, playerStages.value, enemyStages.value, addLog)
  }

  const addLog = (msg, type = 'log-info') => {
    logQueue.value.push({ id: Date.now() + Math.random(), msg, type })
    if (!isProcessingLogs.value) processNextLog()
  }

  const processNextLog = async () => {
    if (logQueue.value.length === 0) { isProcessingLogs.value = false; return }
    isProcessingLogs.value = true
    const nextItem = logQueue.value.shift()
    battleLogs.value.unshift(nextItem)
    if (battleLogs.value.length > 30) battleLogs.value.pop()
    setTimeout(processNextLog, nextItem.type === 'log-info' ? 800 : 1200)
  }

  const clearLogs = () => {
    battleLogs.value = []; logQueue.value = []; isProcessingLogs.value = false; participants.value.clear()
    playerStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }
    enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }
  }

  const executeMove = async (moveIndex) => {
    if (isProcessing.value || !isBattleActive.value) return
    isProcessing.value = true
    await executeTurn(thisStore, moveIndex)
    if (isBattleActive.value && !activeBattle.value.over) await applyEndTurnEffects()
    isProcessing.value = false
  }

  const applyEndTurnEffects = async () => {
    const p = activeBattle.value.player
    const e = activeBattle.value.enemy
    tickStatus(p, addLog, 'player')
    tickStatus(e, addLog, 'enemy')
    tickLeechSeed(p, e, addLog)
    tickLeechSeed(e, p, addLog)
    applyEndTurnWeather(p, e, activeBattle.value.weather, addLog)
  }

  const useItemInBattle = async (itemName) => {
    if (isProcessing.value || !isBattleActive.value) return
    isProcessing.value = true
    const res = await handleItemUsage(itemName, activeBattle.value.player, activeBattle.value.enemy, { gs, eventStore, addLog, audio, consumeItem })
    if (res.action === 'capture') {
      activeBattle.value.isCapture = true
      gs.addPokemon(res.pokemon, { notify: true })
      await endBattle(true, false)
    } else if (res.action !== 'fail') {
      await new Promise(r => setTimeout(r, 800))
      await runEnemyAction(thisStore)
    }
    isProcessing.value = false
  }

  const endBattle = async (win, fled = false) => {
    isFinishing.value = true
    if (win && !fled) calculateRewards()
    const teamIdx = gs.state.team.findIndex(p => p.uid === activeBattle.value.player.uid)
    if (teamIdx !== -1) {
      gs.state.team[teamIdx].hp = activeBattle.value.player.hp
      gs.state.team[teamIdx].exp = activeBattle.value.player.exp
    }
    if (win && !fled) {
      const locId = activeBattle.value.locationId
      const isTr = activeBattle.value.isTrainer || activeBattle.value.isGym
      if (activeBattle.value.enemy.isGuardian) await warStore.addPoints(locId, 'guardian', true)
      else await warStore.addPoints(locId, isTr ? 'trainer_win' : 'wild_win', true)
      if (activeBattle.value.isCapture) await eventStore.submitCompetitionEntry(activeBattle.value.enemy, 'hourly_competition')
      if (activeBattle.value.isGym && activeBattle.value.gymId) {
        const gid = activeBattle.value.gymId
        if (!gs.state.defeatedGyms.includes(gid)) {
          gs.state.defeatedGyms.push(gid); gs.state.badges++
          if (activeBattle.value.rewardTM) { gs.state.inventory[activeBattle.value.rewardTM] = (gs.state.inventory[activeBattle.value.rewardTM] || 0) + 1; addLog(`¡Recibiste la ${activeBattle.value.rewardTM}!`, 'log-info') }
          useUIStore().notify(`¡Ganaste la medalla del Gimnasio ${gid}!`, '🏆')
          await gs.save(false)
        }
      }
    }
  }

  const calculateRewards = () => {
    const e = activeBattle.value.enemy
    const baseExp = calculateBaseExp(e)
    const warMods = getBattleRewardModifiers(activeBattle.value.locationId, gs.state.faction, warStore.mapDominance)
    const totalExpMult = warMods.expMult + ((eventStore.globalMultipliers?.exp || 1) - 1)

    gs.state.team.forEach(p => {
      const reward = processExpGain(p, baseExp, participants.value, {
        isActive: p.uid === activeBattle.value.player.uid,
        classMult: classStore.getModifier('expMult', { isTrainer: activeBattle.value.isTrainer }),
        totalExpMult, participantsSet: participants.value
      })
      if (reward) {
        addLog(`${p.name} ganó ${reward.gained} EXP.`, 'log-player')
        if (reward.levelUp) { audio.levelUp(); addLog(`¡${p.name} subió al nivel ${p.level}!`, 'log-info') }
      }
    })

    const moneyGained = calculateMoneyGain(e, { bcMult: classStore.getModifier('bcMult', { isGym: activeBattle.value.isGym }), totalMoneyMult: warMods.moneyMult + ((eventStore.globalMultipliers?.money || 1) - 1) })
    gs.state.money += moneyGained
    if (moneyGained > 0) audio.money()
    addLog(`¡Ganaste ₽${moneyGained}!`, 'log-info')
  }

  const _executeSwitch = async (teamIndex, isForced = false) => {
    if (isProcessing.value && !isForced) return
    isProcessing.value = true
    const newPoke = gs.state.team[teamIndex]
    if (!newPoke || newPoke.hp <= 0) { isProcessing.value = false; return }
    const oldPoke = activeBattle.value.player
    addLog(`¡Bien hecho, ${oldPoke.name}! ¡Regresa!`, 'log-info')
    phaserBridge.sendCommand('BattleScene', 'PLAY_WITHDRAW', { side: 'player' })
    await new Promise(r => setTimeout(r, 600))
    oldPoke.confused = 0; oldPoke.flinched = false
    activeBattle.value.player = newPoke; activeBattle.value.playerTeamIndex = teamIndex
    activeBattle.value.participants.push(newPoke.uid)
    playerStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }
    addLog(`¡Adelante, ${newPoke.name}!`, 'log-player')
    phaserBridge.sendCommand('BattleScene', 'PLAY_SEND_OUT', { side: 'player', pokemon: newPoke })
    await new Promise(r => setTimeout(r, 600))
    handleEntryAbilities(newPoke, activeBattle.value.enemy, playerStages.value, enemyStages.value, addLog)
    if (!isForced) await runEnemyAction(thisStore)
    isProcessing.value = false
  }

  const consumeItem = (itemName) => {
    if (gs.state.inventory[itemName]) {
      gs.state.inventory[itemName]--
      if (gs.state.inventory[itemName] <= 0) delete gs.state.inventory[itemName]
    }
  }

  const thisStore = { 
    activeBattle, playerStages, enemyStages, participants, addLog, endBattle 
  }

  return {
    state: activeBattle, activeBattle, battleLogs, isBattleActive, isFinishing, isProcessing, player, enemy,
    playerStages, enemyStages, participants,
    syncFromLegacy, addLog, clearLogs, executeMove, flee: async () => { if (isProcessing.value) return; audio.flee(); addLog('¡Huiste!', 'log-info'); await endBattle(false, true) },
    setFinishing: (cb) => { isFinishing.value = true; battleEndCallback.value = cb },
    completeBattleFlow: () => { if (battleEndCallback.value) { battleEndCallback.value(); battleEndCallback.value = null }; isFinishing.value = false; isBattleActive.value = false; activeBattle.value = null; clearLogs() },
    useItemInBattle, endBattle
  }
})
