export const REFRESH_BUTTON_SIZES = ['sm', 'md'] as const;
export type RefreshButtonSize = (typeof REFRESH_BUTTON_SIZES)[number];

export const REFRESH_BUTTON_VARIANTS = ['circle', 'pill'] as const;
export type RefreshButtonVariant = (typeof REFRESH_BUTTON_VARIANTS)[number];
