export const EVOLUTION_STEPS = ['intro', 'flashing', 'transformed', 'final', 'cancelled'] as const;
export type EvolutionStep = (typeof EVOLUTION_STEPS)[number];

export const EVOLUTION_SPRITE_TARGETS = ['from', 'to'] as const;
export type EvolutionSpriteTarget = (typeof EVOLUTION_SPRITE_TARGETS)[number];
