export const NOTIFICATION_CATEGORIES = [
  'all',
  'capture',
  'economy',
  'social',
  'system'
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export interface NotificationCategoryOption {
  id: NotificationCategory;
  label: string; // domain-ok
  icon: string; // domain-ok
}

export const NOTIFICATION_CATEGORY_OPTIONS: readonly NotificationCategoryOption[] = [
  { id: 'all', label: 'Todas', icon: '📋' },
  { id: 'capture', label: 'Capturas', icon: '🔴' },
  { id: 'economy', label: 'Economía', icon: '💰' },
  { id: 'social', label: 'Social', icon: '⚔️' },
  { id: 'system', label: 'Sistema', icon: '⚡' }
] as const;

const NOTIFICATION_CATEGORY_SET = new Set<string>(NOTIFICATION_CATEGORIES); // runtime-set

export function isNotificationCategory(value: string): value is NotificationCategory {
  return NOTIFICATION_CATEGORY_SET.has(value);
}
