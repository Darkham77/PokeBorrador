import { defineStore } from 'pinia'
import { computed, watch } from 'vue'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import { gameBus } from '@/logic/events/gameBus.ts'
import { 
  PLAYER_CLASSES, CLASS_MISSIONS_BY_ID, requirePlayerClassId, isMissionId,
  type PlayerClassId, type MissionId, type PlayerClassDefinition
} from '@/data/player/playerClasses'
import { supabase } from '@/logic/db/supabase'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { getClassModifier } from '@/logic/player/classEngine'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { getXPNeededForClassLevel, MAX_PLAYER_CLASS_LEVEL, CLASS_CHANGE_COST_BATTLE_COINS, MAX_CRIMINALITY_LEVEL } from '@/logic/player/classMath'
import { requireFactionId, type FactionId } from '@/types/system/game'
import { ONE_HOUR_MS } from '@/logic/constants/items.ts'
import { FACTION_CHANGE_COST } from '@/logic/war/warEngine.ts'
import {
  getDeploymentCost,
  resolveDeploymentRewards,
  calculateCazabichosStreak,
  getInitialProjectedRewards
} from '@/logic/player/classDeploymentEngine'

import { AVATAR_STYLES_BY_ID, isAvatarStyleId } from '@/data/player/cosmeticsData'
import type { ActiveMission, PlayerClassState } from '@/types/system/game.ts'
import {
  resolveNewClassAvatarStyle,
  releasePokemonFromMissions,
  deductDeploymentCost,
  applyPokemonGrowthOutcome
} from './playerClassHelper.ts'

const CAZABICHOS_CAPTURE_CLASS_XP = 10;



