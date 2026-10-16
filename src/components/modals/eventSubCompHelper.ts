import type { ResolvedSubCompetition, SubCompetitionConfig } from '@/logic/events/eventEngine';
import { getSubCompTitle as getCanonicalSubCompTitle } from '@/logic/events/eventCompetitions';

export function getSubCompDefaultIcon(catId: string): string {
  if (catId.startsWith('ivs')) return '🧬';
  if (catId.startsWith('weight')) return '⚖️';
  if (catId.startsWith('height')) return '📏';
  if (catId.startsWith('level')) return '📈';
  if (catId.startsWith('friendship')) return '💖';
  return '🏆';
}

export function getSubCompTitle(
  eventId: string,
  sub: ResolvedSubCompetition | SubCompetitionConfig
): string {
  if (sub.metric === 'total_ivs') {
    return 'Mayor cantidad de IVs totales (0 a 186)';
  }
  if ('description' in sub && sub.description) {
    return sub.description;
  }
  return getCanonicalSubCompTitle(eventId, sub as SubCompetitionConfig);
}
