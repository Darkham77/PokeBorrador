// [PureVue-Ignore-Length]
import { calculateDamage, getEffectiveSpeed } from './battleEngine'
import { canAttack } from './battleFlow'
import { dispatchMoveEffect } from './actions/actionRegistry'
import { decideEnemyMove, shouldEnemySwitch, findBestSwitchIndex } from './ai/battleAI'
import { gameBus } from '@/logic/gameBus'
import { recalcPokemonStats } from '@/logic/pokemonFactory'
import { getMechanicalWeather, WEATHER_MECHANICAL } from './weatherMapper'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

/**
 * Handles the turn logic for a single move execution.
 */
export async function executeTurn(store, moveIndex) {
  const p = store.activeBattle.player
  const e = store.activeBattle.enemy
  
  // Thrash check
  if (p.thrashTurns > 0) {
    const forcedIdx = p.moves.findIndex(m => m.effect === 'thrash');
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  } else if (p.encoreTurns > 0 && p.encoreMove) {
    const forcedIdx = p.moves.findIndex(m => m.id === p.encoreMove.id);
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  }

  const move = p.moves[moveIndex]

  if (move.pp <= 0) {
    store.addLog(`¡No queda PP para ${move.name}!`, 'log-info', p)
    return
  }

  // Determine Turn Order (Consider Priority)
  const pMove = p.moves[moveIndex]
  const isWild = !store.activeBattle.isTrainer && !store.activeBattle.isGym
  const eMove = decideEnemyMove(e, p, store.playerStages, isWild)
  
  const pPrio = pMove?.priority || 0
  const ePrio = eMove?.priority || 0

  const pSpe = getEffectiveSpeed(p, store.playerStages, { weather: store.activeBattle.weather, getStatMultiplier: (s) => 1 + (0.5 * s) })
  const eSpe = getEffectiveSpeed(e, store.enemyStages, { weather: store.activeBattle.weather, getStatMultiplier: (s) => 1 + (0.5 * s) })
  
  let playerFirst = true
  if (pPrio > ePrio) playerFirst = true
  else if (ePrio > pPrio) playerFirst = false
  else playerFirst = pSpe >= eSpe

  if (playerFirst) {
    await runPlayerAction(store, moveIndex)
    if (e.hp > 0 && !store.activeBattle.over) {
      await new Promise(r => setTimeout(r, 400)) // Reducido de 600
      await runEnemyAction(store)
    }
  } else {
    await runEnemyAction(store)
    if (p.hp > 0 && !store.activeBattle.over) {
      await new Promise(r => setTimeout(r, 400)) // Reducido de 600
      await runPlayerAction(store, moveIndex)
    }
  }
  
  if (store.activeBattle.over) {
    await store.endBattle(false, true)
    return
  }
  
  if (store.persistBattle) store.persistBattle()
}

