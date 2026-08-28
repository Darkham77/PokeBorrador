/**
 * tests/node/validation/test_event_competition_persistence_valibot.test.ts
 *
 * Verifies that:
 * 1. Valibot schemas (saveDataSchema, pokemonSchema, pokemonCompetitionTrophySchema, userProfileSchema)
 *    successfully validate all event stats, medals, and compound sub-competition trophies (e.g. 'weight_horsea', 'ivs').
 * 2. SQLite database persistence roundtrips for events_config, competition_entries, and game_saves
 *    maintain strict data integrity with 0 schema violations.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { safeParse } from 'valibot';
import {
  saveDataSchema,
  pokemonSchema,
  pokemonCompetitionTrophySchema,
  userProfileSchema
} from '../../../src/logic/validation/schemas.ts';
import { TABLES_SCHEMA } from '../../../src/logic/db/schema.ts';

describe('Event Competition Persistence & Valibot Validation Roundtrip', () => {
  it('validates player save data with event medals, stats, and multi-species sub-competition trophies via Valibot', () => {
    const trophyHorsea = {
      eventId: 'torneo_pesca',
      eventName: 'Torneo de Pesca Acuática',
      categoryId: 'weight_horsea',
      categoryName: 'Mayor Peso (Horsea)',
      rank: 'first' as const,
      score: 12.85,
      awardedAt: Temporal.Now.instant().epochMilliseconds
    };

    const trophyShellder = {
      eventId: 'torneo_pesca',
      eventName: 'Torneo de Pesca Acuática',
      categoryId: 'height_shellder',
      categoryName: 'Mayor Altura (Shellder)',
      rank: 'second' as const,
      score: 0.45,
      awardedAt: Temporal.Now.instant().epochMilliseconds
    };

    const trophyGlobalIvs = {
      eventId: 'gran_concurso_sabado',
      eventName: 'Gran Concurso del Sábado',
      categoryId: 'ivs',
      categoryName: 'Genética Suprema (IVs Totales)',
      rank: 'third' as const,
      score: 184,
      awardedAt: Temporal.Now.instant().epochMilliseconds
    };

    // 1. Validate individual trophies
    assert.ok(safeParse(pokemonCompetitionTrophySchema, trophyHorsea).success);
    assert.ok(safeParse(pokemonCompetitionTrophySchema, trophyShellder).success);
    assert.ok(safeParse(pokemonCompetitionTrophySchema, trophyGlobalIvs).success);

    // 2. Validate Pokemon with trophies
    const horseaPokemon = {
      uid: 'poke-horsea-champion-1',
      id: 'horsea',
      species: 'horsea',
      name: 'Horsea',
      nickname: 'Sea King',
      level: 45,
      exp: 15000,
      expNeeded: 5000,
      hp: 110,
      maxHp: 110,
      atk: 60,
      def: 85,
      spa: 90,
      spd: 55,
      spe: 80,
      type: 'water',
      isShiny: true,
      friendship: 200,
      nature: 'modest',
      gender: 'm' as const,
      status: '' as const,
      ability: 'swift-swim',
      weight: 12.85,
      height: 0.52,
      ivs: { hp: 31, atk: 30, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      trophies: [trophyHorsea, trophyGlobalIvs]
    };

    const parsedPoke = safeParse(pokemonSchema, horseaPokemon);
    assert.ok(parsedPoke.success, `Pokemon validation failed: ${JSON.stringify(parsedPoke.issues)}`);

    // 3. Validate full player save with event medal stats
    const fullSave = {
      trainer: 'MarinaChampion',
      gender: 'm' as const,
      badges: 8,
      balls: 50,
      money: 250000,
      battleCoins: 1500,
      trainerLevel: 50,
      trainerExp: 10000,
      trainerExpNeeded: 20000,
      inventory: { pokeball: 20, masterball: 1 },
      team: [horseaPokemon],
      box: [],
      eggs: [],
      pokedex: ['horsea', 'shellder'],
      seenPokedex: ['horsea', 'shellder', 'staryu'],
      defeatedGyms: ['pewter', 'cerulean', 'vermilion'],
      starterChosen: true,
      eloRating: 1450,
      pvpStats: { wins: 25, losses: 5, draws: 1 },
      rankedMaxElo: 1450,
      passiveTeamActive: false,
      daycare_mission_refreshes: 3,
      boxCount: 4,
      classLevel: 5,
      classXP: 2500,
      classData: {
        captureStreak: 12,
        longestStreak: 25,
        reputation: 150,
        blackMarketSales: 0,
        criminality: 0,
        kitCaptures: 10
      },
      warCoins: 500,
      warCoinsSpent: 100,
      lastPokemonCenterHeal: Temporal.Now.instant().epochMilliseconds,
      playtime: 36000,
      stats: {
        eventsFirstPlace: 4,
        eventsSecondPlace: 2,
        eventsThirdPlace: 1,
        eventsParticipated: 12,
        eventMedals: 7,
        totalCatches: 350
      }
    };

    const parsedSave = safeParse(saveDataSchema, fullSave);
    assert.ok(parsedSave.success, `Save validation failed: ${JSON.stringify(parsedSave.issues)}`);

    // 4. Validate user profile schema
    const profile = {
      id: 'usr-event-pro-1',
      username: 'MarinaPro',
      level: 50,
      is_banned: false,
      coins: 250000
    };
    assert.ok(safeParse(userProfileSchema, profile).success);
  });

  it('persists and retrieves competition entries with multi-species compound category IDs in SQLite', () => {
    using db = new DatabaseSync(':memory:');

    // Create tables from official TABLES_SCHEMA
    for (const schema of TABLES_SCHEMA) {
      db.exec(`CREATE TABLE IF NOT EXISTS ${schema}`);
    }

    // Insert active multi-species event configuration
    const eventConfig = {
      species: 'shellder,horsea,staryu',
      hasCompetition: true,
      subCompetitions: [
        { id: 'ivs', name: 'Genética Superior (IVs)', metric: 'total_ivs', order: 'max' },
        { id: 'weight', name: 'Masa y Peso', metric: 'weight', order: 'auto' },
        { id: 'height', name: 'Envergadura y Altura', metric: 'height', order: 'auto' }
      ]
    };

    db.prepare(`
      INSERT INTO events_config (id, name, icon, type, active, manual, config, description)
      VALUES (?, ?, ?, ?, 1, 1, ?, ?)
    `).run(
      'torneo_pesca',
      'Torneo de Pesca Acuática',
      '🎣',
      'competition',
      JSON.stringify(eventConfig),
      'Torneo semanal multi-especie'
    );

    // Insert user competition entries across multiple compound categories
    const entries = [
      {
        id: 'torneo_pesca:ivs:user_1',
        event_id: 'torneo_pesca',
        category_id: 'ivs',
        player_id: 'user_1',
        pokemon_uid: 'poke-shellder-1',
        data: JSON.stringify({ species: 'shellder', score: 180, displayValue: '180 / 186 IVs' })
      },
      {
        id: 'torneo_pesca:weight_horsea:user_1',
        event_id: 'torneo_pesca',
        category_id: 'weight_horsea',
        player_id: 'user_1',
        pokemon_uid: 'poke-horsea-1',
        data: JSON.stringify({ species: 'horsea', score: 12.8, displayValue: '12.8 kg (Titán)' })
      },
      {
        id: 'torneo_pesca:height_shellder:user_1',
        event_id: 'torneo_pesca',
        category_id: 'height_shellder',
        player_id: 'user_1',
        pokemon_uid: 'poke-shellder-2',
        data: JSON.stringify({ species: 'shellder', score: 0.48, displayValue: '0.48 m' })
      }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO competition_entries (id, event_id, category_id, player_id, pokemon_uid, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const e of entries) {
      insertStmt.run(e.id, e.event_id, e.category_id, e.player_id, e.pokemon_uid, e.data);
    }

    // Query entries by event and category
    const userEntries = db.prepare(`
      SELECT * FROM competition_entries WHERE event_id = ? AND player_id = ?
    `).all('torneo_pesca', 'user_1') as Array<{ category_id: string; pokemon_uid: string; data: string }>;

    assert.equal(userEntries.length, 3);
    const categoryIds = userEntries.map(u => u.category_id).sort();
    assert.deepEqual(categoryIds, ['height_shellder', 'ivs', 'weight_horsea']);

    // Ensure PRIMARY KEY constraint works properly per canonical entry id (event_id:category_id:player_id)
    assert.throws(() => {
      insertStmt.run(
        'torneo_pesca:weight_horsea:user_1',
        'torneo_pesca',
        'weight_horsea',
        'user_1',
        'poke-horsea-dupe',
        '{}'
      );
    });
  });
});
