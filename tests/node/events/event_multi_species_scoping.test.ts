/**
 * tests/node/events/event_multi_species_scoping.test.ts
 *
 * TIER 1 UNIT TEST:
 * Verifies that when competition events have multiple participating species:
 * 1. Genetic IV sub-competitions are evaluated globally across all species in a shared 'ivs' slot.
 * 2. Physical dimension sub-competitions (Weight and Height) are resolved intra-species into dedicated slots (e.g. 'weight_horsea', 'height_horsea').
 * 3. Saturday open championship (species: '*', competitionScope: 'global') keeps all categories global.
 * 4. isPokemonEligibleForSubCompetition strictly enforces the target species on species-scoped slots.
 * 5. Anti-duplication prevents enrolling the same Pokemon into multiple slots of the same event.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  resolveEventSubCompetitions,
  isPokemonEligibleForSubCompetition,
  isPokemonEnrolledInOtherSubCompetition,
  type Event,
  type EventConfig,
  type ResolvedSubCompetition
} from '../../../src/logic/events/eventEngine.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

function mockEvent(id: string, config: EventConfig, schedule?: unknown): Event {
  return {
    id,
    name: 'Test Competition Event',
    icon: '🏆',
    type: 'competition',
    active: true,
    manual: false,
    schedule: typeof schedule === 'string' ? schedule : JSON.stringify(schedule || { type: 'weekly', days: [2], startHour: 18, endHour: 22 }),
    config: JSON.stringify(config),
    description: 'Test Description'
  };
}

function mockPokemon(uid: string, speciesId: string, overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    uid,
    id: speciesId as Pokemon['id'],
    species: speciesId as Pokemon['species'],
    name: speciesId.toUpperCase(),
    level: 25,
    gender: 'm',
    nature: 'hardy',
    isShiny: false,
    weight: 12.5,
    height: 0.6,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    stats: { hp: 50, atk: 40, def: 40, spa: 40, spd: 40, spe: 40 },
    moves: ['tackle', 'watergun'],
    pp: [35, 25],
    maxHp: 50,
    currentHp: 50,
    experience: 1000,
    experienceToNextLevel: 500,
    friendship: 100,
    obtainedAt: Temporal.Now.instant().epochMilliseconds,
    ...overrides
  } as Pokemon;
}

describe('Multi-Species Event Sub-Competition Scoping', () => {
  it('resolves single-species events into standard categories without species suffix', () => {
    const singleSpeciesEvent = mockEvent('hora_magikarp', {
      species: 'magikarp',
      hasCompetition: true,
      subCompetitions: [
        { id: 'ivs', name: 'Genética Superior (IVs)', metric: 'total_ivs', order: 'max' },
        { id: 'weight', name: 'Masa y Peso (Titán / Miniatura)', metric: 'weight', order: 'auto' },
        { id: 'height', name: 'Envergadura y Altura (Gran Salto)', metric: 'height', order: 'auto' }
      ]
    });

    const resolved = resolveEventSubCompetitions(singleSpeciesEvent);
    assert.equal(resolved.length, 3);
    const r0 = resolved[0];
    const r1 = resolved[1];
    const r2 = resolved[2];
    assert.ok(r0 && r1 && r2);
    assert.equal(r0.id, 'ivs');
    assert.equal(r0.speciesScope, 'global');
    assert.equal(r1.id, 'weight');
    assert.equal(r1.targetSpecies, 'magikarp');
    assert.equal(r2.id, 'height');
    assert.equal(r2.targetSpecies, 'magikarp');
  });

  it('resolves multi-species event rotations into 1 Global IV slot + dedicated Weight and Height slots per species', () => {
    const multiSpeciesEvent = mockEvent('torneo_pesca', {
      hasCompetition: true,
      rotationTheme: 'weekly_4',
      weeklyRotations: {
        '2': {
          species: 'shellder,staryu,horsea,seadra,goldeen',
          banner: 'pesca_exotica_full',
          title: 'Torneo de Pesca Exótica'
        }
      },
      subCompetitions: [
        { id: 'ivs', name: 'Genética Superior (IVs)', metric: 'total_ivs', order: 'max' },
        { id: 'weight', name: 'Masa y Peso (Titán / Miniatura)', metric: 'weight', order: 'auto' },
        { id: 'height', name: 'Envergadura y Altura (Gran Salto)', metric: 'height', order: 'auto' }
      ]
    });

    // Week 2 date (Aug 11, 2026)
    const week2Date = Temporal.ZonedDateTime.from('2026-08-11T19:00:00[America/Argentina/Buenos_Aires]');
    const resolved = resolveEventSubCompetitions(multiSpeciesEvent, week2Date);

    // 1 Global IVs + 5 species * 2 physical metrics (weight, height) = 11 total slots
    assert.equal(resolved.length, 11);

    // 1. First slot is Global IVs
    const globalIvs = resolved[0];
    assert.ok(globalIvs);
    assert.equal(globalIvs.id, 'ivs');
    assert.equal(globalIvs.metric, 'total_ivs');
    assert.equal(globalIvs.speciesScope, 'global');
    assert.equal(globalIvs.targetSpecies, undefined);

    // 2. Physical slots for Shellder
    const shellderWeight = resolved.find(r => r.id === 'weight_shellder');
    assert.ok(shellderWeight, 'weight_shellder must exist');
    assert.equal(shellderWeight.targetSpecies, 'shellder');
    assert.equal(shellderWeight.speciesScope, 'per_species');
    assert.ok(shellderWeight.name.includes('Shellder') || shellderWeight.name.includes('shellder'));

    const shellderHeight = resolved.find(r => r.id === 'height_shellder');
    assert.ok(shellderHeight, 'height_shellder must exist');
    assert.equal(shellderHeight.targetSpecies, 'shellder');

    // 3. Physical slots for Horsea
    const horseaWeight = resolved.find(r => r.id === 'weight_horsea');
    assert.ok(horseaWeight, 'weight_horsea must exist');
    assert.equal(horseaWeight.targetSpecies, 'horsea');

    const horseaHeight = resolved.find(r => r.id === 'height_horsea');
    assert.ok(horseaHeight, 'height_horsea must exist');
    assert.equal(horseaHeight.targetSpecies, 'horsea');
  });

  it('keeps all categories global for Saturday open championship (species: "*", competitionScope: "global")', () => {
    const saturdayEvent = mockEvent('gran_concurso_sabado', {
      species: '*',
      competitionScope: 'global',
      hasCompetition: true,
      subCompetitions: [
        { id: 'ivs', name: 'Genética Suprema (IVs Totales)', metric: 'total_ivs', order: 'max' },
        { id: 'weight', name: 'Titanes y Miniaturas (Masa y Peso)', metric: 'weight', order: 'auto' },
        { id: 'height', name: 'Envergadura y Altura', metric: 'height', order: 'auto' }
      ]
    });

    const resolved = resolveEventSubCompetitions(saturdayEvent);
    assert.equal(resolved.length, 3);
    const r0 = resolved[0];
    const r1 = resolved[1];
    const r2 = resolved[2];
    assert.ok(r0 && r1 && r2);
    assert.equal(r0.id, 'ivs');
    assert.equal(r0.speciesScope, 'global');
    assert.equal(r1.id, 'weight');
    assert.equal(r1.speciesScope, 'global');
    assert.equal(r2.id, 'height');
    assert.equal(r2.speciesScope, 'global');
  });

  it('enforces candidate eligibility: Global IV accepts any event species, while per-species slot accepts ONLY its target species', () => {
    const event = mockEvent('torneo_pesca', {
      hasCompetition: true,
      species: 'horsea,shellder'
    });

    const horsea = mockPokemon('poke-horsea-1', 'horsea');
    const shellder = mockPokemon('poke-shellder-1', 'shellder');
    const pikachu = mockPokemon('poke-pikachu-1', 'pikachu');

    const ivSlot: ResolvedSubCompetition = {
      id: 'ivs',
      name: 'Genética Superior (IVs)',
      metric: 'total_ivs',
      speciesScope: 'global'
    };

    const horseaWeightSlot: ResolvedSubCompetition = {
      id: 'weight_horsea',
      name: 'Peso: Horsea',
      metric: 'weight',
      targetSpecies: 'horsea',
      speciesScope: 'per_species'
    };

    // 1. IV Slot: Horsea & Shellder are eligible, Pikachu is not in event
    assert.equal(isPokemonEligibleForSubCompetition(event, ivSlot, horsea).eligible, true);
    assert.equal(isPokemonEligibleForSubCompetition(event, ivSlot, shellder).eligible, true);
    assert.equal(isPokemonEligibleForSubCompetition(event, ivSlot, pikachu).eligible, false);

    // 2. Horsea Weight Slot: ONLY Horsea is eligible, Shellder is rejected
    assert.equal(isPokemonEligibleForSubCompetition(event, horseaWeightSlot, horsea).eligible, true);
    const shellderCheck = isPokemonEligibleForSubCompetition(event, horseaWeightSlot, shellder);
    assert.equal(shellderCheck.eligible, false);
    assert.ok(shellderCheck.reason?.toLowerCase().includes('horsea'));
  });

  it('prevents enrolling the same Pokemon UID into multiple slots of the same event', () => {
    const userEntries = {
      'torneo_pesca:ivs': {
        event_id: 'torneo_pesca',
        category_id: 'ivs',
        pokemon_uid: 'poke-horsea-1'
      }
    };

    // horsea-1 is enrolled in 'ivs', so it cannot be enrolled into 'weight_horsea'
    assert.equal(
      isPokemonEnrolledInOtherSubCompetition(userEntries, 'torneo_pesca', 'weight_horsea', 'poke-horsea-1'),
      true
    );

    // horsea-2 is NOT enrolled anywhere, so it is free to enroll
    assert.equal(
      isPokemonEnrolledInOtherSubCompetition(userEntries, 'torneo_pesca', 'weight_horsea', 'poke-horsea-2'),
      false
    );
  });
});
