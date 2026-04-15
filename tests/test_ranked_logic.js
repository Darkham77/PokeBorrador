/**
 * test_ranked_logic.js
 * Unit tests for Ranked PvP System logic
 */

const { 
  normalizeRankedRules, 
  validatePokemonForRanked, 
  getEloTier,
  isAllowedRankGap
} = require('./js/24_passive_pvp_mock_loader.js'); // We'll create a mock loader for node

async function runRankedTests() {
  console.log("🚀 Iniciando Unit Tests: Sistema Ranked PvP\n");

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  };

  // 1. TEST: getEloTier
  console.log("--- 1. Tiers de ELO ---");
  assert(getEloTier(1000).name === 'Bronce', "ELO 1000 es Bronce");
  assert(getEloTier(1250).name === 'Plata', "ELO 1250 es Plata");
  assert(getEloTier(1650).name === 'Oro', "ELO 1650 es Oro");
  assert(getEloTier(2200).name === 'Platino', "ELO 2200 es Platino");
  assert(getEloTier(2800).name === 'Diamante', "ELO 2800 es Diamante");
  assert(getEloTier(3500).name === 'Maestro', "ELO 3500 es Maestro");

  // 2. TEST: isAllowedRankGap (Max gap = 1)
  console.log("\n--- 2. Brecha de Rango (Matchmaking) ---");
  assert(isAllowedRankGap(1000, 1300) === true, "Bronce vs Plata: Permitido");
  assert(isAllowedRankGap(1000, 1700) === false, "Bronce vs Oro: Denegado");
  assert(isAllowedRankGap(2700, 3500) === true, "Diamante vs Maestro: Permitido");
  assert(isAllowedRankGap(1000, 3500) === false, "Bronce vs Maestro: Extremadamente Denegado");

  // 3. TEST: normalizeRankedRules
  console.log("\n--- 3. Normalización de Reglas ---");
  const rawRules = {
    maxPokemon: 3,
    levelCap: 50,
    allowedTypes: ['fire', 'water'],
    bannedPokemonIds: ['MEWTWO']
  };
  const norm = normalizeRankedRules(rawRules, "Test Season");
  assert(norm.maxPokemon === 3, "Respetó Max Pokemon: 3");
  assert(norm.levelCap === 50, "Respetó Level Cap: 50");
  assert(norm.allowedTypes.length === 2, "Respetó Tipos Permitidos");
  assert(norm.bannedPokemonIds.includes('mewtwo'), "ID de baneo normalizado a minúsculas");

  // 4. TEST: validatePokemonForRanked
  console.log("\n--- 4. Validación de Pokémon ---");
  const testRules = {
    levelCap: 50,
    allowedTypes: ['fire'],
    bannedPokemonIds: ['charizard']
  };

  const okPonyta = { id: 'ponyta', level: 20, type: ['fire'] };
  const overLeveled = { id: 'ponyta', level: 51, type: ['fire'] };
  const wrongType = { id: 'staryu', level: 20, type: ['water'] };
  const banned = { id: 'charizard', level: 40, type: ['fire', 'flying'] };

  assert(validatePokemonForRanked(okPonyta, testRules).ok === true, "Ponyta Niv 20 Fuego: OK");
  assert(validatePokemonForRanked(overLeveled, testRules).ok === false, "Ponyta Niv 51: Falla por nivel");
  assert(validatePokemonForRanked(wrongType, testRules).ok === false, "Staryu Agua: Falla por tipo");
  assert(validatePokemonForRanked(banned, testRules).ok === false, "Charizard: Falla por baneo");

  console.log(`\n--- RESULTADOS FINALES ---`);
  console.log(`Totales: ${passed + failed} | Pasados: ${passed} | Fallidos: ${failed}`);
  
  if (failed > 0) process.exit(1);
}

runRankedTests();
