import { getCombinedEffectiveness } from '../battleEngine.ts'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import type { BattleStages } from '@/types/battle/battle'

/**
 * Motor de Inteligencia Artificial para el Combate
 * Portado y modernizado desde public/js/07_battle.js
 */

export const decideEnemyMove = (enemy: Pokemon, player: Pokemon, playerStages: BattleStages, isWild = false): Move | null => {
  const battleStore = useBattleStore()
  const enemyRequest = battleStore.state?.enemyRequest

  console.log('[DEBUG-AI] decideEnemyMove called for:', enemy.name, 'isWild:', isWild);
  console.log('[DEBUG-AI] enemy.moves:', enemy.moves ? enemy.moves.map(m => m ? `${m.id}(pp:${m.pp}/${m.maxPP})` : 'null') : 'null');
  console.log('[DEBUG-AI] enemyRequest:', JSON.stringify(enemyRequest || null));

  const validMoves = enemy.moves.filter((m): m is Move => {
    if (!m || m.pp <= 0) return false
    if (enemy.disabledMove && m.id === enemy.disabledMove.id) return false
    
    interface ShowdownMoveRequest {
      id: string;
      disabled?: boolean;
    }
    interface ShowdownActiveRequest {
      moves?: ShowdownMoveRequest[];
    }
    interface ShowdownPlayerRequest {
      active?: ShowdownActiveRequest[];
    }

    // Excluir movimientos deshabilitados o ausentes informados por el request del simulador
    const enemyReq = enemyRequest as ShowdownPlayerRequest | undefined;
    if (enemyReq && enemyReq.active?.[0]?.moves) {
      const reqMove = enemyReq.active[0].moves.find((rm: ShowdownMoveRequest) => rm.id === m.id);
      if (!reqMove || reqMove.disabled) return false;
    }
    
    return true
  })
  console.log('[DEBUG-AI] filtered validMoves:', validMoves.map(m => m.id));
  if (validMoves.length === 0) return null

  // Si es salvaje, elige al azar (Gen 3 wild behavior)
  if (isWild) {
    return validMoves[Math.floor(Math.random() * validMoves.length)] || null
  }


  // Si es Entrenador o Gimnasio, usa lógica de puntuación
  let bestMove = validMoves[0]
  let maxScore = -1

  validMoves.forEach((m) => {
    const s = scoreMove(m, enemy, player, playerStages)
    if (s > maxScore) {
      maxScore = s
      bestMove = m
    }
  })

  return bestMove || null
}

import { calculateDamageRangePure, type PureMove, type PurePokemon } from '../battleMath.ts'
import { getDayCycle } from '@/logic/utils/timeUtils'
import { useBattleStore } from '@/stores/battle/battle'

