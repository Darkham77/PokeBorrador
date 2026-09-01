import { describe, it, expect, vi } from 'vitest';
import { isFlying } from '@/composables/battle/useBattleShadows';
import {
  animateCombatantEmerging,
  animateCombatantHeal,
  animateCombatantRecoil,
  animatePokeballWobble,
  animatePokeballBlink,
  animateSpriteShake,
  animateSpriteBlink,
  animateStatusFlash,
  executeCatchingTween,
  executeReleasingTween,
  STATUS_FLASH_COLORS
} from '@/components/battle/helpers/combatantFeedbackAnims';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('useBattleCombatantAnims & combatantFeedbackAnims helpers', () => {
  it('correctly detects floating status for shadows and idle animations', () => {
    expect(isFlying({ id: 'butterfree' } as Pokemon)).toBe(true);
    expect(isFlying({ id: 'pikachu' } as Pokemon)).toBe(false);
  });

  it('provides valid hex colors for all major status conditions', () => {
    expect(STATUS_FLASH_COLORS.brn).toBe('#ff4500');
    expect(STATUS_FLASH_COLORS.psn).toBe('#9400d3');
    expect(STATUS_FLASH_COLORS.par).toBe('#ffd700');
    expect(STATUS_FLASH_COLORS.frz).toBe('#00ffff');
    expect(STATUS_FLASH_COLORS.slp).toBe('#ffffff');
    expect(STATUS_FLASH_COLORS.tox).toBe('#9400d3');
  });

  it('runs emerging, heal, and recoil animations without throwing', () => {
    const el = document.createElement('div');
    expect(() => animateCombatantEmerging(el)).not.toThrow();
    expect(() => animateCombatantHeal(el)).not.toThrow();
    expect(() => animateCombatantRecoil(el, true)).not.toThrow();
    expect(() => animateCombatantRecoil(el, false)).not.toThrow();
  });

  it('runs pokeball wobble, blink, sprite shake and sprite blink without throwing', () => {
    const el = document.createElement('div');
    expect(() => animatePokeballWobble(el)).not.toThrow();
    expect(() => animatePokeballBlink(el)).not.toThrow();
    expect(() => animateSpriteShake(el, true)).not.toThrow();
    expect(() => animateSpriteShake(el, false)).not.toThrow();
    expect(() => animateSpriteBlink(el, true)).not.toThrow();
    expect(() => animateSpriteBlink(el, false)).not.toThrow();
    expect(() => animateStatusFlash(el, 'brn')).not.toThrow();
  });

  it('executes catching and releasing tweens successfully with callbacks', () => {
    const sprite = document.createElement('div');
    const shadow = document.createElement('div');
    const rotation = document.createElement('div');
    const onCatchDone = vi.fn();
    const onReleaseDone = vi.fn();

    const catchTween = executeCatchingTween(sprite, shadow, rotation, '50% 100%', { x: 10, y: 20 }, onCatchDone);
    expect(catchTween).toBeDefined();

    const releaseTween = executeReleasingTween(sprite, shadow, rotation, '50% 100%', { x: 10, y: 20 }, 'pikachu', onReleaseDone);
    expect(releaseTween).toBeDefined();
  });
});
