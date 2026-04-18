const fs = require('fs');
const path = require('path');

/**
 * MOVE VALIDATOR SCRIPT (IMPROVED)
 * This script checks src/data/moves.js and src/data/pokemonDB.js for structural and semantic integrity.
 * 
 * Usage: node .agents/skills/pokemon-move-validator/validator.js [--fix]
 */

const FIX_MODE = process.argv.includes('--fix');

try {
  const dbPath = 'src/data/pokemonDB.js';
  const movesPath = 'src/data/moves.js';

  if (!fs.existsSync(dbPath) || !fs.existsSync(movesPath)) {
    console.error("❌ ERROR: Missing data files (src/data/pokemonDB.js or src/data/moves.js)");
    process.exit(1);
  }

  const dbContent = fs.readFileSync(dbPath, 'utf8');
  const movesContent = fs.readFileSync(movesPath, 'utf8');

  // 1. Extract all move names from learnsets (pokemonDB.js)
  const learnsetRegex = /name:\s*'([^']+)'/g;
  const learnsetMoves = new Set();
  let match;
  while ((match = learnsetRegex.exec(dbContent)) !== null) {
    if (match[1] !== 'Unknown') learnsetMoves.add(match[1]);
  }

  // 2. Extract all defined moves from MOVE_DATA block (moves.js)
  const definedMoves = new Map();
  const duplicates = [];
  const lines = movesContent.split('\n');
  
  lines.forEach((line, index) => {
    const match = line.match(/'([^']+)':\s*\{/);
    if (match) {
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

  // 4. Validate that all used 'effect: \'...\'' exist in getMoveDescription's effects dictionary (pokemonUtils.js)
  const utilsPath = 'src/logic/pokemonUtils.js';
  if (fs.existsSync(utilsPath)) {
    const utilsContent = fs.readFileSync(utilsPath, 'utf8');
    const effectsDictRegex = /const effects = {([^}]+)};/;
    const effMatch = utilsContent.match(effectsDictRegex);
    if (effMatch) {
      const effStr = effMatch[1];
      const registeredEffs = new Set();
      const effKeyRegex = /'([^']+)':/g;
      let k;
      while ((k = effKeyRegex.exec(effStr)) !== null) {
        registeredEffs.add(k[1]);
      }
      
      definedMoves.forEach((data, name) => {
        const eMatch = data.content.match(/effect:\s*'([^']+)'/);
        if (eMatch) {
           const effectName = eMatch[1];
           if (!registeredEffs.has(effectName)) {
             semanticIssues.push(`- ${name} (Line: ${data.line}): Uses effect '${effectName}' which has no UI description in pokemonUtils.js.`);
           }
        }
      });
    } else {
       semanticIssues.push(`- WARNING: Could not find 'const effects = {' block in src/logic/pokemonUtils.js. Skipping UI description check.`);
    }
  } else {
     semanticIssues.push(`- WARNING: src/logic/pokemonUtils.js not found. Skipping UI description check.`);
  }

  if (semanticIssues.length > 0) {
    console.log("❌ SEMANTIC ISSUES FOUND:");
    semanticIssues.forEach(issue => console.log(issue));
    hasErrors = true;
  }

  if (!hasErrors) {
    console.log("✅ MOVE_DATA is clean! All learnset moves exist and no semantic issues found.");
  } else {
    console.log("\nPlease resolve the errors above in src/data/moves.js.");
    if (!FIX_MODE) console.log("Run with --fix to see suggested snippets.");
    process.exit(1);
  }
} catch (e) {
  console.error("Error running validator:", e);
  process.exit(1);
}
