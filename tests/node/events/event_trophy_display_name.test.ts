/**
 * tests/node/events/event_trophy_display_name.test.ts
 *
 * TIER 1 UNIT TEST:
 * Verifies that Pokemon competition trophies correctly resolve their thematic event name
 * (e.g. "Torneo Magikarp & Gyarados") instead of falling back to the generic database name
 * ("Torneo de Pesca Acuática") when resolved with species or date.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  getEventDisplayName,
  resolveTrophyDisplayName,
  type Event as GameEvent
} from '../../../src/logic/events/eventEngine.ts';
import type { PokemonCompetitionTrophy } from '../../../src/types/pokemon/pokemon.ts';

describe('Event Trophy Thematic Display Name Resolution', () => {
  const mockFishingEvent: GameEvent = {
    id: 'torneo_pesca',
    name: 'Torneo de Pesca Acuática',
    description: 'Competencia semanal de pesca',
    active: true,
    config: {
      hasCompetition: true,
      rotationTheme: 'weekly_4',
      weeklyRotations: {
        '1': { species: 'magikarp,gyarados', banner: 'hora_magikarp_full', title: 'Torneo Magikarp & Gyarados' },
        '2': { species: 'shellder,staryu,horsea,seadra,goldeen', banner: 'pesca_exotica_full', title: 'Torneo de Pesca Exótica' },
        '3': { species: 'tentacool,tentacruel,krabby,kingler,poliwag', banner: 'pesca_profunda_full', title: 'Torneo de Pesca Profunda' },
        '4': { species: 'dratini,dragonair,lapras', banner: 'pesca_mistica_full', title: 'Torneo de Pesca Mística' }
      }
    }
  };

  const mockHuntingEvent: GameEvent = {
    id: 'torneo_caza',
    name: 'Torneo de Caza Temático',
    description: 'Competencia semanal de caza',
    active: true,
    config: {
      hasCompetition: true,
      rotationTheme: 'weekly_4',
      weeklyRotations: {
        '1': { species: 'scyther,pinsir,butterfree,beedrill,venomoth', banner: 'caza_bichos_full', title: 'Concurso de Caza de Bichos' },
        '2': { species: 'tauros,kangaskhan,chansey,dodrio', banner: 'safari_park_full', title: 'Gran Torneo de la Zona Safari' }
      }
    }
  };

  const allEvents = [mockFishingEvent, mockHuntingEvent];

  it('getEventDisplayName resolves rotation title when passed a species ID', () => {
    const nameMagikarp = getEventDisplayName(mockFishingEvent, 'magikarp');
    assert.equal(nameMagikarp, 'Torneo Magikarp & Gyarados');

    const nameGyarados = getEventDisplayName(mockFishingEvent, 'gyarados');
    assert.equal(nameGyarados, 'Torneo Magikarp & Gyarados');

    const nameShellder = getEventDisplayName(mockFishingEvent, 'shellder');
    assert.equal(nameShellder, 'Torneo de Pesca Exótica');

    const nameScyther = getEventDisplayName(mockHuntingEvent, 'scyther');
    assert.equal(nameScyther, 'Concurso de Caza de Bichos');
  });

  it('resolveTrophyDisplayName resolves thematic name for Magikarp trophy with generic saved name', () => {
    const legacyTrophy: PokemonCompetitionTrophy = {
      eventId: 'torneo_pesca',
      eventName: 'Torneo de Pesca Acuática', // Legacy or generic saved name
      categoryId: 'ivs',
      categoryName: 'Genética Superior (IVs)',
      rank: 'first',
      score: 186,
      awardedAt: 1788200000000
    };

    const resolvedName = resolveTrophyDisplayName(legacyTrophy, allEvents, 'magikarp');
    assert.equal(resolvedName, 'Torneo Magikarp & Gyarados');
  });

  it('resolveTrophyDisplayName falls back to trophy.eventName if event is unknown or not in list', () => {
    const unknownTrophy: PokemonCompetitionTrophy = {
      eventId: 'custom_old_event',
      eventName: 'Torneo Antiguo Especial',
      categoryId: 'ivs',
      categoryName: 'Genética',
      rank: 'first',
      score: 100,
      awardedAt: 1788200000000
    };

    const resolvedName = resolveTrophyDisplayName(unknownTrophy, allEvents, 'magikarp');
    assert.equal(resolvedName, 'Torneo Antiguo Especial');
  });

  it('should resolve the correct rotation event name when an historical awarded_at date is provided', async () => {
    const { GAME_TIMEZONE } = await import('@/logic/utils/timeUtils');

    const week1Zdt = Temporal.Instant.from('2026-01-05T10:00:00Z').toZonedDateTimeISO(GAME_TIMEZONE);
    const displayNameWeek1 = getEventDisplayName(mockFishingEvent, week1Zdt);
    assert.equal(displayNameWeek1, 'Torneo Magikarp & Gyarados');

    const week2Zdt = Temporal.Instant.from('2026-01-12T10:00:00Z').toZonedDateTimeISO(GAME_TIMEZONE);
    const displayNameWeek2 = getEventDisplayName(mockFishingEvent, week2Zdt);
    assert.equal(displayNameWeek2, 'Torneo de Pesca Exótica');
  });
});
