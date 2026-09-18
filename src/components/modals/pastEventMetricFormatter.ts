/**
 * src/components/modals/pastEventMetricFormatter.ts
 *
 * Pure formatter functions for past event competition winner metrics and rank medals.
 */

import type { PastCompetitionWinner } from '@/types/system/stores'
import { getTierFromTotalIvs } from '@/logic/pokemon/tierEngine'
import { getPhysicalDimensionTier } from '@/logic/pokemon/physicalDimensionsMath'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { toID } from '@/logic/utils/strings.ts'

const DIMENSION_VARIATION_FACTOR = 0.15
const MAX_TARGET_MULTIPLIER = 1 + DIMENSION_VARIATION_FACTOR
const MIN_TARGET_MULTIPLIER = 1 - DIMENSION_VARIATION_FACTOR
const DEFAULT_FALLBACK_SCORE = 0
const DEFAULT_LEVEL_SCORE = 1
const MAX_LEVEL_SCORE = 100
const MAX_FRIENDSHIP_SCORE = 255
const MAX_TOTAL_IVS = 186

export const getWinnerSpeciesId = (w: PastCompetitionWinner): PokemonSpeciesId | null => {
  const rawSpecies = w.entry_data?.species
  if (rawSpecies && isPokemonSpeciesId(rawSpecies)) {
    return rawSpecies
  }
  const rawName = w.entry_data?.name ? toID(w.entry_data.name) : ''
  if (rawName && isPokemonSpeciesId(rawName)) {
    return rawName
  }
  return null
}

function formatIvsMetric(w: PastCompetitionWinner): string {
  const data = w.entry_data
  const score = Number(w.score ?? data?.total_ivs ?? DEFAULT_FALLBACK_SCORE)
  const tierLabel = data?.tier_label || getTierFromTotalIvs(score).tier
  return `${score} / ${MAX_TOTAL_IVS} IVs (${tierLabel})`
}

function formatWeightMetric(w: PastCompetitionWinner): string {
  const data = w.entry_data
  let score = Number(w.score ?? data?.weight ?? DEFAULT_FALLBACK_SCORE)
  const speciesId = getWinnerSpeciesId(w)
  const spec = speciesId ? pokemonDataProvider.getPokemonData(speciesId, true) : null
  const baseWeight = spec?.weight || null
  if (score <= DEFAULT_FALLBACK_SCORE && baseWeight) {
    score = baseWeight
  }
  const tier = baseWeight ? getPhysicalDimensionTier(score, baseWeight) : null

  const maxTarget = baseWeight ? (baseWeight * MAX_TARGET_MULTIPLIER).toFixed(1) : null
  const minTarget = baseWeight ? (baseWeight * MIN_TARGET_MULTIPLIER).toFixed(1) : null
  const isMinCategory = (w.category_name || '').toLowerCase().includes('miniatura') || (w.category_id || '').toLowerCase().includes('min')
  const targetRef = isMinCategory ? minTarget : maxTarget

  const tierStr = tier ? ` (${tier.label} · ${tier.name})` : data?.tier_label ? ` (${data.tier_label})` : ''
  const targetStr = targetRef ? ` / ${targetRef} kg` : ''
  return `${score.toFixed(1)} kg${targetStr}${tierStr}`
}

function formatHeightMetric(w: PastCompetitionWinner): string {
  const data = w.entry_data
  let score = Number(w.score ?? data?.height ?? DEFAULT_FALLBACK_SCORE)
  const speciesId = getWinnerSpeciesId(w)
  const spec = speciesId ? pokemonDataProvider.getPokemonData(speciesId, true) : null
  const baseHeight = spec?.height || null
  if (score <= DEFAULT_FALLBACK_SCORE && baseHeight) {
    score = baseHeight
  }
  const tier = baseHeight ? getPhysicalDimensionTier(score, baseHeight) : null

  const maxTarget = baseHeight ? (baseHeight * MAX_TARGET_MULTIPLIER).toFixed(1) : null
  const minTarget = baseHeight ? (baseHeight * MIN_TARGET_MULTIPLIER).toFixed(1) : null
  const isMinCategory = (w.category_name || '').toLowerCase().includes('miniatura') || (w.category_id || '').toLowerCase().includes('min')
  const targetRef = isMinCategory ? minTarget : maxTarget

  const tierStr = tier ? ` (${tier.label} · ${tier.name})` : data?.tier_label ? ` (${data.tier_label})` : ''
  const targetStr = targetRef ? ` / ${targetRef} m` : ''
  return `${score.toFixed(1)} m${targetStr}${tierStr}`
}

function formatLevelMetric(w: PastCompetitionWinner): string {
  const score = Number(w.score ?? w.entry_data?.level ?? DEFAULT_LEVEL_SCORE)
  return `Nv. ${score} / ${MAX_LEVEL_SCORE}`
}

function formatFriendshipMetric(w: PastCompetitionWinner): string {
  const score = Number(w.score ?? w.entry_data?.friendship ?? DEFAULT_FALLBACK_SCORE)
  return `${score} / ${MAX_FRIENDSHIP_SCORE} Amistad`
}

