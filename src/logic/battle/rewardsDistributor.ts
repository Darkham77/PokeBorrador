import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'
import { calculateBaseExp, processExpGain, calculateMoneyGain } from './battleRewards.ts'
import { getBattleRewardModifiers } from '@/logic/war/bonusEngine'
import type { BattleContext } from '@/types/battleContext'
import type { Pokemon, PokemonMove } from '@/types/pokemon'
import { useUIStore } from '@/stores/ui'
import { getItemByName, getItemById } from '@/data/items'

import type { BattleState } from '@/types/battle.ts'

export function registerRewardCombatant(active: BattleState | null) {
  if (!active) return
  if (!active._rewardCombatants) {
    active._rewardCombatants = []
  }
  const e = active.enemy || active._initialEnemy
  if (e && !active._rewardCombatants.some((p: Pokemon) => p.uid === e.uid)) {
    active._rewardCombatants.push(e)
  }
}

/**
 * Calculates and distributes XP and money rewards.
 */
export async function calculateBattleRewards(ctx: BattleContext) {
  const active = ctx.activeBattle.value;
  if (!active) return;

  const combatants = active._rewardCombatants && active._rewardCombatants.length > 0 
    ? active._rewardCombatants 
    : (active.enemy || active._initialEnemy ? [active.enemy || active._initialEnemy] : []).filter(Boolean) as Pokemon[]
  
  if (combatants.length === 0) return;

  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  
  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.DISTRIBUTE_XP)
  // fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
  
  const isTr = active.isTrainer || active.isGym || active.isPvP
  const locId = active.locationId

  // Update statistics
  if (!ctx.gs.state.stats) {
    ctx.gs.state.stats = {}
  }
  if (isTr) {
    ctx.gs.state.stats.trainersDefeated = (Number(ctx.gs.state.stats.trainersDefeated) || 0) + 1
  } else {
    ctx.gs.state.stats.wins = (Number(ctx.gs.state.stats.wins) || 0) + 1
  }

  // Faction points using the primary opponent
  const primaryEnemy = combatants[0]
  if (primaryEnemy?.isGuardian) await ctx.warStore.addPoints(locId, 'guardian', true)
  else await ctx.warStore.addPoints(locId, isTr ? 'trainer_win' : 'wild_win', true)
  
  if (active.isGym && active.gymId) {
    const gid = active.gymId
    const diff = active.difficulty || 'easy'
    
    // Registrar victoria global (Medalla)
    if (!ctx.gs.state.defeatedGyms.includes(gid)) {
      ctx.gs.state.defeatedGyms.push(gid); ctx.gs.state.badges++
      if (active.rewardTM) { 
        const tm = active.rewardTM
        const itemObj = getItemByName(tm) || getItemById(tm)
        const tmId = itemObj ? itemObj.id : tm.toLowerCase().replace(/\s+/g, '_')
        ctx.gs.state.inventory[tmId] = (ctx.gs.state.inventory[tmId] || 0) + 1
        ctx.addLog(`¡Recibiste la ${itemObj?.name || tm}!`, 'log-info', tmId) 
      }
      ctx.uiStore.notify(`¡Ganaste la medalla del Gimnasio ${gid}!`, '🏆')
    }

    // Registrar progreso específico por dificultad
    if (!ctx.gs.state.gymProgress[gid] || typeof ctx.gs.state.gymProgress[gid] !== 'object') {
      ctx.gs.state.gymProgress[gid] = { easy: false, normal: false, hard: false, attempts: 0 }
    }
    const prog = ctx.gs.state.gymProgress[gid]
    if (prog) {
      const key = diff as 'easy' | 'normal' | 'hard'
      if (!prog[key]) {
        prog[key] = true
        ctx.addLog(`¡Superaste el gimnasio en dificultad ${diff.toUpperCase()}!`, 'log-success', '🏆')
        
        // Award Gym Difficulty-Specific rewards dynamically
        import('@/stores/gyms').then(({ useGymsStore }) => {
          const gymsStore = useGymsStore()
          const gym = gymsStore.gyms.find(g => g.id === gid)
          if (gym && gym.difficulties) {
            const diffData = gym.difficulties[key]
            if (diffData && diffData.levels) {
              const avgLevel = diffData.levels.reduce((a: number, b: number) => a + b, 0) / diffData.levels.length
              
              const mults: Record<string, number> = { easy: 1, normal: 2.2, hard: 4.5 }
              const mult = mults[key] || 1
              
              const expReward = Math.floor(avgLevel * 180 * mult)
              const moneyReward = Math.floor(avgLevel * 30 * mult)
              const tmReward = gym.rewardTM

              // 1. Award Money
              ctx.gs.state.money += moneyReward
              ctx.addLog(`¡Bono de Gimnasio: Recibiste ₽${moneyReward}!`, 'log-success', 'player')
              ctx.uiStore.notify(`¡Obtuviste ₽${moneyReward}!`, '💰')

              // 2. Award TM
              if (tmReward) {
                const itemObj = getItemByName(tmReward) || getItemById(tmReward)
                const tmId = itemObj ? itemObj.id : tmReward.toLowerCase().replace(/\s+/g, '_')
                ctx.gs.state.inventory[tmId] = (ctx.gs.state.inventory[tmId] || 0) + 1
                ctx.addLog(`¡Bono de Gimnasio: Recibiste la ${itemObj?.name || tmReward}!`, 'log-success', tmId)
                ctx.uiStore.notify(`¡Obtuviste ${itemObj?.name || tmReward}!`, '🎒')
              }

              // 3. Award EXP (distributed)
              const team = ctx.gs.state.team || []
              if (team.length > 0) {
                const expPerPoke = Math.floor(expReward / team.length)
                import('@/logic/pokemon/pokemonFactory').then(({ getExpNeeded, levelUpPokemon }) => {
                  for (const p of team) {
                    if (p.level >= 100) continue
                    p.exp += expPerPoke
                    
                    let leveledUp = false
                    let tempLevel = p.level
                    let tempExpNeeded = p.expNeeded || getExpNeeded(tempLevel)
                    
                    while (p.exp >= tempExpNeeded && tempLevel < 100) {
                      p.exp -= tempExpNeeded
                      leveledUp = true
                      tempLevel++
                      tempExpNeeded = getExpNeeded(tempLevel)
                    }
                    
                    if (leveledUp) {
                      const diffLevels = tempLevel - p.level
                      p.level = tempLevel
                      p.expNeeded = tempLevel >= 100 ? Infinity : tempExpNeeded
                      for (let i = 0; i < diffLevels; i++) {
                        levelUpPokemon(p)
                      }
                      ctx.addLog(`¡Bono de Gimnasio: ${p.name} subió al nivel ${p.level}!`, 'log-success', p)
                    }
                    ctx.addLog(`¡Bono de Gimnasio: ${p.name} ganó ${expPerPoke} EXP!`, 'log-success', p)
                  }
                })
                ctx.uiStore.notify(`¡Tu equipo ganó ${expReward} EXP de bono!`, '✨')
              }
            }
          }
        })
      }
      prog.attempts++
    }
    
    await ctx.gs.save(false)
  }

  const warMods = getBattleRewardModifiers(active.locationId, ctx.gs.state.faction, ctx.warStore.mapDominance)
  let totalExpMult = warMods.expMult + ((ctx.eventStore.globalMultipliers?.exp || 1) - 1)
  
  if ((ctx.gs.state.luckyEggSecs || 0) > 0) {
    totalExpMult *= 1.5
  }

  const classMult = ctx.classStore.getModifier('expMult', { isTrainer: active.isTrainer })
  const participantsSet = new Set(active.participants)

  const expGainedMap = new Map<string, number>()
  const levelUpMap = new Map<string, { levelsGained: number; moves: PokemonMove[] }>()
  let totalMoneyGained = 0
  let totalCoinsGained = 0
  let totalTrainerExpGained = 0

  const isGymRematch = active.isGym && active.gymId && ctx.gs.state.defeatedGyms.includes(active.gymId)

  for (const e of combatants) {
    if (active.isCapture) await ctx.eventStore.submitCompetitionEntry(e, 'hourly_competition')

    const baseExp = calculateBaseExp(e)
    for (const p of ctx.gs.state.team) {
      const reward = processExpGain(p, baseExp, participantsSet, {
        isActive: p.uid === active.player?.uid,
        classMult,
        totalExpMult,
        participantsSet
      })
      if (!reward) continue
      
      expGainedMap.set(p.uid, (expGainedMap.get(p.uid) || 0) + reward.gained)
      
      if (reward.levelUp) {
        if (!levelUpMap.has(p.uid)) {
          levelUpMap.set(p.uid, { levelsGained: 0, moves: [] })
        }
        const lvlData = levelUpMap.get(p.uid)!
        lvlData.levelsGained += reward.levelsGained
        
        const { levelUpPokemon } = await import('@/logic/pokemon/pokemonFactory')
        for (let i = 0; i < reward.levelsGained; i++) {
          const pendingMoves = levelUpPokemon(p)
          if (pendingMoves) {
            lvlData.moves.push(...pendingMoves)
          }
        }
      }
    }

    let moneyGained = calculateMoneyGain(e, { 
      bcMult: ctx.classStore.getModifier('bcMult', { isGym: active.isGym }), 
      totalMoneyMult: warMods.moneyMult + ((ctx.eventStore.globalMultipliers?.money || 1) - 1),
      isTrainer: active.isTrainer,
      isGym: active.isGym
    })
    
    if ((ctx.gs.state.amuletCoinSecs || 0) > 0) {
      moneyGained *= 2
    }
    
    totalMoneyGained += moneyGained

    if ((active.isTrainer || active.isGym) && !isGymRematch) {
      let coins = Math.floor(e.level * 2)
      const bcMult = ctx.classStore.getModifier('bcMult', { isGym: active.isGym })
      coins = Math.floor(coins * bcMult)
      const eventMult = ctx.eventStore.globalMultipliers?.bc || 1
      coins = Math.floor(coins * eventMult)
      totalCoinsGained += coins
    }

    // Trainer experience formula: isGym ? level * 5 : level * 2
    const trainerExpGain = active.isGym ? (e.level * 5) : (e.level * 2)
    totalTrainerExpGained += trainerExpGain
  }

  // Multiplicador de extorsión del Team Rocket (x1.5 ₽ en ruta extorsionada)
  if (ctx.gs.state.playerClass === 'rocket' && ctx.gs.state.classData?.extortedRouteId === active.locationId) {
    const extTimestamp = Number(ctx.gs.state.classData?.extortedRouteTimestamp || 0)
    const now = Temporal.Now.instant().epochMilliseconds
    if (now - extTimestamp <= 24 * 3600 * 1000) {
      const bonusMoney = Math.floor(totalMoneyGained * 0.5)
      totalMoneyGained += bonusMoney
      ctx.addLog(`¡Extorsión activa (+50% ₽)! +₽${bonusMoney}`, 'log-info', 'player')
    }
  }

  // Lógica de Ruta Oficial del Entrenador (+1 Reputación por combate ganado durante 30 mins)
  if (ctx.gs.state.playerClass === 'entrenador' && ctx.gs.state.classData?.officialRouteId === active.locationId) {
    const offTimestamp = Number(ctx.gs.state.classData?.officialRouteTimestamp || 0)
    const now = Temporal.Now.instant().epochMilliseconds
    if (now - offTimestamp <= 30 * 60 * 1000) {
      if (!ctx.gs.state.classData) {
        ctx.gs.state.classData = {
          captureStreak: 0,
          longestStreak: 0,
          reputation: 0,
          blackMarketSales: 0,
          criminality: 0,
          blackMarketDaily: { date: '', items: [], purchased: [] }
        }
      }
      ctx.gs.state.classData.reputation = (Number(ctx.gs.state.classData.reputation) || 0) + 1
      ctx.addLog('¡Ruta Oficial activa! Ganaste +1 de Reputación.', 'log-success', 'player')
    }
  }

  // Award consolidated rewards
  ctx.gs.state.money += totalMoneyGained
  if ((ctx.gs.state.amuletCoinSecs || 0) > 0) {
    ctx.addLog('¡Moneda Amuleto duplicó el dinero obtenido!', 'log-success', 'player')
  }
  if ((ctx.gs.state.luckyEggSecs || 0) > 0) {
    ctx.addLog('¡Huevo Suerte aumentó un 50% la EXP obtenida!', 'log-success', 'player')
  }
  ctx.addLog(`¡Ganaste ₽${totalMoneyGained} en total!`, 'log-info', 'player')

  if (totalCoinsGained > 0) {
    ctx.gs.state.battleCoins = (ctx.gs.state.battleCoins || 0) + totalCoinsGained
    ctx.addLog(`¡Obtuviste ${totalCoinsGained} Battle Coins en total!`, 'log-info', 'player')
  }

  if (totalTrainerExpGained > 0) {
    ctx.gs.addTrainerExp(totalTrainerExpGained)
    ctx.addLog(`¡Ganaste ${totalTrainerExpGained} EXP de entrenador!`, 'log-info', 'player')
  }

  // Print consolidated EXP and trigger Level Ups
  for (const p of ctx.gs.state.team) {
    const gained = expGainedMap.get(p.uid) || 0
    if (gained > 0) {
      ctx.addLog(`${p.name} ganó ${gained} EXP.`, 'log-player', p)
    }

    const lvlData = levelUpMap.get(p.uid)
    if (lvlData) {
      await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.CHECK_PENDING)
      ctx.addLog(`¡${p.name} subió al nivel ${p.level}!`, 'log-info', p)

      if (lvlData.moves.length > 0) {
        await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.SHOW_CHOICE)
        p.pendingMoves = lvlData.moves
        
        const uiStore = useUIStore()
        uiStore.addToLearnQueue(lvlData.moves.map(m => ({ pokemon: p, move: m })))
      }

      // Sincronizar evolución por nivel
      if (p.heldItem === 'everstone') {
        ctx.addLog(`${p.name} evitó evolucionar debido a la Piedra Eterna.`, 'log-info', p)
      } else {
        const { checkLevelUpEvolution } = await import('../evolution/evolutionLogic.ts')
        const targetId = checkLevelUpEvolution(p)
        if (targetId) {
          const uiStore = useUIStore()
          uiStore.startEvolution(p, targetId, '')
          // Esperar síncronamente mientras el modal de evolución esté abierto
          while (uiStore.isEvolutionOpen) {
            await sleep(100)
          }
        }
      }
    }
  }

  if (active.player) {
    const teamPoke = ctx.gs.state.team.find((tp: Pokemon) => tp && tp.uid === active.player?.uid)
    if (teamPoke) {
      active.player.level = teamPoke.level
      active.player.exp = teamPoke.exp
      active.player.expNeeded = teamPoke.expNeeded
      active.player.maxHp = teamPoke.maxHp
      active.player.hp = teamPoke.hp
      active.player.atk = teamPoke.atk
      active.player.def = teamPoke.def
      active.player.spa = teamPoke.spa
      active.player.spd = teamPoke.spd
      active.player.spe = teamPoke.spe
      active.player.moves = teamPoke.moves ? teamPoke.moves.map(m => m ? ({ ...m }) : null) : []
    }
  }
}

