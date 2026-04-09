const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const scriptPath = 'js/24_passive_pvp.js';
const source = fs.readFileSync(scriptPath, 'utf8');

const sandbox = {
  console,
  setInterval,
  clearInterval,
  setTimeout,
  clearTimeout,
  Date,
  window: { addEventListener: () => {} },
  document: { getElementById: () => null },
  currentUser: null,
  sb: null,
  state: {
    team: [],
    box: [],
    passiveTeamUids: []
  },
  POKEMON_DB: {
    charmander: { name: 'Charmander', type: 'fire' },
    squirtle: { name: 'Squirtle', type: 'water' },
    pikachu: { name: 'Pikachu', type: 'electric' }
  },
  notify: () => {},
  scheduleSave: () => {},
  getSpriteUrl: () => '',
  ITEM_DATA: {}
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: scriptPath });

assert.strictEqual(typeof sandbox.normalizeRankedRules, 'function', 'normalizeRankedRules no está disponible');
assert.strictEqual(typeof sandbox.validatePokemonForRanked, 'function', 'validatePokemonForRanked no está disponible');
assert.strictEqual(typeof sandbox.validateTeamForRanked, 'function', 'validateTeamForRanked no está disponible');
assert.strictEqual(typeof sandbox.getRankedPlayableTeam, 'function', 'getRankedPlayableTeam no está disponible');

const normalized = sandbox.normalizeRankedRules(
  {
    maxPokemon: 10,
    levelCap: 200,
    allowedTypes: ['fire', 'invalid-type', 'water', 'fire'],
    bannedPokemonIds: ['pikachu', 'Pikachu']
  },
  'Temporada Test'
);

assert.strictEqual(normalized.maxPokemon, 6, 'maxPokemon debe clamp en 6');
assert.strictEqual(normalized.levelCap, 100, 'levelCap debe clamp en 100');
assert.deepStrictEqual(Array.from(normalized.allowedTypes), ['fire', 'water'], 'allowedTypes debe filtrar y deduplicar');
assert.deepStrictEqual(Array.from(normalized.bannedPokemonIds), ['pikachu'], 'bannedPokemonIds debe normalizar y deduplicar');

const strictRules = {
  seasonName: 'S1',
  maxPokemon: 3,
  levelCap: 50,
  allowedTypes: ['fire'],
  bannedPokemonIds: ['charmander']
};

const bannedMon = { id: 'charmander', name: 'Charmander', type: 'fire', level: 25 };
const wrongTypeMon = { id: 'squirtle', name: 'Squirtle', type: 'water', level: 20 };
const overLevelMon = { id: 'pikachu', name: 'Pikachu', type: 'fire', level: 80 };

const bannedCheck = sandbox.validatePokemonForRanked(bannedMon, strictRules);
assert.strictEqual(bannedCheck.ok, false, 'Charmander baneado debería fallar');

const typeCheck = sandbox.validatePokemonForRanked(wrongTypeMon, strictRules);
assert.strictEqual(typeCheck.ok, false, 'Tipo no permitido debería fallar');

const levelCheck = sandbox.validatePokemonForRanked(overLevelMon, strictRules);
assert.strictEqual(levelCheck.ok, false, 'Nivel por encima del cap debería fallar');

const teamCheck = sandbox.validateTeamForRanked([
  { id: 'pikachu', name: 'Pikachu', type: 'fire', level: 20 },
  { id: 'pikachu', name: 'Pikachu', type: 'fire', level: 20 },
  { id: 'pikachu', name: 'Pikachu', type: 'fire', level: 20 },
  { id: 'pikachu', name: 'Pikachu', type: 'fire', level: 20 }
], strictRules, 'equipo ranked');

assert.strictEqual(teamCheck.ok, false, 'Equipo por encima del máximo permitido debería fallar');

sandbox.state.team = [
  { uid: 'a', id: 'charmander', name: 'Charmander', type: 'fire', level: 20, hp: 10, onMission: false },
  { uid: 'b', id: 'squirtle', name: 'Squirtle', type: 'water', level: 20, hp: 0, onMission: false }
];
sandbox.state.box = [
  { uid: 'c', id: 'pikachu', name: 'Pikachu', type: 'electric', level: 20, hp: 15, onMission: false },
  { uid: 'd', id: 'pikachu', name: 'Pikachu', type: 'electric', level: 20, hp: 15, onMission: true }
];
sandbox.state.passiveTeamUids = ['a', 'b', 'c', 'd', 'a'];

const rankedTeam = sandbox.getRankedPlayableTeam();
assert.deepStrictEqual(  Array.from(rankedTeam, p => p.uid),
  ['a', 'c'],
  'El equipo ranked debe tomar UIDs configurados, ignorar KO/misión y deduplicar'
);

console.log('✅ test_ranked_rules_unit: OK');