export const scoreMove = (move: Move, attacker: Pokemon, defender: Pokemon, defStages: BattleStages) => {
  const effectStr = typeof move.effect === 'string' ? move.effect : ''

  // 1. Caso base para movimientos de estado
  if (move.cat === 'status') {
    let score = 30

    // Si duerme o paraliza y el oponente no tiene estado alterado, es muy prioritario
    if ((effectStr === 'sleep' || effectStr === 'paralyze') && !defender.status) {
      score = 60
    }

    // No repetir estados alterados
    const statusEffects = ['sleep', 'paralyze', 'poison', 'toxic', 'burn', 'freeze']
    if (statusEffects.includes(effectStr) && defender.status) {
      return 0
    }

    // Evitar seguir bajando estadísticas si ya están al mínimo (-2 o peor)
    if (effectStr === 'lower_atk' && (defStages.atk || 0) <= -2) score = 5
    if (effectStr === 'lower_def' && (defStages.def || 0) <= -2) score = 5
    if (effectStr === 'lower_spa' && (defStages.spa || 0) <= -2) score = 5
    if (effectStr === 'lower_spd' && (defStages.spd || 0) <= -2) score = 5
    if (effectStr === 'lower_spe' && (defStages.spe || 0) <= -2) score = 5

    // Movimientos que mejoran estadísticas propias
    if (effectStr.startsWith('stat_up_self')) {
      // Priorizar buffearse en los primeros turnos si el atacante tiene alta salud (>75%)
      const hpPct = attacker.hp / attacker.maxHp
      if (hpPct > 0.75) {
        score = 45
      } else {
        score = 20 // Menos prioridad si ya estamos en apuros
      }
    }

    // Movimientos curativos (heal_50, etc.)
    if (effectStr === 'heal_50') {
      const hpPct = attacker.hp / attacker.maxHp
      if (hpPct < 0.4) {
        score = 75 // ¡Curación crítica de alta prioridad!
      } else if (hpPct > 0.8) {
        score = 5 // Inútil curarse si estamos casi llenos
      } else {
        score = 30
      }
    }

    // Añadir aleatoriedad
    return score * (0.8 + Math.random() * 0.4)
  }

  // 2. Movimientos ofensivos (daño directo)
  let score = move.power || 40

  // Clima y ciclo de día
  let weather = null
  try {
    const battleStore = useBattleStore()
    weather = battleStore.state?.weather || null
  } catch {
    // Si Pinia aún no está inicializado (ej. en tests)
  }
  const cycle = getDayCycle()

  const pureMove: PureMove = {
    id: move.id,
    name: move.name,
    type: move.type || 'normal',
    power: move.power || 0,
    cat: move.cat as PureMove['cat'],
    effect: effectStr
  }

  const pureCtx = {
    atkStages: 0, // En IA simple asumimos stages neutros para la estimación rápida
    defStages: defStages.def || 0,
    weather: weather ? { type: weather.type, turns: weather.turns } : null
  }

  // Invocar al estimador de daño puro
  const result = calculateDamageRangePure(
    attacker as unknown as PurePokemon,
    defender as unknown as PurePokemon,
    pureMove,
    pureCtx,
    cycle
  )

  const eff = result.effectiveness?.value ?? 1
  if (eff === 0) return 0 // Inmunidad total

  if (result.damageRange) {
    const minDmg = result.damageRange.normalMin
    const maxDmg = result.damageRange.normalMax
    const avgDmg = (minDmg + maxDmg) / 2
    const targetHp = defender.hp || 1

    // A) ¿OHKO Garantizado? Prioridad Finisher Máxima
    if (minDmg >= targetHp) {
      score = 150 // Supera a cualquier movimiento de estado
    }
    // B) ¿OHKO Posible? Ponderación por probabilidad
    else if (maxDmg >= targetHp) {
      const diff = maxDmg - minDmg
      const prob = diff > 0 ? (maxDmg - targetHp) / diff : 0.5
      // Multiplicador por probabilidad (OHKO posible da un gran bono ponderado)
      score = 80 + (70 * prob) 
    }
    // C) Sin KO inmediato: Puntuación proporcional al % de HP restante que reducimos
    else {
      const dmgPct = avgDmg / targetHp // Qué porcentaje de su vida actual le quitamos
      score = (move.power || 40) * eff * (1 + dmgPct)
    }
  } else {
    // Fallback simple si no hay rango (ej. sin power)
    score *= eff
  }

  // STAB
  if (move.type === attacker.type || move.type === attacker.type2) {
    score *= 1.5
  }

  // Autodestrucción inteligente
  if (move.selfKO) {
    const hpPct = attacker.hp / attacker.maxHp
    const canKO = result.damageRange ? (result.damageRange.normalMax >= defender.hp) : false
    if (hpPct > 0.25 && !canKO) score *= 0.01 
    else if (canKO) score *= 1.5
    else score *= 0.8
  }

  // Preservación y escala de prioridades (ej. Ataque Rápido / Velocidad Extrema)
  if (move.priority && move.priority !== 0) {
    const pVal = move.priority
    if (pVal > 0) {
      const defHpPct = defender.hp / defender.maxHp
      if (defHpPct < 0.3) {
        const isSlower = (attacker.spe || 0) < (defender.spe || 0)
        score *= isSlower ? 2.0 : 1.5
      } else {
        score *= 1.1
      }
    } else if (pVal < 0) {
      const attHpPct = attacker.hp / attacker.maxHp
      if (attHpPct < 0.25) {
        score *= 0.1
      } else {
        score *= 0.8
      }
    }
  }

  // Añadir aleatoriedad para evitar predictibilidad
  return score * (0.8 + Math.random() * 0.4)
}

/**
 * Evalúa si el oponente debería cambiar de Pokémon
 */
export const shouldEnemySwitch = (enemy: Pokemon, player: Pokemon, enemyTeam: Pokemon[] | undefined) => {
  if (!enemyTeam || enemyTeam.filter((p) => p.hp > 0).length <= 1) return false

  const playerEff = getCombinedEffectiveness(player.type, enemy)
  const isBadMatch = playerEff >= 2

  // Si tiene mala ventaja de tipo, hay un 20% - 40% de chance de cambio
  if (isBadMatch && Math.random() < 0.3) {
    return true
  }

  return false
}

export const findBestSwitchIndex = (enemyTeam: Pokemon[], player: Pokemon, currentEnemyUid: string): number => {
  let bestIdx = -1
  let bestScore = -1
  
  enemyTeam.forEach((p, idx) => {
    if (p.hp <= 0 || p.uid === currentEnemyUid) return

    let score = 0
    // Defense: how well we tank the player
    const playerEff = getCombinedEffectiveness(player.type, p)
    score += (2 - playerEff) * 50

    // Offense: how well we hit the player
    const maxOffense = Math.max(...p.moves.map((m) => {
      if (!m) return 0
      const eff = getCombinedEffectiveness(m.type || 'normal', player, p)
      return eff * (m.power || 40)
    }))
    score += maxOffense

    if (score > bestScore) {
      bestScore = score
      bestIdx = idx
    }
  })

  return bestIdx
}

export const getBattleAITools = () => {
  return {
    scoreMove,
    decideEnemyMove,
    shouldEnemySwitch,
    findBestSwitchIndex
  };
}
