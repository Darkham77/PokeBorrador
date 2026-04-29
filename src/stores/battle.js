// [PureVue-Ignore-Length]
import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { useGameStore } from './game'
import { handleEntryAbilities, applyEndTurnWeather } from '../logic/battle/battleFlow'
import { calculateBaseExp, processExpGain, calculateMoneyGain } from '../logic/battle/battleRewards'
import { handleItemUsage } from '../logic/battle/battleItems'
import { gameBus } from '@/logic/gameBus'
import { useWarStore } from './war'
import { useEventStore } from './events'
import { usePlayerClassStore } from './playerClass'
import { useUIStore } from './ui'
import { useAudioStore } from './audio'
import { getBattleRewardModifiers } from '@/logic/war/bonusEngine'
import { tickStatus, tickLeechSeed } from '../logic/battle/battleStatus'
import { executeTurn, runEnemyAction } from '../logic/battle/battleTurn'
import { SHOP_ITEMS } from '@/data/items'

export const useBattleStore = defineStore('battle', () => {
  const gs = useGameStore()
  const warStore = useWarStore()
  const eventStore = useEventStore()
  const classStore = usePlayerClassStore()
  const audio = useAudioStore()
  
  const activeBattle = ref(null)
  const isBattleActive = ref(false)
  const isFinishing = ref(false)
  const isProcessing = ref(false)
  const isIntroAnimating = ref(false)
  const isSearching = ref(false)
  const battleLogs = ref([])
  const logQueue = ref([])
  const isProcessingLogs = ref(false)
  const battleEndCallback = ref(null)
  const attackerSide = ref(null) // 'player' or 'enemy'
  const activeMove = ref(null)

  const playerStages = ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 })
  const enemyStages = ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 })
  const upcomingPokemon = ref(null)
  const debugLoopPokemon = ref(null) // Plantilla para bucle infinito debug

  const player = computed(() => activeBattle.value?.player)
  const enemy = computed(() => activeBattle.value?.enemy)

  const syncFromLegacy = (battleData) => {
    if (!battleData) {
      activeBattle.value = null
      isBattleActive.value = false
      return
    }
    activeBattle.value = battleData
    if (battleData.playerStages) playerStages.value = battleData.playerStages
    if (battleData.enemyStages) enemyStages.value = battleData.enemyStages
    if (battleData.battleLogs) battleLogs.value = battleData.battleLogs
    
    isBattleActive.value = !battleData.over
    isFinishing.value = false
  }

  const persistBattle = () => {
    if (!activeBattle.value || activeBattle.value.over) {
      gs.state.activeBattle = null
      return
    }
    gs.state.activeBattle = {
      ...activeBattle.value,
      playerStages: playerStages.value,
      enemyStages: enemyStages.value,
      battleLogs: battleLogs.value.slice(-10)
    }
    // No notificamos el guardado para evitar spam visual
    gs.save(false)
  }

  const _startBattle = async (enemyPoke, options = {}) => {
    const { 
      isGym = false, gymId = null, locationId = 'plains', 
      isTrainer = false, enemyTeam = null, trainerName = 'Entrenador',
      battleOptions = {} 
    } = options

    const playerPoke = gs.state.team.find(p => p.hp > 0 && !p.onMission && !p.onDefense)
    if (!playerPoke) {
      useUIStore().notify('No tienes Pokémon sanos para combatir', '❌')
      return
    }

    // Si hay un combate activo pero NO está en fase de finalización, forzamos huida.
    // Si ya está en isFinishing (viendo recompensas), podemos simplemente pisarlo.
    if (isBattleActive.value && !isFinishing.value && !activeBattle.value?.over && !isSearching.value) {
      console.warn('[BATTLE] Combate en curso detectado. Forzando huida del anterior.')
      await endBattle(false, true)
    }

    // Efecto de búsqueda: si estamos buscando, mostramos el pokemon tras los arbustos un momento
    if (isSearching.value) {
      upcomingPokemon.value = enemyPoke
      await new Promise(r => setTimeout(r, 1500)) // Pausa dramática para ver el pokemon en el pasto
    }

    isSearching.value = false
    clearLogs()

    playerPoke.confused = 0; playerPoke.flinched = false
    enemyPoke.confused = 0; enemyPoke.flinched = false

    const { useMapStore } = await import('./map')
    const { sanitizePokemon } = await import('@/logic/pokemonFactory')
    const mapStore = useMapStore()

    // Saneamiento de emergencia antes de empezar
    sanitizePokemon(playerPoke)
    sanitizePokemon(enemyPoke)
    
    // IMPORTANTE: Seteamos el combate ANTES de quitar isFinishing 
    // para que la sombra y otros elementos no parpadeen
    activeBattle.value = {
      enemy: enemyPoke, player: playerPoke, isGym, gymId, isTrainer, enemyTeam,
      trainerName, locationId, turn: 'player', turnCount: 1, over: false,
      weather: { type: mapStore.currentWeather || 'clear', turns: -1 },
      playerTeamIndex: gs.state.team.indexOf(playerPoke),
      participants: [playerPoke.uid], learnQueue: [], ...battleOptions
    }

    // Si es un encuentro de debug, lo guardamos para el bucle infinito
    if (battleOptions.isDebug) {
      debugLoopPokemon.value = JSON.parse(JSON.stringify(enemyPoke))
    } else {
      // Si iniciamos un combate normal, rompemos el bucle de debug previo si existía
      // a menos que sea una navegación normal donde el próximo ya estaba pre-seteadp
      if (!isSearching.value) debugLoopPokemon.value = null
    }

    persistBattle()
    if (isTrainer || isGym) await gs.save()
    gs.registerPokedex(enemyPoke.id, false)
    if (isTrainer && enemyTeam) enemyTeam.forEach(p => gs.registerPokedex(p.id, false))

    gameBus.emit('START_BATTLE', { player: playerPoke, enemy: enemyPoke, locationId, isTrainer, isGym })
    enemyPoke.isShiny ? audio.shiny() : (isTrainer || isGym) ? audio.rival() : null

    const startMsg = isTrainer ? `¡${trainerName} te desafía!` : isGym ? `¡Combate de Gimnasio contra ${enemyPoke.name}!` : `¡Un ${enemyPoke.name} salvaje apareció!`
    addLog(startMsg, 'log-info', enemyPoke)
    handleEntryAbilities(playerPoke, enemyPoke, playerStages.value, enemyStages.value, addLog)
    
    // IMPORTANTE: Seteamos estos flags al FINAL para evitar parpadeos visuales
    isFinishing.value = false
    isBattleActive.value = true
    
    // Limpieza final de previsualización
    setTimeout(() => { upcomingPokemon.value = null }, 100)
  }

  const addLog = (msg, type = 'log-info', source = null) => {
    let icon = null
    let iconType = null
    
    if (source) {
      if (source === 'player') {
        // Resolver avatar del entrenador (usando playerClass como fallback)
        const spriteId = gs.state.playerClass || gs.state.avatar_style || 'entrenador'
        icon = getAssetUrl(ASSET_TYPES.TRAINER, spriteId)
        iconType = 'trainer'
      } else if (typeof source === 'object' && source.id) {
        // Es un pokemon
        icon = getAssetUrl(ASSET_TYPES.POKEMON, source.id, { isShiny: source.isShiny })
        iconType = 'pokemon'
      } else if (typeof source === 'string') {
        // Resolver sprite del item por nombre o ID
        const item = SHOP_ITEMS.find(i => i.name === source || i.id === source)
        const spriteId = item ? item.sprite : source
        icon = getAssetUrl(ASSET_TYPES.ITEM, spriteId)
        iconType = 'item'
      }
    }

    logQueue.value.push({ 
      id: Date.now() + Math.random(), 
      msg, 
      type,
      icon,
      iconType
    })
    if (!isProcessingLogs.value) processNextLog()
  }

  const processNextLog = async () => {
    if (logQueue.value.length === 0) { isProcessingLogs.value = false; return }
    isProcessingLogs.value = true
    const nextItem = logQueue.value.shift()
    battleLogs.value.push(nextItem)
    if (battleLogs.value.length > 30) battleLogs.value.shift()
    setTimeout(processNextLog, nextItem.type === 'log-info' ? 800 : 1200)
  }

  const clearLogs = () => {
    battleLogs.value = []; logQueue.value = []; isProcessingLogs.value = false;
    playerStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }
    enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }
  }

  const executeMove = async (moveIndex) => {
    if (isProcessing.value || !isBattleActive.value) return
    isProcessing.value = true
    const thisStore = reactive({ 
      activeBattle, playerStages, enemyStages, addLog, endBattle, gs, completeBattleFlow,
      attackerSide, activeMove, persistBattle
    })
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
      addLog(`Usaste ${itemName}`, 'log-info', 'player')
      persistBattle()
      await new Promise(r => setTimeout(r, 800))
      const thisStore = reactive({ 
        activeBattle, playerStages, enemyStages, addLog, endBattle, gs, completeBattleFlow,
        attackerSide, activeMove, persistBattle
      })
      await runEnemyAction(thisStore)
    }
    isProcessing.value = false
  }

  const endBattle = async (win, fled = false) => {
    if (!activeBattle.value) {
      isBattleActive.value = false
      isFinishing.value = false
      return
    }

    activeBattle.value.over = true
    gs.state.activeBattle = null
    
    if (win && !fled) calculateRewards()
    
    // Sincronizar HP antes de guardar
    syncTeamHP();

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
          if (activeBattle.value.rewardTM) { 
            gs.state.inventory[activeBattle.value.rewardTM] = (gs.state.inventory[activeBattle.value.rewardTM] || 0) + 1
            addLog(`¡Recibiste la ${activeBattle.value.rewardTM}!`, 'log-info', activeBattle.value.rewardTM) 
          }
          useUIStore().notify(`¡Ganaste la medalla del Gimnasio ${gid}!`, '🏆')
          await gs.save(false)
        }
      }
    }
    
    if (fled) {
      await completeBattleFlow('map')
    } else {
      // 1. Activar estado de finalización para mostrar recompensas/opciones
      isFinishing.value = true
      
      // 2. Pre-generar el próximo encuentro
      const isWild = !activeBattle.value.isTrainer && !activeBattle.value.isGym
      if (isWild && activeBattle.value.enemy.hp <= 0) {
        // PRIORIDAD: Modo Debug (Bucle Infinito)
        if (debugLoopPokemon.value) {
          try {
            const nextPoke = JSON.parse(JSON.stringify(debugLoopPokemon.value))
            nextPoke.hp = nextPoke.maxHp
            nextPoke.status = null
            nextPoke.confused = 0
            nextPoke.flinched = false
            upcomingPokemon.value = nextPoke
            // Forzar reactividad para que aparezca en los arbustos
            upcomingPokemon.value = { ...upcomingPokemon.value }
            console.log('[DEBUG] Bucle infinito preparado:', nextPoke.name)
          } catch (e) {
            console.error('[DEBUG] Error clonando pokemon de bucle:', e)
          }
        } else {
          // MODO NORMAL: Generar encuentro aleatorio
          const { generateEncounter } = await import('@/logic/encounters')
          const { useMapStore } = await import('./map')
          const { useEventStore } = await import('./events')
          
          const encounter = await generateEncounter(activeBattle.value.locationId, gs.state, {
            activeEvents: useMapStore().activeEvents,
            dominanceData: useMapStore().mapWinners,
            shinyMultiplier: useEventStore().globalMultipliers?.shiny || 1
          })
          
          if (encounter && encounter.type === 'wild') {
            upcomingPokemon.value = encounter.pokemon
          }
        }
      }

      // REORDENAMIENTO DE EQUIPO: Si el pokemon activo ya no es el líder saludable, lo cambiamos en paralelo
      // Esto evita que el DOM sufra un salto brusco al iniciar el siguiente combate, protegiendo las animaciones del enemigo.
      const firstHealthy = gs.state.team.find(p => p.hp > 0)
      const currentActive = activeBattle.value?.player
      
      if (firstHealthy && currentActive && firstHealthy.uid !== currentActive.uid) {
        // Ejecutar en paralelo sin hacer await para no bloquear la pantalla de victoria (Fase 2 salvaje)
        (async () => {
          if (currentActive.hp > 0) {
            gameBus.emit('PLAY_WITHDRAW', { side: 'player' })
            await new Promise(r => setTimeout(r, 800)) // Animación de volver a la pokebola (Simulada)
          } else {
            await new Promise(r => setTimeout(r, 500)) // Margen para que termine la animación de muerte
          }
          
          if (!isBattleActive.value || !activeBattle.value) return // Abortar si salió rápido
          
          // Cambiamos el pokemon activo silenciosamente
          activeBattle.value.player = firstHealthy
          activeBattle.value.playerTeamIndex = gs.state.team.findIndex(p => p.uid === firstHealthy.uid)
          
          // Lo sacamos a combatir (Silencioso en Vue)
          gameBus.emit('PLAY_SEND_OUT', { side: 'player', pokemon: firstHealthy })
        })()
      }
    }

    // Persistir estado inmediatamente después del combate
    await gs.save(false)
  }

  const calculateRewards = () => {
    const e = activeBattle.value.enemy
    const baseExp = calculateBaseExp(e)
    const warMods = getBattleRewardModifiers(activeBattle.value.locationId, gs.state.faction, warStore.mapDominance)
    const totalExpMult = warMods.expMult + ((eventStore.globalMultipliers?.exp || 1) - 1)
    const classMult = classStore.getModifier('expMult', { isTrainer: activeBattle.value.isTrainer })

    gs.state.team.forEach(p => {
      const participantsSet = new Set(activeBattle.value.participants)
      const reward = processExpGain(p, baseExp, participantsSet, {
        isActive: p.uid === activeBattle.value.player.uid,
        classMult,
        totalExpMult,
        participantsSet
      })
      if (reward) {
        addLog(`${p.name} ganó ${reward.gained} EXP.`, 'log-player', p)
        if (reward.levelUp) { audio.levelUp(); addLog(`¡${p.name} subió al nivel ${p.level}!`, 'log-info', p) }
      }
    })

    const moneyGained = calculateMoneyGain(e, { bcMult: classStore.getModifier('bcMult', { isGym: activeBattle.value.isGym }), totalMoneyMult: warMods.moneyMult + ((eventStore.globalMultipliers?.money || 1) - 1) })
    gs.state.money += moneyGained
    if (moneyGained > 0) audio.money()
    addLog(`¡Ganaste ₽${moneyGained}!`, 'log-info')
  }

  /**
   * Forzar sincronización de HP de TODO el equipo al GameStore.
   * Útil para asegurar persistencia atómica tras combates o cambios.
   */
  const syncTeamHP = () => {
    if (!activeBattle.value) return;
    
    // Sincronizar el activo actual
    if (activeBattle.value.player) {
      const currentIdx = activeBattle.value.playerTeamIndex ?? gs.state.team.findIndex(p => p.uid === activeBattle.value.player.uid);
      if (currentIdx !== -1) {
        gs.state.team[currentIdx].hp = activeBattle.value.player.hp;
        gs.state.team[currentIdx].status = activeBattle.value.player.status;
      }
    }

    // Nota: Otros miembros del equipo que hayan recibido daño (p.ej. púas, persecución)
    // ya deberían estar sincronizados si se mantienen las referencias de objetos,
    // pero este método asegura al menos el estado del Pokémon que cerró la batalla.
  }

  const _executeSwitch = async (teamIndex, isForced = false) => {
    if (isProcessing.value && !isForced) return
    isProcessing.value = true
    const newPoke = gs.state.team[teamIndex]
    if (!newPoke || newPoke.hp <= 0) { isProcessing.value = false; return }
    const oldPoke = activeBattle.value.player
    addLog(`¡Bien hecho, ${oldPoke.name}! ¡Regresa!`, 'log-info', oldPoke)
    await new Promise(r => setTimeout(r, 800))
    oldPoke.confused = 0; oldPoke.flinched = false
    activeBattle.value.player = newPoke; activeBattle.value.playerTeamIndex = teamIndex
    if (!activeBattle.value.participants.includes(newPoke.uid)) {
      activeBattle.value.participants.push(newPoke.uid)
    }
    playerStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }
    addLog(`¡Adelante, ${newPoke.name}!`, 'log-player', newPoke)
    await new Promise(r => setTimeout(r, 800))
    handleEntryAbilities(newPoke, activeBattle.value.enemy, playerStages.value, enemyStages.value, addLog)
    persistBattle()
    const thisStore = reactive({ 
      activeBattle, playerStages, enemyStages, addLog, endBattle, gs, completeBattleFlow,
      attackerSide, activeMove, persistBattle
    })
    if (!isForced) await runEnemyAction(thisStore)
    isProcessing.value = false
  }

  const consumeItem = (itemName) => {
    if (gs.state.inventory[itemName]) {
      gs.state.inventory[itemName]--
      if (gs.state.inventory[itemName] <= 0) delete gs.state.inventory[itemName]
    }
  }

  const completeBattleFlow = async (option = 'continue') => { 
    const uiStore = useUIStore()
    const locId = activeBattle.value?.locationId
    
    if (battleEndCallback.value) { battleEndCallback.value(); battleEndCallback.value = null }; 
    
    if (option === 'search' && locId) {
      // Flujo optimizado: Si ya tenemos el upcomingPokemon, entramos en combate directo
      if (upcomingPokemon.value) {
        const nextPoke = upcomingPokemon.value
        // IMPORTANTE: Si venimos de un bucle de debug, mantener la bandera para que no se limpie
        await _startBattle(nextPoke, { 
          locationId: locId,
          battleOptions: { isDebug: !!debugLoopPokemon.value } 
        })
        upcomingPokemon.value = null 
        return
      }

      // Fallback si no había pre-generado (ej: recarga de página)
      isSearching.value = true
      isFinishing.value = false
      isProcessing.value = false
      
      const { useMapStore } = await import('./map')
      await useMapStore().navigate(locId)
      return
    }

    isFinishing.value = false; isBattleActive.value = false; activeBattle.value = null; isSearching.value = false; clearLogs() 

    if (option === 'map') {
      uiStore.activeTab = 'map'
    }

    if (option === 'search' && locId) {
      const { useMapStore } = await import('./map')
      useMapStore().navigate(locId)
    }
  }


  if (typeof window !== 'undefined') {
    window.__VITE_DEBUG__ = window.__VITE_DEBUG__ || {}
    window.__VITE_DEBUG__.forceFlee = async () => {
      console.warn('[DEBUG] Forzando huida del combate...')
      await endBattle(false, true)
    }
  }

  return {
    state: activeBattle, battleLogs, isBattleActive, isFinishing, isProcessing, player, enemy,
    playerStages, enemyStages, attackerSide, activeMove, upcomingPokemon, debugLoopPokemon,
    syncFromLegacy, addLog, clearLogs, executeMove, persistBattle,
    flee: async () => { 
      if (isProcessing.value) return; 
      useUIStore().openConfirm({
        title: 'HUIR DEL COMBATE',
        message: '¿Estás seguro que deseas huir de este encuentro?',
        confirmText: 'SÍ, HUIR',
        cancelText: 'VOLVER',
        type: 'primary',
        variant: 'retro',
        onConfirm: async () => {
          audio.flee(); 
          addLog('¡Huiste!', 'log-info'); 
          await endBattle(false, true);
        }
      });
    },
    completeBattleFlow,
    setFinishing: (cb) => { isFinishing.value = true; battleEndCallback.value = cb },
    useItemInBattle, endBattle, _startBattle, executeSwitch: _executeSwitch,
    isSearching, isIntroAnimating
  }
})
