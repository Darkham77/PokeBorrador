/**
 * Battle AI logic for enemy moves.
 */

export function getBestEnemyMove(enemy, target, targetStages, options = {}) {
  const { MOVE_DATA, getTypeEffectiveness } = options;
  if (!enemy.moves || enemy.moves.length === 0) return null;

  const validMoves = enemy.moves.filter(m => m.pp > 0);
  if (validMoves.length === 0) return null;

  // Simple heuristic: choose most effective move
  let bestMove = validMoves[0];
  let maxScore = -1;

  validMoves.forEach(m => {
    const md = MOVE_DATA[m.name];
    if (!md) return;

    let score = md.power || 0;
    
    // Type effectiveness multiplier
    const eff = getTypeEffectiveness(md.type, target.type) * 
                (target.type2 ? getTypeEffectiveness(md.type, target.type2) : 1);
    score *= eff;

    // Status moves heuristic
    if (md.cat === 'status') {
      if (md.effect.includes('+') && !m._used) score = 40; // Buff once
      if (md.effect.includes('poison') && !target.status) score = 45;
      if (md.effect.includes('sleep') && !target.status) score = 50;
    }

    if (score > maxScore) {
      maxScore = score;
      bestMove = m;
    }
  });

  return bestMove;
}
