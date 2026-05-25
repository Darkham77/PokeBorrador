/**
 * hatchAuras.ts
 * Utilidades de configuración de auras y colores para la eclosión de huevos.
 */
import type { Pokemon } from '@/types/pokemon'

export const TYPE_AURA_COLORS: Record<string, { c1: string; c2: string }> = {
  normal: { c1: 'rgba(168, 168, 120, 0.95)', c2: 'rgba(120, 120, 90, 0.8)' },
  fire: { c1: 'rgba(240, 128, 48, 0.95)', c2: 'rgba(180, 70, 20, 0.85)' },
  water: { c1: 'rgba(104, 144, 240, 0.95)', c2: 'rgba(30, 70, 180, 0.85)' },
  grass: { c1: 'rgba(120, 200, 80, 0.95)', c2: 'rgba(40, 130, 30, 0.85)' },
  electric: { c1: 'rgba(248, 208, 48, 0.95)', c2: 'rgba(200, 140, 0, 0.85)' },
  ice: { c1: 'rgba(152, 216, 216, 0.95)', c2: 'rgba(70, 170, 180, 0.85)' },
  fighting: { c1: 'rgba(192, 48, 40, 0.95)', c2: 'rgba(120, 20, 20, 0.85)' },
  poison: { c1: 'rgba(160, 64, 160, 0.95)', c2: 'rgba(90, 20, 100, 0.85)' },
  ground: { c1: 'rgba(224, 192, 104, 0.95)', c2: 'rgba(160, 120, 50, 0.85)' },
  flying: { c1: 'rgba(168, 144, 240, 0.95)', c2: 'rgba(100, 70, 200, 0.85)' },
  psychic: { c1: 'rgba(248, 88, 136, 0.95)', c2: 'rgba(180, 20, 80, 0.85)' },
  bug: { c1: 'rgba(168, 184, 32, 0.95)', c2: 'rgba(100, 120, 10, 0.85)' },
  rock: { c1: 'rgba(184, 160, 56, 0.95)', c2: 'rgba(120, 100, 20, 0.85)' },
  ghost: { c1: 'rgba(112, 88, 152, 0.95)', c2: 'rgba(60, 40, 100, 0.85)' },
  dragon: { c1: 'rgba(112, 56, 248, 0.95)', c2: 'rgba(50, 20, 180, 0.85)' },
  dark: { c1: 'rgba(112, 88, 72, 0.95)', c2: 'rgba(60, 45, 35, 0.85)' },
  steel: { c1: 'rgba(184, 184, 208, 0.95)', c2: 'rgba(120, 120, 150, 0.85)' },
  fairy: { c1: 'rgba(240, 166, 178, 0.95)', c2: 'rgba(180, 90, 110, 0.85)' }
}

export function getAuraStyles(
  pokemon: Pokemon | null,
  flare1Url: string,
  flare2Url: string
) {
  let c1 = 'rgba(0, 255, 255, 0.85)' // Cian brillante por defecto
  let c2 = 'rgba(0, 190, 255, 0.75)' // Azul profundo por defecto

  if (pokemon) {
    const primaryType = pokemon.type?.toLowerCase() || 'normal'
    const colors = TYPE_AURA_COLORS[primaryType] ?? TYPE_AURA_COLORS.normal ?? {
      c1: 'rgba(0, 255, 255, 0.85)',
      c2: 'rgba(0, 190, 255, 0.75)'
    }
    c1 = colors.c1
    c2 = colors.c2

    // Si es shiny o guardián, sobreescribir con los colores de rareza premium
    if (pokemon.isShiny) {
      c1 = 'rgba(255, 215, 0, 0.95)' // Oro brillante
      c2 = 'rgba(255, 140, 0, 0.85)' // Naranja fuego
    } else if (pokemon.isGuardian) {
      c1 = 'rgba(255, 255, 255, 0.95)' // Blanco puro
      c2 = 'rgba(173, 216, 230, 0.85)' // Plateado / Celeste suave
    }
  }

  return {
    '--flare-1-url': `url('${flare1Url}')`,
    '--flare-2-url': `url('${flare2Url}')`,
    '--aura-color-1': c1,
    '--aura-color-2': c2,
    '--particle-color': c1
  }
}
