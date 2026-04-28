/**
 * battleFlow.js
 * Logic for turn flow, entry abilities, and end-turn effects.
 */

export function handleEntryAbilities(playerPoke, enemyPoke, playerStages, enemyStages, addLog) {
  if (playerPoke.ability === 'Intimidación') {
    enemyStages.atk = Math.max(-6, enemyStages.atk - 1)
    addLog(`¡La Intimidación de ${playerPoke.name} bajó el ataque de ${enemyPoke.name}!`, 'log-info', playerPoke)
  }
  if (enemyPoke.ability === 'Intimidación') {
    playerStages.atk = Math.max(-6, playerStages.atk - 1)
    addLog(`¡La Intimidación de ${enemyPoke.name} bajó el ataque de ${playerPoke.name}!`, 'log-info', enemyPoke)
  }
}

export function canAttack(pokemon, addLog) {
  if (pokemon.flinched) {
    addLog(`¡${pokemon.name} retrocedió!`, 'log-info', pokemon)
    pokemon.flinched = false
    return false
  }
  if (pokemon.status === 'sleep') {
    if (pokemon.sleepTurns > 0) {
      pokemon.sleepTurns--
      addLog(`¡${pokemon.name} está profundamente dormido!`, 'log-info', pokemon)
      return false
    } else {
      pokemon.status = null
      addLog(`¡${pokemon.name} se despertó!`, 'log-info', pokemon)
    }
  }
  if (pokemon.status === 'freeze') {
    if (Math.random() < 0.8) {
      addLog(`¡${pokemon.name} está congelado!`, 'log-info', pokemon)
      return false
    } else {
      pokemon.status = null
      addLog(`¡${pokemon.name} se descongeló!`, 'log-info', pokemon)
    }
  }
  return true
}

export function applyEndTurnWeather(p, e, weather, addLog) {
  if (weather?.type === 'sandstorm') {
    const isSandImmune = (poke) => ['rock', 'ground', 'steel'].includes(poke.type) || ['rock', 'ground', 'steel'].includes(poke.type2)
    if (!isSandImmune(p)) {
      const dmg = Math.floor(p.maxHp / 16)
      p.hp = Math.max(0, p.hp - dmg)
      addLog(`¡La tormenta de arena alcanza a ${p.name}!`, 'log-player', p)
    }
    if (!isSandImmune(e)) {
      const dmg = Math.floor(e.maxHp / 16)
      e.hp = Math.max(0, e.hp - dmg)
      addLog(`¡La tormenta de arena alcanza a ${e.name}!`, 'log-enemy', e)
    }
  }
}
