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

  // Extract all defined moves from MOVE_DATA block with duplicate detection
  const definedMoves = new Set();
  const duplicates = [];
  const mdMoveRegex = /'([^']+)':\s*\{\s*(power:\s*\d+,|acc:)/g; 
  const lines = fileContent.split('\n');
  
  // Track move entries and their line numbers for better reporting
  const moveEntries = {}; // name -> [line1, line2...]
  
  lines.forEach((line, index) => {
    const match = line.match(/'([^']+)':\s*\{/);
    if (match && index > 900) { // Assuming MOVE_DATA starts after line 900
      const moveName = match[1];
      if (!moveEntries[moveName]) moveEntries[moveName] = [];
      moveEntries[moveName].push(index + 1);
      
      if (definedMoves.has(moveName)) {
        duplicates.push(moveName);
      }
      definedMoves.add(moveName);

      // PP Validation
      if (line.includes('pp:')) {
        const ppMatch = line.match(/pp:\s*(\d+)/);
        if (!ppMatch) {
          console.log(`⚠️ Warning: Move '${moveName}' on line ${index + 1} has invalid PP format.`);
        }
      }
    }
  });

  const missingMoves = [...learnsetMoves].filter(move => !definedMoves.has(move));
  
  let hasErrors = false;

  if (duplicates.length > 0) {
    console.log("❌ DUPLICATE MOVES FOUND IN MOVE_DATA:");
    duplicates.forEach(m => {
      console.log(`- ${m} (Located at lines: ${moveEntries[m].join(', ')})`);
    });
    hasErrors = true;
  }

  if (missingMoves.length > 0) {
    console.log("❌ MISSING MOVES FOUND:");
    console.log("The following moves are assigned to a Pokémon but not defined in MOVE_DATA:");
    missingMoves.forEach(m => console.log(`- ${m}`));
    hasErrors = true;
  }

  if (!hasErrors) {
    console.log("✅ MOVE_DATA is clean! All learnset moves exist and no duplicates found.");
  } else {
    console.log("\nPlease resolve the errors above in js/02_pokemon_data.js to ensure battle integrity.");
    process.exit(1);
  }
} catch (e) {
  console.error("Error running validator:", e);
  process.exit(1);
}
