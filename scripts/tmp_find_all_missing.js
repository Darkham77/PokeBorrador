const fs = require('fs');

try {
  const fileContent = fs.readFileSync('js/02_pokemon_data.js', 'utf8');

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
  
  console.log("--- MISSING MOVES ---");
  missingMoves.forEach(m => console.log(m));
  console.log("--- END MISSING ---");

} catch (e) {
  console.error("Error:", e);
}
