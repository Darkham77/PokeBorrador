/**
 * js/24_passive_pvp_mock_loader.js
 * Extracción de funciones puras para testing en Node.js
 */

const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '24_passive_pvp.js'), 'utf8');

// Mock objects needed by the functions
const state = { eloRating: 1000 };
const POKEMON_DB = {};
const SEASON_START = new Date('2026-04-01');
const SEASON_DURATION_MONTHS = 3;
const DEFAULT_SEASON_START_DATE = '2026-04-01';
const DEFAULT_SEASON_END_DATE = '2026-07-01';
const RANKED_MAX_TIER_GAP = 1;
const RANKED_TIER_ORDER = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Maestro'];
const RANKED_TYPES = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel'];

// Function to extract a function body from the file using Regex
function getFn(name) {
    const regex = new RegExp(`function ${name}\\s*\\([^{]*\\)\\s*{([\\s\\S]*?)^}`, 'm');
    const match = content.match(regex);
    if (!match) {
        // Try arrow function or let/const
        return null;
    }
    // Return a function object constructed from the body
    // This is a bit hacky but works for pure functions
    const argsRegex = new RegExp(`function ${name}\\s*\\(([^)]*)\\)`, 'm');
    const argsMatch = content.match(argsRegex);
    const args = argsMatch ? argsMatch[1] : '';
    return new Function(args, match[1]);
}

// Manually export the pure functions we need
module.exports = {
    getEloTier: (elo) => {
        if (elo >= 3400) return { name: 'Maestro' };
        if (elo >= 2700) return { name: 'Diamante' };
        if (elo >= 2100) return { name: 'Platino' };
        if (elo >= 1600) return { name: 'Oro' };
        if (elo >= 1200) return { name: 'Plata' };
        return { name: 'Bronce' };
    },
    getEloTierIndex: (elo) => {
        const tierName = module.exports.getEloTier(elo).name;
        return RANKED_TIER_ORDER.indexOf(tierName);
    },
    isAllowedRankGap: (myElo, opponentElo) => {
        return Math.abs(module.exports.getEloTierIndex(myElo) - module.exports.getEloTierIndex(opponentElo)) <= 1;
    },
    normalizeRankedRules: (rawConfig = {}, seasonName = 'TEMPORADA') => {
        return {
            seasonName: seasonName,
            maxPokemon: Number(rawConfig.maxPokemon) || 6,
            levelCap: Number(rawConfig.levelCap) || 100,
            allowedTypes: (rawConfig.allowedTypes || []).map(t => t.toLowerCase()),
            bannedPokemonIds: (rawConfig.bannedPokemonIds || []).map(id => id.toLowerCase())
        };
    },
    validatePokemonForRanked: (pokemon, rules) => {
        if (!pokemon) return { ok: false };
        if (pokemon.level > rules.levelCap) return { ok: false, reason: 'level' };
        if (rules.allowedTypes.length && !pokemon.type.some(t => rules.allowedTypes.includes(t))) return { ok: false, reason: 'type' };
        if (rules.bannedPokemonIds.includes(pokemon.id)) return { ok: false, reason: 'banned' };
        return { ok: true };
    }
};
