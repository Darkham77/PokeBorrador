import type { GenderName } from '@pkmn/types';

export const DEFAULT_PAGE_SIZE = 50 as const;
const PERCENT_MULTIPLIER = 100 as const;
const MIN_PERCENT_VALUE = 0 as const;
const MAX_PERCENT_VALUE = 100 as const;
const FIRST_PAGE_INDEX = 1 as const;
const EMPTY_COUNT = 0 as const;

export const COLUMN_OPTIONS = [2, 3, 4, 5, 6, 8] as const;

export const VIEW_OPTIONS = [
  { label: 'Todas (Intercalado)', value: 'all' as const },
  { label: 'Solo Frente', value: 'front' as const },
  { label: 'Solo Espalda', value: 'back' as const }
] as const;

export const GENERATION_OPTIONS = [
  { label: 'Todas', value: 'all' as const },
  { label: 'Gen 1', value: 1 },
  { label: 'Gen 2', value: 2 },
  { label: 'Gen 3', value: 3 },
  { label: 'Gen 4', value: 4 },
  { label: 'Gen 5', value: 5 },
  { label: 'Gen 6', value: 6 },
  { label: 'Gen 7', value: 7 },
  { label: 'Gen 8', value: 8 },
  { label: 'Gen 9', value: 9 }
] as const;

export const GENDER_OPTIONS: readonly { label: string; value: 'all' | Extract<GenderName, 'M' | 'F'> }[] = [
  { label: 'Todos', value: 'all' },
  { label: '♂ Macho (M) / Base', value: 'M' },
  { label: '♀ Hembra (F)', value: 'F' }
];

export type ShadowViewOption = (typeof VIEW_OPTIONS)[number]['value'];
export type ShadowGenOption = (typeof GENERATION_OPTIONS)[number]['value'];
export type ShadowGenderOption = (typeof GENDER_OPTIONS)[number]['value'];

export function formatRatioPercent(ratio: number): string {
  return `${Math.round(ratio * PERCENT_MULTIPLIER)}%`;
}

export interface PaginationBounds {
  from: number;
  to: number;
}

export function calculatePaginationBounds(
  page: number,
  pageSize: number,
  total: number
): PaginationBounds {
  if (total <= EMPTY_COUNT) {
    return { from: EMPTY_COUNT, to: EMPTY_COUNT };
  }
  const from = Math.min(total, (page - FIRST_PAGE_INDEX) * pageSize + FIRST_PAGE_INDEX);
  const to = Math.min(total, page * pageSize);
  return { from, to };
}

export function formatPaginationRange(
  page: number,
  pageSize: number,
  total: number
): string {
  const { from, to } = calculatePaginationBounds(page, pageSize, total);
  return `Mostrando ${from} - ${to} de ${total} entidades`;
}

export function isRebuildProgressActive(isRebuilding: boolean, progress: number): boolean {
  return isRebuilding || (progress > MIN_PERCENT_VALUE && progress < MAX_PERCENT_VALUE);
}

const _SAVE_BUTTON_STATES = ['saving', 'unsaved', 'saved'] as const;
export type SaveButtonState = (typeof _SAVE_BUTTON_STATES)[number];

export function resolveSaveButtonState(
  isSaving: boolean,
  hasUnsavedChanges: boolean
): SaveButtonState {
  if (isSaving) return 'saving';
  if (hasUnsavedChanges) return 'unsaved';
  return 'saved';
}
