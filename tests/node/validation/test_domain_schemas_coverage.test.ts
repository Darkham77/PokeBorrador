import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { safeParse } from 'valibot';
import {
  userProfileSchema,
  trainerNameSchema,
  authLoginSchema,
  authRegisterSchema,
  authPasswordResetSchema,
  chatMessageSchema,
  networkActionSchema,
  pokemonIVsSchema,
  pokemonEVsSchema,
  moveEffectSchema,
  moveSchema,
  pokemonSchema,
  pokemonEggSchema,
  gtsItemDataSchema,
  gtsListingSchema,
  tradeOfferSchema,
  enemyPokemonSerializedSchema,
  activeBattleSchema,
  daycareMissionSchema,
  notificationItemSchema,
  saveDataSchema,
  type UserProfileDto,
  type TrainerNameDto,
  type AuthLoginDto,
  type AuthRegisterDto,
  type AuthPasswordResetDto,
  type ChatMessageDto,
  type NetworkActionDto,
  type PokemonInstanceDto,
  type PokemonEggDto,
  type GtsListingDto,
  type TradeOfferDto,
  type SaveDataDto,
  type SaveDataInputDto
} from '../../../src/logic/validation/schemas.ts';

describe('Domain Schemas & DTO Type Governance Exhaustive Test', () => {
  it('validates auth and user schemas directly', () => {
    assert.ok(safeParse(userProfileSchema, { id: 'u1', username: 'AshKetchum', level: 10, is_banned: false, coins: 100 }).success);
    assert.ok(safeParse(trainerNameSchema, 'TrainerAsh').success);
    assert.ok(safeParse(authLoginSchema, { email: 'ash@kanto.org', password: 'password123' }).success);
    assert.ok(safeParse(authRegisterSchema, { email: 'misty@cerulean.org', password: 'password123', username: 'MistyWater' }).success);
    assert.ok(safeParse(authPasswordResetSchema, { password: 'newPassword123', confirmPassword: 'newPassword123' }).success);
    assert.ok(safeParse(chatMessageSchema, {
      id: 'c1',
      user_id: 'u1',
      username: 'Ash',
      message: 'Hello',
      player_class: 'trainer',
      trainer_level: 10,
      created_at: '2026-08-18T00:00:00.000Z'
    }).success);
  });

  it('validates IV and EV schemas within boundaries', () => {
    const validIVs = { hp: 31, atk: 0, def: 15, spa: 31, spd: 31, spe: 31 };
    const validEVs = { hp: 252, atk: 0, def: 0, spa: 252, spd: 4, spe: 0 };

    assert.ok(safeParse(pokemonIVsSchema, validIVs).success);
    assert.ok(safeParse(pokemonEVsSchema, validEVs).success);

    assert.ok(!safeParse(pokemonIVsSchema, { ...validIVs, hp: 32 }).success);
    assert.ok(!safeParse(pokemonEVsSchema, { ...validEVs, atk: 253 }).success);
  });

  it('validates move and move effect schemas', () => {
    const effect = { type: 'damage', status: 'par' as const, stages: 1, chance: 100 };
    assert.ok(safeParse(moveEffectSchema, effect).success);

    const move = { id: 'tackle', name: 'Tackle', power: 40, acc: 100, cat: 'physical' as const, pp: 35, maxPP: 35 };
    assert.ok(safeParse(moveSchema, move).success);
  });

  it('validates pokemon instance schema and egg schema', () => {
    const poke = {
      uid: 'poke-1',
      id: 'pikachu',
      species: 'pikachu',
      name: 'Pikachu',
      level: 25,
      exp: 1000,
      expNeeded: 1200,
      hp: 60,
      maxHp: 60,
      atk: 55,
      def: 40,
      spa: 50,
      spd: 50,
      spe: 90,
      type: 'electric',
      isShiny: false
    };
    assert.ok(safeParse(pokemonSchema, poke).success);

    const egg = {
      uid: 'egg-1',
      id: 'pichu',
      steps: 1280,
      totalSteps: 2560,
      ready: false
    };
    assert.ok(safeParse(pokemonEggSchema, egg).success);
  });

  it('validates gts item data schema, listing, and daycare mission schema', () => {
    const itemData = { id: 'potion', name: 'Poción', qty: 5 };
    assert.ok(safeParse(gtsItemDataSchema, itemData).success);

    const listing = {
      id: 'gts-1',
      seller_id: 'u1',
      seller_name: 'Red',
      price: 100,
      status: 'active' as const,
      listing_type: 'item' as const,
      data: itemData,
      created_at: '2026-08-18T00:00:00.000Z'
    };
    assert.ok(safeParse(gtsListingSchema, listing).success);

    const daycare = {
      id: 'mission-1',
      slot: 0,
      durationMinutes: 30,
      startedAt: Date.now(),
      targetLevel: 30,
      rewardsClaimed: false
    };
    assert.ok(safeParse(daycareMissionSchema, daycare).success);
  });

  it('validates trade offer schema', () => {
    const offer = {
      id: 'trade-1',
      sender_id: 'u1',
      receiver_id: 'u2',
      offer_pokemon: null,
      offer_items: { pokeball: 5 },
      offer_money: 100,
      request_pokemon: null,
      request_items: { potion: 1 },
      request_money: 0,
      message: 'Trade',
      status: 'pending' as const,
      created_at: '2026-08-18T00:00:00.000Z'
    };
    assert.ok(safeParse(tradeOfferSchema, offer).success);
  });

  it('validates notification and network action schema', () => {
    const notif = {
      id: 'notif-1',
      title: 'Aviso',
      message: 'Tienes un nuevo mensaje',
      type: 'system' as const,
      timestamp: Date.now(),
      read: false
    };
    assert.ok(safeParse(notificationItemSchema, notif).success);

    const netAction = {
      type: 'ping',
      payload: { client: 'v1' },
      timestamp: Date.now()
    };
    assert.ok(safeParse(networkActionSchema, netAction).success);
  });

  it('validates battle active, enemy, and save schemas', () => {
    const enemy = {
      uid: 'enemy-1',
      id: 'rattata',
      name: 'Rattata',
      type: 'normal',
      level: 3,
      hp: 15,
      maxHp: 15,
      atk: 10,
      def: 10,
      spa: 10,
      spd: 10,
      spe: 10,
      moves: [{ id: 'tackle' }],
      status: null,
      isShiny: false,
      gender: 'm' as const,
      ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
      nature: 'hardy',
      ability: 'runaway',
      exp: 10,
      expNeeded: 50,
      friendship: 70,
      _revealed: true,
      _gymLeader: null,
      _gymBadge: null
    };
    assert.ok(safeParse(enemyPokemonSerializedSchema, enemy).success);

    const battle = {
      isGym: false,
      gymId: null,
      isTrainer: false,
      trainerName: null,
      locationId: 'route-1',
      enemyTeam: [enemy],
      timestamp: Date.now()
    };
    assert.ok(safeParse(activeBattleSchema, battle).success);

    assert.ok(safeParse(saveDataSchema, {
      trainer: 'Ash',
      gender: 'h' as const,
      badges: 1,
      balls: 5,
      money: 1000,
      battleCoins: 50,
      trainerLevel: 5,
      trainerExp: 100,
      trainerExpNeeded: 200,
      inventory: { pokeball: 5, potion: 2 },
      team: [{
        uid: 'poke-valid-1',
        id: 'pikachu',
        species: 'pikachu',
        name: 'Pikachu',
        level: 25,
        exp: 1000,
        expNeeded: 2000,
        hp: 60,
        maxHp: 60,
        atk: 55,
        def: 40,
        spa: 50,
        spd: 50,
        spe: 90,
        type: 'electric',
        isShiny: false,
        friendship: 70,
        nature: 'hardy',
        gender: 'm' as const,
        status: '' as const,
        ability: 'static'
      }],
      box: [],
      eggs: [],
      pokedex: ['pikachu'],
      seenPokedex: ['pikachu'],
      defeatedGyms: ['pewter'],
      starterChosen: true,
      eloRating: 1000,
      pvpStats: { wins: 0, losses: 0, draws: 0 },
      rankedMaxElo: 1000,
      passiveTeamActive: false,
      daycare_mission_refreshes: 3,
      boxCount: 4,
      classLevel: 1,
      classXP: 0,
      classData: {
        captureStreak: 0,
        longestStreak: 0,
        reputation: 0,
        blackMarketSales: 0,
        criminality: 0,
        kitCaptures: 0
      },
      warCoins: 0,
      warCoinsSpent: 0,
      lastPokemonCenterHeal: 0,
      playtime: 120
    }).success);
  });

  it('verifies DTO typing compiles safely', () => {
    const userDto: Partial<UserProfileDto> = { username: 'Red' };
    const trainerName: TrainerNameDto = 'Ash';
    const loginDto: Partial<AuthLoginDto> = { email: 'test@kanto.org' };
    const regDto: Partial<AuthRegisterDto> = { username: 'Misty' };
    const passDto: Partial<AuthPasswordResetDto> = { password: 'newPassword123' };
    const chatDto: Partial<ChatMessageDto> = { message: 'Hola' };
    const netDto: Partial<NetworkActionDto> = { type: 'action' };
    const pokeDto: Partial<PokemonInstanceDto> = { name: 'Bulbasaur' };
    const eggDto: Partial<PokemonEggDto> = { id: 'togepi' };
    const gtsDto: Partial<GtsListingDto> = { price: 100 };
    const tradeDto: Partial<TradeOfferDto> = { status: 'pending' };
    const saveDto: Partial<SaveDataDto> = { trainer: 'Red' };
    const saveInDto: Partial<SaveDataInputDto> = { trainer: 'Red' };

    assert.ok(userDto !== undefined);
    assert.strictEqual(trainerName, 'Ash');
    assert.ok(loginDto !== undefined);
    assert.ok(regDto !== undefined);
    assert.ok(passDto !== undefined);
    assert.ok(chatDto !== undefined);
    assert.ok(netDto !== undefined);
    assert.ok(pokeDto !== undefined);
    assert.ok(eggDto !== undefined);
    assert.ok(gtsDto !== undefined);
    assert.ok(tradeDto !== undefined);
    assert.ok(saveDto !== undefined);
    assert.ok(saveInDto !== undefined);
  });
});
