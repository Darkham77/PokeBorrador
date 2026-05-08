import { getMechanicalWeather, WEATHER_MECHANICAL } from './weatherMapper'
import { gameBus } from '@/logic/gameBus'
import type { Pokemon } from '@/types/pokemon'
import type { BattleStages, LogFn, BattleWeather } from '@/types/battle'

export function handleEntryAbilities(playerPoke: Pokemon, enemyPoke: Pokemon, playerStages: BattleStages, enemyStages: BattleStages, addLog: LogFn) {
  if (!playerPoke || !enemyPoke) return // GUARDIA CRÍTICA

  if (playerPoke.ability === 'Intimidación') {
    enemyStages.atk = Math.max(-6, enemyStages.atk - 1)
    addLog(`¡La Intimidación de ${playerPoke.name} bajó el ataque de ${enemyPoke.name}!`, 'log-info', playerPoke)
  }
  if (enemyPoke.ability === 'Intimidación') {
    playerStages.atk = Math.max(-6, playerStages.atk - 1)
    addLog(`¡La Intimidación de ${enemyPoke.name} bajó el ataque de ${playerPoke.name}!`, 'log-info', enemyPoke)
  }
}

export function canAttack(pokemon: Pokemon, addLog: LogFn) {
  if (pokemon.mustRecharge) {
    addLog(`¡${pokemon.name} tiene que recargar!`, 'log-info', pokemon)
    pokemon.mustRecharge = false
    return false
  }
  if (pokemon.flinched) {
    addLog(`¡${pokemon.name} retrocedió!`, 'log-info', pokemon)
    pokemon.flinched = false
    return false
  }
  if (pokemon.status === 'sleep') {
    if ((pokemon.sleepTurns || 0) > 0) {
      pokemon.sleepTurns = (pokemon.sleepTurns || 0) - 1
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
  if (pokemon.status === 'paralysis') {
    if (Math.random() < 0.25) {
      addLog(`¡${pokemon.name} está paralizado! ¡No puede moverse!`, 'log-info', pokemon)
      return false
    }
  }
  if ((pokemon.confused || 0) > 0) {
    pokemon.confused = (pokemon.confused || 0) - 1
    if ((pokemon.confused || 0) <= 0) {
      addLog(`¡${pokemon.name} ya no está confundido!`, 'log-info', pokemon)
    } else {
      addLog(`¡${pokemon.name} está confundido!`, 'log-info', pokemon)
      if (Math.random() < 0.5) {
        const selfDmg = Math.max(1, Math.floor(((2 * pokemon.level / 5 + 2) * 40 * (pokemon.atk || 10) / (pokemon.def || 10)) / 50) + 2)
        pokemon.hp = Math.max(0, pokemon.hp - selfDmg)
        addLog(`¡Tan confundido que se hirió a sí mismo! (-${selfDmg} HP)`, 'log-info', pokemon)
        gameBus.emit('PLAY_SOUND', 'statusDamage')
        return false
      }
    }
  }
  if (pokemon.attracted) {
    addLog(`¡${pokemon.name} está enamorado!`, 'log-info', pokemon)
    if (Math.random() < 0.5) {
      addLog(`¡La atracción le impide atacar!`, 'log-info', pokemon)
      return false
    }
  }
  return true
}

export function applyEndTurnWeather(p: Pokemon, e: Pokemon, weather: BattleWeather | null, addLog: LogFn) {
  const mechWeather = getMechanicalWeather(weather?.type);

  if (mechWeather === WEATHER_MECHANICAL.SANDSTORM) {
    const isSandImmune = (poke: Pokemon) => ['rock', 'ground', 'steel'].includes(poke.type) || ['rock', 'ground', 'steel'].includes(poke.type2 || '')
    if (!isSandImmune(p)) {
      const dmg = Math.floor(p.maxHp / 16)
      p.hp = Math.max(0, p.hp - dmg)
      addLog(`¡La tormenta de arena alcanza a ${p.name}!`, 'log-player', p)
      gameBus.emit('PLAY_SOUND', 'statusDamage')
    }
    if (!isSandImmune(e)) {
      const dmg = Math.floor(e.maxHp / 16)
      e.hp = Math.max(0, e.hp - dmg)
      addLog(`¡La tormenta de arena alcanza a ${e.name}!`, 'log-enemy', e)
      gameBus.emit('PLAY_SOUND', 'statusDamage')
    }
  }

  if (mechWeather === WEATHER_MECHANICAL.HAIL) {
    const isHailImmune = (poke: Pokemon) => poke.type === 'ice' || poke.type2 === 'ice'
    if (!isHailImmune(p)) {
      const dmg = Math.floor(p.maxHp / 16)
      p.hp = Math.max(0, p.hp - dmg)
      addLog(`¡El granizo alcanza a ${p.name}!`, 'log-player', p)
      gameBus.emit('PLAY_SOUND', 'statusDamage')
    }
    if (!isHailImmune(e)) {
      const dmg = Math.floor(e.maxHp / 16)
      e.hp = Math.max(0, e.hp - dmg)
      addLog(`¡El granizo alcanza a ${e.name}!`, 'log-enemy', e)
      gameBus.emit('PLAY_SOUND', 'statusDamage')
    }
  }

  if (mechWeather === WEATHER_MECHANICAL.SNOW) {
    // La nieve normal NO hace daño residual (Gen 9)
  }
}
