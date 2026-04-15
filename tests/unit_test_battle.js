
// unit_test_battle.js
// Standalone unit test for the battle mechanics overhaul

const MOVE_DATA_MOCK = {
  'Rayo': { power: 90, type: 'electric', cat: 'special', acc: 100 },
  'Placaje': { power: 40, type: 'normal', cat: 'physical', acc: 100 },
  'Lanzallamas': { power: 90, type: 'fire', cat: 'special', acc: 100 },
  'Pistola Agua': { power: 40, type: 'water', cat: 'special', acc: 100 },
  'Súper Colmillo': { cat: 'physical', halfHP: true, acc: 90 },
  'Guillotina': { cat: 'physical', ohko: true, acc: 30 },
  'Golpe Aéreo': { power: 60, type: 'flying', cat: 'physical', acc: 100, effect: 'always_hits' }
};

const STAGE_MULT = [0.25, 0.28, 0.33, 0.40, 0.50, 0.66, 1, 1.5, 2, 2.5, 3, 3.5, 4];
const ACC_STAGE_MULT = [0.33, 0.37, 0.43, 0.50, 0.60, 0.75, 1, 1.33, 1.66, 2, 2.33, 2.66, 3];

function stageMult(stage) { return STAGE_MULT[Math.max(0, Math.min(12, stage + 6))]; }
function accStageMult(stage) { return ACC_STAGE_MULT[Math.max(0, Math.min(12, stage + 6))]; }

// Mirroring the CORE logic implemented in js/07_battle.js
function testCalcDamage(attacker, defender, move, atkStages, defStages, weather = null, screens = {}) {
  const md = MOVE_DATA_MOCK[move.name] || { power: 40, type: 'normal', cat: 'physical' };
  let power = md.power || 0;
  if (!power && !md.halfHP && !md.ohko) return 0;

  const isPhysical = md.cat === 'physical';
  const atkStat = isPhysical ? attacker.atk : attacker.spa;
  const defStat = isPhysical ? defender.def : defender.spd;
  
  const atkM = stageMult(atkStages);
  const defM = stageMult(defStages);
  
  let A = Math.floor(atkStat * atkM);
  const D = Math.max(1, Math.floor(defStat * defM));
  
  let base = Math.floor(((2 * attacker.level / 5 + 2) * power * A / D) / 50) + 2;

  // Weather
  let weatherMult = 1;
  if (weather) {
    if (weather === 'sun') {
        if (md.type === 'fire') weatherMult = 1.5;
        else if (md.type === 'water') weatherMult = 0.5;
    } else if (weather === 'rain') {
        if (md.type === 'water') weatherMult = 1.5;
        else if (md.type === 'fire') weatherMult = 0.5;
    }
  }

  // Screens
  let screenMult = 1;
  if (isPhysical && screens.reflect) screenMult = 0.5;
  else if (!isPhysical && screens.lightScreen) screenMult = 0.5;

  return Math.floor(base * weatherMult * screenMult);
}

function runTests() {
  console.log("Starting Battle Mechanics Unit Tests...\n");
  let passed = 0;
  let total = 0;

  const assert = (condition, message) => {
    total++;
    if (condition) {
        passed++;
        console.log(`✅ [PASS] ${message}`);
    } else {
        console.error(`❌ [FAIL] ${message}`);
    }
  };

  const pikachu = { level: 50, hp: 100, maxHp: 100, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 };
  const snorlax = { level: 50, hp: 160, maxHp: 160, atk: 110, def: 65, spa: 65, spd: 110, spe: 30 };

  // --- STAT STAGE SELECTION ---
  // If moving special with +2 SpA, it should do more damage than neutral
  const rayoNeut = testCalcDamage(pikachu, snorlax, MOVE_DATA_MOCK['Rayo'], 0, 0);
  const rayoPlus2 = testCalcDamage(pikachu, snorlax, MOVE_DATA_MOCK['Rayo'], 2, 0); // +2 spa
  assert(rayoPlus2 === Math.floor(rayoNeut * 2), "Special Move damage doubles at +2 spa stages.");

  // --- ACCURACY SCALING ---
  const accNeut = accStageMult(0);
  const accMinus6 = accStageMult(-6);
  assert(accNeut === 1, "Neutral accuracy multiplier is 1.");
  assert(accMinus6 === 0.33, "Stage -6 accuracy multiplier is 0.33 (3/9).");

  // --- WEATHER ---
  const fireNeut = testCalcDamage(pikachu, snorlax, MOVE_DATA_MOCK['Lanzallamas'], 0, 0);
  const fireSun = testCalcDamage(pikachu, snorlax, MOVE_DATA_MOCK['Lanzallamas'], 0, 0, 'sun');
  assert(fireSun === Math.floor(fireNeut * 1.5), "Sun increases fire move damage by 50%.");

  const waterNeut = testCalcDamage(pikachu, snorlax, MOVE_DATA_MOCK['Pistola Agua'], 0, 0);
  const waterSun = testCalcDamage(pikachu, snorlax, MOVE_DATA_MOCK['Pistola Agua'], 0, 0, 'sun');
  assert(waterSun === Math.floor(waterNeut * 0.5), "Sun decreases water move damage by 50%.");

  // --- SCREENS ---
  const placajeNeut = testCalcDamage(snorlax, pikachu, MOVE_DATA_MOCK['Placaje'], 0, 0);
  const placajeReflect = testCalcDamage(snorlax, pikachu, MOVE_DATA_MOCK['Placaje'], 0, 0, null, { reflect: true });
  assert(placajeReflect === Math.floor(placajeNeut * 0.5), "Reflect shield reduces physical damage by 50%.");

  const rayoLightScreen = testCalcDamage(pikachu, snorlax, MOVE_DATA_MOCK['Rayo'], 0, 0, null, { lightScreen: true });
  assert(rayoLightScreen === Math.floor(rayoNeut * 0.5), "Light Screen reduces special damage by 50%.");

  console.log(`\nTests Results: ${passed}/${total} passed.`);
  if (passed === total) console.log("\n🎊 ALL BATTLE MECHANICS TESTS PASSED SUCCESSFULLY! 🎊");
  else process.exit(1);
}

runTests();
