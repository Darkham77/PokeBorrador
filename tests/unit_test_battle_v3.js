
// unit_test_battle_v3.js
// Final unit test for battle mechanics - Corrected property access

const MOVE_DATA_MOCK = {
  'Rayo': { name: 'Rayo', power: 90, type: 'electric', cat: 'special', acc: 100 },
  'Lanzallamas': { name: 'Lanzallamas', power: 90, type: 'fire', cat: 'special', acc: 100 },
  'Pistola Agua': { name: 'Pistola Agua', power: 40, type: 'water', cat: 'special', acc: 100 },
  'Placaje': { name: 'Placaje', power: 40, type: 'normal', cat: 'physical', acc: 100 }
};

const STAGE_MULT = [0.25, 0.28, 0.33, 0.40, 0.50, 0.66, 1, 1.5, 2, 2.5, 3, 3.5, 4];
const ACC_STAGE_MULT = [0.33, 0.37, 0.43, 0.50, 0.60, 0.75, 1, 1.33, 1.66, 2, 2.33, 2.66, 3];

function stageMult(stage) { return STAGE_MULT[Math.max(0, Math.min(12, stage + 6))]; }
function accStageMult(stage) { return ACC_STAGE_MULT[Math.max(0, Math.min(12, stage + 6))]; }

function testCalcDamage(attacker, defender, moveName, atkStages, defStages, weather = null, screens = {}) {
  const md = MOVE_DATA_MOCK[moveName];
  if (!md) throw new Error("Move not found: " + moveName);
  
  let power = md.power;
  const isPhysical = md.cat === 'physical';
  const atkStat = isPhysical ? attacker.atk : attacker.spa;
  const defStat = isPhysical ? defender.def : defender.spd;
  
  const atkM = stageMult(atkStages);
  const defM = stageMult(defStages);
  
  let A = Math.floor(atkStat * atkM);
  const D = Math.max(1, Math.floor(defStat * defM));
  const base = Math.floor(((2 * attacker.level / 5 + 2) * power * A / D) / 50) + 2;

  let weatherMult = 1;
  if (weather === 'sun') {
    if (md.type === 'fire') weatherMult = 1.5;
    else if (md.type === 'water') weatherMult = 0.5;
  } else if (weather === 'rain') {
    if (md.type === 'water') weatherMult = 1.5;
    else if (md.type === 'fire') weatherMult = 0.5;
  }

  let screenMult = 1;
  if (isPhysical && screens.reflect) screenMult = 0.5;
  else if (!isPhysical && screens.lightScreen) screenMult = 0.5;

  return Math.floor(base * weatherMult * screenMult);
}

function runTests() {
  console.log("Starting Battle Mechanics Unit Tests (v3)...\n");

  const attacker = { level: 100, atk: 200, spa: 200 };
  const defender = { level: 100, def: 100, spd: 100 };

  // 1. STAT STAGES
  const baseDmg = testCalcDamage(attacker, defender, 'Rayo', 0, 0);
  const plus2Dmg = testCalcDamage(attacker, defender, 'Rayo', 2, 0);
  console.log(`- Special Damage (Neutral): ${baseDmg}`);
  console.log(`- Special Damage (+2 stages): ${plus2Dmg}`);
  if (plus2Dmg === Math.floor(baseDmg * 2)) console.log("✅ Stat Stage Scaling: PASS");
  else console.log("❌ Stat Stage Scaling: FAIL");

  // 2. ACCURACY
  console.log(`- Accuracy Mult (Neutral): ${accStageMult(0)}`);
  console.log(`- Accuracy Mult (-6 stages): ${accStageMult(-6)}`);
  if (accStageMult(0) === 1 && accStageMult(-6) === 0.33) console.log("✅ Accuracy Scale: PASS");
  else console.log("❌ Accuracy Scale: FAIL");

  // 3. WEATHER
  const fireBase = testCalcDamage(attacker, defender, 'Lanzallamas', 0, 0);
  const fireSun = testCalcDamage(attacker, defender, 'Lanzallamas', 0, 0, 'sun');
  console.log(`- Fire Damage (No Sun): ${fireBase}`);
  console.log(`- Fire Damage (Sun): ${fireSun}`);
  if (fireSun === Math.floor(fireBase * 1.5)) console.log("✅ Weather (Sun): PASS");
  else console.log("❌ Weather (Sun): FAIL");

  // 4. SCREENS
  const physBase = testCalcDamage(attacker, defender, 'Placaje', 0, 0);
  const physReflect = testCalcDamage(attacker, defender, 'Placaje', 0, 0, null, { reflect: true });
  console.log(`- Physical Damage (No Reflect): ${physBase}`);
  console.log(`- Physical Damage (Reflect): ${physReflect}`);
  if (physReflect === Math.floor(physBase * 0.5)) console.log("✅ Screens (Reflect): PASS");
  else console.log("❌ Screens (Reflect): FAIL");
}

runTests();
