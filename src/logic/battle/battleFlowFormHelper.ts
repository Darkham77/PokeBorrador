import { getWeatherFamily } from '../../data/system/weatherFamilies.ts';
import { WEATHER_MECHANICAL } from '../weather/weatherRegistry.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages, LogFn } from '@/types/battle/battle';
import type { PokemonType } from '@/data/battle/types';

export function updateCastformForm(pokemon: Pokemon | null | undefined, weatherType: string | undefined, addLog: LogFn): void {
  if (!pokemon) return;
  if (pokemon.id !== 'castform') return;
  if (pokemon.ability !== 'forecast') return;

  const family = weatherType ? getWeatherFamily(weatherType) : null;
  let targetForm: string;
  let targetType: PokemonType;

  if (family === WEATHER_MECHANICAL.SUN) {
    targetForm = 'sunny';
    targetType = 'fire';
  } else if (family === WEATHER_MECHANICAL.RAIN) {
    targetForm = 'rainy';
    targetType = 'water';
  } else if (family === WEATHER_MECHANICAL.SNOW || family === WEATHER_MECHANICAL.HAIL) {
    targetForm = 'snowy';
    targetType = 'ice';
  } else {
    targetForm = 'normal';
    targetType = 'normal';
  }

  const currentForm = pokemon.form || 'normal';

  if (currentForm !== targetForm) {
    pokemon.form = targetForm;
    pokemon.type = targetType;
    pokemon.type2 = undefined;

    const formLabels: Record<string, string> = { sunny: 'Soleada', rainy: 'Lluvia', snowy: 'Nieve' };
    if (targetForm === 'normal') {
      if (currentForm !== 'normal') {
        addLog(`¡La habilidad Predicción de ${pokemon.name} lo devolvió a su forma normal!`, 'log-info', pokemon);
      }
    } else {
      addLog(`¡La habilidad Predicción de ${pokemon.name} lo transformó en su Forma ${formLabels[targetForm]}!`, 'log-info', pokemon);
    }
  }
}

export function handleEntryAbilities(
  playerPoke: Pokemon,
  enemyPoke: Pokemon,
  playerStages: BattleStages,
  enemyStages: BattleStages,
  addLog: LogFn,
  weatherType?: string
): void {
  if (!playerPoke || !enemyPoke) return;

  const isAclimatacion = playerPoke.ability === 'cloudnine' || enemyPoke.ability === 'cloudnine';
  const effectiveWeather = isAclimatacion ? undefined : weatherType;
  updateCastformForm(playerPoke, effectiveWeather, addLog);
  updateCastformForm(enemyPoke, effectiveWeather, addLog);

  if (playerPoke.ability === 'intimidate') {
    playerStages.atk = Math.max(-6, enemyStages.atk - 1);
    addLog(`¡La Intimidación de ${playerPoke.name} bajó el ataque de ${enemyPoke.name}!`, 'log-info', playerPoke);
  }
  if (enemyPoke.ability === 'intimidate') {
    playerStages.atk = Math.max(-6, playerStages.atk - 1);
    addLog(`¡La Intimidación de ${enemyPoke.name} bajó el ataque de ${playerPoke.name}!`, 'log-info', enemyPoke);
  }
}
