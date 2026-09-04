/**
 * src/types/pokemon/friendship.ts
 *
 * Domain-Type-First contracts and metadata for the Friendship / Happiness System.
 */

export const FRIENDSHIP_SEAL_TIERS = [
  'distrust',
  'sprout',
  'comrade',
  'radiant_prism',
  'best_friends',
] as const;

export type FriendshipSealTier = (typeof FRIENDSHIP_SEAL_TIERS)[number];

export const FRIENDSHIP_LOG_TONES = ['log-player', 'log-info', 'log-error'] as const;
export type FriendshipLogTone = (typeof FRIENDSHIP_LOG_TONES)[number];

export interface FriendshipSealMetadata {
  readonly id: FriendshipSealTier;
  readonly minFriendship: number;
  readonly maxFriendship: number;
  readonly label: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly iconEmoji: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly iconName: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly barGradientClass: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly evaluatorQuote: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly isEvolutionReady: boolean;
  readonly isCombatPerksActive: boolean;
}

export const FRIENDSHIP_BOUNDS = {
  MIN: 0,
  MAX: 255,
  GEN_8_EVO_THRESHOLD: 160,
  LEGACY_EVO_THRESHOLD: 220,
  AFFINITY_PERK_THRESHOLD: 220,
  COMRADE_MIN: 100,
  SPROUT_MIN: 50,
  DEFAULT_BASE: 50,
  LEGACY_BASE: 70,
  FRIEND_BALL_BASE: 200,
  EGG_HATCH_BASE: 120,
} as const;

export const FRIENDSHIP_SEAL_MAP: Readonly<Record<FriendshipSealTier, FriendshipSealMetadata>> = Object.freeze({
  distrust: {
    id: 'distrust',
    minFriendship: 0,
    maxFriendship: 49,
    label: 'Desconfianza',
    iconEmoji: '⛓️',
    iconName: 'seal_distrust.png',
    barGradientClass: 'friendship-distrust',
    evaluatorQuote: 'Parece que aún no confía en ti. ¡Trátalo con cuidado!',
    isEvolutionReady: false,
    isCombatPerksActive: false,
  },
  sprout: {
    id: 'sprout',
    minFriendship: 50,
    maxFriendship: 99,
    label: 'Sello Brote',
    iconEmoji: '🌱',
    iconName: 'seal_sprout.png',
    barGradientClass: 'friendship-sprout',
    evaluatorQuote: 'Se está acostumbrando a ti. Es un buen comienzo.',
    isEvolutionReady: false,
    isCombatPerksActive: false,
  },
  comrade: {
    id: 'comrade',
    minFriendship: 100,
    maxFriendship: 159,
    label: 'Sello Camarada',
    iconEmoji: '🤝',
    iconName: 'seal_comrade.png',
    barGradientClass: 'friendship-comrade',
    evaluatorQuote: '¡Se llevan bastante bien! Confía en tus decisiones.',
    isEvolutionReady: false,
    isCombatPerksActive: false,
  },
  radiant_prism: {
    id: 'radiant_prism',
    minFriendship: 160,
    maxFriendship: 219,
    label: 'Prisma Radiante',
    iconEmoji: '💎',
    iconName: 'seal_radiant_prism.png',
    barGradientClass: 'friendship-radiant',
    evaluatorQuote: '¡Son grandes amigos! Su vínculo le permite alcanzar nuevas formas.',
    isEvolutionReady: true,
    isCombatPerksActive: false,
  },
  best_friends: {
    id: 'best_friends',
    minFriendship: 220,
    maxFriendship: 255,
    label: 'Cinta Mejores Amigos',
    iconEmoji: '🎀',
    iconName: 'ribbon_best_friends.png',
    barGradientClass: 'friendship-best-friends',
    evaluatorQuote: '¡No podría quererte más! Su profundo vínculo activa ventajas milagrosas en combate.',
    isEvolutionReady: true,
    isCombatPerksActive: true,
  },
});

export function isFriendshipSealTier(value: unknown): value is FriendshipSealTier {
  return typeof value === 'string' && FRIENDSHIP_SEAL_TIERS.includes(value as FriendshipSealTier);
}

export function requireFriendshipSealTier(value: unknown): FriendshipSealTier {
  if (isFriendshipSealTier(value)) return value;
  throw new Error(`[DomainTypeFirst] Invalid FriendshipSealTier value: ${String(value)}`);
}
