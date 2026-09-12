import { describe, it, expect } from 'vitest';
import { getEncounterPool } from '@/logic/encounters/routeSpawnMath';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import type { MapLocation } from '@/types/pokemon/encounters';

describe('Legendary Tickets Dynamic Spawn Injection', () => {
  const maps = pokemonDataProvider.getMaps();
  const seafoam = maps.find(m => m.id === 'seafoam_islands') as MapLocation;
  const cerulean = maps.find(m => m.id === 'cerulean_cave') as MapLocation;

  describe('Articuno Ticket', () => {
    it('does NOT include Articuno when ticket is inactive or 0 secs', () => {
      const { pool } = getEncounterPool(seafoam, 'day', 'clear', [], { articunoTicketSecs: 0 });
      expect(pool).not.toContain('articuno');
    });

    it('injects Articuno into Seafoam Islands when ticket is active', () => {
      const { pool, rates } = getEncounterPool(seafoam, 'day', 'clear', [], { articunoTicketSecs: 1800 });
      expect(pool).toContain('articuno');
      const idx = pool.indexOf('articuno');
      expect(rates[idx]).toBe(1);
    });
  });

  describe('Mewtwo Ticket', () => {
    it('does NOT include Mewtwo when ticket is inactive or 0 secs', () => {
      const { pool } = getEncounterPool(cerulean, 'day', 'clear', [], { mewtwoTicketSecs: 0 });
      expect(pool).not.toContain('mewtwo');
    });

    it('injects Mewtwo into Cerulean Cave when ticket is active', () => {
      const { pool, rates } = getEncounterPool(cerulean, 'day', 'clear', [], { mewtwoTicketSecs: 1800 });
      expect(pool).toContain('mewtwo');
      const idx = pool.indexOf('mewtwo');
      expect(rates[idx]).toBe(0.1);
    });
  });
});
