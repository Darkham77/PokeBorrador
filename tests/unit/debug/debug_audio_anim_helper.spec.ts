import { describe, it, expect } from 'vitest';
import { isSecondaryEffectActive, isFieldEffectActive, isDebugEffectActive } from '@/components/admin/debug/debugAudioAnimHelper';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('debugAudioAnimHelper Unit Suite', () => {
  describe('isSecondaryEffectActive', () => {
    it('returns false when pokemon is null or undefined', () => {
      expect(isSecondaryEffectActive(null, 'confusion')).toBe(false);
      expect(isSecondaryEffectActive(undefined, 'confusion')).toBe(false);
    });

    it('correctly detects all 16 secondary statuses via domain properties', () => {
      const mockPokemon = {
        confused: 4,
        tauntTurns: 3,
        substitute: 25,
        disabledTurns: 4,
        encoreTurns: 3,
        perishSongCount: 3,
        bound: 4,
        attracted: true,
        cursed: true,
        seeded: true,
        trapped: true,
        ingrain: true,
        protect: true,
        endure: true,
        focusEnergy: true,
        lockOn: true,
      } as unknown as Pokemon;

      const secondaryTypes = [
        'confusion', 'taunt', 'substitute', 'disable', 'encore',
        'perishsong', 'bound', 'attract', 'curse', 'leechseed',
        'trapped', 'ingrain', 'protect', 'endure', 'focusenergy', 'lockon'
      ];

      for (const type of secondaryTypes) {
        expect(isSecondaryEffectActive(mockPokemon, type)).toBe(true);
      }
    });

    it('correctly detects all 16 secondary statuses via volatileCounters', () => {
      const secondaryTypes = [
        'confusion', 'taunt', 'substitute', 'disable', 'encore',
        'perishsong', 'bound', 'attract', 'curse', 'leechseed',
        'trapped', 'ingrain', 'protect', 'endure', 'focusenergy', 'lockon'
      ];

      for (const type of secondaryTypes) {
        const mockPokemon = {
          volatileCounters: { [type]: 1 }
        } as unknown as Pokemon;
        expect(isSecondaryEffectActive(mockPokemon, type)).toBe(true);
      }
    });

    it('returns false when secondary statuses are cleared / 0', () => {
      const mockPokemon = {
        confused: 0,
        tauntTurns: 0,
        substitute: 0,
        disabledTurns: 0,
        encoreTurns: 0,
        perishSongCount: 0,
        bound: 0,
        attracted: false,
        cursed: false,
        seeded: false,
        trapped: false,
        ingrain: false,
        protect: false,
        endure: false,
        focusEnergy: false,
        lockOn: false,
        volatileCounters: {
          confusion: 0,
          taunt: 0,
          substitute: 0,
          disable: 0,
          encore: 0,
          perishsong: 0,
          bound: 0,
          attract: 0,
          curse: 0,
          leechseed: 0,
          trapped: 0,
          ingrain: 0,
          protect: 0,
          endure: 0,
          focusenergy: 0,
          lockon: 0
        }
      } as unknown as Pokemon;

      const secondaryTypes = [
        'confusion', 'taunt', 'substitute', 'disable', 'encore',
        'perishsong', 'bound', 'attract', 'curse', 'leechseed',
        'trapped', 'ingrain', 'protect', 'endure', 'focusenergy', 'lockon'
      ];

      for (const type of secondaryTypes) {
        expect(isSecondaryEffectActive(mockPokemon, type)).toBe(false);
      }
    });
  });

  describe('isFieldEffectActive', () => {
    it('detects canonical terrains via terrain state', () => {
      const terrains = ['electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain'];
      for (const t of terrains) {
        expect(isFieldEffectActive(t, null, null, null, t)).toBe(true);
        expect(isFieldEffectActive(t, null, null, null, 'other')).toBe(false);
      }
    });

    it('detects screens and hazards via stages (including lightscreen alias)', () => {
      expect(isFieldEffectActive('reflect', null, null, { reflect: 5 })).toBe(true);
      expect(isFieldEffectActive('lightscreen', null, null, { lightScreen: 5 })).toBe(true);
      expect(isFieldEffectActive('safeguard', null, null, { safeguard: 5 })).toBe(true);
      expect(isFieldEffectActive('mist', null, null, { mist: 5 })).toBe(true);
      expect(isFieldEffectActive('spikes', null, null, { spikes: 3 })).toBe(true);
      expect(isFieldEffectActive('reflect', null, null, { reflect: 0 })).toBe(false);
    });

    it('detects conditions via fieldConditions or sideConditions', () => {
      expect(isFieldEffectActive('trickroom', { trickroom: { turns: 5 } }, null, null)).toBe(true);
      expect(isFieldEffectActive('gravity', { gravity: { turns: 5 } }, null, null)).toBe(true);
      expect(isFieldEffectActive('stealthrock', null, { stealthrock: { turns: 1 } }, null)).toBe(true);
      expect(isFieldEffectActive('toxicspikes', null, { toxicspikes: { turns: 2 } }, null)).toBe(true);
    });
  });

  describe('isDebugEffectActive orchestrator', () => {
    it('dispatches to secondary and field handlers cleanly', () => {
      const mockPokemon = { confused: 4 } as unknown as Pokemon;
      expect(isDebugEffectActive('secondary', 'confusion', { poke: mockPokemon })).toBe(true);
      expect(isDebugEffectActive('field', 'electricterrain', { terrain: 'electricterrain' })).toBe(true);
    });
  });
});
