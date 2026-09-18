import type { PokemonType } from '@/data/battle/types'
import type { BattleDifficulty } from '@/types/battle/battle'

const POKEMON_TYPE_ICONS: Readonly<Record<string, string>> = {
  rock: '🪨',
  water: '💧',
  electric: '⚡',
  grass: '🌿',
  poison: '☠️',
  psychic: '🔮',
  fire: '🔥',
  ground: '🌍'
} as const

const DEFAULT_TYPE_ICON = '🏆' as const

export function getPokemonTypeIcon(type: PokemonType | string): string {
  return POKEMON_TYPE_ICONS[type] || DEFAULT_TYPE_ICON
}

export function formatDifficultyLabel(difficulty: BattleDifficulty): string {
  switch (difficulty) {
    case 'easy':
      return 'FÁCIL'
    case 'normal':
      return 'NORMAL'
    case 'hard':
      return 'DIFÍCIL'
  }
}

export function resolveGymButtonGradient(color: string): string {
  return `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
}

export function resolveGymButtonShadow(color: string): string {
  return `0 8px 25px ${color}44`
}

export function resolveGymHeaderGradient(color: string): string {
  return `linear-gradient(180deg, ${color}15 0%, transparent 100%)`
}
