import type { Pokemon } from '@/types/pokemon/pokemon';

export type SecondaryPredicate = (p: Pokemon & Record<string, unknown>, vc: Partial<Record<string, number>>) => boolean;

export const SECONDARY_EFFECT_PREDICATES: Record<string, SecondaryPredicate> = {
  confusion: (p, vc) => (Number(p.confused) || 0) > 0 || (vc.confusion || 0) > 0,
  taunt: (p, vc) => (Number(p.tauntTurns) || 0) > 0 || (vc.taunt || 0) > 0 || (vc.tauntTurns || 0) > 0,
  substitute: (p, vc) => (Number(p.substitute) || 0) > 0 || (vc.substitute || 0) > 0,
  disable: (p, vc) => (Number(p.disabledTurns) || 0) > 0 || (vc.disable || 0) > 0 || (vc.disabledTurns || 0) > 0,
  encore: (p, vc) => (Number(p.encoreTurns) || 0) > 0 || (vc.encore || 0) > 0 || (vc.encoreTurns || 0) > 0,
  perishsong: (p, vc) => (Number(p.perishSongCount) || 0) > 0 || (vc.perishsong || 0) > 0,
  bound: (p, vc) => (Number(p.bound) || 0) > 0 || (vc.bound || 0) > 0 || (vc.partiallytrapped || 0) > 0,
  attract: (p, vc) => Boolean(p.attracted) || (vc.attract || 0) > 0,
  curse: (p, vc) => Boolean(p.cursed) || (vc.curse || 0) > 0,
  leechseed: (p, vc) => Boolean(p.seeded) || (vc.leechseed || 0) > 0,
  trapped: (p, vc) => Boolean(p.trapped) || (vc.trapped || 0) > 0,
  ingrain: (p, vc) => Boolean(p.ingrain) || (vc.ingrain || 0) > 0,
  protect: (p, vc) => Boolean(p.protect) || Boolean(p.detect) || (vc.protect || 0) > 0,
  endure: (p, vc) => Boolean(p.endure) || (vc.endure || 0) > 0,
  focusenergy: (p, vc) => Boolean(p.focusEnergy) || (vc.focusenergy || 0) > 0,
  lockon: (p, vc) => Boolean(p.lockOn) || (vc.lockon || 0) > 0
};
