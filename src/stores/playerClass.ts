import { defineStore } from 'pinia'
import { computed, watch } from 'vue'
import { useGameStore } from './game.ts'
import { useUIStore } from './ui.ts'
import { PLAYER_CLASSES, CLASS_MISSIONS } from '@/data/playerClasses'
import { supabase } from '@/logic/supabase'
import { useInventoryStore } from '@/stores/inventory'
import { getClassModifier } from '@/logic/player/classEngine'
import type { Pokemon } from '@/types/pokemon'


import { AVATAR_STYLES } from '@/data/cosmeticsData'

export interface ActiveMission {
  id: string
  startedAt: number
  endsAt: number
  targetPokemonIdx?: number
  projectedReward?: number
  [key: string]: unknown
}

export interface ClassDefinition {
  id: string
  name: string
  icon: string
  color: string
  colorDark: string
  description: string
  bonuses?: string[]
  bonusLevels?: number[]
  penalties?: string[]
  showdownSpriteId?: string
}

interface ClassData {
  captureStreak?: number
  longestStreak?: number
  reputation?: number
  blackMarketSales?: number
  criminality?: number
  activeMission?: ActiveMission | null
  blackMarketDaily?: { date: string, items: unknown[], purchased: unknown[] }
  extortedRouteId?: string | null
  officialRouteId?: string | null
  kitCaptures?: number
}