/**
 * Simulates a standard experience reward in battle for testing purposes.
 */
export async function awardDebugExp(ctx: BattleContext) {
  const active = ctx.activeBattle.value
  if (!active || !active.player) return

  const p = active.player
  const teamPoke = ctx.gs.state.team.find((tp: Pokemon) => tp && tp.uid === p.uid)
  if (!teamPoke) return

  const needed = teamPoke.expNeeded - teamPoke.exp
  if (needed <= 0) return

  ctx.addLog(`DEBUG: Añadiendo ${needed} EXP para subir de nivel...`, 'log-info', p)

  const participantsSet = new Set([p.uid])
  const reward = processExpGain(teamPoke, needed, participantsSet, {
    isActive: true,
    classMult: 1,
    totalExpMult: 1,
    participantsSet
  })

  if (reward) {
    ctx.addLog(`${teamPoke.name} ganó ${reward.gained} EXP.`, 'log-player', teamPoke)
    
    if (reward.levelUp) {
      const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
      const fsm = ctx.fsm
      const prevState = fsm.currentState.value
      const prevSubState = fsm.currentSubState.value

      await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.CHECK_PENDING)
      
      const allPendingMoves: PokemonMove[] = []
      const { levelUpPokemon } = await import('@/logic/pokemon/pokemonFactory')
      for (let i = 0; i < reward.levelsGained; i++) {
        const pendingMoves = levelUpPokemon(teamPoke)
        if (pendingMoves) {
          allPendingMoves.push(...pendingMoves)
        }
      }
      
      ctx.addLog(`¡${teamPoke.name} subió al nivel ${teamPoke.level}!`, 'log-info', teamPoke)

      // Sync active player copy stats
      p.level = teamPoke.level
      p.exp = teamPoke.exp
      p.expNeeded = teamPoke.expNeeded
      p.maxHp = teamPoke.maxHp
      p.hp = teamPoke.hp
      p.atk = teamPoke.atk
      p.def = teamPoke.def
      p.spa = teamPoke.spa
      p.spd = teamPoke.spd
      p.spe = teamPoke.spe
      p.moves = teamPoke.moves ? teamPoke.moves.map(m => m ? ({ ...m }) : null) : []

      if (allPendingMoves.length > 0) {
        await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.SHOW_CHOICE)
        teamPoke.pendingMoves = allPendingMoves
        
        const uiStore = useUIStore()
        uiStore.addToLearnQueue(allPendingMoves.map(m => ({ pokemon: teamPoke, move: m })))

        while (uiStore.learnQueue.length > 0 || uiStore.currentMoveToLearn) {
          await sleep(100)
        }
      }

      // Sincronizar evolución por nivel en debug
      if (teamPoke.heldItem === 'everstone') {
        ctx.addLog(`${teamPoke.name} evitó evolucionar debido a la Piedra Eterna.`, 'log-info', teamPoke)
      } else {
        const { checkLevelUpEvolution } = await import('../evolution/evolutionLogic.ts')
        const targetId = checkLevelUpEvolution(teamPoke)
        if (targetId) {
          const uiStore = useUIStore()
          uiStore.startEvolution(teamPoke, targetId, '')
          // Esperar síncronamente mientras el modal de evolución esté abierto
          while (uiStore.isEvolutionOpen) {
            await sleep(100)
          }
        }
      }

      // Sync active player copy stats (including newly learned/replaced moves & evolution stats)
      p.level = teamPoke.level
      p.exp = teamPoke.exp
      p.expNeeded = teamPoke.expNeeded
      p.maxHp = teamPoke.maxHp
      p.hp = teamPoke.hp
      p.atk = teamPoke.atk
      p.def = teamPoke.def
      p.spa = teamPoke.spa
      p.spd = teamPoke.spd
      p.spe = teamPoke.spe
      p.moves = teamPoke.moves ? teamPoke.moves.map(m => m ? ({ ...m }) : null) : []

      await fsm.transition(prevState, prevSubState)
    }
  }
}
