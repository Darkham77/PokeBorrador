import { getTypeEffectiveness, getCombinedEffectiveness } from '../battleEngine'

/**
 * Motor de Inteligencia Artificial para el Combate
 * Portado y modernizado desde public/js/07_battle.js
 */

export const decideEnemyMove = (enemy, player, playerStages, isWild = false) => {
  const validMoves = enemy.moves.filter(m => m.pp > 0)
  if (validMoves.length === 0) return null

  // Si es salvaje, elige al azar (Gen 3 wild behavior)
  if (isWild) {
    return validMoves[Math.floor(Math.random() * validMoves.length)]
  }

  // Si es Entrenador o Gimnasio, usa lógica de puntuación
  let bestMove = validMoves[0]
  let maxScore = -1

  validMoves.forEach(m => {
    const s = scoreMove(m, enemy, player, playerStages)
    if (s > maxScore) {
      maxScore = s
      bestMove = m
    }
  })

  return bestMove
}

export const scoreMove = (move, attacker, defender, defStages) => {
  // md = move data (placeholder or from global data)
  let score = move.power || 40
  if (move.cat === 'status') score = 30

  const totalEff = getCombinedEffectiveness(move.type, defender, attacker)
  
  if (totalEff === 0 && move.cat !== 'status') return 0
  score *= totalEff

  // STAB
  if (move.type === attacker.type || move.type === attacker.type2) {
    score *= 1.5
  }

  // Status moves refinement
  if (move.cat === 'status') {
    // Don't repeat status
    const statusEffects = ['sleep', 'paralyze', 'poison', 'toxic', 'burn', 'freeze']
    if (statusEffects.includes(move.effect) && defender.status) score = 0
    
    // Stage modifiers penalization if already lowered
    const effect = move.effect || ''
    if (effect === 'lower_atk' && (defStages.atk || 0) <= -2) score = 5
    if (effect === 'lower_def' && (defStages.def || 0) <= -2) score = 5
    if (effect === 'lower_spa' && (defStages.spa || 0) <= -2) score = 5
    if (effect === 'lower_spd' && (defStages.spd || 0) <= -2) score = 5
    if (effect === 'lower_spe' && (defStages.spe || 0) <= -2) score = 5
    
    // High priority for non-statused sleep/paralyze
    if ((effect === 'sleep' || effect === 'paralyze') && !defender.status) score = 60
  }

  // Self-destruct logic (smart usage)
  if (move.selfKO) {
    const hpPct = attacker.hp / attacker.maxHp
    const canKO = (score >= defender.hp)
    if (hpPct > 0.25 && !canKO) score *= 0.01 
    else if (canKO) score *= 1.5
    else score *= 0.8
  }

  // Add randomness to be less predictable (80% - 120%)
  return score * (0.8 + Math.random() * 0.4)
}

/**
 * Evalúa si el oponente debería cambiar de Pokémon
 */
export const shouldEnemySwitch = (enemy, player, enemyTeam) => {
  if (!enemyTeam || enemyTeam.filter(p => p.hp > 0).length <= 1) return false

  const playerEff = getCombinedEffectiveness(player.type, enemy)
  const isBadMatch = playerEff >= 2

  // Si tiene mala ventaja de tipo, hay un 20% - 40% de chance de cambio
  if (isBadMatch && Math.random() < 0.3) {
    return true
  }

  return false
}

export const findBestSwitchIndex = (enemyTeam, player, currentEnemyUid) => {
  let bestIdx = -1
  let bestScore = -1

  enemyTeam.forEach((p, idx) => {
    if (p.hp <= 0 || p.uid === currentEnemyUid) return

    let score = 0
    // Defense: how well we tank the player
    const playerEff = getCombinedEffectiveness(player.type, p)
    score += (2 - playerEff) * 50

    // Offense: how well we hit the player
    const maxOffense = Math.max(...p.moves.map(m => {
      const eff = getCombinedEffectiveness(m.type, player, p)
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
