import { defineStore } from 'pinia'
import { computed, watch } from 'vue'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import { 
  PLAYER_CLASSES, CLASS_MISSIONS_BY_ID, requirePlayerClassId, isMissionId,
  type PlayerClassId, type MissionId, type PlayerClassDefinition
} from '@/data/player/playerClasses'
import { supabase } from '@/logic/db/supabase'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { getClassModifier } from '@/logic/player/classEngine'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { MAX_POKEMON_LEVEL } from '@/data/system/constants'
import { getXPNeededForClassLevel, MAX_PLAYER_CLASS_LEVEL, CLASS_CHANGE_COST_BATTLE_COINS, MAX_CRIMINALITY_LEVEL } from '@/logic/player/classMath'
import { requireFactionId, type FactionId } from '@/types/system/game'
import { ONE_HOUR_MS } from '@/logic/constants/items.ts'
import { FACTION_CHANGE_COST } from '@/logic/war/warEngine.ts'
import { MAX_SINGLE_STAT_IV, MAX_POKEMON_VIGOR } from '@/logic/constants/gameplay.ts'
import {
  getDeploymentCost,
  resolveDeploymentRewards,
  calculateCazabichosStreak,
  getInitialProjectedRewards
} from '@/logic/player/classDeploymentEngine'

import { AVATAR_STYLES_BY_ID, isAvatarStyleId } from '@/data/player/cosmeticsData'
import type { ActiveMission, PlayerClassState } from '@/types/system/game.ts'

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
    [...(gameStore.state.team || []), ...(gameStore.state.box || [])].forEach((p: Pokemon | null) => {
      if (p && p.onMission) p.onMission = false
    })

    // Lógica de transición de cosméticos de clase
    const currentAvatar = gameStore.state.avatar_style || ''
    if (currentAvatar && isAvatarStyleId(currentAvatar)) {
      const avatarDef = AVATAR_STYLES_BY_ID[currentAvatar]
      if (avatarDef && avatarDef.requiredClass) {
        const isSquare = currentAvatar.includes('-sq-')
        const classToStyleMap: Record<PlayerClassId, string> = {
          cazabichos: 'av-class-cazabichos',
          criador: 'av-class-criador',
          rocket: 'av-class-rocket',
          entrenador: 'av-class-entrenador'
        }
        
        const newBaseStyle = classToStyleMap[resolvedClassId]
        if (newBaseStyle) {
          gameStore.state.avatar_style = isSquare 
            ? newBaseStyle.replace('av-class-', 'av-sq-')
            : newBaseStyle
        } else {
          gameStore.state.avatar_style = null // Volver al por defecto
        }
      }
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
    if (cost.type === 'money') {
      if ((gameStore.state.money || 0) < cost.amount) {
        uiStore.notify(`Necesitas ₽${cost.amount.toLocaleString()} para esta misión.`, '💸')
        return
      }
      gameStore.state.money -= cost.amount
    } else if (cost.type === 'battleCoins') {
      if ((gameStore.state.battleCoins || 0) < cost.amount) {
        uiStore.notify(`Necesitas ${cost.amount} Battle Coins para esta misión.`, '💸')
        return
      }
      gameStore.state.battleCoins -= cost.amount
    }

    // Marcar pokemon como ocupado
    const targetUid = extraData.targetPokemonUid as string | undefined
    const targetIdx = extraData.targetPokemonIdx as number | undefined
    
    let p: Pokemon | null = null
    if (targetUid) {
      p = gameStore.getPokemonByUid(targetUid)
    } else if (targetIdx !== undefined) {
      p = gameStore.state.box[targetIdx] || null
      if (p) {
        extraData.targetPokemonUid = p.uid
      }
    }

    if (p) {
      if (p.hp <= 0) {
        uiStore.notify('No puedes enviar un Pokémon debilitado a una misión.', '⚠️')
        return
      }
      const teamIdx = gameStore.state.team.findIndex((tp: Pokemon | null) => tp && tp.uid === p.uid)
      if (teamIdx !== -1) {
        if (gameStore.state.team.length <= 1) {
          uiStore.notify('No puedes enviar a tu único Pokémon del equipo.', '⚠️')
          return
        }
        const tp = gameStore.state.team.splice(teamIdx, 1)[0]
        if (tp) {
          gameStore.state.box.push(tp)
          gameStore.autoFillPvpTeam()
        }
      }
      // Re-resolve index in box for compatibility
      extraData.targetPokemonIdx = gameStore.state.box.findIndex((bp: Pokemon | null) => bp && bp.uid === p.uid)
      p.onMission = true

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

    if (res.money > 0) {
      gameStore.state.money = (gameStore.state.money || 0) + res.money
      msg += `+₽${res.money.toLocaleString()} `
    }
    if (res.battleCoins > 0) {
      gameStore.state.battleCoins = (gameStore.state.battleCoins || 0) + res.battleCoins
      msg += `+${res.battleCoins} BC `
    }
    for (const item of res.items) {
      invStore.addItem(item.id, item.qty)
    }
    if (res.classXP > 0) {
      addXP(res.classXP)
    }
    if (res.criminality > 0) {
      addCriminality(res.criminality)
    }

    if (res.shouldSacrifice && p) {
      if (p.heldItem) {
        invStore.addItem(p.heldItem, 1)
      }
      p.onMission = false
      gameStore.removePokemon(p.uid)
      gameStore.state.classData.blackMarketSales = (gameStore.state.classData.blackMarketSales || 0) + 1
    } else if (res.generatedPokemon.length > 0) {
      for (const gp of res.generatedPokemon) {
        gameStore.state.box.push(gp)
      }
      msg += `+${res.generatedPokemon.length} Pokémon Bicho `
    } else if (p) {
      p.onMission = false
      if ((res.expGained > 0 || res.bonusLevels > 0) && p.level < MAX_POKEMON_LEVEL) {
        if (res.expGained > 0) {
          p.exp = (p.exp || 0) + res.expGained
          gameStore.checkLevelUp(p)
        }
        for (let i = 0; i < res.bonusLevels; i++) {
          if (p.level < MAX_POKEMON_LEVEL) {
            p.exp = p.expNeeded
            gameStore.checkLevelUp(p)
          }
        }
        msg += `¡${p.name} ganó EXP! `
      }
      if (res.ivIncrements.length > 0) {
        p.ivs = p.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
        for (const stat of res.ivIncrements) {
          p.ivs[stat] = Math.min(MAX_SINGLE_STAT_IV, (p.ivs[stat] || 0) + 1)
        }
        p.vigor = Math.max(0, (p.vigor ?? MAX_POKEMON_VIGOR) - res.vigorConsumed)
        msg += `¡${p.name} mejoró su genética! `
      }
    } else {
      msg += 'Tus Pokémon han regresado con éxito.'
    }

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
    onCaptureSuccess,
    onCaptureFail,
    setFaction,
    syncTheme
  }
})
