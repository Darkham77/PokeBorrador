const fs = require('fs');
const path = require('path');

/**
 * MOVE VALIDATOR SCRIPT (IMPROVED)
 * This script checks js/02_pokemon_data.js for structural and semantic integrity.
 * 
 * Usage: node .agents/skills/pokemon-move-validator/validator.js [--fix]
 */

const FIX_MODE = process.argv.includes('--fix');

try {
  const filePath = fs.existsSync('js/02_pokemon_data.js') 
      ? 'js/02_pokemon_data.js' 
      : path.resolve(__dirname, '../../../js/02_pokemon_data.js');

  const fileContent = fs.readFileSync(filePath, 'utf8');

  // 1. Extract all move names from learnsets
  const learnsetRegex = /lv:\s*\d+,\s*name:\s*'([^']+)'/g;
  const learnsetMoves = new Set();
  let match;
  while ((match = learnsetRegex.exec(fileContent)) !== null) {
    if (match[1] !== 'Unknown') learnsetMoves.add(match[1]);
  }

  // 2. Extract all defined moves from MOVE_DATA block
  const definedMoves = new Map();
  const duplicates = [];
  const lines = fileContent.split('\n');
  
  lines.forEach((line, index) => {
    const match = line.match(/'([^']+)':\s*\{/);
    if (match && index > 900) {
      const moveName = match[1];
      if (definedMoves.has(moveName)) {
        duplicates.push({ name: moveName, line: index + 1 });
      }
      definedMoves.set(moveName, { line: index + 1, content: line });
    }
  });

  const missingMoves = [...learnsetMoves].filter(move => !definedMoves.has(move));
  
  let hasErrors = false;

  if (duplicates.length > 0) {
    console.log("❌ DUPLICATE MOVES FOUND IN MOVE_DATA:");
    duplicates.forEach(m => console.log(`- ${m.name} (Line: ${m.line})`));
    hasErrors = true;
  }

  if (missingMoves.length > 0) {
    console.log("❌ MISSING MOVES FOUND:");
    missingMoves.forEach(m => {
      console.log(`- ${m}`);
      if (FIX_MODE) {
        console.log(`   [AUTO-FIX] Suggested snippet for ${m}:`);
        console.log(`   '${m}': { power: 40, acc: 100, type: 'normal', cat: 'physical', pp: 35 },`);
      }
    });
    hasErrors = true;
  }

  // 3. Semantic Validation: Check for common errors
  const semanticIssues = [];
  definedMoves.forEach((data, name) => {
    const content = data.content;
    
    // Check for status moves with power > 0
    if (content.includes("cat: 'status'") && content.match(/power:\s*([1-9]\d*)/)) {
      semanticIssues.push(`- ${name} (Line: ${data.line}): Status move has power > 0.`);
    }

    // Check for fixed damage moves (Dragon Rage)
    if (name === 'Furia Dragón' && !content.includes('fixedDmg: 40')) {
      semanticIssues.push(`- ${name} (Line: ${data.line}): Missing 'fixedDmg: 40'.`);
    }

    // Check for Super Fang (Súper Colmillo)
    if (name === 'Súper Colmillo' && !content.includes('halfHP: true')) {
      semanticIssues.push(`- ${name} (Line: ${data.line}): Missing 'halfHP: true'.`);
    }

    // Check for Esfuerzo (Endeavor)
    if (name === 'Esfuerzo' && !content.includes('endeavor: true')) {
      semanticIssues.push(`- ${name} (Line: ${data.line}): Missing 'endeavor: true'.`);
    }

    // Anti effect pseudo-boolean misuse
    const boolProps = ['halfHP', 'ohko', 'selfKO', 'endeavor'];
    boolProps.forEach(prop => {
      if (content.includes(`effect: '${prop}'`)) {
         semanticIssues.push(`- ${name} (Line: ${data.line}): Uses "effect: '${prop}'" instead of the required schema "${prop}: true".`);
      }
    });
    if (content.includes(`effect: 'fixedDmg'`)) {
         semanticIssues.push(`- ${name} (Line: ${data.line}): Uses "effect: 'fixedDmg'" instead of the required schema "fixedDmg: X".`);
    }
  });

  if (semanticIssues.length > 0) {
    console.log("❌ SEMANTIC ISSUES FOUND:");
    semanticIssues.forEach(issue => console.log(issue));
    hasErrors = true;
  }

  if (!hasErrors) {
    console.log("✅ MOVE_DATA is clean! All learnset moves exist and no semantic issues found.");
  } else {
    console.log("\nPlease resolve the errors above in js/02_pokemon_data.js.");
    if (!FIX_MODE) console.log("Run with --fix to see suggested snippets.");
    process.exit(1);
  }
} catch (e) {
  console.error("Error running validator:", e);
  process.exit(1);
}
