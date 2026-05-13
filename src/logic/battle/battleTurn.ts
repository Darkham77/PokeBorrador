import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'

// [PureVue-Ignore-Length]
import { calculateDamage, getEffectiveSpeed } from './battleEngine.ts'
import { canAttack } from './battleFlow.ts'
import { dispatchMoveEffect } from './actions/actionRegistry.ts'
import { decideEnemyMove, shouldEnemySwitch, findBestSwitchIndex } from './ai/battleAI.ts'
import { gameBus } from '@/logic/gameBus'
import { recalcPokemonStats } from '@/logic/pokemonFactory'
import { getMechanicalWeather, WEATHER_MECHANICAL } from './weatherMapper.ts'
import { getDayCycle } from '@/logic/timeUtils'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { MOVE_DATA } from '@/data/moves'
import type { BattleContext } from '@/types/battleContext'
import { logger } from '../utils/logger.ts'
import type { Move } from '@/types/pokemon'

/**
 * Handles the turn logic for a single move execution.
 */
export async function executeTurn(store: BattleContext, moveIndex: number) {
  const p = store.activeBattle.value?.player
  const e = store.activeBattle.value?.enemy
  
  if (!p || !e) {
    logger.warn('BattleTurn', 'Aborting turn: Player or Enemy is null', { p, e })
    return
  }

  const fsm = store.fsm
  const { BATTLE_STATES, BATTLE_SUBSTATES } = store

  // Thrash check
  if (p.thrashTurns && p.thrashTurns > 0) {
    const forcedIdx = p.moves.findIndex((m) => m?.effect === 'thrash');
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  } else if (p.encoreTurns && p.encoreTurns > 0 && p.encoreMove) {
    const forcedIdx = p.moves.findIndex((m) => m?.id === p.encoreMove?.id);
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  }

  const move = p.moves[moveIndex]
  if (!move || move.pp <= 0) {
    store.addLog(`¡No queda PP para ${move?.name || 'este movimiento'}!`, 'log-info', p)
    return
  }

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.BUILD_QUEUE)

  // Determine Turn Order (Consider Priority)
  const isWild = !store.activeBattle.value?.isTrainer && !store.activeBattle.value?.isGym
  const eMove = decideEnemyMove(e, p, store.enemyStages.value, isWild)
  
  const pPrio = move.priority || 0
  const ePrio = eMove?.priority || 0

  const pSpe = getEffectiveSpeed(p, store.playerStages.value, { weather: store.activeBattle.value?.weather })
  const eSpe = getEffectiveSpeed(e, store.enemyStages.value, { weather: store.activeBattle.value?.weather })
  
  let playerFirst = true
  if (pPrio > ePrio) playerFirst = true
  else if (ePrio > pPrio) playerFirst = false
  else playerFirst = pSpe >= eSpe

  const queue: { source: 'player' | 'enemy'; action: () => Promise<void> }[] = []
  if (playerFirst) {
    queue.push({ source: 'player', action: () => runPlayerAction(store, moveIndex) })
    if (eMove) queue.push({ source: 'enemy', action: () => runEnemyAction(store) })
  } else {
    if (eMove) queue.push({ source: 'enemy', action: () => runEnemyAction(store) })
    queue.push({ source: 'player', action: () => runPlayerAction(store, moveIndex) })
  }

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.BUILD_QUEUE)
  
  while (queue.length > 0) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POP_ACTION)
    const currentAction = queue.shift()
    if (!currentAction) break

    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)
    await currentAction.action()

    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

    if (store.activeBattle.value?.player && store.activeBattle.value.player.hp <= 0) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RESOLVE_PLAYER_FAINT)
      await store.handleFaint('player')
      break;
    }

    if (store.activeBattle.value?.enemy && store.activeBattle.value.enemy.hp <= 0) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RESOLVE_ENEMY_FAINT)
      await store.handleFaint('enemy')
      break;
    }

    if (store.activeBattle.value?.over) break;

    if (queue.length > 0) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_CONTINUE)
      await sleep(400)
    }
  }
  
  if (store.activeBattle.value?.over) {
    return
  }
  
  if (store.persistBattle) store.persistBattle()
}

