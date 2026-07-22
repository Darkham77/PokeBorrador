import { calculateDamage } from '@/logic/battle/battleEngine'
import { recalcPokemonStats } from '@/logic/pokemon/pokemonFactory'
import { canAttack, updateCastformForm } from '@/logic/battle/battleFlow'
import { dispatchMoveEffect } from './actionRegistry.ts'
import { gameBus } from '@/logic/events/gameBus'
import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { Dex } from '@pkmn/sim'
import { ACTIVE_GENERATION } from '@/data/system/constants'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Move } from '@/types/pokemon/pokemon'
import { checkMoveAccuracy } from './moveAccuracyHelper.ts'
import { logger } from '@/logic/utils/logger'

export async function executeMoveAction(
  store: BattleContext,
  side: 'player' | 'enemy',
  move: Move
) {
  const p = store.activeBattle.value?.player
  const e = store.activeBattle.value?.enemy
  if (!p || !e) return

  // Actualización al inicio del turno del atacante (antes de pegar)
  if (store.activeBattle.value) {
    updateCastformForm(p, store.activeBattle.value.weather?.type, store.addLog)
    updateCastformForm(e, store.activeBattle.value.weather?.type, store.addLog)
  }

  const attacker = side === 'player' ? p : e
  const defender = side === 'player' ? e : p
  const attackerStages = side === 'player' ? store.playerStages.value : store.enemyStages.value
  const defenderStages = side === 'player' ? store.enemyStages.value : store.playerStages.value
  const logStyle = side === 'player' ? 'log-player' : 'log-enemy'

  if (attacker.tauntTurns && attacker.tauntTurns > 0 && move.cat === 'status') {
    store.addLog(`¡La mofa impide a ${attacker.name} usar ${move.name}!`, 'log-info', attacker)
    return
  }
  if (attacker.disabledMove && move.id === attacker.disabledMove.id) {
    store.addLog(`¡${move.name} está desactivado!`, 'log-info', attacker)
    return
  }

  if (!await canAttack(attacker, store)) return

  if (attacker.furyCutterCount && move.effect !== 'fury_cutter') attacker.furyCutterCount = 0
  attacker.destinyBond = false
  attacker.snatching = false
  if (attacker.heldItem && (attacker.heldItem === 'choiceband' || attacker.heldItem === 'choicespecs' || attacker.heldItem === 'choicescarf')) {
    attacker.choiceMove = move.id
  }
  attacker.lastMove = move
  store.attackerSide.value = side

  try {
    if (side === 'player') {
      const isLockedMove = !!(attacker.volatileCounters?.['lockedmove'] && attacker.volatileCounters['lockedmove'] > 0)
      const isThrashLocked = !!(attacker.thrashTurns && attacker.thrashTurns > 0)
      if (!isLockedMove && !isThrashLocked && move.pp > 0) {
        move.pp--
      }
    }
    store.addLog(`¡${attacker.name} usó ${move.name}!`, logStyle, attacker)

    let executableMove: Move = { ...move }

    // Charging moves logic (Solar Beam)
    const weather = store.activeBattle.value?.weather?.type
    const mechWeather = getMechanicalWeather(weather)
    const isSunny = mechWeather === WEATHER_MECHANICAL.SUN

    if (attacker.chargingMove) {
      executableMove = { ...attacker.chargingMove }
      attacker.chargingMove = null
      store.addLog(`¡${attacker.name} lanzó el ataque cargado!`, 'log-info', attacker)
    } else if (executableMove.id === 'solar_beam' && !isSunny) {
      attacker.chargingMove = { ...executableMove }
      store.addLog(`¡${attacker.name} está reuniendo luz solar!`, 'log-info', attacker)
      return
    }

    if (move.effect === 'metronome') {
      const allMoves = Dex.forGen(ACTIVE_GENERATION).moves.all().filter(m => m.id !== 'metronome' && m.id !== 'struggle');
      const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
      if (randomMove) {
        const rawMoveData = pokemonDataProvider.getMoveData(randomMove.id) || {};
        executableMove = { ...rawMoveData, pp: 5, maxPP: 5 } as Move;
        store.addLog(`¡El Metrónomo escogió ${executableMove.name}!`, 'log-info', attacker);
      } else {
        store.addLog("¡Pero falló!", 'log-info', attacker);
        return;
      }
    } else if (move.effect === 'mirror_move') {
      if (defender.lastMove) {
        executableMove = { ...defender.lastMove }
        store.addLog(`¡Espejo copió ${executableMove.name}!`, 'log-info', attacker)
      } else {
        store.addLog("¡Pero falló!", 'log-info', attacker)
        return
      }
    }

    const normalizeCat = (c: string | number | undefined): 'status' | 'special' | 'physical' => {
      const lower = String(c || '').toLowerCase()
      if (lower === 'estado' || lower === 'status' || c === 3) return 'status'
      if (lower === 'especial' || lower === 'special' || c === 2) return 'special'
      return 'physical'
    }

    store.activeMove.value = { ...executableMove, side }
    gameBus.emit('PLAY_ATTACK_ANIM', { side, cat: normalizeCat(executableMove.cat) })

    // Sanity check
    if (!attacker.atk || !attacker.maxHp || executableMove.power === undefined) recalcPokemonStats(attacker)
    if (!defender.atk || !defender.maxHp) recalcPokemonStats(defender)

    if (!attacker.level) attacker.level = 5

    if (!attacker.atk || !defender.def || (executableMove.power === undefined && executableMove.cat !== 'status')) {
      store.addLog(`[Error] Datos faltantes: Atk:${attacker.atk} Def:${defender.def} Pwr:${executableMove.power}`, 'log-error', attacker)
    }
    if (store.activeBattle.value && !store.activeBattle.value.participants.includes(attacker.uid)) {
      store.activeBattle.value.participants.push(attacker.uid)
    }

    // Precision Check
    if (!checkMoveAccuracy(store, attacker, defender, attackerStages, defenderStages, executableMove)) {
      return
    }

    if (executableMove && (executableMove.effect === undefined || executableMove.effect === null)) {
      if (!executableMove.id) throw new Error('[moveExecutor] El movimiento ejecutable no tiene un ID válido.');
      const freshMoveData = pokemonDataProvider.getMoveData(executableMove.id)
      if (!freshMoveData) throw new Error(`[moveExecutor] No se encontró información para el movimiento: ${executableMove.id}`);
      if (freshMoveData.effect) {
        executableMove.effect = freshMoveData.effect
      }
    }

    let totalHits = 1
    if (executableMove.hits) {
      if (typeof executableMove.hits === 'number') totalHits = executableMove.hits
      else if (executableMove.hits === '2-5') {
        const rolls = [2, 2, 2, 3, 3, 3, 4, 5]
        totalHits = (rolls[Math.floor(Math.random() * rolls.length)] as number)
      }
    }

    let hitsDealt = 0
    let totalDamageDealt = 0

    for (let i = 0; i < totalHits; i++) {
      if (defender.hp <= 0) break

      const result = calculateDamage(attacker, defender, executableMove, {
        atkStages: attackerStages.atk,
        defStages: defenderStages.def,
        weather: store.activeBattle.value?.weather,
        cycle: store.activeBattle.value?.isGym ? 'day' : undefined
      })

      if (result.isNoEffect) {
        store.addLog(`¡No afecta a ${defender.name}!`, side === 'player' ? 'log-enemy' : 'log-player', defender)
        break
      } else {
        const damage = Math.floor(result.dmg || 0)

        if (executableMove.cat !== 'status') {
          if (totalHits === 1) store.addLog(`¡${defender.name} recibió ${damage} de daño!`, 'log-info', defender)
          totalDamageDealt += damage
        }

        if (result.isCrit && i === 0) store.addLog('¡Un golpe crítico!', logStyle, attacker)
        if (result.isNotVeryEffective && i === 0) store.addLog('No es muy eficaz...', logStyle, attacker)
        if (result.isSuperEffective && i === 0) store.addLog('¡Es súper eficaz!', logStyle, attacker)

        if (executableMove.effect === 'magnitude' && result.power) {
          const magMap: Record<number, number> = { 10: 4, 30: 5, 50: 6, 70: 7, 90: 8, 110: 9, 150: 10 }
          const mag = magMap[result.power] || 7
          store.addLog(`¡Magnitud ${mag}!`, 'log-info', defender)
        }

        defender.hp = Math.max(0, defender.hp - damage)
        if (store.activeBattle.value) store.activeBattle.value.lastDamage = damage
        hitsDealt++

        if (defender.hp <= 0) break

        if (defender.rageActive && damage > 0 && defender.hp > 0) {
          defenderStages.atk = Math.min(6, (defenderStages.atk || 0) + 1)
          store.addLog(`¡La furia de ${defender.name} está creciendo!`, 'log-info', defender)
        }

        if (executableMove.cat !== 'status' && store.animations?.handleShakeRequest) {
          await store.animations.handleShakeRequest({ side: side === 'player' ? 'enemy' : 'player' })
        }
      }
    }

    if (totalHits > 1 && hitsDealt > 0) {
      store.addLog(`¡Golpeó ${hitsDealt} veces!`, 'log-info', defender)
    }

    if (totalDamageDealt > 0) {
      if (side === 'player') {
        if (!store.gs.state.stats) {
          store.gs.state.stats = {}
        }
        const currentMax = Number(store.gs.state.stats.maxDamage) || 0
        if (totalDamageDealt > currentMax) {
          store.gs.state.stats.maxDamage = totalDamageDealt
        }
      }

      if (executableMove.recoil) {
        const recoilDiv = typeof executableMove.recoil === 'number' ? executableMove.recoil : 2
        const recoilDmg = Math.floor(totalDamageDealt / recoilDiv)
        if (recoilDmg > 0) {
          attacker.hp = Math.max(0, attacker.hp - recoilDmg)
          store.addLog(`¡${attacker.name} recibió daño por retroceso!`, 'log-info', attacker)
        }
      }
      if (executableMove.drain) {
        const heal = Math.floor(totalDamageDealt / 2)
        if (heal > 0) {
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal)
          store.addLog(`¡${attacker.name} absorbió energía!`, 'log-info', attacker)
        }
      }
    }

    if (executableMove.selfKO) {
      attacker.hp = 0
      store.addLog(`¡${attacker.name} se sacrificó!`, 'log-info', attacker)
    }

    if (executableMove.effect && hitsDealt > 0 && store.activeBattle.value) {
      await dispatchMoveEffect(
        executableMove.effect as string,
        attacker,
        defender,
        attackerStages,
        defenderStages,
        store.addLog,
        store
      )
      
      // Si el efecto del movimiento modificó el clima, actualizamos a Castform inmediatamente en este mismo turno
      updateCastformForm(p, store.activeBattle.value.weather?.type, store.addLog)
      updateCastformForm(e, store.activeBattle.value.weather?.type, store.addLog)
    }
  } catch (err) {
    logger.error('Battle', `Error in executeMoveAction: ${(err as Error).message}`)
    store.addLog(
      side === 'player' ? '¡Error en el turno del jugador!' : '¡Error en el turno del oponente!',
      'log-error',
      attacker
    )
  } finally {
    if (store.animations?.awaitTween) {
      await store.animations.awaitTween(side === 'player' ? 'attack-player' : 'attack-enemy')
    }
    store.attackerSide.value = null
    store.activeMove.value = null
  }
}