function formatFallbackMetric(w: PastCompetitionWinner): string {
  const data = w.entry_data
  if (data?.display_value) {
    return String(data.display_value)
  }
  if (data?.displayValue) {
    return String(data.displayValue)
  }
  return `${w.score ?? DEFAULT_FALLBACK_SCORE}`
}

export function formatWinnerMetric(w: PastCompetitionWinner, catId: string): string {
  if (catId.startsWith('ivs')) {
    return formatIvsMetric(w)
  }
  if (catId.startsWith('weight')) {
    return formatWeightMetric(w)
  }
  if (catId.startsWith('height')) {
    return formatHeightMetric(w)
  }
  if (catId.startsWith('level')) {
    return formatLevelMetric(w)
  }
  if (catId.startsWith('friendship')) {
    return formatFriendshipMetric(w)
  }
  return formatFallbackMetric(w)
}

export const getRankMedal = (rank?: string | number): string => {
  if (rank === 'first' || rank === 1 || rank === '1') return '🥇'
  if (rank === 'second' || rank === 2 || rank === '2') return '🥈'
  if (rank === 'third' || rank === 3 || rank === '3') return '🥉'
  return '🎖️'
}

export const getRankLabel = (rank?: string | number): string => {
  if (rank === 'first' || rank === 1 || rank === '1') return '1º'
  if (rank === 'second' || rank === 2 || rank === '2') return '2º'
  if (rank === 'third' || rank === 3 || rank === '3') return '3º'
  return `${rank}º`
}

export interface WinnerProfileData {
  playerClass: string
  level: number
  avatarStyle: string
  nick_style: string
  gender: string
}

const DEFAULT_WINNER_PLAYER_CLASS = 'entrenador' as const
const DEFAULT_WINNER_LEVEL = 1 as const
const DEFAULT_WINNER_GENDER = 'h' as const
const DEFAULT_WINNER_NAME = 'Entrenador' as const
const DEFAULT_WINNER_NICK_STYLE = 'normal' as const
const EMPTY_FIELD_VALUE = '' as const

function resolveFieldCandidate<T>(fallback: T, ...candidates: (T | null | undefined)[]): T {
  for (const c of candidates) {
    if (c !== null && c !== undefined && c !== '') return c
  }
  return fallback
}

export function resolveWinnerProfile(
  w: PastCompetitionWinner,
  currentUserUid?: string | null,
  currentUserState?: {
    playerClass?: string | null
    trainerLevel?: number | null
    avatar_style?: string | null
    nick_style?: string | null
    gender?: string | null
  },
  cachedCosmetics?: {
    player_class?: string | null
    trainer_level?: number | null
    avatar_style?: string | null
    nick_style?: string | null
    gender?: string | null
  }
): WinnerProfileData {
  if (currentUserUid && w.player_id === currentUserUid && currentUserState) {
    return {
      playerClass: resolveFieldCandidate(DEFAULT_WINNER_PLAYER_CLASS, currentUserState.playerClass),
      level: resolveFieldCandidate(DEFAULT_WINNER_LEVEL, currentUserState.trainerLevel),
      avatarStyle: resolveFieldCandidate(EMPTY_FIELD_VALUE, currentUserState.avatar_style),
      nick_style: resolveFieldCandidate(EMPTY_FIELD_VALUE, currentUserState.nick_style),
      gender: resolveFieldCandidate(DEFAULT_WINNER_GENDER, currentUserState.gender)
    }
  }
  const entry = w.entry_data
  return {
    playerClass: resolveFieldCandidate(DEFAULT_WINNER_PLAYER_CLASS, cachedCosmetics?.player_class, w.player_class, entry?.player_class),
    level: resolveFieldCandidate(DEFAULT_WINNER_LEVEL, cachedCosmetics?.trainer_level, w.player_level, entry?.trainer_level),
    avatarStyle: resolveFieldCandidate(EMPTY_FIELD_VALUE, cachedCosmetics?.avatar_style, w.avatar_style, entry?.avatar_style),
    nick_style: resolveFieldCandidate(EMPTY_FIELD_VALUE, cachedCosmetics?.nick_style, w.nick_style, entry?.nick_style),
    gender: resolveFieldCandidate(DEFAULT_WINNER_GENDER, cachedCosmetics?.gender, w.gender, entry?.gender)
  }
}

export function resolveWinnerName(
  w: PastCompetitionWinner,
  currentUserUid?: string | null,
  currentTrainerName?: string | null,
  cachedUsername?: string | null
): string {
  if (currentUserUid && w.player_id === currentUserUid && currentTrainerName) {
    return currentTrainerName
  }
  return resolveFieldCandidate(DEFAULT_WINNER_NAME, cachedUsername, w.player_name)
}

export function resolveWinnerNickStyle(
  w: PastCompetitionWinner,
  currentUserUid?: string | null,
  currentUserNickStyle?: string | null,
  cachedNickStyle?: string | null
): string {
  if (currentUserUid && w.player_id === currentUserUid && currentUserNickStyle) {
    return currentUserNickStyle
  }
  return resolveFieldCandidate(DEFAULT_WINNER_NICK_STYLE, cachedNickStyle, w.nick_style, w.entry_data?.nick_style)
}