export async function runPlayerAction(store: BattleContext, moveIndex: number) {
  const p = store.activeBattle.value?.player
  const e = store.activeBattle.value?.enemy
  if (!p || !e) return

  const move = p.moves[moveIndex]
  if (!move) return
  
  if (p.tauntTurns && p.tauntTurns > 0 && move.cat === 'status') {
    store.addLog(`¡La mofa impide a ${p.name} usar ${move.name}!`, 'log-info', p)
    return
  }
  if (p.disabledMove && move.id === p.disabledMove.id) {
    store.addLog(`¡${move.name} está desactivado!`, 'log-info', p)
    return
  }
  
  if (!canAttack(p, store.addLog)) return
  
  if (p.furyCutterCount && move.effect !== 'fury_cutter') p.furyCutterCount = 0;
  p.destinyBond = false;
  p.snatching = false;
  p.lastMove = move;
  store.attackerSide.value = 'player'
  
  move.pp--
  store.addLog(`¡${p.name} usó ${move.name}!`, 'log-player', p)

  let executableMove: Move = { ...move };
  
  // Charging moves logic (Solar Beam)
  const weather = store.activeBattle.value?.weather?.type;
  const mechWeather = getMechanicalWeather(weather);
  const isSunny = mechWeather === WEATHER_MECHANICAL.SUN;

  if (p.chargingMove) {
    executableMove = { ...p.chargingMove };
    p.chargingMove = null;
    store.addLog(`¡${p.name} lanzó el ataque cargado!`, 'log-info', p);
  } else if (executableMove.id === 'solar_beam' && !isSunny) {
    p.chargingMove = { ...executableMove };
    store.addLog(`¡${p.name} está reuniendo luz solar!`, 'log-info', p);
    return;
  }
  if (move.effect === 'metronome') {
    const moveNames = Object.keys(MOVE_DATA).filter(n => n !== 'Metrónomo');
    const randomName = moveNames[Math.floor(Math.random() * moveNames.length)] || 'Combate';
    const rawMoveData = (MOVE_DATA as Record<string, Partial<Move>>)[randomName] || {};
    executableMove = { ...rawMoveData, name: randomName, id: randomName.toLowerCase().replace(/\s/g, '_'), pp: 5, maxPP: 5 } as Move;
    store.addLog(`¡El Metrónomo escogió ${randomName}!`, 'log-info', p);
  } else if (move.effect === 'mirror_move') {
    if (e.lastMove) {
      executableMove = { ...e.lastMove };
      store.addLog(`¡Espejo copió ${executableMove.name}!`, 'log-info', p);
    } else {
      store.addLog("¡Pero falló!", 'log-info', p);
      return;
    }
  }

  const normalizeCat = (c: string | number | undefined): 'status' | 'special' | 'physical' => {
    if (c === 'Estado' || c === 'status' || c === 3) return 'status'
    if (c === 'Especial' || c === 'special' || c === 2) return 'special'
    return 'physical'
  }
  
  store.activeMove.value = { ...executableMove, side: 'player' }
  gameBus.emit('PLAY_ATTACK_ANIM', { side: 'player', cat: normalizeCat(executableMove.cat) })

  // Sanity check
  if (!p.atk || !p.maxHp || executableMove.power === undefined) recalcPokemonStats(p)
  if (!e.atk || !e.maxHp) recalcPokemonStats(e)
  
  if (!p.level) p.level = 5
  
  if (!p.atk || !e.def || (executableMove.power === undefined && executableMove.cat !== 'status')) {
    store.addLog(`[Error] Datos faltantes: Atk:${p.atk} Def:${e.def} Pwr:${executableMove.power}`, 'log-error', p)
  }
  if (store.activeBattle.value && !store.activeBattle.value.participants.includes(p.uid)) {
    store.activeBattle.value.participants.push(p.uid)
  }

  // Precision Check
  const moveAcc = executableMove.acc || 100;
  if (moveAcc < 100 && !p.lockOn) {
    const accStage = store.playerStages.value.acc || 0;
    const evaStage = store.enemyStages.value.eva || 0;
    const weather = store.activeBattle.value?.weather?.type;
    const mechWeather = getMechanicalWeather(weather);
    const cycle = getDayCycle();
    const isSunActive = mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning'))
    const isRainActive = mechWeather === WEATHER_MECHANICAL.RAIN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'night' || cycle === 'dusk'))
    let finalAcc = moveAcc;
    
    if (isRainActive && (executableMove.id === 'thunder' || executableMove.id === 'hurricane')) finalAcc = 100;
    else if (isSunActive && (executableMove.id === 'thunder' || executableMove.id === 'hurricane')) finalAcc = 50;
    else if ((mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) && executableMove.id === 'blizzard') finalAcc = 100;
    else if (mechWeather === WEATHER_MECHANICAL.FOG) { const isMist = weather === "mist" || weather === "mist_visual"; finalAcc = Math.floor(moveAcc * (isMist ? 0.8 : 0.6)); }

    finalAcc = finalAcc * (1 + (0.33 * accStage)) * (1 - (0.33 * evaStage));
    if (Math.random() * 100 > finalAcc) {
      store.addLog(`¡El ataque de ${p.name} falló!`, 'log-info', p);
      return;
    }
  }
  if (p.lockOn) p.lockOn = false;

  if (executableMove && (executableMove.effect === undefined || executableMove.effect === null)) {
    const freshMoveData = pokemonDataProvider.getMoveData(executableMove.name);
    if (freshMoveData && freshMoveData.effect) {
      executableMove.effect = freshMoveData.effect;
    }
  }

  let totalHits = 1;
  if (executableMove.hits) {
    if (typeof executableMove.hits === 'number') totalHits = executableMove.hits;
    else if (executableMove.hits === '2-5') {
      const rolls = [2, 2, 2, 3, 3, 3, 4, 5];
      totalHits = (rolls[Math.floor(Math.random() * rolls.length)] as number);
    }
  }

  let hitsDealt = 0;
  let totalDamageDealt = 0;

  try {
    for (let i = 0; i < totalHits; i++) {
      if (e.hp <= 0) break;

      const result = calculateDamage(p, e, executableMove, { 
        atkStages: store.playerStages.value.atk, 
        defStages: store.enemyStages.value.def,
        weather: store.activeBattle.value?.weather
      })

      if (result.isNoEffect) {
        store.addLog('¡No afecta!', 'log-enemy', e)
        break;
      } else {
        const damage = Math.floor(result.dmg || 0)
        
        if (executableMove.cat !== 'status') {
          if (totalHits === 1) store.addLog(`¡${e.name} recibió ${damage} de daño!`, 'log-info', e)
          totalDamageDealt += damage;
        }

        if (result.isNotVeryEffective && i === 0) store.addLog('No es muy eficaz...', 'log-player', p)
        if (result.isSuperEffective && i === 0) store.addLog('¡Es muy eficaz!', 'log-player', p)

        if (executableMove.effect === 'magnitude' && result.power) {
          const magMap: Record<number, number> = { 10: 4, 30: 5, 50: 6, 70: 7, 90: 8, 110: 9, 150: 10 };
          const mag = magMap[result.power] || 7;
          store.addLog(`¡Magnitud ${mag}!`, 'log-info', e);
        }

        e.hp = Math.max(0, e.hp - damage)
        gameBus.emit('PLAY_DAMAGE', { side: 'enemy', damage })
        if (store.activeBattle.value) store.activeBattle.value.lastDamage = damage
        hitsDealt++;
        
        if (e.hp <= 0) break;
        
        if (e.rageActive && damage > 0 && e.hp > 0) {
          store.enemyStages.value.atk = Math.min(6, (store.enemyStages.value.atk || 0) + 1);
          store.addLog(`¡La furia de ${e.name} está creciendo!`, 'log-info', e);
        }

        if (executableMove.cat !== 'status') {
          await sleep(200)
        }
      }
    }

    if (totalHits > 1 && hitsDealt > 0) {
      store.addLog(`¡Golpeó ${hitsDealt} veces!`, 'log-info', e);
    }

    if (totalDamageDealt > 0) {
      if (executableMove.recoil) {
        const recoilDiv = typeof executableMove.recoil === 'number' ? executableMove.recoil : 2;
        const recoilDmg = Math.floor(totalDamageDealt / recoilDiv);
        if (recoilDmg > 0) {
          p.hp = Math.max(0, p.hp - recoilDmg);
          store.addLog(`¡${p.name} recibió daño por retroceso!`, 'log-info', p);
        }
      }
      if (executableMove.drain) {
        const heal = Math.floor(totalDamageDealt / 2);
        if (heal > 0) {
          p.hp = Math.min(p.maxHp, p.hp + heal);
          store.addLog(`¡${p.name} absorbió energía!`, 'log-info', p);
        }
      }
    }

    if (executableMove.selfKO) {
      p.hp = 0;
      store.addLog(`¡${p.name} se sacrificó!`, 'log-info', p);
    }

    store.attackerSide.value = null

    if (executableMove.effect && hitsDealt > 0 && store.activeBattle.value) {
      dispatchMoveEffect(executableMove.effect as string, p, e, store.playerStages.value, store.enemyStages.value, store.addLog, store)
    }
 
  } catch (err) {
    logger.error('Battle', `Error in runPlayerAction: ${(err as Error).message}`)
    store.addLog('¡Error en el turno del jugador!', 'log-error', p)
  }
}

