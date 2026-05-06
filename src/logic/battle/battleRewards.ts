
/**
 * battleRewards.js
 * Logic for calculating EXP and Money rewards.
 */

export function calculateBaseExp(enemyPoke: any) {
  return Math.floor(enemyPoke.level * 4)
}

export function processExpGain(p: any, baseExp: any, _participants: any, options: any = {}) {
  const { 
    isActive = false, 
    classMult = 1, 
    totalExpMult = 1, 
    participantsSet = null 
  } = options

  if (!participantsSet?.has(p.uid) && p.heldItem !== 'Compartir EXP') return null

  const share = isActive ? 1 : 0.5
  const gained = Math.floor(baseExp * share * classMult * totalExpMult);
  p.exp += gained

  let levelUp = false
  if (p.exp >= p.expNeeded) {
    p.level++
    p.exp -= p.expNeeded
    p.expNeeded = Math.floor(p.expNeeded * 1.2)
    levelUp = true
  }

  return { gained, levelUp }
}

export function calculateMoneyGain(enemyPoke: any, options: any = {}) {
  const { bcMult = 1, totalMoneyMult = 1 } = options
  const baseMoney = enemyPoke.level * 10 * bcMult
  return Math.floor(baseMoney * totalMoneyMult)
}