export const usePlayerClassStore = defineStore('playerClass', () => {
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  
  const db = supabase

  // --- Getters ---
  const playerClass = computed(() => gameStore.state.playerClass)
  const classLevel = computed(() => gameStore.state.classLevel || 1)
  const classXP = computed(() => gameStore.state.classXP || 0)
  const classData = computed<ClassData>(() => (gameStore.state.classData as unknown as ClassData) || {})
  
  const currentClassDef = computed<ClassDefinition | null>(() => {
    if (!playerClass.value) return null
    return (PLAYER_CLASSES as Record<string, ClassDefinition>)[playerClass.value] || null
  })

  const activeMission = computed(() => classData.value.activeMission || null)

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
  async function selectClass(classId: string) {
    const cls = (PLAYER_CLASSES as Record<string, ClassDefinition>)[classId]
    if (!cls) return { success: false, msg: 'Clase no válida' }

    const isChange = !!playerClass.value
    if (isChange) {
      const cost = 10000
      if ((gameStore.state.battleCoins || 0) < cost) {
        uiStore.notify(`Necesitas ${cost.toLocaleString()} Battle Coins para cambiar.`, '❌')
        return { success: false, msg: `Necesitas ${cost.toLocaleString()} Battle Coins para cambiar.` }
      }
      gameStore.state.battleCoins -= cost
    }

    // Reset de datos específicos y liberación de Pokémon en misión
    [...(gameStore.state.team || []), ...(gameStore.state.box || [])].forEach((p: Pokemon | null) => {
      if (p && p.onMission) p.onMission = false
    })

    // Lógica de transición de cosméticos de clase
    const currentAvatar = gameStore.state.avatar_style || ''
    if (currentAvatar) {
      const avatarDef = AVATAR_STYLES.find(a => a.id === currentAvatar)
      if (avatarDef && avatarDef.requiredClass) {
        const isSquare = currentAvatar.includes('-sq-')
        const classToStyleMap: Record<string, string> = {
          cazabichos: 'av-class-cazabichos',
          criador: 'av-class-criador',
          rocket: 'av-class-rocket',
          entrenador: 'av-class-entrenador'
        }
        
        const newBaseStyle = classToStyleMap[classId]
        if (newBaseStyle) {
          gameStore.state.avatar_style = isSquare 
            ? newBaseStyle.replace('av-class-', 'av-sq-')
            : newBaseStyle
        } else {
          gameStore.state.avatar_style = null // Volver al por defecto
        }
      }
    }

    gameStore.state.playerClass = classId
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
  async function setFaction(factionId: string) {
    if (!['union', 'poder', 'rocket'].includes(factionId)) return { success: false }
    
    const currentFaction = gameStore.state.faction
    if (currentFaction === factionId) {
      uiStore.notify('Ya perteneces a este bando.', '⚠️')
      return { success: false }
    }

    // Costo de cambio (si ya tenía uno)
    if (currentFaction) {
      const cost = 25000
      if ((gameStore.state.money || 0) < cost) {
        uiStore.notify(`Necesitas 🪙 ${cost.toLocaleString()} para cambiar de bando.`, '❌')
        return { success: false }
      }
      gameStore.state.money -= cost
      uiStore.notify(`Cambiaste de bando por 🪙 ${cost.toLocaleString()}`, '💸')
    }

    gameStore.state.faction = factionId
    uiStore.notify(`¡Te uniste al Equipo ${factionId.toUpperCase()}!`, '🚩')
    await gameStore.save(false)
    return { success: true }
  }

  /**
   * Incrementa XP de clase (se sincroniza con el nivel de entrenador por ahora, como en legacy).
   */
  function addXP(amount: number) {
    if (!playerClass.value || amount <= 0) return
    gameStore.addTrainerExp(amount)
  }

  /**
   * Maneja el nivel de criminalidad del Rocket.
   */
  function addCriminality(amount: number) {
    if (playerClass.value !== 'rocket' || amount <= 0) return
    const currentData = gameStore.state.classData as ClassData
    const prev = currentData.criminality || 0
    currentData.criminality = Math.min(100, prev + amount)
    
    if (prev < 100 && currentData.criminality >= 100) {
      uiStore.notify("¡Nivel de criminalidad máximo! La policía te busca.", "🚔")
    }
  }

  /**
   * Inicia una misión idle con validación de tiempo del servidor.
   */
  async function startMission(missionId: string, extraData: Record<string, unknown> = {}) {
    const m = CLASS_MISSIONS.find(x => x.id === missionId)
    if (!m) return

    // Marcar pokemon como ocupado
    if (extraData.targetPokemonIdx !== undefined) {
      const p = gameStore.state.box[extraData.targetPokemonIdx as number]
      if (p) {
        const teamIdx = gameStore.state.team.findIndex((tp: Pokemon | null) => tp && tp.uid === p.uid)
        if (teamIdx !== -1) {
          if (gameStore.state.team.length <= 1) {
            uiStore.notify('No puedes enviar a tu único Pokémon del equipo.', '⚠️')
            return
          }
          const tp = gameStore.state.team.splice(teamIdx, 1)[0]
          if (tp) {
            tp.hp = tp.maxHp
            tp.status = null
            tp.moves?.forEach((m) => { if (m) m.pp = m.maxPP })
            gameStore.state.box.push(tp)
            gameStore.autoFillPvpTeam()
            extraData.targetPokemonIdx = gameStore.state.box.findIndex((bp: Pokemon | null) => bp && bp.uid === tp.uid)
          }
        }
        p.onMission = true
      }
    }

    const now = await db.getServerTime()
    const currentData = gameStore.state.classData as unknown as ClassData

    currentData.activeMission = {
      id: missionId,
      startedAt: now as number,
      endsAt: (now as number) + (m.durationHs * 3600 * 1000),
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

    const now = await db.getServerTime()
    if ((now as number) < mission.endsAt) {
      uiStore.notify('La misión aún no ha terminado.', '⏳')
      return;
    }

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
          if (p.heldItem) {
            const invStore = useInventoryStore()
            invStore.addItem(p.heldItem, 1)
          }
          p.onMission = false
          gameStore.removePokemon(p.uid)
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
          const expGain = (25000 + (p.level || 1) * 1000) * blocks;
          p.exp = (p.exp || 0) + expGain;
          
          p.onMission = false;
          msg += `¡${p.name} ganó ${expGain.toLocaleString()} EXP! 🏅`
        }
      }
    } else if (cls === 'criador') {
      // Recompensa en IVs aleatorios a cambio de Vigor
      if (mission.targetPokemonIdx !== undefined) {
        const p = gameStore.state.box[mission.targetPokemonIdx]
        if (p) {
          const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
          const stat = stats[Math.floor(Math.random() * stats.length)];
          if (stat) {
            const gain = Math.floor(Math.random() * 3) + 1;
            if (!p.ivs) p.ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
            const curVal = p.ivs[stat] || 0;
            p.ivs[stat] = Math.min(31, curVal + gain);
            p.vigor = Math.max(0, (p.vigor || 20) - 5);
            p.onMission = false;
            msg += `¡${p.name} mejoró su ${String(stat).toUpperCase()} (+${gain})! 🧬`
          }
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

    const currentData = gameStore.state.classData as ClassData
    currentData.activeMission = null
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
    collectMission,
    setFaction,
    syncTheme
  }
})