export const usePlayerClassStore = defineStore('playerClass', () => {
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  
  const db = supabase

  // --- Getters ---
  const playerClass = computed(() => gameStore.state.playerClass)
  const classLevel = computed(() => gameStore.state.classLevel || 1)
  const classXP = computed(() => gameStore.state.classXP || 0)
  const classXPNeeded = computed(() => getXPNeededForClassLevel(classLevel.value))
  const classData = computed<PlayerClassState>(() => gameStore.state.classData)
  
  const currentClassDef = computed<PlayerClassDefinition | null>(() => {
    if (!playerClass.value) return null
    return (PLAYER_CLASSES[playerClass.value as keyof typeof PLAYER_CLASSES] as PlayerClassDefinition) || null // domain-ok: Open dynamic text or non-domain string payload
  })

  const activeMission = computed<ActiveMission | null>(() => classData.value.activeMission || null)
  const isMissionDone = computed(() => {
    if (!activeMission.value) return false
    return Temporal.Now.instant().epochMilliseconds >= activeMission.value.endsAt
  })

  /**
   * Obtiene modificadores de clase para batalla o economía.
   * Centraliza la lógica de getClassModifier() de legacy.
   */
  function getModifier(type: string, context: Record<string, unknown> = {}) {
    return getClassModifier(playerClass.value || '', type, {
      ...context,
      isPvP: (gameStore.state as { activeBattle?: { isPvP?: boolean } }).activeBattle?.isPvP
    })
  }

  /**
   * Sincroniza las variables CSS globales con el tema de la clase activa.
   */
  function syncTheme() {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const cls = currentClassDef.value
    
    if (!cls) {
      root.style.setProperty('--class-primary', '#3b82f6')
      root.style.setProperty('--class-dark', '#1e40af')
      return
    }

    root.style.setProperty('--class-primary', cls.color)
    root.style.setProperty('--class-dark', cls.colorDark)
  }

  watch(playerClass, () => syncTheme())

  // --- Actions ---

  /**
   * Selecciona o cambia la clase del jugador.
   */
  async function selectClass(classId: PlayerClassId) {
    const resolvedClassId = requirePlayerClassId(classId)
    const cls = PLAYER_CLASSES[resolvedClassId as keyof typeof PLAYER_CLASSES] as PlayerClassDefinition | undefined // domain-ok: Open dynamic text or non-domain string payload
    if (!cls) return { success: false, msg: 'Clase no válida' }

    const isChange = !!playerClass.value
    if (isChange) {
      if ((gameStore.state.battleCoins || 0) < CLASS_CHANGE_COST_BATTLE_COINS) {
        uiStore.notify(`Necesitas ${CLASS_CHANGE_COST_BATTLE_COINS.toLocaleString()} Battle Coins para cambiar.`, '❌')
        return { success: false, msg: `Necesitas ${CLASS_CHANGE_COST_BATTLE_COINS.toLocaleString()} Battle Coins para cambiar.` }
      }
      gameStore.state.battleCoins -= CLASS_CHANGE_COST_BATTLE_COINS
    }

    // Reset de datos específicos y liberación de Pokémon en misión
    releasePokemonFromMissions(gameStore.state.team || [], gameStore.state.box || [])

    // Lógica de transición de cosméticos de clase
    const currentAvatar = gameStore.state.avatar_style || ''
    const newStyle = resolveNewClassAvatarStyle(currentAvatar, resolvedClassId)
    if (newStyle !== null) {
      gameStore.state.avatar_style = newStyle
    } else if (currentAvatar && isAvatarStyleId(currentAvatar) && AVATAR_STYLES_BY_ID[currentAvatar]?.requiredClass) {
      gameStore.state.avatar_style = null // Volver al por defecto
    }

    gameStore.state.playerClass = resolvedClassId
    gameStore.state.classLevel = 1
    gameStore.state.classXP = 0
    gameStore.state.classData = {
      captureStreak: 0,
      longestStreak: 0,
      reputation: 0,
      blackMarketSales: 0,
      criminality: 0,
      blackMarketDaily: { date: '', items: [], purchased: [] },
      extortedRouteId: null,
      officialRouteId: null,
      kitCaptures: 0
    }

    uiStore.notify(`¡Elegiste ser ${cls.name}!`, cls.icon)
    await gameStore.save(false)
    return { success: true }
  }

  /**
   * Establece la facción del jugador (Unión o Poder).
   */
  async function setFaction(factionId: FactionId) {
    const resolvedFactionId = requireFactionId(factionId)
    
    const currentFaction = gameStore.state.faction
    if (currentFaction === resolvedFactionId) {
      uiStore.notify('Ya perteneces a este bando.', '⚠️')
      return { success: false }
    }

    // Costo de cambio (si ya tenía uno)
    if (currentFaction) {
      if ((gameStore.state.money || 0) < FACTION_CHANGE_COST) {
        uiStore.notify(`Necesitas 🪙 ${FACTION_CHANGE_COST.toLocaleString()} para cambiar de bando.`, '❌')
        return { success: false }
      }
      gameStore.state.money -= FACTION_CHANGE_COST
      uiStore.notify(`Cambiaste de bando por 🪙 ${FACTION_CHANGE_COST.toLocaleString()}`, '💸')
    }

    gameStore.state.faction = resolvedFactionId
    uiStore.notify(`¡Te uniste al Equipo ${resolvedFactionId.toUpperCase()}!`, '🚩') // text-ok: UI text display localization string
    await gameStore.save(false)
    return { success: true }
  }

  /**
   * Incrementa XP de clase y maneja las subidas de nivel.
   */
  function addXP(amount: number) {
    if (!playerClass.value || amount <= 0) return
    
    gameStore.state.classXP = (gameStore.state.classXP || 0) + amount
    
    let xpNeeded = getXPNeededForClassLevel(gameStore.state.classLevel)
    while (gameStore.state.classXP >= xpNeeded && gameStore.state.classLevel < MAX_PLAYER_CLASS_LEVEL) {
      gameStore.state.classXP -= xpNeeded
      gameStore.state.classLevel = (gameStore.state.classLevel || 1) + 1
      uiStore.notify(`¡Tu clase ${currentClassDef.value?.name || ''} subió al Nivel ${gameStore.state.classLevel}!`, '🎓')
      xpNeeded = getXPNeededForClassLevel(gameStore.state.classLevel)
    }
  }

  /**
   * Maneja el nivel de criminalidad del Rocket.
   */
  function addCriminality(amount: number) {
    if (playerClass.value !== 'rocket' || amount <= 0) return
    const currentData = gameStore.state.classData
    const prev = currentData.criminality || 0
    currentData.criminality = prev + amount
    
    if (prev < MAX_CRIMINALITY_LEVEL && currentData.criminality >= MAX_CRIMINALITY_LEVEL) {
      uiStore.notify("¡Nivel de criminalidad máximo! La policía te busca.", "🚔")
    }
  }

  function findMissionTargetPokemon(
    targetExtraData: Record<string, unknown>
  ): Pokemon | null {
    const targetUid = targetExtraData.targetPokemonUid as string | undefined
    const targetIdx = targetExtraData.targetPokemonIdx as number | undefined

    if (targetUid) {
      return gameStore.getPokemonByUid(targetUid)
    }
    if (targetIdx !== undefined) {
      const p = gameStore.state.box[targetIdx] || null
      if (p) {
        targetExtraData.targetPokemonUid = p.uid
      }
      return p
    }
    return null
  }

  function assignPokemonToMission(
    p: Pokemon,
    targetExtraData: Record<string, unknown>
  ): boolean {
    if (p.hp <= 0) {
      uiStore.notify('No puedes enviar un Pokémon debilitado a una misión.', '⚠️')
      return false
    }
    const teamIdx = gameStore.state.team.findIndex((tp: Pokemon | null) => tp && tp.uid === p.uid)
    if (teamIdx !== -1) {
      if (gameStore.state.team.length <= 1) {
        uiStore.notify('No puedes enviar a tu único Pokémon del equipo.', '⚠️')
        return false
      }
      const tp = gameStore.state.team.splice(teamIdx, 1)[0]
      if (tp) {
        gameStore.state.box.push(tp)
        gameStore.autoFillPvpTeam()
      }
    }
    targetExtraData.targetPokemonIdx = gameStore.state.box.findIndex((bp: Pokemon | null) => bp && bp.uid === p.uid)
    p.onMission = true
    return true
  }

  /**
   * Inicia una misión idle con validación de tiempo del servidor y descuento de costos.
   */
  async function startMission(missionId: MissionId, extraData: Record<string, unknown> = {}) {
    if (!isMissionId(missionId)) return
    const m = CLASS_MISSIONS_BY_ID[missionId]
    if (!m) return
    const cls = playerClass.value
    if (!cls) return

    // Validar costos de despliegue
    const cost = getDeploymentCost(cls, missionId)
    const costResult = deductDeploymentCost(gameStore.state, cost)
    if (!costResult.success) {
      uiStore.notify(costResult.errorMsg || 'Fondos insuficientes', '💸')
      return
    }

    // Marcar pokemon como ocupado
    const p = findMissionTargetPokemon(extraData)
    if (p && !assignPokemonToMission(p, extraData)) {
      return
    }

    const initialRewards = getInitialProjectedRewards(cls, missionId, p)
    Object.assign(extraData, initialRewards)

    const now = await db.getServerTime()
    const currentData = gameStore.state.classData

    currentData.activeMission = {
      id: missionId,
      startedAt: now as number,
      endsAt: (now as number) + (m.durationHs * ONE_HOUR_MS),
      ...extraData
    }
    
    uiStore.notify(`¡Misión iniciada! (${m.durationHs}h)`, '📋')
    await gameStore.save(false)
  }

  function applyMissionCurrenciesAndItems(
    gStore: ReturnType<typeof useGameStore>,
    iStore: ReturnType<typeof useInventoryStore>,
    rewards: ReturnType<typeof resolveDeploymentRewards>,
    onAddXP: (xp: number) => void,
    onAddCriminality: (c: number) => void
  ): string {
    let msg = ''
    if (rewards.money > 0) {
      gStore.state.money = (gStore.state.money || 0) + rewards.money
      msg += `+₽${rewards.money.toLocaleString()} `
    }
    if (rewards.battleCoins > 0) {
      gStore.state.battleCoins = (gStore.state.battleCoins || 0) + rewards.battleCoins
      msg += `+${rewards.battleCoins} BC `
    }
    for (const item of rewards.items) {
      iStore.addItem(item.id, item.qty)
    }
    if (rewards.classXP > 0) {
      onAddXP(rewards.classXP)
    }
    if (rewards.criminality > 0) {
      onAddCriminality(rewards.criminality)
    }
    return msg
  }

  function applyMissionPokemonOutcome(
    gStore: ReturnType<typeof useGameStore>,
    iStore: ReturnType<typeof useInventoryStore>,
    rewards: ReturnType<typeof resolveDeploymentRewards>,
    poke: Pokemon | null
  ): string {
    if (rewards.shouldSacrifice && poke) {
      if (poke.heldItem) {
        iStore.addItem(poke.heldItem, 1)
      }
      poke.onMission = false
      gStore.removePokemon(poke.uid)
      gStore.state.classData.blackMarketSales = (gStore.state.classData.blackMarketSales || 0) + 1
      return ''
    }

    if (rewards.generatedPokemon.length > 0) {
      for (const gp of rewards.generatedPokemon) {
        gStore.state.box.push(gp)
      }
      return `+${rewards.generatedPokemon.length} Pokémon Bicho `
    }

    if (poke) {
      poke.onMission = false
      return applyPokemonGrowthOutcome(gStore, rewards, poke)
    }

    return 'Tus Pokémon han regresado con éxito.'
  }

  /**
   * Finaliza y cobra una misión.
   */
  async function collectMission(options: { autoSave?: boolean; silent?: boolean } = {}) {
    const autoSave = options.autoSave ?? true
    const silent = options.silent ?? false

    const mission = activeMission.value
    if (!mission) return

    const now = await db.getServerTime()
    if ((now as number) < mission.endsAt) {
      if (!silent) uiStore.notify('La misión aún no ha terminado.', '⏳')
      return
    }

    const cls = playerClass.value
    if (!cls) return
    let msg = 'Misión completada. '

    // Buscar Pokémon por UID o índice
    let p: Pokemon | null = null
    const targetUid = mission.targetPokemonUid as string | undefined
    const targetIdx = mission.targetPokemonIdx as number | undefined

    if (targetUid) {
      p = gameStore.getPokemonByUid(targetUid)
    } else if (targetIdx !== undefined) {
      p = gameStore.state.box[targetIdx] || null
    }

    const badgeCount = Array.isArray(gameStore.state.badges) 
      ? gameStore.state.badges.length 
      : Number(gameStore.state.badges || 0)

    if (!isMissionId(mission.id)) return

    const res = resolveDeploymentRewards(cls, mission.id, p, {
      projectedReward: mission.projectedReward,
      badgeCount
    })

    const invStore = useInventoryStore()

    const currencyMsg = applyMissionCurrenciesAndItems(gameStore, invStore, res, addXP, addCriminality)
    const outcomeMsg = applyMissionPokemonOutcome(gameStore, invStore, res, p)
    msg += `${currencyMsg}${outcomeMsg}`

    const currentData = gameStore.state.classData
    currentData.activeMission = null
    if (!silent) {
      uiStore.notify(msg.trim(), '🎁')
    }
    if (autoSave) {
      await gameStore.save()
    }
  }

  function onCaptureSuccess() {
    if (playerClass.value !== 'cazabichos') return
    const currentData = gameStore.state.classData
    const res = calculateCazabichosStreak(
      currentData.captureStreak || 0,
      true,
      currentData.kitCaptures || 0,
      classLevel.value
    )
    currentData.captureStreak = res.streak
    if (res.streak > (currentData.longestStreak || 0)) {
      currentData.longestStreak = res.streak
    }
    currentData.kitCaptures = res.kitCaptures
    if (res.awardedPokeballs > 0) {
      const invStore = useInventoryStore()
      invStore.addItem('pokeball', res.awardedPokeballs)
      uiStore.notify('¡Kit de Campo! Recibiste 1 Poké Ball 🎒', '🎒')
    }
    addXP(CAZABICHOS_CAPTURE_CLASS_XP)
    uiStore.notify(`¡Racha de Capturas x${res.streak}!`, '⚡')
  }

  function onCaptureFail() {
    if (playerClass.value !== 'cazabichos') return
    const currentData = gameStore.state.classData
    if ((currentData.captureStreak || 0) > 0) {
      currentData.captureStreak = 0
      uiStore.notify('Racha de capturas perdida.', '💔')
    }
  }

  const handleTrainerExpGained = (e: Event) => {
    const detail = (e as CustomEvent<{ amount?: number }>).detail
    if (detail?.amount) {
      addXP(detail.amount)
    }
  }
  gameBus.on('TRAINER_EXP_GAINED', handleTrainerExpGained)
  gameBus.on('CAPTURE_SUCCESS', () => onCaptureSuccess())

  return {
    playerClass,
    classLevel,
    classXP,
    classXPNeeded,
    classData,
    currentClassDef,
    activeMission,
    isMissionDone,
    getModifier,
    selectClass,
    addXP,
    addCriminality,
    startMission,
    collectMission,
    // fallow-ignore-next-line unused-store-member
    onCaptureSuccess,
    // fallow-ignore-next-line unused-store-member
    onCaptureFail,
    setFaction
  }
})
