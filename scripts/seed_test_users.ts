import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

console.log('\n--- ⚡ SEEDING TEST USERS (ASH & ENTRENADOR) ---');

const dbPath = path.resolve('database/temp/imported.db');
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Error: Local database file not found at ${dbPath}. Please run the import or run the dev server first.`);
  process.exit(1);
}

using db = new DatabaseSync(dbPath);

// Helper to create a structured Pokemon object
function createMockPokemon(id: string, name: string, type: string, type2: string | null, level: number, isShiny: boolean = false, heldItem: string | null = null): Record<string, unknown> {
  const uid = `${id}_${crypto.randomUUID().substring(0, 8)}`;
  
  // Calculate mock stats
  const hpBase = 80;
  const atkBase = 80;
  const defBase = 80;
  const spaBase = 80;
  const spdBase = 80;
  const speBase = 80;

  const maxHp = Math.floor(((hpBase + 31) * 2 * level) / 100) + level + 10;
  const stats = {
    atk: Math.floor(((atkBase + 31) * 2 * level) / 100) + 5,
    def: Math.floor(((defBase + 31) * 2 * level) / 100) + 5,
    spa: Math.floor(((spaBase + 31) * 2 * level) / 100) + 5,
    spd: Math.floor(((spdBase + 31) * 2 * level) / 100) + 5,
    spe: Math.floor(((speBase + 31) * 2 * level) / 100) + 5,
  };

  return {
    uid,
    id,
    name,
    type,
    type2,
    emoji: id,
    isFloating: false,
    catchRate: 45,
    level,
    exp: 0,
    expNeeded: 1000,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    nature: 'Fuerte',
    ability: 'Presión',
    gender: 'M',
    isShiny,
    moves: [
      { name: 'Placaje', pp: 35, maxPP: 35 },
      { name: 'Destructor', pp: 35, maxPP: 35 }
    ],
    status: null,
    sleepTurns: 0,
    friendship: 150,
    vigor: 5,
    heldItem,
    nickname: null,
    tags: [],
    obtainedAt: Temporal.Now.instant().epochMilliseconds,
    hp: maxHp,
    maxHp,
    atk: stats.atk,
    def: stats.def,
    spa: stats.spa,
    spd: stats.spd,
    spe: stats.spe,
  };
}

// Generate team & box for ASH
const ashTeam = [
  createMockPokemon('pikachu', 'Pikachu', 'electric', null, 50, true, 'Bola Luminosa'),
  createMockPokemon('charizard', 'Charizard', 'fire', 'flying', 50, false, 'Carbón'),
  createMockPokemon('blastoise', 'Blastoise', 'water', null, 50, false, 'Agua Mística'),
  createMockPokemon('venusaur', 'Venusaur', 'grass', 'poison', 50, false, 'Semilla Milagro'),
  createMockPokemon('mewtwo', 'Mewtwo', 'psychic', null, 55, false, 'Cuchara Torcida'),
  createMockPokemon('dragonite', 'Dragonite', 'dragon', 'flying', 50, false, 'Colmillodragón')
];

const ashBox = [
  createMockPokemon('bulbasaur', 'Bulbasaur', 'grass', 'poison', 5),
  createMockPokemon('charmander', 'Charmander', 'fire', null, 5),
  createMockPokemon('squirtle', 'Squirtle', 'water', null, 5)
];

// Generate team & box for ENTRENADOR
const entrenadorTeam = [
  createMockPokemon('gyarados', 'Gyarados', 'water', 'flying', 50),
  createMockPokemon('alakazam', 'Alakazam', 'psychic', null, 50),
  createMockPokemon('machamp', 'Machamp', 'fighting', null, 50),
  createMockPokemon('gengar', 'Gengar', 'ghost', 'poison', 50),
  createMockPokemon('snorlax', 'Snorlax', 'normal', null, 50, false, 'Restos'),
  createMockPokemon('lapras', 'Lapras', 'water', 'ice', 50)
];

const entrenadorBox = [
  createMockPokemon('geodude', 'Geodude', 'rock', 'ground', 5),
  createMockPokemon('gastly', 'Gastly', 'ghost', 'poison', 5),
  createMockPokemon('abra', 'Abra', 'psychic', null, 5)
];

const mockInventory = {
  'Poké Ball': 99,
  'Super Ball': 50,
  'Ultra Ball': 30,
  'Master Ball': 10,
  'Poción': 99,
  'Hiper Poción': 99,
  'Revivir': 50,
  'Revivir Máximo': 10,
  'Caramelo Raro': 99,
  'Piedra Trueno': 5,
  'Piedra Fuego': 5,
  'Piedra Agua': 5,
  'Piedra Lunar': 5
};

const ashSaveData = {
  trainer: 'ASH',
  badges: 8,
  balls: 189,
  money: 999999,
  battleCoins: 5000,
  eggs: [],
  trainerChance: 0,
  trainerLevel: 50,
  trainerExp: 0,
  trainerExpNeeded: 10000,
  inventory: { ...mockInventory },
  map: { currentMap: 'pallet_town', region: 'Kanto', lastNavigateAt: Temporal.Now.instant().epochMilliseconds },
  team: ashTeam,
  box: ashBox,
  pokedex: ['pikachu', 'charizard', 'blastoise', 'venusaur', 'mewtwo', 'dragonite', 'bulbasaur', 'charmander', 'squirtle'],
  seenPokedex: ['pikachu', 'charizard', 'blastoise', 'venusaur', 'mewtwo', 'dragonite', 'bulbasaur', 'charmander', 'squirtle'],
  defeatedGyms: ['pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron', 'cinnabar', 'viridian'],
  gymProgress: {},
  lastGymWins: {},
  lastGymAttempts: {},
  battle: null,
  starterChosen: true,
  lastRankedSeason: null,
  nick_style: 'color: #ffcc00; font-weight: bold;',
  avatar_style: '',
  stats: {},
  eloRating: 1200,
  pvpStats: { wins: 10, losses: 5, draws: 0 },
  rankedMaxElo: 1200,
  passiveTeamUids: [],
  passiveTeamActive: false,
  rankedRewardsClaimed: [],
  activeBattle: null,
  daycare_missions: [],
  daycare_mission_refreshes: 0,
  safariTicketSecs: 0,
  ceruleanTicketSecs: 0,
  articunoTicketSecs: 0,
  mewtwoTicketSecs: 0,
  repelSecs: 0,
  shinyBoostSecs: 0,
  amuletCoinSecs: 0,
  luckyEggSecs: 0,
  ivScannerSecs: 0,
  incenseType: null,
  incenseSecs: 0,
  daycare_berry_egg_time: 0,
  boxCount: 1,
  chats: {},
  playerClass: 'maestro_pokemon',
  classLevel: 10,
  classXP: 0,
  classData: {},
  faction: 'union',
  warCoins: 100,
  warCoinsSpent: 0,
  warDailyCap: {},
  warDailyCoins: {},
  warMyPtsLocal: {},
  notificationHistory: [],
  marketSoldSeenIds: [],
  claimQueue: [],
  pvpTeam: [],
  warTeam: [],
  warSlots: 6
};

const entrenadorSaveData = {
  ...ashSaveData,
  trainer: 'ENTRENADOR',
  team: entrenadorTeam,
  box: entrenadorBox,
  pokedex: ['gyarados', 'alakazam', 'machamp', 'gengar', 'snorlax', 'lapras', 'geodude', 'gastly', 'abra'],
  seenPokedex: ['gyarados', 'alakazam', 'machamp', 'gengar', 'snorlax', 'lapras', 'geodude', 'gastly', 'abra'],
  eloRating: 1100,
  playerClass: 'entrenador',
  faction: 'union'
};

try {
  db.exec('BEGIN TRANSACTION;');

  // Clean old entries
  db.prepare("DELETE FROM profiles WHERE id IN (?, ?)").run('local_ash', 'local_entrenador');
  db.prepare("DELETE FROM game_saves WHERE user_id IN (?, ?)").run('local_ash', 'local_entrenador');
  db.prepare("DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)").run('local_ash', 'local_entrenador', 'local_entrenador', 'local_ash');

  // Insert Profiles
  const insertProfile = db.prepare(`
    INSERT INTO profiles (
      id, username, email, trainer_level, player_class, faction, nick_style, avatar_style, role, elo_rating, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  `);

  insertProfile.run('local_ash', 'ASH', 'ash@local', 50, 'maestro_pokemon', 'union', 'color: #ffcc00; font-weight: bold;', '', 'admin', 1200);
  insertProfile.run('local_entrenador', 'ENTRENADOR', 'entrenador@local', 50, 'entrenador', 'union', '', '', 'admin', 1100);

  // Insert Saves
  const insertSave = db.prepare(`
    INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at) VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  `);

  insertSave.run('local_ash', JSON.stringify(ashSaveData), crypto.randomUUID());
  insertSave.run('local_entrenador', JSON.stringify(entrenadorSaveData), crypto.randomUUID());

  // Insert friendship relationship (accepted)
  db.prepare(`
    INSERT INTO friendships (requester_id, addressee_id, status, created_at) VALUES (?, ?, 'accepted', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
  `).run('local_ash', 'local_entrenador');

  db.exec('COMMIT;');
  console.log('✅ Profiles, game_saves, and friendships successfully seeded.');
} catch (err) {
  try {
    db.exec('ROLLBACK;');
  } catch {
    void 0;
  }
  console.error(`❌ Error during seeding: ${(err as Error).message}`);
} finally {
  db.close();
}
