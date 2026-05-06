/**
 * src/logic/pvp/rankedEngine.js
 * Modern logic for Ranked PvP, ELO Tiers, and Validation.
 */

export const RANKED_TIER_ORDER = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Maestro'];
export const RANKED_MAX_TIER_GAP = 1;

export const RANKED_TIERS = {
  BRONCE:   { name: 'Bronce',   minElo: 0,    color: '#c8a060', icon: '🥉' },
  PLATA:    { name: 'Plata',    minElo: 1200, color: '#9E9E9E', icon: '🥈' },
  ORO:      { name: 'Oro',      minElo: 1600, color: '#FFB800', icon: '🥇' },
  PLATINO:  { name: 'Platino',  minElo: 2100, color: '#E5C100', icon: '🔶' },
  DIAMANTE: { name: 'Diamante', minElo: 2700, color: '#89CFF0', icon: '💎' },
  MAESTRO:  { name: 'Maestro',  minElo: 3400, color: '#FFD700', icon: '👑' }
};

/**
 * Returns the tier corresponding to an ELO value.
 */
export function getEloTier(elo) {
  const e = Number(elo) || 0;
  if (e >= RANKED_TIERS.MAESTRO.minElo)  return RANKED_TIERS.MAESTRO;
  if (e >= RANKED_TIERS.DIAMANTE.minElo) return RANKED_TIERS.DIAMANTE;
  if (e >= RANKED_TIERS.PLATINO.minElo)  return RANKED_TIERS.PLATINO;
  if (e >= RANKED_TIERS.ORO.minElo)      return RANKED_TIERS.ORO;
  if (e >= RANKED_TIERS.PLATA.minElo)    return RANKED_TIERS.PLATA;
  return RANKED_TIERS.BRONCE;
}

/**
 * Returns the index of the tier for gap comparison.
 */
export function getEloTierIndex(elo) {
  const tier = getEloTier(elo);
  return RANKED_TIER_ORDER.indexOf(tier.name);
}

/**
 * Checks if a match is allowed between two ELO ratings.
 */
export function isAllowedRankGap(myElo, opponentElo, maxGap = RANKED_MAX_TIER_GAP) {
  return Math.abs(getEloTierIndex(myElo) - getEloTierIndex(opponentElo)) <= maxGap;
}

/**
 * Normalizes ranked rules from raw configuration.
 */
export function normalizeRankedRules(raw = {}, seasonName = 'TEMPORADA ACTUAL') {
  return {
    seasonName: seasonName || 'TEMPORADA ACTUAL',
    maxPokemon: Math.max(1, Math.min(6, Number(raw.maxPokemon) || 6)),
    levelCap: Math.max(1, Math.min(100, Number(raw.levelCap) || 100)),
    allowedTypes: Array.isArray(raw.allowedTypes) ? raw.allowedTypes.map(t => t.toLowerCase()) : [],
    bannedPokemonIds: Array.isArray(raw.bannedPokemonIds) ? raw.bannedPokemonIds.map(id => id.toLowerCase()) : []
  };
}

/**
 * Validates a single Pokemon against the rules.
 */
export function validatePokemonForRanked(pokemon, rules) {
  if (!pokemon) return { ok: false, reason: 'Pokémon inválido.' };

  const id = (pokemon.id || '').toLowerCase();
  if (rules.bannedPokemonIds.includes(id)) {
    return { ok: false, reason: `${pokemon.name || id} está baneado esta temporada.` };
  }

  if (pokemon.level > rules.levelCap) {
    return { ok: false, reason: `${pokemon.name || id} supera el nivel máximo (${rules.levelCap}).` };
  }

  if (rules.allowedTypes.length > 0) {
    const types = Array.isArray(pokemon.type) ? pokemon.type.map(t => t.toLowerCase()) : [String(pokemon.type).toLowerCase()];
    const hasAllowedType = types.some(t => rules.allowedTypes.includes(t));
    if (!hasAllowedType) {
      return { ok: false, reason: `${pokemon.name || id} no tiene un tipo permitido.` };
    }
  }

  return { ok: true };
}

/**
 * Validates a full team against the rules.
 */
export function validateTeamForRanked(team, rules) {
  const members = (team || []).filter(Boolean);
  if (members.length === 0) return { ok: false, reason: 'El equipo está vacío.' };
  if (members.length > rules.maxPokemon) return { ok: false, reason: `Máximo ${rules.maxPokemon} Pokémon permitidos.` };

  for (const p of members) {
    const v = validatePokemonForRanked(p, rules);
    if (!v.ok) return v;
  }

  return { ok: true };
}
