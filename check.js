const fs = require('fs');
const pd = fs.readFileSync('js/02_pokemon_data.js', 'utf8');
const sd = fs.readFileSync('js/03_sprites.js', 'utf8');

const wildMatches = [...pd.matchAll(/wild:\s*{([^}]+)}/g)];
const allWildString = wildMatches.map(m => m[1]).join(' ');
const wildKeys = allWildString.match(/'([a-z0-9_]+)'/g).map(s => s.replace(/'/g, ''));

const fishingMatches = [...pd.matchAll(/fishing:\s*{[^:]+:\s*\[([^\]]+)\]/g)];
const allFishingString = fishingMatches.map(m => m[1]).join(' ');
const fishingKeys = allFishingString.match(/'([a-z0-9_]+)'/g) ? allFishingString.match(/'([a-z0-9_]+)'/g).map(s => s.replace(/'/g, '')) : [];

const uniqueKeys = [...new Set([...wildKeys, ...fishingKeys])];

const missing = uniqueKeys.filter(k => {
    const regex = new RegExp(k + '\\s*:');
    return !regex.test(sd);
});

console.log('Missing sprites including fishing:', missing);
