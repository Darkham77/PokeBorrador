const _EVOLUTION_STEPS = ['intro', 'flashing', 'transformed', 'final', 'cancelled'] as const;
export type EvolutionStep = (typeof _EVOLUTION_STEPS)[number];
