const fs = require('fs');
const path = require('path');

// Configuration
const TRAINER_SPRITES_DIR = path.join(__dirname, '../public/assets/sprites/trainers');
const SHOWDOWN_TRAINERS = [
  'brock', 'misty', 'ltsurge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni',
  'rainbowrocketgrunt', 'bugcatcher-gen6', 'red-lgpe', 'jacq', 'blue-gen3'
];

// Helper to check if sprite exists
function assetExists(id) {
  if (SHOWDOWN_TRAINERS.includes(id.toLowerCase())) return { type: 'remote', exists: true };
  
  const localFiles = fs.readdirSync(TRAINER_SPRITES_DIR);
  const found = localFiles.some(f => f.toLowerCase().startsWith(id.toLowerCase() + '.'));
  return { type: 'local', exists: found };
}

console.log('--- TRAINER SPRITE AUDIT ---');

// 1. Audit missionEngine.js
console.log('\n[1] Auditing missionEngine.js (TRAINER_TYPES):');
const missionEngineContent = fs.readFileSync(path.join(__dirname, '../src/logic/breeding/missionEngine.js'), 'utf8');
const trainerTypesMatch = missionEngineContent.match(/const TRAINER_TYPES = \{([\s\S]*?)\};/);
if (trainerTypesMatch) {
    const typesRaw = trainerTypesMatch[1];
    const spriteMatches = typesRaw.matchAll(/sprite: '([^']+)'/g);
    for (const match of spriteMatches) {
        const id = match[1];
        const status = assetExists(id);
        console.log(`- Sprite ID: ${id.padEnd(15)} | Status: ${status.exists ? 'OK (' + status.type + ')' : 'MISSING ❌'}`);
    }
}

// 2. Audit gyms.js
console.log('\n[2] Auditing gyms.js:');
const gymsContent = fs.readFileSync(path.join(__dirname, '../src/data/gyms.js'), 'utf8');
const gymSpriteMatches = gymsContent.matchAll(/sprite: '([^']+)'/g);
for (const match of gymSpriteMatches) {
    const id = match[1];
    const status = assetExists(id);
    console.log(`- Sprite ID: ${id.padEnd(15)} | Status: ${status.exists ? 'OK (' + status.type + ')' : 'MISSING ❌'}`);
}

// 3. Audit playerClasses.js
console.log('\n[3] Auditing playerClasses.js:');
const classesContent = fs.readFileSync(path.join(__dirname, '../src/data/playerClasses.js'), 'utf8');
const avatarMatches = classesContent.matchAll(/avatarSpriteId: '([^']+)'/g);
for (const match of avatarMatches) {
    const id = match[1];
    const status = assetExists(id);
    console.log(`- Avatar ID: ${id.padEnd(15)} | Status: ${status.exists ? 'OK (' + status.type + ')' : 'MISSING ❌'}`);
}

const showdownMatches = classesContent.matchAll(/showdownSpriteId: '([^']+)'/g);
for (const match of showdownMatches) {
    const id = match[1];
    const status = assetExists(id);
    console.log(`- Showdown ID: ${id.padEnd(13)} | Status: ${status.exists ? 'OK (' + status.type + ')' : 'MISSING ❌'}`);
}

// 4. Check for rogue IDs in TRAINER_TYPES keys
console.log('\n[4] Checking for potentially misused Trainer Keys:');
if (trainerTypesMatch) {
    const typesRaw = trainerTypesMatch[1];
    const keyMatches = typesRaw.matchAll(/'([^']+)': \{/g);
    for (const match of keyMatches) {
        const key = match[1];
        const status = assetExists(key);
        if (!status.exists) {
            console.log(`- Key ID: ${key.padEnd(15)} | Status: MISSING (but used as mission key) ⚠️`);
        }
    }
}

console.log('\n--- AUDIT COMPLETE ---');
