const fs = require('fs');

/**
 * MOVE VALIDATOR SCRIPT
 * This script checks js/02_pokemon_data.js for any move assigned to a Pokémon's 
 * learnset that is missing its corresponding technical definition in MOVE_DATA.
 * 
 * Usage: node .agents/skills/pokemon-move-validator/validator.js
 */

try {
  // Try to find the file from root, adjusting for different execution contexts
  const filePath = fs.existsSync('js/02_pokemon_data.js') 
      ? 'js/02_pokemon_data.js' 
      : '../../../../js/02_pokemon_data.js';

  const fileContent = fs.readFileSync(filePath, 'utf8');

  // Extract all move names from learnsets specifically
  const learnsetRegex = /lv:\s*\d+,\s*name:\s*'([^']+)'/g;
  const learnsetMoves = new Set();
  let match;
  while ((match = learnsetRegex.exec(fileContent)) !== null) {
    if (match[1] !== 'Unknown') learnsetMoves.add(match[1]);
  }

  // Extract all defined moves from MOVE_DATA block
  const definedMoves = new Set();
  const mdMoveRegex = /'([^']+)':\s*\{\s*power:/g;
  let regexMatch;
  while ((regexMatch = mdMoveRegex.exec(fileContent)) !== null) {
    definedMoves.add(regexMatch[1]);
  }

  const missingMoves = [...learnsetMoves].filter(move => !definedMoves.has(move));
  
  if (missingMoves.length === 0) {
    console.log("✅ All learnset moves are properly defined in MOVE_DATA!");
  } else {
    console.log("❌ MISSING MOVES FOUND:");
    console.log("The following moves are assigned to a Pokémon but not defined in MOVE_DATA:");
    missingMoves.forEach(m => console.log(`- ${m}`));
    console.log("\nIf you added new Pokémon or Gen learnsets, please add these moves to js/02_pokemon_data.js and implement their logic in js/07_battle.js if necessary.");
    process.exit(1);
  }
} catch (e) {
  console.error("Error running validator:", e);
  process.exit(1);
}