export async function runEnemyAction(store: BattleContext) {
  const p = store.activeBattle.value?.player
  const e = store.activeBattle.value?.enemy
  if (!p || !e || e.hp <= 0) return
  const fsm = store.fsm
  const { BATTLE_STATES, BATTLE_SUBSTATES } = store

  if (!canAttack(e, store.addLog)) return

  const isWild = !store.activeBattle.value?.isTrainer && !store.activeBattle.value?.isGym
  
  if (!isWild && store.activeBattle.value && shouldEnemySwitch(e, p, store.activeBattle.value.enemyTeam)) {
    const bestIdx = findBestSwitchIndex(store.activeBattle.value.enemyTeam || [], p, e.uid)
    if (store.activeBattle.value.enemyTeam && bestIdx !== -1) {
      const newPoke = store.activeBattle.value.enemyTeam[bestIdx]
      if (!newPoke) return
      store.addLog(`¡${store.activeBattle.value.trainerName || 'El entrenador'} retira a ${e.name}!`, 'log-enemy', 'enemy_trainer')
      
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.TRAINER_RETREAT)
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL)
      gameBus.emit('PLAY_WITHDRAW', { side: 'enemy' })
      await sleep(800)
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
      
      store.activeBattle.value.enemy = newPoke
      
      store.enemyStages.value.atk = 0; store.enemyStages.value.def = 0; store.enemyStages.value.spa = 0; store.enemyStages.value.spd = 0; store.enemyStages.value.spe = 0; store.enemyStages.value.acc = 0; store.enemyStages.value.eva = 0;

      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL)
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.OCCUPY_SEAT)
      store.addLog(`¡Envía a ${newPoke.name}!`, 'log-enemy', newPoke)
      gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: newPoke })
      await sleep(800)

      if (store.enemyStages.value.spikes && store.enemyStages.value.spikes > 0 && newPoke.type !== 'flying' && newPoke.type2 !== 'flying' && newPoke.ability !== 'Levitación') {
        const dmg = Math.floor(newPoke.maxHp * (store.enemyStages.value.spikes / 8))
        newPoke.hp = Math.max(0, newPoke.hp - dmg)
        store.addLog(`¡${newPoke.name} recibió daño por las púas!`, 'log-info', newPoke)
        gameBus.emit('PLAY_SOUND', 'statusDamage')
      }
      return
    }
  }

  if ((store.activeBattle.value?.isGym) && e.hp < (e.maxHp * 0.25) && !store.activeBattle.value.enemyUsedItem) {
    store.activeBattle.value.enemyUsedItem = true
    const heal = Math.floor(e.maxHp * 0.5)
    e.hp = Math.min(e.maxHp, e.hp + heal)
    store.addLog(`¡El Líder usó una Hiper Poción!`, 'log-enemy', 'enemy_trainer')
    store.addLog(`¡${e.name} recuperó salud!`, 'log-info', e, 'enemy')
    return
  }

  const enemyMove = decideEnemyMove(e, p, store.playerStages.value, isWild)
  if (!enemyMove) {
    store.addLog(`¡${e.name} no tiene más PP y usa Forcejeo!`, 'log-enemy', e)
    return
  }

  if (!e.atk || !e.maxHp || enemyMove.power === undefined) recalcPokemonStats(e)
  if (!p.atk || !p.maxHp) recalcPokemonStats(p)
  if (!e.level) e.level = 5

  if (e.furyCutterCount && enemyMove.effect !== 'fury_cutter') e.furyCutterCount = 0;
  e.destinyBond = false;
  e.snatching = false;
  e.lastMove = enemyMove
  store.attackerSide.value = 'enemy'
  store.addLog(`¡${e.name} usó ${enemyMove.name}!`, 'log-enemy', e)

  let executableMove: Move = { ...enemyMove };

  // Charging moves logic (Solar Beam)
  const weather = store.activeBattle.value?.weather?.type;
  const mechWeather = getMechanicalWeather(weather);
  const isSunny = mechWeather === WEATHER_MECHANICAL.SUN;

  if (e.chargingMove) {
    executableMove = { ...e.chargingMove };
    e.chargingMove = null;
    store.addLog(`¡${e.name} lanzó el ataque cargado!`, 'log-info', e);
  } else if (executableMove.id === 'solar_beam' && !isSunny) {
    e.chargingMove = { ...executableMove };
    store.addLog(`¡${e.name} está reuniendo luz solar!`, 'log-info', e);
    return;
  }
  if (enemyMove.effect === 'metronome') {
    const moveNames = Object.keys(MOVE_DATA).filter(n => n !== 'Metrónomo');
    const randomName = moveNames[Math.floor(Math.random() * moveNames.length)] || 'Combate';
    const rawMoveData = (MOVE_DATA as Record<string, Partial<Move>>)[randomName] || {};
    executableMove = { ...rawMoveData, name: randomName, id: randomName.toLowerCase().replace(/\s/g, '_'), pp: 5, maxPP: 5 } as Move;
    store.addLog(`¡El Metrónomo escogió ${randomName}!`, 'log-info', e);
  } else if (enemyMove.effect === 'mirror_move') {
    if (p.lastMove) {
      executableMove = { ...p.lastMove };
      store.addLog(`¡Espejo copió ${executableMove.name}!`, 'log-info', e);
    } else {
      store.addLog("¡Pero falló!", 'log-info', e);
      return;
    }
  }

  const normalizeCat = (c: string | number | undefined): 'status' | 'special' | 'physical' => {
    if (c === 'Estado' || c === 'status' || c === 3) return 'status'
    if (c === 'Especial' || c === 'special' || c === 2) return 'special'
    return 'physical'
  }

  store.activeMove.value = { ...executableMove, side: 'enemy' }
  gameBus.emit('PLAY_ATTACK_ANIM', { side: 'enemy', cat: normalizeCat(executableMove.cat) })

  // Precision Check
  const moveAcc = executableMove.acc || 100;
  if (moveAcc < 100 && !e.lockOn) {
    const accStage = store.enemyStages.value.acc || 0;
    const evaStage = store.playerStages.value.eva || 0;
    const weather = store.activeBattle.value?.weather?.type;
    const mechWeather = getMechanicalWeather(weather);
    const cycle = getDayCycle();
    const isRaining = mechWeather === WEATHER_MECHANICAL.RAIN
    const isSunny = mechWeather === WEATHER_MECHANICAL.SUN
    const isDayTime = cycle === 'day' || cycle === 'morning'
    
    const isSunActive = isSunny || (mechWeather === WEATHER_MECHANICAL.CLEAR && isDayTime)
    
    let finalAcc = moveAcc;

    if (isRaining && (executableMove.id === 'thunder' || executableMove.id === 'hurricane')) finalAcc = 100;
    else if (isSunActive && (executableMove.id === 'thunder' || executableMove.id === 'hurricane')) finalAcc = 50;
    else if ((mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) && executableMove.id === 'blizzard') finalAcc = 100;
    else if (mechWeather === WEATHER_MECHANICAL.FOG) { const isMist = weather === "mist" || weather === "mist_visual"; finalAcc = Math.floor(moveAcc * (isMist ? 0.8 : 0.6)); }

    finalAcc = finalAcc * (1 + (0.33 * accStage)) * (1 - (0.33 * evaStage));
    if (Math.random() * 100 > finalAcc) {
      store.addLog(`¡El ataque de ${e.name} falló!`, 'log-info', e);
      return;
    }
  }
  if (e.lockOn) e.lockOn = false;

  let totalHits = 1;
  if (executableMove.hits) {
    if (typeof executableMove.hits === 'number') totalHits = executableMove.hits;
    else if (executableMove.hits === '2-5') {
      const rolls = [2, 2, 2, 3, 3, 3, 4, 5];
      totalHits = (rolls[Math.floor(Math.random() * rolls.length)] as number);
    }
  }

  let hitsDealt = 0;
  let totalDamageDealt = 0;

  try {
    for (let i = 0; i < totalHits; i++) {
      if (p.hp <= 0) break;

      const eResult = calculateDamage(e, p, executableMove, {
        atkStages: store.enemyStages.value.atk,
        defStages: store.playerStages.value.def,
        weather: store.activeBattle.value?.weather
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
        
        if (enemyMove.effect === 'magnitude' && eResult.power) {
          const magMap: Record<number, number> = { 10: 4, 30: 5, 50: 6, 70: 7, 90: 8, 110: 9, 150: 10 };
          const mag = magMap[eResult.power] || 7;
          store.addLog(`¡Magnitud ${mag}!`, 'log-info', p);
        }

        p.hp = Math.max(0, p.hp - damage)
        gameBus.emit('PLAY_DAMAGE', { side: 'player', damage })
        if (store.activeBattle.value) store.activeBattle.value.lastDamage = damage
        hitsDealt++;

        if (p.hp <= 0) break;

        if (p.rageActive && damage > 0 && p.hp > 0) {
          store.playerStages.value.atk = Math.min(6, (store.playerStages.value.atk || 0) + 1);
          store.addLog(`¡La furia de ${p.name} está creciendo!`, 'log-info', p);
        }
        
        if (enemyMove.cat !== 'status') {
          await sleep(200)
        }
      }
    }

    if (totalHits > 1 && hitsDealt > 0) {
      store.addLog(`¡Golpeó ${hitsDealt} veces!`, 'log-info', p);
    }

    if (totalDamageDealt > 0) {
      if (executableMove.recoil) {
        const recoilDiv = typeof executableMove.recoil === 'number' ? executableMove.recoil : 2;
        const recoilDmg = Math.floor(totalDamageDealt / recoilDiv);
        if (recoilDmg > 0) {
          e.hp = Math.max(0, e.hp - recoilDmg);
          store.addLog(`¡${e.name} recibió daño por retroceso!`, 'log-info', e);
        }
      }
      if (executableMove.drain) {
        const heal = Math.floor(totalDamageDealt / 2);
        if (heal > 0) {
          e.hp = Math.min(e.maxHp, e.hp + heal);
          store.addLog(`¡${e.name} absorbió energía!`, 'log-info', e);
        }
      }
    }

    if (executableMove.selfKO) {
      e.hp = 0;
      store.addLog(`¡${e.name} se sacrificó!`, 'log-info', e);
    }

    store.attackerSide.value = null

    if (executableMove.effect && hitsDealt > 0 && store.activeBattle.value) {
      dispatchMoveEffect(executableMove.effect as string, e, p, store.enemyStages.value, store.playerStages.value, store.addLog, store)
    }
  } catch (err) {
    logger.error('Battle', `Error in runEnemyAction: ${(err as Error).message}`)
    store.addLog('¡Error en el turno del oponente!', 'log-error', e)
  }
}