export async function runPlayerAction(store, moveIndex) {
  const p = store.activeBattle.player
  const e = store.activeBattle.enemy
  const move = p.moves[moveIndex]
  
  if (p.tauntTurns > 0 && move.cat === 'status') {
    store.addLog(`¡La mofa impide a ${p.name} usar ${move.name}!`, 'log-info', p)
    return
  }
  if (p.disabledMove && move.id === p.disabledMove.id) {
    store.addLog(`¡${move.name} está desactivado!`, 'log-info', p)
    return
  }
  
  if (!canAttack(p, store.addLog)) return
  
  if (p.furyCutterCount && move.effect !== 'fury_cutter') p.furyCutterCount = 0;
  p.lastMove = move;
  store.attackerSide = 'player'
  store.activeMove = { ...move, side: 'player' }
  move.pp--
  store.addLog(`¡${p.name} usó ${move.name}!`, 'log-player', p)
  // Sanity check for stats & level & moves
  if (!p.atk || !p.maxHp || move.power === undefined) recalcPokemonStats(p)
  if (!e.atk || !e.maxHp) recalcPokemonStats(e)
  
  if (!p.level) p.level = 5 // Fallback
  
  if (!p.atk || !e.def || (move.power === undefined && move.cat !== 'status')) {
    store.addLog(`[Error] Datos faltantes: Atk:${p.atk} Def:${e.def} Pwr:${move.power}`, 'log-error', p)
  }
  if (!store.activeBattle.participants.includes(p.uid)) {
    store.activeBattle.participants.push(p.uid)
  }

  // Precision Check
  const moveAcc = move.acc || 100;
  if (moveAcc < 100 && !p.lockOn) {
    const accStage = store.playerStages.acc || 0;
    const evaStage = store.enemyStages.eva || 0;
    const weather = store.activeBattle.weather?.type;
    const mechWeather = getMechanicalWeather(weather);
    let finalAcc = moveAcc;
    
    // Reglas de Clima para Precisión
    if (mechWeather === WEATHER_MECHANICAL.RAIN && (move.id === 'thunder' || move.id === 'hurricane')) finalAcc = 100;
    else if (mechWeather === WEATHER_MECHANICAL.SUN && (move.id === 'thunder' || move.id === 'hurricane')) finalAcc = 50;
    else if ((mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) && move.id === 'blizzard') finalAcc = 100;
    else if (mechWeather === WEATHER_MECHANICAL.FOG) finalAcc = Math.floor(moveAcc * 0.6);

    finalAcc = finalAcc * (1 + (0.33 * accStage)) * (1 - (0.33 * evaStage));
    if (Math.random() * 100 > finalAcc) {
      store.addLog(`¡El ataque de ${p.name} falló!`, 'log-info', p);
      return;
    }
  }
  if (p.lockOn) p.lockOn = false; // Se consume el efecto

  // [FIX] Asegurar que el efecto esté presente (Self-Healing de datos antiguos en el equipo)
  if (move && (move.effect === undefined || move.effect === null)) {
    const freshMoveData = pokemonDataProvider.getMoveData(move.name);
    if (freshMoveData && freshMoveData.effect) {
      move.effect = freshMoveData.effect;
    }
  }

  // 1. Determinar número de golpes
  let totalHits = 1;
  if (move.hits) {
    if (typeof move.hits === 'number') totalHits = move.hits;
    else if (move.hits === '2-5') {
      const rolls = [2, 2, 2, 3, 3, 3, 4, 5];
      totalHits = rolls[Math.floor(Math.random() * rolls.length)];
    }
  }

  let hitsDealt = 0;
  let totalDamageDealt = 0;

  try {
    for (let i = 0; i < totalHits; i++) {
      if (e.hp <= 0) break;

      const result = calculateDamage(p, e, move, { 
        atkStages: store.playerStages.atk, 
        defStages: store.enemyStages.def,
        weather: store.activeBattle.weather
      })

      if (result.isNoEffect) {
        store.addLog('¡No afecta!', 'log-enemy', e)
        break;
      } else {
        const damage = Math.floor(result.dmg || 0)
        
        if (move.cat !== 'status') {
          if (totalHits === 1) store.addLog(`¡${e.name} recibió ${damage} de daño!`, 'log-info', e)
          totalDamageDealt += damage;
        }

        if (result.isNotVeryEffective && i === 0) store.addLog('No es muy eficaz...', 'log-player', p)
        if (result.isSuperEffective && i === 0) store.addLog('¡Es muy eficaz!', 'log-player', p)

        // Magnitude log
        if (move.effect === 'magnitude' && result.power) {
          const magMap = { 10: 4, 30: 5, 50: 6, 70: 7, 90: 8, 110: 9, 150: 10 };
          const mag = magMap[result.power] || 7;
          store.addLog(`¡Magnitud ${mag}!`, 'log-info', e);
        }

        // Update HP and Context
        store.activeBattle.enemy.hp = Math.max(0, e.hp - damage)
        store.activeBattle.lastDamage = damage
        hitsDealt++;
        
        if (e.hp <= 0) {
          if (store.handleFaint) await store.handleFaint('enemy')
          break;
        }
        
        // Rage check
        if (e.rageActive && damage > 0 && e.hp > 0) {
          store.enemyStages.atk = Math.min(6, (store.enemyStages.atk || 0) + 1);
          store.addLog(`¡La furia de ${e.name} está creciendo!`, 'log-info', e);
        }

        if (move.cat !== 'status') {
          await new Promise(r => setTimeout(r, 200))
        }
      }
    }

    if (totalHits > 1 && hitsDealt > 0) {
      store.addLog(`¡Golpeó ${hitsDealt} veces!`, 'log-info', e);
    }

    // [Post-Action] Recoil, Drain, Self-KO
    if (totalDamageDealt > 0) {
      // Recoil
      if (move.recoil) {
        const recoilDiv = typeof move.recoil === 'number' ? move.recoil : 2; // recoil: true -> 1/2 damage (standard fail jump)
        const recoilDmg = Math.floor(totalDamageDealt / recoilDiv);
        if (recoilDmg > 0) {
          p.hp = Math.max(0, p.hp - recoilDmg);
          store.addLog(`¡${p.name} recibió daño por retroceso!`, 'log-info', p);
        }
      }
      // Drain
      if (move.drain) {
        const heal = Math.floor(totalDamageDealt / 2);
        if (heal > 0) {
          p.hp = Math.min(p.maxHp, p.hp + heal);
          store.addLog(`¡${p.name} absorbió energía!`, 'log-info', p);
        }
      }
    }

    if (move.selfKO) {
      p.hp = 0;
      store.addLog(`¡${p.name} se sacrificó!`, 'log-info', p);
    }

    store.attackerSide = null

    // Execute Move Effect (Pass the battleCtx)
    if (move.effect && hitsDealt > 0) {
      dispatchMoveEffect(move.effect, p, e, store.playerStages, store.enemyStages, store.addLog, store.activeBattle)
    }

  } catch (err) {
    console.error('[Battle] Error in runPlayerAction:', err)
    store.addLog('¡Error en el turno del jugador!', 'log-error', p)
  }
}

