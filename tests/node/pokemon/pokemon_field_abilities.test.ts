import { describe, test } from 'vitest';
import assert from 'node:assert';
import {
  resolveSynchronizeNature,
  resolveCuteCharmGender,
  getWildHeldItemRates,
  resolveElementalAttractionType,
  shouldAvoidLowLevelWild,
  shouldForceMaxRouteLevel,
  getEncounterRateMultiplier,
  getFishingWeightMultiplier,
  getHatchSpeedMultiplier,
  resolvePickupLoot,
  resolveHoneyGather,
  curePartyNaturalCure,
  getFieldPassiveBadges,
  HELD_ITEM_NORMAL_RATES,
  HELD_ITEM_BOOSTED_RATES
} from '../../../src/logic/pokemon/pokemonFieldAbilities.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';
import { requirePokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';

function createMockPokemon(partial: Partial<Pokemon> = {}): Pokemon {
  return {
    uid: 'mock-uid-1',
    id: requirePokemonSpeciesId('abra'),
    species: requirePokemonSpeciesId('abra'),
    name: 'Abra',
    type: 'psychic',
    level: 25,
    hp: 50,
    maxHp: 50,
    atk: 20,
    def: 20,
    spa: 50,
    spd: 30,
    spe: 45,
    status: '',
    sleepTurns: 0,
    friendship: 70,
    vigor: 10,
    maxVigor: 10,
    heldItem: null,
    nickname: null,
    tags: [],
    obtainedAt: Date.now(),
    obtainedMethod: 'wild',
    isFloating: false,
    catchRate: 200,
    exp: 0,
    expNeeded: 1000,
    ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    nature: 'modest',
    ability: 'synchronize',
    gender: 'm',
    isShiny: false,
    moves: [{ id: 'teleport', name: 'Teleport', pp: 20, maxPP: 20 }],
    ...partial
  };
}

describe('pokemonFieldAbilities - Unit Test Suite (All 33 Field Abilities)', () => {
  // 1. Sincronía (synchronize)
  describe('1. synchronize', () => {
    test('Gen 9: Sincroniza al 100% si el líder está vivo', () => {
      const leader = createMockPokemon({ ability: 'synchronize', nature: 'adamant', hp: 50 });
      const nature = resolveSynchronizeNature(leader, 9, () => 0.99);
      assert.strictEqual(nature, 'adamant', 'Gen 9 must have 100% sync rate');
    });

    test('Gen 9: No sincroniza si el líder está debilitado', () => {
      const leader = createMockPokemon({ ability: 'synchronize', nature: 'adamant', hp: 0 });
      const nature = resolveSynchronizeNature(leader, 9, () => 0.10);
      assert.strictEqual(nature, null, 'Fainted leader must not sync in Gen 9');
    });

    test('Gen 4 (Legacy): Sincroniza al 50% incluso si está debilitado', () => {
      const leader = createMockPokemon({ ability: 'synchronize', nature: 'jolly', hp: 0 });
      const successNature = resolveSynchronizeNature(leader, 4, () => 0.40);
      const failedNature = resolveSynchronizeNature(leader, 4, () => 0.60);
      assert.strictEqual(successNature, 'jolly', 'Gen 4 must sync at 50% even if fainted');
      assert.strictEqual(failedNature, null, 'Must return null when random roll >= 0.50');
    });
  });

  // 2. Gran Encanto (cutecharm)
  describe('2. cutecharm', () => {
    test('Fuerza género opuesto (66.7% probabilidad) en especies con género binario', () => {
      const maleLeader = createMockPokemon({ id: requirePokemonSpeciesId('clefairy'), ability: 'cutecharm', gender: 'm' });
      const forcedFemale = resolveCuteCharmGender(maleLeader, requirePokemonSpeciesId('pidgey'), 9, () => 0.50);
      const notForced = resolveCuteCharmGender(maleLeader, requirePokemonSpeciesId('pidgey'), 9, () => 0.90);
      assert.strictEqual(forcedFemale, 'f', 'Male leader must attract Female wild');
      assert.strictEqual(notForced, null, 'Roll above 2/3 must not force gender');

      const femaleLeader = createMockPokemon({ id: requirePokemonSpeciesId('clefairy'), ability: 'cutecharm', gender: 'f' });
      const forcedMale = resolveCuteCharmGender(femaleLeader, requirePokemonSpeciesId('pidgey'), 9, () => 0.50);
      assert.strictEqual(forcedMale, 'm', 'Female leader must attract Male wild');
    });

    test('No afecta a especies asexuales (Magnemite, Voltorb)', () => {
      const maleLeader = createMockPokemon({ ability: 'cutecharm', gender: 'm' });
      const result = resolveCuteCharmGender(maleLeader, requirePokemonSpeciesId('magnemite'), 9, () => 0.10);
      assert.strictEqual(result, null, 'Cute charm must not affect genderless Pokemon');
    });
  });

  // 3, 4, 5. Ojo Compuesto (compoundeyes), Afortunado (superluck), Cacheo (frisk)
  describe('3, 4, 5. compoundeyes, superluck, frisk (Wild Held Items)', () => {
    test('compoundeyes y superluck duplican/aumentan tasas a 60% común y 20% raro', () => {
      const normal = getWildHeldItemRates('blaze');
      assert.deepStrictEqual(normal, HELD_ITEM_NORMAL_RATES);

      const compound = getWildHeldItemRates('compoundeyes');
      assert.deepStrictEqual(compound, HELD_ITEM_BOOSTED_RATES);

      const luck = getWildHeldItemRates('superluck');
      assert.deepStrictEqual(luck, HELD_ITEM_BOOSTED_RATES);
    });

    test('frisk otorga 50% de probabilidad de forzar held item', () => {
      const frisk = getWildHeldItemRates('frisk');
      assert.strictEqual(frisk.forceHeldChance, 0.50);
    });
  });

  // 6, 7, 8. Cuerpo Llama (flamebody), Escudo Magma (magmaarmor), Combustible (steamengine)
  describe('6, 7, 8. flamebody, magmaarmor, steamengine (Daycare Hatch Multiplier)', () => {
    test('Otorga x2 velocidad de eclosión si al menos uno está en el equipo', () => {
      const team = [createMockPokemon({ ability: 'flamebody', hp: 10 })];
      assert.strictEqual(getHatchSpeedMultiplier(team), 2);
    });

    test('No es acumulable (múltiples miembros no otorgan x4)', () => {
      const team = [
        createMockPokemon({ ability: 'flamebody', hp: 10 }),
        createMockPokemon({ ability: 'magmaarmor', hp: 10 }),
        createMockPokemon({ ability: 'steamengine', hp: 10 })
      ];
      assert.strictEqual(getHatchSpeedMultiplier(team), 2, 'Must remain strictly 2x');
    });

    test('Devuelve x1 si el Pokémon con la habilidad está debilitado o no existe', () => {
      const team = [createMockPokemon({ ability: 'flamebody', hp: 0 })];
      assert.strictEqual(getHatchSpeedMultiplier(team), 1);
    });
  });

  // 9. Recogida (pickup)
  describe('9. pickup (Level Brackets & 10% Chance)', () => {
    test('Devuelve null si el roll supera el 10% o el Pokémon está debilitado', () => {
      const meowth = createMockPokemon({ ability: 'pickup', level: 15, hp: 30 });
      assert.strictEqual(resolvePickupLoot(meowth, () => 0.15), null, 'Roll above 10% must return null');

      const deadMeowth = createMockPokemon({ ability: 'pickup', level: 15, hp: 0 });
      assert.strictEqual(resolvePickupLoot(deadMeowth, () => 0.05), null, 'Fainted Pokemon cannot pickup');
    });

    test('Escala correctamente en los 5 rangos de nivel', () => {
      // Bracket 1 (Lv 1-20): Potion
      const pkmnLv10 = createMockPokemon({ ability: 'pickup', level: 10 });
      const itemLv10 = resolvePickupLoot(pkmnLv10, () => 0.01);
      assert.strictEqual(itemLv10, 'potion');

      // Bracket 2 (Lv 21-40): Superpotion
      const pkmnLv30 = createMockPokemon({ ability: 'pickup', level: 30 });
      const itemLv30 = resolvePickupLoot(pkmnLv30, () => 0.01);
      assert.strictEqual(itemLv30, 'superpotion');

      // Bracket 3 (Lv 41-60): Hyperpotion
      const pkmnLv50 = createMockPokemon({ ability: 'pickup', level: 50 });
      const itemLv50 = resolvePickupLoot(pkmnLv50, () => 0.01);
      assert.strictEqual(itemLv50, 'hyperpotion');

      // Bracket 4 (Lv 61-80): Maxpotion
      const pkmnLv70 = createMockPokemon({ ability: 'pickup', level: 70 });
      const itemLv70 = resolvePickupLoot(pkmnLv70, () => 0.01);
      assert.strictEqual(itemLv70, 'maxpotion');

      // Bracket 5 (Lv 81-100): Fullrestore
      const pkmnLv95 = createMockPokemon({ ability: 'pickup', level: 95 });
      const itemLv95 = resolvePickupLoot(pkmnLv95, () => 0.01);
      assert.strictEqual(itemLv95, 'fullrestore');
    });
  });

  // 10. Recogemiel (honeygather)
  describe('10. honeygather', () => {
    test('Calcula probabilidad según nivel (5% base hasta 50% max)', () => {
      const combeeLv1 = createMockPokemon({ ability: 'honeygather', level: 1 });
      assert.strictEqual(resolveHoneyGather(combeeLv1, () => 0.04), true);
      assert.strictEqual(resolveHoneyGather(combeeLv1, () => 0.06), false);

      const combeeLv100 = createMockPokemon({ ability: 'honeygather', level: 100 });
      assert.strictEqual(resolveHoneyGather(combeeLv100, () => 0.49), true);
      assert.strictEqual(resolveHoneyGather(combeeLv100, () => 0.51), false);
    });
  });

  // 11. Cura Natural (naturalcure)
  describe('11. naturalcure', () => {
    test('Limpia problemas de estado de los miembros del equipo post-combate', () => {
      const chansey = createMockPokemon({ name: 'Chansey', ability: 'naturalcure', status: 'psn' });
      const snorlax = createMockPokemon({ name: 'Snorlax', ability: 'immunity', status: 'brn' });
      const team = [chansey, snorlax];

      const cured = curePartyNaturalCure(team);
      assert.strictEqual(chansey.status, '', 'Chansey status must be cleared');
      assert.strictEqual(snorlax.status, 'brn', 'Snorlax status must not be modified');
      assert.deepStrictEqual(cured, ['Chansey']);
    });
  });

  // 12, 13, 14, 15, 16, 17. Atracción Elemental
  describe('12-17. Elemental Type Attraction Abilities', () => {
    test('magnetpull y static atraen Acero y Eléctrico (50%) en todas las generaciones', () => {
      assert.strictEqual(resolveElementalAttractionType('magnetpull', 4, () => 0.40), 'steel');
      assert.strictEqual(resolveElementalAttractionType('static', 4, () => 0.40), 'electric');
    });

    test('lightningrod, flashfire, stormdrain y harvest atraen tipos en Gen 8+, pero no en Gen 4', () => {
      assert.strictEqual(resolveElementalAttractionType('flashfire', 9, () => 0.40), 'fire');
      assert.strictEqual(resolveElementalAttractionType('flashfire', 4, () => 0.40), null, 'Must be inactive in Gen 4');

      assert.strictEqual(resolveElementalAttractionType('stormdrain', 9, () => 0.40), 'water');
      assert.strictEqual(resolveElementalAttractionType('harvest', 9, () => 0.40), 'grass');
      assert.strictEqual(resolveElementalAttractionType('lightningrod', 9, () => 0.40), 'electric');
    });
  });

  // 18, 19. Pesca (suctioncups, stickyhold)
  describe('18, 19. suctioncups, stickyhold (Fishing Bite Multiplier)', () => {
    test('Duplican el peso de mordida de pesca (2.0x)', () => {
      assert.strictEqual(getFishingWeightMultiplier('suctioncups'), 2.0);
      assert.strictEqual(getFishingWeightMultiplier('stickyhold'), 2.0);
      assert.strictEqual(getFishingWeightMultiplier('torrent'), 1.0);
    });
  });

  // 20, 21. Intimidación (intimidate) y Vista Lince (keeneye)
  describe('20, 21. intimidate, keeneye (Level Filtering)', () => {
    test('Descarta salvajes de 5+ niveles menores con 50% de probabilidad', () => {
      const leaderLv50 = createMockPokemon({ ability: 'intimidate', level: 50 });
      assert.strictEqual(shouldAvoidLowLevelWild(leaderLv50, 44, 9, () => 0.40), true);
      assert.strictEqual(shouldAvoidLowLevelWild(leaderLv50, 46, 9, () => 0.40), false);
      assert.strictEqual(shouldAvoidLowLevelWild(leaderLv50, 20, 9, () => 0.60), false);
    });
  });

  // 22, 23, 24. Presión (pressure), Espíritu Vital (vitalspirit), Entusiasmo (hustle)
  describe('22, 23, 24. pressure, vitalspirit, hustle (Force Max Level)', () => {
    test('50% de probabilidad de forzar el nivel máximo de la ruta', () => {
      assert.strictEqual(shouldForceMaxRouteLevel('pressure', () => 0.40), true);
      assert.strictEqual(shouldForceMaxRouteLevel('vitalspirit', () => 0.40), true);
      assert.strictEqual(shouldForceMaxRouteLevel('hustle', () => 0.40), true);
      assert.strictEqual(shouldForceMaxRouteLevel('pressure', () => 0.60), false);
      assert.strictEqual(shouldForceMaxRouteLevel('blaze', () => 0.10), false);
    });
  });

  // 25, 26, 27. Trampa Arena (arenatrap), Iluminación (illuminate), Indefenso (noguard)
  describe('25, 26, 27. arenatrap, illuminate, noguard (High Spawn Rate)', () => {
    test('Duplican el ratio de encuentros salvajes (2.0x)', () => {
      assert.strictEqual(getEncounterRateMultiplier('arenatrap'), 2.0);
      assert.strictEqual(getEncounterRateMultiplier('illuminate'), 2.0);
      assert.strictEqual(getEncounterRateMultiplier('noguard'), 2.0);
    });
  });

  // 28, 29, 30, 31. Hedor (stench), Humo Blanco (whitesmoke), Pies Rápidos (quickfeet), Allanamiento (infiltrator)
  describe('28, 29, 30, 31. Low Spawn Rate Abilities', () => {
    test('Reducen a la mitad el ratio de encuentros salvajes (0.5x)', () => {
      assert.strictEqual(getEncounterRateMultiplier('stench'), 0.5);
      assert.strictEqual(getEncounterRateMultiplier('whitesmoke'), 0.5);
      assert.strictEqual(getEncounterRateMultiplier('quickfeet'), 0.5);
      assert.strictEqual(getEncounterRateMultiplier('infiltrator'), 0.5);
    });
  });

  // 32, 33. Velo Arena (sandveil) y Manto Níveo (snowcloak)
  describe('32, 33. Weather Encounter Reduction Abilities', () => {
    test('sandveil reduce 50% encuentros en sandstorm y snowcloak en snow/blizzard', () => {
      assert.strictEqual(getEncounterRateMultiplier('sandveil', 'sandstorm'), 0.5);
      assert.strictEqual(getEncounterRateMultiplier('sandveil', 'clear'), 1.0);

      assert.strictEqual(getEncounterRateMultiplier('snowcloak', 'snow'), 0.5);
      assert.strictEqual(getEncounterRateMultiplier('snowcloak', 'blizzard'), 0.5);
      assert.strictEqual(getEncounterRateMultiplier('snowcloak', 'clear'), 1.0);
    });
  });

  // UI Badges
  describe('UI Badges', () => {
    test('Devuelve el badge descriptor correspondiente si la pasiva existe', () => {
      const abra = createMockPokemon({ ability: 'synchronize' });
      const badge = getFieldPassiveBadges(abra);
      assert.ok(badge);
      assert.strictEqual(badge.label, 'Sincronía');
      assert.strictEqual(badge.icon, '🔮');
    });
  });
});
