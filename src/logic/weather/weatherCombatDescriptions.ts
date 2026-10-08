import { toID } from '@/logic/utils/strings.ts';
import { SINNOH_GENERATION_NUM } from '@/logic/constants/gameplay.ts';
import { mapVisualToOfficialWeather } from './weatherGenerationProvider.ts';

const STATIC_COMBAT_DESCRIPTIONS: Record<string, string> = {
  raindance: '▲ Potencia Agua (x1.5)\n▼ Debilita Fuego (x0.5)\n• Efecto: Trueno 100% precisión',
  sunnyday: '▲ Potencia Fuego (x1.5)\n▼ Debilita Agua (x0.5)\n• Efecto: Rayo Solar sin carga',
  hail: '▼ Debilita a no Hielo (1/16 HP por turno)\n• Efecto: Ventisca 100% precisión',
  snow: '▲ Potencia Defensa Hielo (x1.5)\n• Efecto: Ventisca 100% precisión',
  desolateland: '▲ Potencia Fuego (x1.5)\n▼ Bloquea Agua (x0)\n• Efecto: Rayo Solar sin carga',
  primordialsea: '▲ Potencia Agua (x1.5)\n▼ Bloquea Fuego (x0)\n• Efecto: Trueno 100% precisión',
  deltastream: '▲ Bloquea debilidades Volador'
};

/**
 * Returns the combat description dynamically based on the mapped Showdown weather and generation rules.
 */
export function getWeatherCombatDescription(visualWeather: string | null | undefined, gen: number): string {
  const officialWeather = mapVisualToOfficialWeather(visualWeather, gen);
  const lower = toID(officialWeather);

  const staticDesc = STATIC_COMBAT_DESCRIPTIONS[lower];
  if (staticDesc) return staticDesc;

  if (lower === 'sandstorm') {
    return gen >= SINNOH_GENERATION_NUM
      ? '▲ Potencia Especial Roca (x1.5)\n▼ Debilita a no Roca/Tierra/Acero (1/16 HP por turno)'
      : '▼ Debilita a no Roca/Tierra/Acero (1/16 HP por turno)';
  }

  if (lower === 'fog') {
    return gen >= SINNOH_GENERATION_NUM
      ? '▼ Reduce la precisión de todos los movimientos (x0.6)\n• Efecto: Meteorobola dobla potencia'
      : 'Sin efectos en combate.';
  }

  return 'Sin efectos en combate.';
}