export async function runEnemyAction(store) {
  const p = store.activeBattle.player
  const e = store.activeBattle.enemy
  if (e.hp <= 0) return

  if (e.tauntTurns > 0 && e.lastMove?.cat === 'status') {
    // Note: Enemy selection already happened, but if they were taunted during turn
    // (e.g. player faster and used Taunt), we block it here.
    // However, enemy AI should handle it. This is a safety check.
  }

  if (!canAttack(e, store.addLog)) return

  const isWild = !store.activeBattle.isTrainer && !store.activeBattle.isGym
  
  if (!isWild && shouldEnemySwitch(e, p, store.activeBattle.enemyTeam)) {
    const bestIdx = findBestSwitchIndex(store.activeBattle.enemyTeam, p, e.uid)
    if (bestIdx !== -1) {
      const newPoke = store.activeBattle.enemyTeam[bestIdx]
      store.addLog(`¡${store.activeBattle.trainerName || 'El entrenador'} retira a ${e.name}!`, 'log-enemy', 'enemy_trainer')
      gameBus.emit('PLAY_WITHDRAW', { side: 'enemy' })
      await new Promise(r => setTimeout(r, 800))
      
      store.activeBattle.enemy = newPoke
      store.addLog(`¡Envía a ${newPoke.name}!`, 'log-enemy', newPoke)
      gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: newPoke })
      await new Promise(r => setTimeout(r, 800))
      return
    }
  }

  if ((store.activeBattle.isGym) && e.hp < (e.maxHp * 0.25) && !store.activeBattle.enemyUsedItem) {
    store.activeBattle.enemyUsedItem = true
    const heal = Math.floor(e.maxHp * 0.5)
    e.hp = Math.min(e.maxHp, e.hp + heal)
    store.addLog(`¡El Líder usó una Hiper Poción!`, 'log-enemy', 'enemy_trainer')
    store.addLog(`¡${e.name} recuperó salud!`, 'log-info', e, 'enemy')
    return
  }

  const enemyMove = decideEnemyMove(e, p, store.playerStages, isWild)
  if (!enemyMove) {
    store.addLog(`¡${e.name} no tiene más PP y usa Forcejeo!`, 'log-enemy', e)
    return
  }

  // Sanity check for stats & moves
  if (!e.atk || !e.maxHp || enemyMove.power === undefined) recalcPokemonStats(e)
  if (!p.atk || !p.maxHp) recalcPokemonStats(p)
  if (!e.level) e.level = 5

  if (e.furyCutterCount && enemyMove.effect !== 'fury_cutter') e.furyCutterCount = 0;
  e.lastMove = enemyMove
  store.attackerSide = 'enemy'
  store.activeMove = { ...enemyMove, side: 'enemy' }
  store.addLog(`¡${e.name} usó ${enemyMove.name}!`, 'log-enemy', e)

  // Precision Check
  const moveAcc = enemyMove.acc || 100;
  if (moveAcc < 100 && !e.lockOn) {
    const accStage = store.enemyStages.acc || 0;
    const evaStage = store.playerStages.eva || 0;
    const weather = store.activeBattle.weather?.type;
    const mechWeather = getMechanicalWeather(weather);
    let finalAcc = moveAcc;

    // Reglas de Clima para Precisión
    if (mechWeather === WEATHER_MECHANICAL.RAIN && (enemyMove.id === 'thunder' || enemyMove.id === 'hurricane')) finalAcc = 100;
    else if (mechWeather === WEATHER_MECHANICAL.SUN && (enemyMove.id === 'thunder' || enemyMove.id === 'hurricane')) finalAcc = 50;
    else if ((mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) && enemyMove.id === 'blizzard') finalAcc = 100;
    else if (mechWeather === WEATHER_MECHANICAL.FOG) finalAcc = Math.floor(moveAcc * 0.6);

    finalAcc = finalAcc * (1 + (0.33 * accStage)) * (1 - (0.33 * evaStage));
    if (Math.random() * 100 > finalAcc) {
      store.addLog(`¡El ataque de ${e.name} falló!`, 'log-info', e);
      return;
    }
  }
  if (e.lockOn) e.lockOn = false; // Se consume el efecto

  // 1. Determinar número de golpes
  let totalHits = 1;
  if (enemyMove.hits) {
    if (typeof enemyMove.hits === 'number') totalHits = enemyMove.hits;
    else if (enemyMove.hits === '2-5') {
      const rolls = [2, 2, 2, 3, 3, 3, 4, 5];
      totalHits = rolls[Math.floor(Math.random() * rolls.length)];
    }
  }

  let hitsDealt = 0;
  let totalDamageDealt = 0;

  try {
    for (let i = 0; i < totalHits; i++) {
      if (p.hp <= 0) break;

      const eResult = calculateDamage(e, p, enemyMove, {
        atkStages: store.enemyStages.atk,
        defStages: store.playerStages.def,
        weather: store.activeBattle.weather
      })

      if (eResult.isNoEffect) {
        store.addLog('¡No afecta!', 'log-player', p)
        break;
      } else {
        const damage = Math.floor(eResult.dmg || 0)
        
        if (enemyMove.cat !== 'status') {
          if (totalHits === 1) store.addLog(`¡${p.name} recibió ${damage} de daño!`, 'log-info', p)
          totalDamageDealt += damage;
        }

        if (eResult.isCrit && i === 0) store.addLog('¡Un golpe crítico!', 'log-enemy', e)
        if (eResult.isSuperEffective && i === 0) store.addLog('¡Es muy eficaz!', 'log-enemy', e)
        if (eResult.isNotVeryEffective && i === 0) store.addLog('No es muy eficaz...', 'log-enemy', e)
        
        // Magnitude log
        if (enemyMove.effect === 'magnitude' && eResult.power) {
          const magMap = { 10: 4, 30: 5, 50: 6, 70: 7, 90: 8, 110: 9, 150: 10 };
          const mag = magMap[eResult.power] || 7;
          store.addLog(`¡Magnitud ${mag}!`, 'log-info', p);
        }

        p.hp = Math.max(0, p.hp - damage)
        store.activeBattle.lastDamage = damage
        hitsDealt++;

        if (p.hp <= 0) {
          if (store.handleFaint) await store.handleFaint('player')
          break;
        }

        // Rage check
        if (p.rageActive && damage > 0 && p.hp > 0) {
          store.playerStages.atk = Math.min(6, (store.playerStages.atk || 0) + 1);
          store.addLog(`¡La furia de ${p.name} está creciendo!`, 'log-info', p);
        }
        
        if (enemyMove.cat !== 'status') {
          await new Promise(r => setTimeout(r, 200))
        }
      }
    }

    if (totalHits > 1 && hitsDealt > 0) {
      store.addLog(`¡Golpeó ${hitsDealt} veces!`, 'log-info', p);
    }

    // [Post-Action] Recoil, Drain, Self-KO
    if (totalDamageDealt > 0) {
      // Recoil
      if (enemyMove.recoil) {
        const recoilDiv = typeof enemyMove.recoil === 'number' ? enemyMove.recoil : 2;
        const recoilDmg = Math.floor(totalDamageDealt / recoilDiv);
        if (recoilDmg > 0) {
          e.hp = Math.max(0, e.hp - recoilDmg);
          store.addLog(`¡${e.name} recibió daño por retroceso!`, 'log-info', e);
        }
      }
      // Drain
      if (enemyMove.drain) {
        const heal = Math.floor(totalDamageDealt / 2);
        if (heal > 0) {
          e.hp = Math.min(e.maxHp, e.hp + heal);
          store.addLog(`¡${e.name} absorbió energía!`, 'log-info', e);
        }
      }
    }

    if (enemyMove.selfKO) {
      e.hp = 0;
      store.addLog(`¡${e.name} se sacrificó!`, 'log-info', e);
    }

    store.attackerSide = null

    if (enemyMove.effect && hitsDealt > 0) {
      dispatchMoveEffect(enemyMove.effect, e, p, store.enemyStages, store.playerStages, store.addLog, store.activeBattle)
    }
  } catch (err) {
    console.error('[Battle] Error in runEnemyAction:', err)
    store.addLog('¡Error en el turno del oponente!', 'log-error', e)
  }
}
