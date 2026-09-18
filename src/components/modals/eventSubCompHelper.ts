import type { ResolvedSubCompetition, SubCompetitionConfig } from '@/logic/events/eventEngine'
import { resolveSubCompetitionDirection } from '@/logic/events/eventEngine'

export function getSubCompDefaultIcon(catId: string): string {
  if (catId.startsWith('ivs')) return '🧬'
  if (catId.startsWith('weight')) return '⚖️'
  if (catId.startsWith('height')) return '📏'
  if (catId.startsWith('level')) return '📈'
  if (catId.startsWith('friendship')) return '💖'
  return '🏆'
}

export function getSubCompTitle(eventId: string, sub: ResolvedSubCompetition | SubCompetitionConfig): string {
  const dir = resolveSubCompetitionDirection(eventId, sub.id, sub.order)
  const speciesSuffix = ('targetSpecies' in sub && sub.targetSpecies) ? ` (${sub.targetSpecies.toUpperCase()})` : ''
  if (sub.metric === 'total_ivs') {
    return 'Mayor cantidad de IVs totales (0 a 186)'
  }
  if (sub.metric === 'stat_iv' && sub.targetStat) {
    return `Mayor IV en ${sub.targetStat.toUpperCase()}${speciesSuffix}`
  }
  if (sub.metric === 'weight') {
    return (dir === 'max' ? 'Mayor Peso' : 'Menor Peso') + speciesSuffix
  }
  if (sub.metric === 'height') {
    return (dir === 'max' ? 'Mayor Altura' : 'Menor Altura') + speciesSuffix
  }
  if (sub.metric === 'level') {
    return (dir === 'max' ? 'Mayor Nivel' : 'Menor Nivel') + speciesSuffix
  }
  if (sub.metric === 'friendship') {
    return (dir === 'max' ? 'Mayor Amistad' : 'Menor Amistad') + speciesSuffix
  }
  return sub.description || sub.name || 'Criterio de evaluación'
}
