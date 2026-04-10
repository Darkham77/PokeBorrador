// ===== SISTEMA DE EQUIPOS PASIVOS, ELO Y MATCHMAKING RANKED =====
// Este archivo es un <script> inline — NO usar export/import.

// ── Constantes de Temporada ───────────────────────────────────────────
const SEASON_START = new Date('2026-04-01T00:00:00-03:00');
const SEASON_DURATION_MONTHS = 3;

function _toIsoDay(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return '';
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function _buildSeasonEndFromStart(startDate) {
  const end = new Date(startDate);
  end.setMonth(end.getMonth() + SEASON_DURATION_MONTHS);
  return end;
}

function _normalizeSeasonDate(value) {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const [year, month, day] = raw.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== (month - 1) || date.getDate() !== day) return '';
  return raw;
}

function _parseSeasonDate(value) {
  const safe = _normalizeSeasonDate(value);
  if (!safe) return null;
  const [year, month, day] = safe.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const DEFAULT_SEASON_START_DATE = _toIsoDay(SEASON_START);
const DEFAULT_SEASON_END_DATE = _toIsoDay(_buildSeasonEndFromStart(SEASON_START));

function getRankedSeasonDateRange(rules = getCurrentRankedRules()) {
  const startRaw = _normalizeSeasonDate(rules?.seasonStartDate) || DEFAULT_SEASON_START_DATE;
  let startDate = _parseSeasonDate(startRaw) || new Date(SEASON_START);

  const endRawCandidate = _normalizeSeasonDate(rules?.seasonEndDate);
  let endDate = endRawCandidate ? _parseSeasonDate(endRawCandidate) : null;

  if (!endDate) {
    endDate = _buildSeasonEndFromStart(startDate);
  }

  if (endDate < startDate) {
    endDate = new Date(startDate);
  }

  return {
    startDate,
    endDate,
    startIso: _toIsoDay(startDate),
    endIso: _toIsoDay(endDate)
  };
}

function getSeasonEndDate(rules = getCurrentRankedRules()) {
  return getRankedSeasonDateRange(rules).endDate;
}

function _formatSeasonDate(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return '-';
  return dateObj.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ── Tiers de ELO ─────────────────────────────────────────────────────
function getEloTier(elo) {
  if (elo >= 3400) return { name: 'Maestro',  icon: '\uD83D\uDC51', color: '#FFD700' };
  if (elo >= 2700) return { name: 'Diamante', icon: '\uD83D\uDC8E', color: '#89CFF0' };
  if (elo >= 2100) return { name: 'Platino',  icon: '\uD83D\uDD36', color: '#E5C100' };
  if (elo >= 1600) return { name: 'Oro',      icon: '\uD83E\uDD47', color: '#FFB800' };
  if (elo >= 1200) return { name: 'Plata',    icon: '\uD83E\uDD48', color: '#9E9E9E' };
  return                  { name: 'Bronce',   icon: '\uD83E\uDD49', color: '#c8a060' };
}

const RANKED_TIER_ORDER = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Maestro'];
const RANKED_MAX_TIER_GAP = 1; // No emparejar con diferencia de 2 o mas rangos

const RANKED_REWARD_TRACK_MIN_ELO = 1000;
const RANKED_REWARD_TRACK_MAX_ELO = 3400;

const RANKED_REWARD_TIER_MARKS = [
  { name: 'Bronce', elo: 1000, color: '#c8a060' },
  { name: 'Plata', elo: 1200, color: '#9E9E9E' },
  { name: 'Oro', elo: 1600, color: '#FFB800' },
  { name: 'Platino', elo: 2100, color: '#E5C100' },
  { name: 'Diamante', elo: 2700, color: '#89CFF0' },
  { name: 'Maestro', elo: 3400, color: '#FFD700' }
];

const RANKED_REWARD_MILESTONES = [
  { id: 'bronce_1000', tier: 'Bronce', elo: 1000, rewards: { 'Parche de naturaleza': 1 } },
  { id: 'bronce_1100', tier: 'Bronce', elo: 1100, rewards: { 'Parche de naturaleza': 1 } },
  { id: 'plata_1200', tier: 'Plata', elo: 1200, rewards: { 'Parche de naturaleza': 1, 'Caramelo de vigor': 1 } },
  { id: 'plata_1400', tier: 'Plata', elo: 1400, rewards: { 'Parche de naturaleza': 2 } },
  { id: 'oro_1600', tier: 'Oro', elo: 1600, rewards: { 'Caramelo de vigor': 2 } },
  { id: 'oro_1800', tier: 'Oro', elo: 1800, rewards: { 'Parche de naturaleza': 2, 'Caramelo de vigor': 1 } },
  { id: 'oro_2000', tier: 'Oro', elo: 2000, rewards: { 'Parche de naturaleza': 2 } },
  { id: 'platino_2100', tier: 'Platino', elo: 2100, rewards: { 'Parche de naturaleza': 1, 'Caramelo de vigor': 2 } },
  { id: 'platino_2400', tier: 'Platino', elo: 2400, rewards: { 'Parche de naturaleza': 2, 'Caramelo de vigor': 2 } },
  { id: 'diamante_2700', tier: 'Diamante', elo: 2700, rewards: { 'P\u00edldora de cambio de habilidad': 1, 'Caramelo de vigor': 2 } },
  { id: 'diamante_3000', tier: 'Diamante', elo: 3000, rewards: { 'Parche de naturaleza': 3, 'Caramelo de vigor': 2 } },
  { id: 'diamante_3300', tier: 'Diamante', elo: 3300, rewards: { 'P\u00edldora de cambio de habilidad': 1 } },
  { id: 'maestro_3400', tier: 'Maestro', elo: 3400, rewards: { 'P\u00edldora de cambio de habilidad': 2, 'Parche de naturaleza': 3, 'Caramelo de vigor': 3 } }
];

function getEloTierIndex(elo) {
  const tierName = getEloTier(Number(elo) || 0).name;
  const idx = RANKED_TIER_ORDER.indexOf(tierName);
  return idx >= 0 ? idx : 0;
}

function isAllowedRankGap(myElo, opponentElo, maxGap = RANKED_MAX_TIER_GAP) {
  const opp = Number(opponentElo);
  if (!Number.isFinite(opp)) return false;
  const mine = Number(myElo) || 0;
  return Math.abs(getEloTierIndex(mine) - getEloTierIndex(opp)) <= maxGap;
}

// Ranked rules (temporada actual)
const RANKED_TYPES = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel'];
const RANKED_TYPE_META = {
  normal:   { label: 'Normal', icon: '?' },
  fire:     { label: 'Fuego', icon: '\u26A0\uFE0F' },
  water:    { label: 'Agua', icon: '\u26A0\uFE0F' },
  electric: { label: 'El?ctrico', icon: '?' },
  grass:    { label: 'Planta', icon: '\u26A0\uFE0F' },
  ice:      { label: 'Hielo', icon: '\u26A0\uFE0F' },
  fighting: { label: 'Lucha', icon: '\u26A0\uFE0F' },
  poison:   { label: 'Veneno', icon: '\u26A0\uFE0F' },
  ground:   { label: 'Tierra', icon: '\u26A0\uFE0F' },
  flying:   { label: 'Volador', icon: '\u26A0\uFE0F' },
  psychic:  { label: 'Ps?quico', icon: '\u26A0\uFE0F' },
  bug:      { label: 'Bicho', icon: '\u26A0\uFE0F' },
  rock:     { label: 'Roca', icon: '\u26A0\uFE0F' },
  ghost:    { label: 'Fantasma', icon: '\u26A0\uFE0F' },
  dragon:   { label: 'Drag?n', icon: '\u26A0\uFE0F' },
  dark:     { label: 'Siniestro', icon: '\u26A0\uFE0F' },
  steel:    { label: 'Acero', icon: '\u26A0\uFE0F' }
};

const DEFAULT_RANKED_RULES = {
  seasonName: 'TEMPORADA ACTUAL',
  seasonStartDate: DEFAULT_SEASON_START_DATE,
  seasonEndDate: DEFAULT_SEASON_END_DATE,
  maxPokemon: 6,
  levelCap: 100,
  allowedTypes: [],
  bannedPokemonIds: []
};

let _currentRankedRules = { ...DEFAULT_RANKED_RULES };
let _rankedRulesLoaded = false;

const LOCAL_RANKED_RESULT_SUPPRESS_MS = 120000;
const PASSIVE_DEFENSE_SUPPRESS_KEY = 'ranked_local_result_suppress_until';

function _markLocalRankedResult(ms = LOCAL_RANKED_RESULT_SUPPRESS_MS) {
  const ttl = Math.max(1000, Number(ms) || LOCAL_RANKED_RESULT_SUPPRESS_MS);
  const until = Date.now() + ttl;
  state._passiveDefenseSuppressUntil = until;
  try { sessionStorage.setItem(PASSIVE_DEFENSE_SUPPRESS_KEY, String(until)); } catch (e) {}
}

function _isPassiveDefenseNotificationSuppressed() {
  let until = Number(state._passiveDefenseSuppressUntil || 0);
  try {
    const persisted = Number(sessionStorage.getItem(PASSIVE_DEFENSE_SUPPRESS_KEY) || 0);
    if (persisted > until) until = persisted;
  } catch (e) {}

  if (!Number.isFinite(until) || until <= 0) return false;
  if (Date.now() < until) return true;

  state._passiveDefenseSuppressUntil = 0;
  try { sessionStorage.removeItem(PASSIVE_DEFENSE_SUPPRESS_KEY); } catch (e) {}
  return false;
}

function _normalizeRankedType(v) {
  const key = String(v || '').trim().toLowerCase();
  return RANKED_TYPES.includes(key) ? key : null;
}

function _normalizePokemonId(v) {
  return String(v || '').trim().toLowerCase();
}

function _uniqueArray(values) {
  return Array.from(new Set(values));
}

function normalizeRankedRules(rawConfig = {}, seasonNameRaw = DEFAULT_RANKED_RULES.seasonName) {
  const maxPokemonNum = Number(rawConfig?.maxPokemon);
  const levelCapNum = Number(rawConfig?.levelCap);

  const seasonStartDate = _normalizeSeasonDate(rawConfig?.seasonStartDate) || DEFAULT_RANKED_RULES.seasonStartDate;

  const rawSeasonEnd = _normalizeSeasonDate(rawConfig?.seasonEndDate);
  const derivedSeasonEnd = rawSeasonEnd || _toIsoDay(_buildSeasonEndFromStart(_parseSeasonDate(seasonStartDate) || SEASON_START));

  const startDateObj = _parseSeasonDate(seasonStartDate) || new Date(SEASON_START);
  let endDateObj = _parseSeasonDate(derivedSeasonEnd) || _buildSeasonEndFromStart(startDateObj);
  if (endDateObj < startDateObj) endDateObj = new Date(startDateObj);

  return {
    seasonName: String(seasonNameRaw || DEFAULT_RANKED_RULES.seasonName).trim() || DEFAULT_RANKED_RULES.seasonName,
    seasonStartDate,
    seasonEndDate: _toIsoDay(endDateObj),
    maxPokemon: Number.isFinite(maxPokemonNum) ? Math.max(1, Math.min(6, Math.floor(maxPokemonNum))) : DEFAULT_RANKED_RULES.maxPokemon,
    levelCap: Number.isFinite(levelCapNum) ? Math.max(1, Math.min(100, Math.floor(levelCapNum))) : DEFAULT_RANKED_RULES.levelCap,
    allowedTypes: _uniqueArray((rawConfig?.allowedTypes || []).map(_normalizeRankedType).filter(Boolean)),
    bannedPokemonIds: _uniqueArray((rawConfig?.bannedPokemonIds || []).map(_normalizePokemonId).filter(Boolean))
  };
}

async function loadRankedRules(force = false) {
  if (!force && _rankedRulesLoaded) return _currentRankedRules;
  _rankedRulesLoaded = true;
  if (!sb) {
    _currentRankedRules = { ...DEFAULT_RANKED_RULES };
    return _currentRankedRules;
  }

  try {
    const { data, error } = await sb.from('ranked_rules_config').select('season_name, config').eq('id', 'current').maybeSingle();
    if (error) throw error;
    _currentRankedRules = normalizeRankedRules(data?.config || {}, data?.season_name || DEFAULT_RANKED_RULES.seasonName);
  } catch (e) {
    _currentRankedRules = { ...DEFAULT_RANKED_RULES };
  }
  return _currentRankedRules;
}

function getCurrentRankedRules() {
  return _currentRankedRules || { ...DEFAULT_RANKED_RULES };
}

function _getPokemonTypeTokens(pokemon) {
  const raw = pokemon?.type;
  if (Array.isArray(raw)) {
    return _uniqueArray(raw.map(_normalizeRankedType).filter(Boolean));
  }
  const str = String(raw || '').toLowerCase();
  if (!str) return [];
  return _uniqueArray(str.split(/[^a-z]+/).map(_normalizeRankedType).filter(Boolean));
}

function validatePokemonForRanked(pokemon, rules = getCurrentRankedRules()) {
  if (!pokemon) return { ok: false, reason: 'Hay un Pokemon invalido en el equipo.' };

  const pokeId = _normalizePokemonId(pokemon.id || pokemon.name || '');
  if (rules.bannedPokemonIds.includes(pokeId)) {
    return { ok: false, reason: `${pokemon.name || pokeId || 'Un Pokemon'} esta baneado esta temporada.` };
  }

  const level = Number(pokemon.level || 1);
  if (level > rules.levelCap) {
    return { ok: false, reason: `${pokemon.name || 'Un Pokemon'} supera el nivel maximo (${rules.levelCap}).` };
  }

  if (rules.allowedTypes.length) {
    const pokemonTypes = _getPokemonTypeTokens(pokemon);
    const hasAllowedType = pokemonTypes.some(t => rules.allowedTypes.includes(t));
    if (!hasAllowedType) {
      return { ok: false, reason: `${pokemon.name || 'Un Pokemon'} no cumple los tipos permitidos de la temporada.` };
    }
  }

  return { ok: true };
}

function validateTeamForRanked(team, rules = getCurrentRankedRules(), sourceLabel = 'equipo') {
  const members = Array.isArray(team) ? team.filter(Boolean) : [];
  if (!members.length) {
    return { ok: false, reason: `Tu ${sourceLabel} no tiene Pokemon disponibles.` };
  }

  if (members.length > rules.maxPokemon) {
    return { ok: false, reason: `Tu ${sourceLabel} supera el maximo permitido (${rules.maxPokemon}).` };
  }

  for (const pokemon of members) {
    const check = validatePokemonForRanked(pokemon, rules);
    if (!check.ok) return check;
  }

  return { ok: true };
}

async function ensureRankedTeamEligibility(team, sourceLabel = 'equipo', notifyOnFail = true) {
  const rules = await loadRankedRules();
  const validation = validateTeamForRanked(team, rules, sourceLabel);
  if (!validation.ok && notifyOnFail) {
    notify(validation.reason, '\u26A0\uFE0F');
  }
  return validation;
}


// ── Snapshot para equipo pasivo ───────────────────────────────────────
function buildPassiveSnapshot(p) {
  return {
    id: p.id,
    name: p.name,
    level: p.level,
    type: p.type,
    ability: p.ability || null,
    nature: p.nature || 'Serio',
    ivs: p.ivs || { hp:15, atk:15, def:15, spa:15, spd:15, spe:15 },
    maxHp: p.maxHp,
    atk: p.atk, def: p.def, spa: p.spa, spd: p.spd, spe: p.spe,
    moves: (p.moves || []).map(m => ({
      name: m.name,
      pp: m.maxPP || m.pp,
      maxPP: m.maxPP || m.pp,
      ppUps: m.ppUps || 0
    })),
    heldItem: p.heldItem || null, // <-- Fix Audit: Incluir objeto equipado
    isShiny: p.isShiny || false,
  };
}

// ── Cargar ELO del jugador ────────────────────────────────────────────
async function loadPlayerElo() {
  if (!currentUser || !sb) return;
  if (_offlineEloSummaryUserId !== currentUser.id) {
    _offlineEloSummaryShown = false;
    _offlineEloSummaryUserId = currentUser.id;
  }

  const previousElo = state.eloRating || 1000;
  const previousWins = state.pvpStats?.wins || 0;
  const previousLosses = state.pvpStats?.losses || 0;
  const previousDraws = state.pvpStats?.draws || 0;

  const { data } = await sb.from('profiles')
    .select('elo_rating, pvp_wins, pvp_losses, pvp_draws')
    .eq('id', currentUser.id)
    .single();

  const rules = await loadRankedRules();
  const currentSeason = rules.seasonName || 'TEMPORADA ACTUAL';

  if (data) {
    // REVISAR SI CAMBIÓ LA TEMPORADA (RESET)
    // El estado local state.lastRankedSeason persiste los cambios entre sesiones.
    if (state.lastRankedSeason && state.lastRankedSeason !== currentSeason) {
      console.log(`[Ranked] Detectada nueva temporada: ${currentSeason}. Reseteando stats...`);
      
      // Realizar reset local
      state.eloRating = 1000;
      state.pvpStats = { wins: 0, losses: 0, draws: 0 };
      state.rankedMaxElo = 1000;
      state.rankedRewardsClaimed = [];
      state.lastRankedSeason = currentSeason;

      // Actualizar DB de inmediato para que no se repita el reset
      await sb.from('profiles').update({
        elo_rating: 1000,
        pvp_wins: 0,
        pvp_losses: 0,
        pvp_draws: 0
      }).eq('id', currentUser.id);

      notify(`¡Bienvenido a la ${currentSeason}! Tu ELO ha sido reiniciado.`, '🏅');
    } else if (!state.lastRankedSeason) {
      // Primera vez entrando al sistema en este formato
      state.lastRankedSeason = currentSeason;
    }

    const nextElo = data.elo_rating || 1000;
    const nextWins = data.pvp_wins || 0;
    const nextLosses = data.pvp_losses || 0;
    const nextDraws = data.pvp_draws || 0;

    state.eloRating = nextElo;
    state.pvpStats = {
      wins: nextWins,
      losses: nextLosses,
      draws: nextDraws
    };

    const maxEloChanged = _ensureRankedRewardProgress();
    const delta = nextElo - previousElo;
    const totalBattlesDelta = (nextWins - previousWins) + (nextLosses - previousLosses) + (nextDraws - previousDraws);
    if (!_offlineEloSummaryShown && delta !== 0 && totalBattlesDelta > 0) {
      const sign = delta > 0 ? '+' : '';
      notify(
        `Defensa pasiva offline: ${sign}${delta} ELO total desde tu ultima conexion.`,
        delta >= 0 ? '🛡️' : '💀',
        { type: 'passive_elo_offline' }
      );
      _offlineEloSummaryShown = true;
    }

    if ((delta !== 0 || maxEloChanged) && typeof scheduleSave === 'function') {
      scheduleSave();
    }
  }

  // Tambien cargar el estado de activacion del equipo pasivo
  const { data: passiveData } = await sb.from('passive_teams')
    .select('is_active')
    .eq('user_id', currentUser.id)
    .single();

  if (passiveData) {
    state.passiveTeamActive = passiveData.is_active;
  } else {
    state.passiveTeamActive = false;
  }

  initGlobalRankedLeaderboardWatcher();
}

// ── Watcher de ELO en segundo plano ──────────────────────────────────
let _eloWatcherInterval = null;
let _offlineEloSummaryShown = false;
let _offlineEloSummaryUserId = null;

const RANKED_LEADERBOARD_LIMIT = 100;
const RANKED_LEADERBOARD_REFRESH_MS = 30 * 60 * 1000;
let _rankedLeaderboardRefreshTimer = null;
let _rankedLeaderboardRows = [];
let _rankedLeaderboardLastSyncAt = 0;
let _rankedLeaderboardPending = null;
let _rankedLeaderboardError = '';

function _rankedEscHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

function _formatRankedLeaderboardDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('es-AR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
}

function _rankedLeaderboardMsUntilNextSync() {
  if (!_rankedLeaderboardLastSyncAt) return 0;
  return Math.max(0, (_rankedLeaderboardLastSyncAt + RANKED_LEADERBOARD_REFRESH_MS) - Date.now());
}

function _renderRankedLeaderboardRows(rows = _rankedLeaderboardRows) {
  const listEl = document.getElementById('ranked-global-list');
  if (!listEl) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    listEl.innerHTML = '<div style="font-size:11px;color:var(--gray);padding:10px;">Aun no hay datos de ranking global.</div>';
    _renderSeasonFinalRewardsCard();
    return;
  }

  const meId = currentUser?.id || null;
  listEl.innerHTML = rows.map((row, idx) => {
    const elo = Number(row?.elo_rating || 1000);
    const tier = getEloTier(elo);
    const nick = _rankedEscHtml(row?.username || 'Entrenador');
    const isMe = !!meId && row?.id === meId;
    const meBadge = isMe
      ? '<span style="font-size:7px;padding:2px 4px;border-radius:6px;background:rgba(107,203,119,0.18);color:#86efac;border:1px solid rgba(134,239,172,0.35);">TU</span>'
      : '';

    return `
      <div style="display:grid;grid-template-columns:62px minmax(0,1fr) 124px 88px;gap:8px;align-items:center;padding:8px 10px;border-radius:10px;border:1px solid ${isMe ? 'rgba(107,203,119,0.45)' : 'rgba(255,255,255,0.08)'};background:${isMe ? 'rgba(107,203,119,0.08)' : 'rgba(0,0,0,0.16)'};">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--yellow);">#${idx + 1}</div>
        <div style="font-size:11px;color:#fff;display:flex;align-items:center;gap:6px;min-width:0;">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nick}</span>${meBadge}
        </div>
        <div style="font-size:10px;color:${tier.color};font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tier.icon} ${_rankedEscHtml(tier.name)}</div>
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#e2e8f0;text-align:right;">${elo}</div>
      </div>
    `;
  }).join('');

  _renderSeasonFinalRewardsCard();
}

function _renderRankedLeaderboardStatus(isLoading = false) {
  const statusEl = document.getElementById('ranked-global-status');
  const btn = document.getElementById('ranked-global-refresh-btn');
  if (btn) btn.disabled = isLoading;
  if (!statusEl) return;

  if (isLoading) {
    statusEl.textContent = 'Actualizando ranking global...';
    statusEl.style.color = 'var(--gray)';
    return;
  }

  if (_rankedLeaderboardError) {
    statusEl.textContent = _rankedLeaderboardError;
    statusEl.style.color = 'var(--red)';
    return;
  }

  const syncText = _rankedLeaderboardLastSyncAt
    ? `Ultima actualizacion: ${_formatRankedLeaderboardDate(_rankedLeaderboardLastSyncAt)}`
    : 'Sin sincronizar todavia.';

  const minsLeft = Math.max(1, Math.ceil(((_rankedLeaderboardMsUntilNextSync() || RANKED_LEADERBOARD_REFRESH_MS)) / 60000));
  statusEl.textContent = `${syncText} - Proxima revision en ${minsLeft} min.`;
  statusEl.style.color = 'var(--gray)';
}

async function refreshGlobalRankedLeaderboard(force = false) {
  if (!currentUser || !sb) return [];

  const isStale = !_rankedLeaderboardLastSyncAt || (Date.now() - _rankedLeaderboardLastSyncAt) >= RANKED_LEADERBOARD_REFRESH_MS;
  if (!force && !isStale) {
    _renderRankedLeaderboardRows();
    _renderRankedLeaderboardStatus(false);
    return _rankedLeaderboardRows;
  }

  if (_rankedLeaderboardPending) return _rankedLeaderboardPending;

  _rankedLeaderboardError = '';
  _renderRankedLeaderboardRows();
  _renderRankedLeaderboardStatus(true);

  _rankedLeaderboardPending = (async () => {
    try {
      const { data, error } = await sb.from('profiles')
        .select('id,username,elo_rating')
        .not('username', 'is', null)
        .order('elo_rating', { ascending: false, nullsFirst: false })
        .order('username', { ascending: true })
        .limit(RANKED_LEADERBOARD_LIMIT);

      if (error) throw error;

      _rankedLeaderboardRows = Array.isArray(data) ? data.map((row) => ({
        id: row.id,
        username: row.username || 'Entrenador',
        elo_rating: Number(row.elo_rating || 1000)
      })) : [];

      _rankedLeaderboardLastSyncAt = Date.now();
      _rankedLeaderboardError = '';
      _renderRankedLeaderboardRows();
      _renderRankedLeaderboardStatus(false);
      return _rankedLeaderboardRows;
    } catch (e) {
      console.warn('[Ranked] No se pudo cargar leaderboard global:', e);
      _rankedLeaderboardError = 'No se pudo cargar el ranking global. Reintenta en unos minutos.';
      _renderRankedLeaderboardRows();
      _renderRankedLeaderboardStatus(false);
      return [];
    } finally {
      _rankedLeaderboardPending = null;
    }
  })();

  return _rankedLeaderboardPending;
}

function initGlobalRankedLeaderboardWatcher() {
  if (_rankedLeaderboardRefreshTimer || !currentUser) return;

  refreshGlobalRankedLeaderboard(true).catch(() => {});
  _rankedLeaderboardRefreshTimer = setInterval(() => {
    if (!currentUser) return;
    refreshGlobalRankedLeaderboard(true).catch(() => {});
  }, RANKED_LEADERBOARD_REFRESH_MS);
}

function initEloWatcher() {
  if (_eloWatcherInterval || !currentUser) return;
  
  _eloWatcherInterval = setInterval(async () => {
    if (!currentUser) return;
    
    const oldElo = state.eloRating || 1000;
    const oldWins = state.pvpStats?.wins || 0;
    const oldLosses = state.pvpStats?.losses || 0;

    const { data, error } = await sb.from('profiles')
      .select('elo_rating, pvp_wins, pvp_losses, pvp_draws')
      .eq('id', currentUser.id)
      .single();

    if (!error && data) {
      const newElo = data.elo_rating || 1000;
      
      if (newElo !== oldElo) {
        // Solo notificar si NO estamos en una batalla activa de ranked o buscando
        // (Para evitar spam mientras uno mismo está jugando rankeds)
        const isCurrentlyRanked = (state.activeBattle && state.activeBattle.isRanked) || (state.battle && state.battle.isRanked);
        const isSearching = window.isRankedSearching;
        const isSuppressedByLocalResult = _isPassiveDefenseNotificationSuppressed();

        if (!isCurrentlyRanked && !isSearching && !isSuppressedByLocalResult) {
          const delta = newElo - oldElo;
          const won = delta > 0 || data.pvp_wins > oldWins;
          
          if (delta !== 0) {
            notify(
              `🛡️ Defensa Pasiva: ${won ? '¡Victoria!' : 'Derrota.'} (${delta > 0 ? '+' : ''}${delta} ELO)`,
              won ? '⚔️' : '💀'
            );
          }
        }

        // Actualizar estado local
        state.eloRating = newElo;
        state.pvpStats = {
          wins:   data.pvp_wins   || 0,
          losses: data.pvp_losses || 0,
          draws:  data.pvp_draws  || 0
        };

        const maxEloChanged = _ensureRankedRewardProgress();
        if (maxEloChanged && typeof scheduleSave === 'function') scheduleSave();

        // Si la pestaña de Ranked está visible, refrescar UI
        const tab = document.getElementById('tab-ranked');
        if (tab && tab.style.display !== 'none') {
          renderRankedTab();
        }
      }
    }
  }, 20000); // Cada 20 segundos
}

// ── Renderizar el tab Rankeds ─────────────────────────────────────────
function _ensureRankedRewardProgress() {
  let changed = false;

  if (!Array.isArray(state.rankedRewardsClaimed)) {
    if (state.rankedRewardsClaimed && typeof state.rankedRewardsClaimed === 'object') {
      state.rankedRewardsClaimed = Object.keys(state.rankedRewardsClaimed).filter((k) => !!state.rankedRewardsClaimed[k]);
    } else {
      state.rankedRewardsClaimed = [];
    }
    changed = true;
  }

  const currentElo = Number(state.eloRating) || RANKED_REWARD_TRACK_MIN_ELO;
  const savedMax = Number(state.rankedMaxElo);
  const normalizedSavedMax = Number.isFinite(savedMax)
    ? Math.max(RANKED_REWARD_TRACK_MIN_ELO, Math.floor(savedMax))
    : RANKED_REWARD_TRACK_MIN_ELO;

  if (state.rankedMaxElo !== normalizedSavedMax) {
    state.rankedMaxElo = normalizedSavedMax;
    changed = true;
  }

  const nextMax = Math.max(state.rankedMaxElo, Math.floor(currentElo));
  if (nextMax !== state.rankedMaxElo) {
    state.rankedMaxElo = nextMax;
    changed = true;
  }

  return changed;
}

function _rankedRewardProgressPct(eloValue) {
  const clamped = Math.max(RANKED_REWARD_TRACK_MIN_ELO, Math.min(RANKED_REWARD_TRACK_MAX_ELO, Number(eloValue) || RANKED_REWARD_TRACK_MIN_ELO));
  const span = RANKED_REWARD_TRACK_MAX_ELO - RANKED_REWARD_TRACK_MIN_ELO;
  if (span <= 0) return 0;
  return ((clamped - RANKED_REWARD_TRACK_MIN_ELO) / span) * 100;
}

function _renderRankedRewardsCard() {
  const root = document.getElementById('ranked-rewards-track');
  if (!root) return;

  _ensureRankedRewardProgress();

  const maxElo = Number(state.rankedMaxElo) || RANKED_REWARD_TRACK_MIN_ELO;
  const claimed = new Set(Array.isArray(state.rankedRewardsClaimed) ? state.rankedRewardsClaimed : []);
  const progress = _rankedRewardProgressPct(maxElo);
  const nextMilestone = RANKED_REWARD_MILESTONES.find((m) => maxElo < m.elo) || null;

  const marksHtml = RANKED_REWARD_TIER_MARKS.map((mark) => {
    const markPct = _rankedRewardProgressPct(mark.elo);
    return `<div style="position:absolute;left:${markPct}%;top:-8px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:4px;z-index:2;">
      <div style="width:12px;height:12px;border-radius:999px;border:2px solid ${mark.color};background:rgba(0,0,0,0.85);box-shadow:0 0 8px ${mark.color}44;"></div>
    </div>`;
  }).join('');

  const cardsHtml = RANKED_REWARD_MILESTONES.map((milestone) => {
    const unlocked = maxElo >= milestone.elo;
    const isClaimed = claimed.has(milestone.id);
    const tier = getEloTier(milestone.elo);
    const rewardText = Object.entries(milestone.rewards).map(([itemName, qty]) => {
      const itemMeta = (typeof SHOP_ITEMS !== 'undefined' && Array.isArray(SHOP_ITEMS))
        ? SHOP_ITEMS.find((it) => it.name === itemName)
        : null;
      const icon = itemMeta?.icon || '🎁';
      return `${icon} ${itemName} x${qty}`;
    }).join(' • ');

    let actionHtml = `<div style="font-size:9px;color:var(--gray);font-family:'Press Start 2P',monospace;">BLOQUEADO</div>`;
    if (isClaimed) {
      actionHtml = `<div style="font-size:9px;color:var(--green);font-family:'Press Start 2P',monospace;">RECLAMADO</div>`;
    } else if (unlocked) {
      actionHtml = `<button onclick="claimRankedMilestoneReward('${milestone.id}')" style="font-family:'Press Start 2P',monospace;font-size:8px;padding:8px 10px;border:none;border-radius:10px;cursor:pointer;background:rgba(107,203,119,0.2);color:var(--green);border:1px solid rgba(107,203,119,0.35);">RECLAMAR</button>`;
    }

    return `<div style="border:1px solid ${unlocked ? 'rgba(107,203,119,0.35)' : 'rgba(255,255,255,0.1)'};background:${isClaimed ? 'rgba(107,203,119,0.08)' : unlocked ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.25)'};border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px;min-width:240px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div style="font-size:10px;color:${tier.color};font-weight:700;">${tier.icon} ${milestone.tier}</div>
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--yellow);">ELO ${milestone.elo}</div>
      </div>
      <div style="font-size:11px;color:#fff;line-height:1.5;">${rewardText}</div>
      <div>${actionHtml}</div>
    </div>`;
  }).join('');

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px;">
      <div>
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--yellow);margin-bottom:6px;">PROGRESO DE TEMPORADA</div>
        <div style="font-size:11px;color:var(--gray);">Tu maximo ELO alcanzado: <span style="color:#fff;font-weight:700;">${maxElo}</span></div>
      </div>
      <div style="font-size:10px;color:var(--gray);">${nextMilestone ? `Proximo hito: ELO ${nextMilestone.elo}` : 'Todos los hitos desbloqueados'}</div>
    </div>

    <div style="position:relative;margin:20px 10px 20px;height:12px;">
      <div style="position:absolute;left:0;right:0;top:2px;height:8px;border-radius:999px;background:rgba(255,255,255,0.12);overflow:hidden;border:1px solid rgba(255,255,255,0.16);">
        <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#c8a060,#9E9E9E,#FFB800,#E5C100,#89CFF0,#FFD700);"></div>
      </div>
      ${marksHtml}
    </div>

    <div style="display:flex;gap:10px;overflow-x:auto;padding:4px 2px 2px;">${cardsHtml}</div>
  `;
}

function _getMyLeaderboardRank(rows = _rankedLeaderboardRows) {
  if (!currentUser || !Array.isArray(rows)) return null;
  const idx = rows.findIndex((row) => row?.id === currentUser.id);
  return idx >= 0 ? (idx + 1) : null;
}

function _renderSeasonFinalRewardsCard() {
  const root = document.getElementById('ranked-season-final-rewards');
  if (!root) return;

  const myRank = _getMyLeaderboardRank();
  let statusText = 'Aun no estas rankeado en el top global.';
  let statusColor = 'var(--gray)';

  if (myRank) {
    if (myRank <= 10) {
      statusText = `Tu posicion actual (#${myRank}) esta en rango TOP 10.`;
      statusColor = 'var(--yellow)';
    } else if (myRank <= 50) {
      statusText = `Tu posicion actual (#${myRank}) esta en rango TOP 11-50.`;
      statusColor = '#93c5fd';
    } else {
      statusText = `Tu posicion actual es #${myRank}.`;
      statusColor = 'var(--gray)';
    }
  }

  root.innerHTML = `
    <div style="display:grid;gap:10px;">
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#fde68a;margin-bottom:6px;">TOP 1 A TOP 10</div>
        <div style="font-size:11px;color:#fff;line-height:1.6;">Eevee shiny perfecto (naturaleza aleatoria) + 2 Ticket Cueva Celeste + 2 Ticket Islas Espumas.</div>
      </div>
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#bfdbfe;margin-bottom:6px;">TOP 11 A TOP 50</div>
        <div style="font-size:11px;color:#fff;line-height:1.6;">2 Ticket Cueva Celeste + 2 Ticket Islas Espumas.</div>
      </div>
      <div style="font-size:10px;color:${statusColor};line-height:1.5;">${statusText}</div>
      <div style="font-size:10px;color:var(--gray);line-height:1.5;">Los premios se entregan al cerrar la temporada con el ranking oficial final.</div>
    </div>
  `;
}

window.claimRankedMilestoneReward = function(milestoneId) {
  _ensureRankedRewardProgress();

  const milestone = RANKED_REWARD_MILESTONES.find((m) => m.id === milestoneId);
  if (!milestone) {
    notify('No se encontro ese hito de premio.', '⚠️');
    return;
  }

  const maxElo = Number(state.rankedMaxElo) || RANKED_REWARD_TRACK_MIN_ELO;
  if (maxElo < milestone.elo) {
    notify('Todavia no alcanzaste el ELO requerido para este premio.', '⚠️');
    return;
  }

  const claimed = Array.isArray(state.rankedRewardsClaimed) ? state.rankedRewardsClaimed : [];
  if (claimed.includes(milestone.id)) {
    notify('Ese premio ya fue reclamado.', 'ℹ️');
    return;
  }

  Object.entries(milestone.rewards).forEach(([itemName, qty]) => {
    const amount = Math.max(1, Number(qty) || 1);
    state.inventory[itemName] = (state.inventory[itemName] || 0) + amount;
  });

  state.rankedRewardsClaimed.push(milestone.id);

  const rewardSummary = Object.entries(milestone.rewards).map(([itemName, qty]) => `${itemName} x${qty}`).join(', ');
  notify(`Premio reclamado: ${rewardSummary}.`, '🎁');

  _renderRankedRewardsCard();
  if (typeof renderBag === 'function' && document.getElementById('tab-bag')?.style.display !== 'none') renderBag();
  if (typeof scheduleSave === 'function') scheduleSave();
};
function renderRankedTab() {
  _ensureRankedRewardProgress();
  const elo   = state.eloRating || 1000;
  const stats = state.pvpStats  || { wins: 0, losses: 0, draws: 0 };
  const tier  = getEloTier(elo);

  // ELO display
  const eloEl = document.getElementById('ranked-elo-display');
  if (eloEl) {
    eloEl.textContent = elo;
    eloEl.style.color = tier.color;
    eloEl.style.textShadow = `0 0 25px ${tier.color}88`;
  }
  const tierEl = document.getElementById('ranked-tier-label');
  if (tierEl) {
    tierEl.textContent = tier.name;
    tierEl.style.color = tier.color;
  }

  // Rank Badge
  const badgeImgEl = document.getElementById('ranked-badge-img');
  if (badgeImgEl) badgeImgEl.textContent = tier.icon;

  // Rank Progress Calculation
  const nextTierInfo = _calculateNextTierInfo(elo);
  const progressFillEl = document.getElementById('ranked-progress-fill');
  if (progressFillEl) {
    progressFillEl.style.width = nextTierInfo.progress + '%';
    progressFillEl.style.background = `linear-gradient(90deg, ${tier.color}, #3b8bff)`;
  }
  const nextTierLabelEl = document.getElementById('ranked-next-tier-label');
  if (nextTierLabelEl) nextTierLabelEl.textContent = nextTierInfo.label;
  const nextTierEloEl = document.getElementById('ranked-next-tier-elo');
  if (nextTierEloEl) nextTierEloEl.textContent = nextTierInfo.eloGoal + ' ELO';

  // Stats
  const wEl = document.getElementById('ranked-wins');   if (wEl) wEl.textContent = stats.wins;
  const lEl = document.getElementById('ranked-losses'); if (lEl) lEl.textContent = stats.losses;
  const dEl = document.getElementById('ranked-draws');  if (dEl) dEl.textContent = stats.draws;

  const total = stats.wins + stats.losses;
  const wrEl  = document.getElementById('ranked-winrate');
  if (wrEl) wrEl.textContent = total > 0 ? Math.round((stats.wins / total) * 100) + '%' : '—';

  // Season timer
  const now  = new Date();
  const end  = getSeasonEndDate();
  const diff = end - now;
  let timerText = '';
  if (diff <= 0) {
    timerText = 'La temporada ha finalizado.';
  } else {
    const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    timerText = `Termina en ${days}d ${hours}h`;
  }
  _updateRankedFields('.ranked-data-season-timer', timerText);

  renderPassiveTeamPreview();
  _renderRankedRulesCard();

  loadRankedRules().then(() => {
    _renderRankedRulesCard();
    _renderPassiveEditorRulesHint();
  }).catch(() => {});

  _renderRankedRewardsCard();
  _renderSeasonFinalRewardsCard();
  _renderRankedLeaderboardRows();
  _renderRankedLeaderboardStatus(false);
  initGlobalRankedLeaderboardWatcher();
  refreshGlobalRankedLeaderboard(false).catch(() => {});

  // Si hay una búsqueda activa, restaurar el estado visual
  if (window.isRankedSearching) {
    _showSearchingUI(true);
  }

  // --- SEASON GATING UI ---
  const rules = getCurrentRankedRules();
  const nowTs = Date.now();
  const range = getRankedSeasonDateRange(rules);
  const isSeasonActive = nowTs >= range.startDate.getTime() && nowTs <= range.endDate.getTime();
  const btnSearch = document.getElementById('btn-ranked-search');
  
  if (btnSearch) {
    if (!isSeasonActive) {
      btnSearch.disabled = true;
      btnSearch.style.opacity = '0.6';
      btnSearch.style.cursor = 'not-allowed';
      btnSearch.style.filter = 'grayscale(1)';
      btnSearch.innerHTML = '🚫 TEMPORADA INACTIVA';
    } else {
      btnSearch.disabled = false;
      btnSearch.style.opacity = '1';
      btnSearch.style.cursor = 'pointer';
      btnSearch.style.filter = 'none';
      btnSearch.innerHTML = '🔍 BUSCAR PARTIDA';
    }
  }
}

// ── Helper para obtener Pokémon válidos por UID ───────────────────────
function getPokemonByUid(uid) {
  if (!uid) return null;
  const inTeam = (state.team || []).find(p => p.uid === uid);
  if (inTeam) return inTeam;
  const inBox = (state.box || []).find(p => p.uid === uid);
  return inBox || null;
}

// ── Preview de equipo pasivo ──────────────────────────────────────────
function _updateRankedFields(selector, content, isHtml = false, color = null) {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    if (isHtml) el.innerHTML = content;
    else el.textContent = content;
    if (color) el.style.color = color;
  });
}

function _renderRankedRulesCard() {
  const rules = getCurrentRankedRules();
  
  // Season Name
  _updateRankedFields('.ranked-data-season-name', rules.seasonName);

  // Season Dates
  const range = getRankedSeasonDateRange(rules);
  const datesText = `Inicio: ${_formatSeasonDate(range.startDate)} • Fin: ${_formatSeasonDate(range.endDate)}`;
  _updateRankedFields('.ranked-data-season-dates', datesText);

  // Summary
  _updateRankedFields('.ranked-data-rules-summary', `Máximo ${rules.maxPokemon} Pokémon • Nivel máximo ${rules.levelCap}`);

  // Allowed Types
  let typesHtml = '';
  if (!rules.allowedTypes.length) {
    typesHtml = '<span style="font-size:11px;color:var(--gray);">Sin restricción de tipos.</span>';
  } else {
    typesHtml = rules.allowedTypes.map((type) => {
      const meta = RANKED_TYPE_META[type] || { label: type, icon: '?' };
      return `<span style="font-size:10px;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);">${meta.icon} ${meta.label}</span>`;
    }).join('');
  }
  _updateRankedFields('.ranked-data-rules-types', typesHtml, true);

  // Banned Pokemon
  let bansHtml = '';
  if (!rules.bannedPokemonIds.length) {
    bansHtml = '<span style="font-size:11px;color:var(--gray);">Sin baneos.</span>';
  } else {
    bansHtml = rules.bannedPokemonIds.map((id) => {
      const pokemon = POKEMON_DB?.[id] || null;
      const label = pokemon?.name || id;
      const spriteKey = typeof pokemon?.id === 'string' ? pokemon.id : id;
      const spriteFromKey = typeof getSpriteUrl === 'function' ? getSpriteUrl(spriteKey, false) : null;
      const spriteDex = pokemon?.dexNum || window.POKEMON_SPRITE_IDS?.[spriteKey] || null;
      const spriteUrl = spriteFromKey || (spriteDex ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteDex}.png` : null);
      const spriteHtml = spriteUrl
        ? `<img src="${spriteUrl}" alt="${label}" style="width:16px;height:16px;image-rendering:pixelated;" onerror="this.style.display='none'">`
        : '';
      return `<span style="font-size:10px;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,59,59,0.35);background:rgba(255,59,59,0.14);color:#fecaca;display:inline-flex;align-items:center;gap:6px;">${spriteHtml}<span>${label}</span></span>`;
    }).join('');
  }
  _updateRankedFields('.ranked-data-rules-bans', bansHtml, true);

  // Passive Team Status
  const rankedTeam = getRankedPlayableTeam();
  const passiveCheck = validateTeamForRanked(rankedTeam, rules, 'equipo ranked');
  const statusElContent = passiveCheck.ok ? 'OK Equipo ranked: cumple reglas.' : `Error equipo ranked: ${passiveCheck.reason}`;
  const statusColor = passiveCheck.ok ? 'var(--green)' : 'var(--red)';
  _updateRankedFields('.ranked-data-rules-passive-team-status', statusElContent, false, statusColor);
}

function _renderPassiveEditorRulesHint() {
  const el = document.getElementById('passive-editor-rules-hint');
  if (!el) return;

  const rules = getCurrentRankedRules();
  const typeText = rules.allowedTypes.length ? rules.allowedTypes.map(t => (RANKED_TYPE_META[t]?.label || t)).join(', ') : 'Todos los tipos';

  el.textContent = `Reglas de temporada: maximo ${rules.maxPokemon} Pokemon, nivel maximo ${rules.levelCap}, tipos permitidos: ${typeText}.`;
}

function getRankedPlayableTeam() {
  const uids = Array.isArray(state.passiveTeamUids) ? state.passiveTeamUids : [];
  const picked = [];
  const seen = new Set();
  for (const uid of uids) {
    if (!uid || seen.has(uid)) continue;
    const p = getPokemonByUid(uid);
    if (!p || p.hp <= 0 || p.onMission) continue;
    seen.add(uid);
    picked.push(p);
  }
  return picked;
}
function renderPassiveTeamPreview() {
  const el = document.getElementById('ranked-passive-team-preview');
  if (!el) return;
  
  const uids = state.passiveTeamUids || [];
  if (!uids.length) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;width:100%;padding:10px;border:1px dashed rgba(255,255,255,0.2);border-radius:12px;">
        <span style="font-size:11px;color:rgba(255,255,255,0.3);">No configurado</span>
      </div>`;
    return;
  }
  
  let validCount = 0;
  validCount = uids.reduce((acc, uid) => acc + (getPokemonByUid(uid) ? 1 : 0), 0);
  
  const isActive = state.passiveTeamActive !== false; // Default true if not explicitly set to false? No, better explicit.
  const isSetupValid = validCount === uids.length;
  const isValid = isActive && isSetupValid;

  const borderColor = isValid ? 'var(--green)' : 'var(--red)';
  const glow = isValid ? 'rgba(107,203,119,0.3)' : 'rgba(255,59,59,0.3)';
  
  let label = '';
  if (!isActive) {
    label = '🔴 EQUIPO DESACTIVADO';
  } else if (!isSetupValid) {
    label = '❌ EQUIPO NO PREPARADO (Pokémon faltante)';
  } else {
    label = '✅ EQUIPO PREPARADO';
  }

  let htmlSprites = '';
  uids.forEach(uid => {
    const p = getPokemonByUid(uid);
    if (!p) {
      // Empty/Missing slot box
      htmlSprites += `<div style="width:40px;height:40px;border:1px dashed var(--red);border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,59,59,0.1);"><span style="color:var(--red);font-size:10px;">?</span></div>`;
      return;
    }
    const num = p.dexNum || p.id || '';
    const itemName = p.heldItem || null;
    let itemHtml = '';
    
    // Add item miniature logic if exists
    if (itemName && typeof ITEM_DATA !== 'undefined' && ITEM_DATA[itemName]) {
       if (ITEM_DATA[itemName].sprite) {
         itemHtml = `<img src="${ITEM_DATA[itemName].sprite}" style="position:absolute;bottom:-4px;right:-4px;width:16px;height:16px;image-rendering:pixelated;filter:drop-shadow(0 0 2px #000);">`;
       } else if (ITEM_DATA[itemName].icon) {
         itemHtml = `<span style="position:absolute;bottom:-4px;right:-4px;font-size:12px;filter:drop-shadow(0 0 2px #000);">${ITEM_DATA[itemName].icon}</span>`;
       }
    }

    const spriteUrl = typeof getSpriteUrl === 'function' ? getSpriteUrl(p.id, p.isShiny) : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png`;

    htmlSprites += `<div style="position:relative;width:40px;height:40px;background:rgba(255,255,255,0.05);border-radius:8px;display:flex;align-items:center;justify-content:center;border:1px solid ${isValid ? 'rgba(107,203,119,0.4)': 'rgba(255,59,59,0.4)'};">
      <img src="${spriteUrl}" style="width:100%;height:100%;image-rendering:pixelated;" title="${p.name}" onerror="this.style.display='none'">
      ${itemHtml}
    </div>`;
  });

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;width:100%;gap:10px;padding:12px;border:2px solid ${borderColor};border-radius:14px;box-shadow:0 0 15px ${glow};background:rgba(0,0,0,0.4);">
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;min-height:40px;">
        ${htmlSprites}
      </div>
      <div style="text-align:center;font-family:'Press Start 2P',monospace;font-size:7px;color:${borderColor};">
        ${label}
      </div>
    </div>
  `;
}

// ── Guardar equipo pasivo ─────────────────────────────────────────────
async function savePassiveTeam(active = true) {
  if (!currentUser) { notify('Debés estar logueado', '⚠️'); return; }
  
  const uids = state.passiveTeamUids || [];
  if (active && (!uids || !uids.length)) {
    notify('Tenés que armar tu equipo pasivo (Editar) antes de activarlo.', '⚠️'); 
    return;
  }
  
  if (!active) {
    // Apagar directamente
    const { error } = await sb.from('passive_teams').upsert({
      user_id: currentUser.id, team_data: [], elo_rating: state.eloRating || 1000, is_active: false, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) { notify('Error desactivando', '❌'); return; }
    
    state.passiveTeamActive = false;
    renderPassiveTeamPreview();
    _renderRankedRulesCard();
    notify('Equipo pasivo desactivado', '🔴');
    return;
  }

  // Active is True, validate against current ranked rules
  const rules = await loadRankedRules();
  const teamObjs = uids.map(uid => getPokemonByUid(uid));
  if (teamObjs.some(p => !p)) {
    notify('Tu equipo contiene Pokemon que ya no existen. Editalo primero.', '\u26A0\uFE0F');
    return;
  }

  const fullValidation = validateTeamForRanked(teamObjs, rules, 'equipo ranked');
  if (!fullValidation.ok) {
    notify(fullValidation.reason, '\u26A0\uFE0F');
    return;
  }

  const eligibleTeam = teamObjs.filter(p => p.hp > 0 && !p.onMission);
  if (!eligibleTeam.length) {
    notify('Tus Pokemon designados no tienen HP.', '\u26A0\uFE0F');
    return;
  }

  const liveValidation = validateTeamForRanked(eligibleTeam, rules, 'equipo ranked');
  if (!liveValidation.ok) {
    notify(liveValidation.reason, '\u26A0\uFE0F');
    return;
  }

  const snapshot  = eligibleTeam.map(buildPassiveSnapshot);
  const eloRating = state.eloRating || 1000;

  const { error } = await sb.from('passive_teams').upsert({
    user_id:    currentUser.id,
    team_data:  snapshot,
    elo_rating: eloRating,
    is_active:  active,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  if (error) { notify('Error guardando equipo: ' + error.message, '❌'); return; }
  state.passiveTeamActive = active;
  renderPassiveTeamPreview();
  _renderRankedRulesCard();
  notify(`Equipo pasivo ${active ? 'activado' : 'desactivado'} ✓`, '🤖');
}

// ── Editor Visual de Equipo (Rankeds Modal) ───────────────────────────
let _tempEditingUids = [];
let _passiveEditorSelectedUid = null;

function openPassiveTeamEditor() {
  const modal = document.getElementById('passive-team-editor-modal');
  if (!modal) return;
  _tempEditingUids = [...(state.passiveTeamUids || [])];
  _passiveEditorSelectedUid = null;

  // Limpiar slots con UIDs invalidos
  _tempEditingUids = _tempEditingUids.filter(uid => getPokemonByUid(uid) !== null);
  const slotCap = Math.max(1, Math.min(6, Number(getCurrentRankedRules().maxPokemon) || 6));
  _tempEditingUids = _tempEditingUids.slice(0, slotCap);

  modal.style.display = 'flex';
  _renderPassiveEditorRulesHint();
  _renderPassiveEditor();
}
function closePassiveTeamEditor() {
  document.getElementById('passive-team-editor-modal').style.display = 'none';
}

function _renderPassiveEditor() {
  const slotsEl   = document.getElementById('passive-editor-slots');
  const poolEl    = document.getElementById('passive-editor-pool');
  const previewEl = document.getElementById('passive-editor-preview');
  if (!slotsEl || !poolEl || !previewEl) return;
  
  const rules = getCurrentRankedRules();
  const slotCap = Math.max(1, Math.min(6, Number(rules.maxPokemon) || 6));

  // Render de slots segun reglas
  let htmlSlots = '';
  for (let i = 0; i < slotCap; i++) {
    const uid = _tempEditingUids[i];
    const p = uid ? getPokemonByUid(uid) : null;
    
    let spriteUrl = '';
    if (p) {
        spriteUrl = typeof getSpriteUrl === 'function' ? getSpriteUrl(p.id, p.isShiny) : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.dexNum||p.id}.png`;
    }

    htmlSlots += `
      <div onclick="if(typeof _selectPassiveEditorItem==='function')_selectPassiveEditorItem('${uid}')"
      style="width:50px;height:50px;border:2px dashed ${p ? 'var(--purple)' : 'rgba(255,255,255,0.2)'};border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);cursor:pointer;position:relative;">
        ${p ? `<img src="${spriteUrl}" style="width:100%;height:100%;image-rendering:pixelated;" onerror="this.style.display='none'">` : '<span style="color:#666;font-size:16px;">+</span>'}
        ${p && _tempEditingUids.includes(uid) ? `<div style="position:absolute;bottom:-4px;right:-4px;background:var(--green);border-radius:50%;width:12px;height:12px;display:flex;align-items:center;justify-content:center;"><span style="color:#000;font-size:8px;">✓</span></div>` : ''}
      </div>
    `;
  }
  slotsEl.innerHTML = htmlSlots;

  // Render Preview Panel
  if (_passiveEditorSelectedUid) {
    const sp = getPokemonByUid(_passiveEditorSelectedUid);
    if (sp) {
      previewEl.style.display = 'flex';
      const isEquipped = _tempEditingUids.includes(sp.uid);
      const itemName = sp.heldItem || 'Ninguno';
      let itemImg = '';
      if (itemName !== 'Ninguno' && typeof ITEM_DATA !== 'undefined' && ITEM_DATA[itemName]) {
        if (ITEM_DATA[itemName].sprite) {
           itemImg = `<img src="${ITEM_DATA[itemName].sprite}" style="width:16px;height:16px;image-rendering:pixelated;margin-right:4px;">`;
        } else if (ITEM_DATA[itemName].icon) {
           itemImg = `<span style="font-size:14px;margin-right:2px;">${ITEM_DATA[itemName].icon}</span>`;
        }
      }
      
      const spSpriteUrl = typeof getSpriteUrl === 'function' ? getSpriteUrl(sp.id, sp.isShiny) : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${sp.dexNum||sp.id}.png`;

      previewEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:16px;width:100%;">
          <div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:8px;">
            <img src="${spSpriteUrl}" style="width:60px;height:60px;image-rendering:pixelated;" onerror="this.style.display='none'">
          </div>
          <div style="flex:1;">
            <div style="font-family:'Press Start 2P',monospace;font-size:12px;color:var(--yellow);margin-bottom:6px;">${sp.name} <span style="font-size:9px;color:var(--gray);">Lv${sp.level}</span></div>
            <div style="font-size:10px;color:rgba(255,255,255,0.8);margin-bottom:4px;display:flex;align-items:center;">
              <span style="font-weight:bold;margin-right:6px;">Objeto:</span> ${itemImg} ${itemName}
            </div>
            <div style="font-size:10px;color:rgba(255,255,255,0.8);margin-bottom:4px;">
              <span style="font-weight:bold;">Hab:</span> ${sp.ability || 'Genérica'} | <span style="font-weight:bold;">Nat:</span> ${sp.nature || 'Seria'}
            </div>
          </div>
        </div>
        <button onclick="_togglePassiveEditorSelection()" style="margin-top:12px;width:100%;font-family:'Press Start 2P',monospace;font-size:9px;padding:12px;border:none;border-radius:8px;cursor:pointer;
          background:${isEquipped ? 'var(--red)' : 'var(--green)'};color:${isEquipped ? '#fff' : '#000'};">
          ${isEquipped ? 'Quitar del Equipo' : 'Asignar al Equipo'}
        </button>
      `;
    } else {
      previewEl.style.display = 'none';
    }
  } else {
    previewEl.style.display = 'none';
  }
  
  // Render Pool (Equipo + Caja combinados)
  const allAvailable = [...(state.team || []), ...(state.box || [])].filter(p => !p.onMission);
  let htmlPool = '';
  
  allAvailable.forEach(p => {
    const isSelected = _tempEditingUids.includes(p.uid);
    const isPreviewing = _passiveEditorSelectedUid === p.uid;
    const poolSpriteUrl = typeof getSpriteUrl === 'function' ? getSpriteUrl(p.id, p.isShiny) : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.dexNum||p.id}.png`;
    const tierInfo = (typeof getPokemonTier === 'function') ? getPokemonTier(p) : { tier: '?', color: '#aaa', bg: 'rgba(255,255,255,0.1)' };
    const tags = Array.isArray(p.tags) ? p.tags : [];

    let heldItemHtml = '';
    if (p.heldItem && typeof ITEM_DATA !== 'undefined' && ITEM_DATA[p.heldItem]) {
       if (ITEM_DATA[p.heldItem].sprite) {
         heldItemHtml = `<img src="${ITEM_DATA[p.heldItem].sprite}" style="position:absolute;top:2px;right:2px;width:12px;height:12px;image-rendering:pixelated;">`;
       } else if (ITEM_DATA[p.heldItem].icon) {
         heldItemHtml = `<span style="position:absolute;top:2px;right:2px;font-size:8px;">${ITEM_DATA[p.heldItem].icon}</span>`;
       }
    }

    const tagIconsHtml = tags.map(tag => {
      if (tag === 'fav') return '<span style="font-size:8px;line-height:1;">&#11088;</span>';
      if (tag === 'breed') return '<span style="font-size:8px;line-height:1;">&#10084;&#65039;</span>';
      if (tag === 'iv31') return '<span style="font-size:8px;line-height:1;font-family:monospace;">31</span>';
      return '';
    }).join('');

    const tagsBadgeHtml = tagIconsHtml
      ? `<div style="position:absolute;bottom:2px;left:2px;background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:1px 3px;display:flex;align-items:center;gap:3px;">${tagIconsHtml}</div>`
      : '';

    htmlPool += `
      <div onclick="if(typeof _selectPassiveEditorItem==='function')_selectPassiveEditorItem('${p.uid}')"
      style="border:1px solid ${isPreviewing ? 'var(--purple)' : (isSelected ? 'var(--green)' : 'rgba(255,255,255,0.1)')};border-radius:8px;padding:4px;display:flex;flex-direction:column;align-items:center;cursor:pointer;background:${isPreviewing ? 'rgba(199,125,255,0.2)' : (isSelected ? 'rgba(107,203,119,0.1)' : 'rgba(0,0,0,0.3)')};opacity:${!isPreviewing && isSelected ? '0.5' : '1'};position:relative;">
        <div style="position:absolute;top:2px;left:2px;background:${tierInfo.bg};color:${tierInfo.color};font-family:'Press Start 2P',monospace;font-size:6px;padding:1px 3px;border-radius:5px;border:1px solid ${tierInfo.color}55;line-height:1.2;">${tierInfo.tier}</div>
        <img src="${poolSpriteUrl}" style="width:40px;height:40px;image-rendering:pixelated;" onerror="this.style.display='none'">
        <div style="font-family:'Press Start 2P',monospace;font-size:6px;margin-top:2px;text-align:center;word-break:break-all;">Lv${p.level}</div>
        ${heldItemHtml}
        ${tagsBadgeHtml}
      </div>
    `;
  });
  
  poolEl.innerHTML = htmlPool;
}

function _selectPassiveEditorItem(uid) {
  if (uid === 'undefined' || !uid) return;
  _passiveEditorSelectedUid = uid;
  _renderPassiveEditor();
}

function _togglePassiveEditorSelection() {
  if (!_passiveEditorSelectedUid) return;

  if (_tempEditingUids.includes(_passiveEditorSelectedUid)) {
    _tempEditingUids = _tempEditingUids.filter(u => u !== _passiveEditorSelectedUid);
  } else {
    const rules = getCurrentRankedRules();
    const slotCap = Math.max(1, Math.min(6, Number(rules.maxPokemon) || 6));

    if (_tempEditingUids.length >= slotCap) {
      notify(`Tu equipo ya tiene el maximo permitido (${slotCap}).`, '\u26A0\uFE0F');
      return;
    }

    const selectedPokemon = getPokemonByUid(_passiveEditorSelectedUid);
    const check = validatePokemonForRanked(selectedPokemon, rules);
    if (!check.ok) {
      notify(check.reason, '\u26A0\uFE0F');
      return;
    }

    _tempEditingUids.push(_passiveEditorSelectedUid);
  }

  _renderPassiveEditor();
}

function confirmPassiveTeamEdit() {
  const candidateTeam = _tempEditingUids.map(uid => getPokemonByUid(uid)).filter(Boolean);
  const validation = validateTeamForRanked(candidateTeam, getCurrentRankedRules(), 'equipo ranked');
  if (!validation.ok) {
    notify(validation.reason, '\u26A0\uFE0F');
    return;
  }

  state.passiveTeamUids = [..._tempEditingUids];
  scheduleSave();
  closePassiveTeamEditor();
  renderPassiveTeamPreview();
  _renderRankedRulesCard();
  notify('Alineacion ranked guardada localmente.', 'OK');
}


// ── Buscar equipo pasivo para el fallback ─────────────────────────────
function _rankedEloDistance(a, b) {
  const aNum = Number(a);
  const bNum = Number(b);
  if (!Number.isFinite(aNum) || !Number.isFinite(bNum)) return Number.POSITIVE_INFINITY;
  return Math.abs(aNum - bNum);
}

function _pickClosestByElo(candidates, myElo, topPool = 5) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  const sorted = [...candidates].sort((x, y) => _rankedEloDistance(x?.elo_rating, myElo) - _rankedEloDistance(y?.elo_rating, myElo));
  const pool = sorted.slice(0, Math.max(1, Math.min(topPool, sorted.length)));
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

async function _tryFindPassiveOpponentQuery({ requireActive = true, useEloWindow = true, myElo = 1000, eloRange = 300 } = {}) {
  let query = sb.from('passive_teams')
    .select('user_id, team_data, elo_rating, is_active')
    .neq('user_id', currentUser.id);

  if (requireActive) query = query.eq('is_active', true);
  if (useEloWindow) {
    query = query
      .gte('elo_rating', myElo - eloRange)
      .lte('elo_rating', myElo + eloRange);
  }

  // Evita depender de columnas opcionales como updated_at.
  query = query.limit(80);

  const { data, error } = await query;
  if (error) return { data: null, error };
  return { data: Array.isArray(data) ? data : [], error: null };
}

async function findPassiveOpponent() {
  if (!currentUser || !sb) return null;
  const myElo = state.eloRating || 1000;

  const attempts = [
    { requireActive: true, useEloWindow: true, myElo, eloRange: 200 },
    { requireActive: true, useEloWindow: false, myElo, eloRange: 200 },
    { requireActive: false, useEloWindow: false, myElo, eloRange: 200 }
  ];

  for (const cfg of attempts) {
    let rows = [];
    try {
      const { data, error } = await _tryFindPassiveOpponentQuery(cfg);
      if (error) {
        console.warn('[Ranked] findPassiveOpponent query error:', error);
        continue;
      }
      rows = data || [];
    } catch (e) {
      console.warn('[Ranked] findPassiveOpponent query failed:', e);
      continue;
    }

    const valid = rows
      .filter(r => r && r.user_id && Array.isArray(r.team_data) && r.team_data.length > 0)
      .filter(r => isAllowedRankGap(myElo, r.elo_rating));
    if (!valid.length) continue;

    const chosen = valid[Math.floor(Math.random() * valid.length)] || null;
    if (chosen) return chosen;
  }

  return null;
}

// ── Estado de Matchmaking ─────────────────────────────────────────────
window.isRankedSearching = false;
let _matchmakingInterval = null;
let _matchmakingTimeout  = null;
let _matchmakingSeconds  = 60;
let _matchmakingQueueId  = null;   // Row en la tabla ranked_queue

async function _clearOwnRankedQueueRow() {
  if (!currentUser || !sb) return;
  try {
    await sb.from('ranked_queue').delete().eq('user_id', currentUser.id);
  } catch (e) {
    // noop: puede no existir la tabla en algunos entornos
  }
  _matchmakingQueueId = null;
}

async function _upsertRankedQueueEntry(myElo) {
  if (!currentUser || !sb) return null;

  const payloads = [
    { user_id: currentUser.id, elo_rating: myElo, status: 'searching', updated_at: new Date().toISOString() },
    { user_id: currentUser.id, elo_rating: myElo, status: 'searching' },
    { user_id: currentUser.id, elo_rating: myElo },
    { user_id: currentUser.id }
  ];

  for (const payload of payloads) {
    try {
      const upsertRes = await sb.from('ranked_queue').upsert(payload, { onConflict: 'user_id' }).select('id').single();
      if (!upsertRes.error) return upsertRes.data?.id || null;
    } catch (e) {}

    try {
      const insertRes = await sb.from('ranked_queue').insert(payload).select('id').single();
      if (!insertRes.error) return insertRes.data?.id || null;
    } catch (e) {}
  }

  return null;
}

async function _loadQueueCandidates(myElo) {
  if (!currentUser || !sb) return [];

  const queryBuilders = [
    () => sb.from('ranked_queue')
      .select('id, user_id, elo_rating, status')
      .eq('status', 'searching')
      .neq('user_id', currentUser.id)
      .gte('elo_rating', myElo - 300)
      .lte('elo_rating', myElo + 300)
      .order('created_at', { ascending: true })
      .limit(30),
    () => sb.from('ranked_queue')
      .select('id, user_id, elo_rating, status')
      .eq('status', 'searching')
      .neq('user_id', currentUser.id)
      .gte('elo_rating', myElo - 300)
      .lte('elo_rating', myElo + 300)
      .limit(30),
    () => sb.from('ranked_queue')
      .select('id, user_id, elo_rating, status')
      .neq('user_id', currentUser.id)
      .limit(40),
    () => sb.from('ranked_queue')
      .select('id, user_id, elo_rating')
      .neq('user_id', currentUser.id)
      .limit(40),
    () => sb.from('ranked_queue')
      .select('user_id')
      .neq('user_id', currentUser.id)
      .limit(40)
  ];

  for (const build of queryBuilders) {
    try {
      const { data, error } = await build();
      if (error) continue;
      if (Array.isArray(data) && data.length) return data;
    } catch (e) {
      // try next shape
    }
  }

  return [];
}

// ?? Entrada: Buscar Partida ???????????????????????????????????????????
async function startRankedMatchmaking() {
  if (!currentUser) { notify('Debes estar logueado', '⚠️'); return; }
  if (_matchmakingInterval) return; // Ya buscando

  // Gating de Temporada
  const rules = await loadRankedRules();
  const now = Date.now();
  const range = getRankedSeasonDateRange(rules);

  if (now < range.startDate.getTime()) {
    notify(`La temporada todavía no comienza. Inicia el ${_formatSeasonDate(range.startDate)}.`, '⏳');
    return;
  }
  if (now > range.endDate.getTime()) {
    notify('La temporada ha finalizado. Espera a que se programe la próxima.', '🛑');
    return;
  }

  window.isRankedSearching = true;

  const myTeam = getRankedPlayableTeam();
  if (!myTeam.length) {
    notify('Configura tu equipo ranked antes de buscar partida.', '⚠️');
    window.isRankedSearching = false;
    return;
  }

  const gate = await ensureRankedTeamEligibility(myTeam, 'equipo ranked', true);
  if (!gate.ok) {
    window.isRankedSearching = false;
    return;
  }

  const myElo = state.eloRating || 1000;
  _matchmakingQueueId = await _upsertRankedQueueEntry(myElo);

  _matchmakingSeconds = 60;
  _showSearchingUI(true);

  // Countdown visual cada segundo
  _matchmakingInterval = setInterval(() => {
    _matchmakingSeconds--;
    const timerEl = document.getElementById('ranked-search-timer');
    if (timerEl) {
      timerEl.textContent = _matchmakingSeconds;
      timerEl.style.color = _matchmakingSeconds <= 10 ? 'var(--red)' : 'var(--purple)';
    }

    // Cada 5 segundos, buscar un oponente humano en la cola
    if (_matchmakingSeconds % 5 === 0) {
      _checkForHumanOpponent();
    }

    if (_matchmakingSeconds <= 0) {
      _matchmakingFallbackToPassive();
    }
  }, 1000);
}

async function _checkForHumanOpponent() {
  if (!currentUser || !_matchmakingInterval) return;
  const myElo = state.eloRating || 1000;

  try {
    const rows = await _loadQueueCandidates(myElo);
    if (!rows.length) return;

    const candidates = rows
      .filter(r => r && r.user_id && r.user_id !== currentUser.id)
      .filter(r => !r.status || r.status === 'searching')
      .filter(r => isAllowedRankGap(myElo, r.elo_rating));
    if (!candidates.length) return;

    const opponent = _pickClosestByElo(candidates, myElo, 4) || candidates[0];
    if (!opponent?.user_id) return;

    // Best effort: marcar matched si la columna existe
    if (opponent.id) {
      try {
        await sb.from('ranked_queue')
          .update({ status: 'matched' })
          .eq('id', opponent.id)
          .eq('status', 'searching');
      } catch (e) {}
    }
    if (_matchmakingQueueId) {
      try {
        await sb.from('ranked_queue')
          .update({ status: 'matched' })
          .eq('id', _matchmakingQueueId);
      } catch (e) {}
    }

    // Crear invitacion primero. Si falla, seguimos buscando en vez de cortar el matchmaking.
    let inviteRow = null;
    try {
      const { data, error } = await sb.from('battle_invites').insert({
        challenger_id: currentUser.id,
        opponent_id: opponent.user_id,
        status: 'ranked_match',
      }).select('*').single();
      if (error || !data?.id) {
        console.warn('[Ranked] No se pudo crear battle_invite ranked_match:', error);
        return;
      }
      inviteRow = data;
    } catch (e) {
      console.warn('[Ranked] Error creando battle_invite ranked_match:', e);
      return;
    }

    // Recien aca detenemos el countdown visual.
    _matchmakingStop();
    notify('Rival encontrado. Iniciando batalla...', '⚔️');

    const inviteId = inviteRow.id;
    let checks = 0;
    const waitInterval = setInterval(async () => {
      checks++;
      let currentInv = null;
      try {
        const { data } = await sb.from('battle_invites').select('status').eq('id', inviteId).single();
        currentInv = data;
      } catch (e) {}

      if (currentInv?.status === 'ranked_accepted') {
        clearInterval(waitInterval);
        await _clearOwnRankedQueueRow();
        if (typeof startPvpBattle === 'function') startPvpBattle(inviteRow, true, true);
        return;
      }

      if (!currentInv || currentInv.status === 'declined' || checks > 10) {
        clearInterval(waitInterval);
        try { await sb.from('ranked_queue').delete().eq('user_id', opponent.user_id); } catch (e) {}
        notify('El rival no respondio. Buscando equipo pasivo...', '⚠️');
        _matchmakingFallbackToPassive();
      }
    }, 800);
  } catch (e) {
    // Si falla cola humana, dejamos que siga el countdown y termine en fallback pasivo.
    console.warn('[Ranked] _checkForHumanOpponent fallo:', e);
  }
}

// ?? Fallback: luchar contra equipo pasivo ?????????????????????????????
async function _matchmakingFallbackToPassive() {
  _matchmakingStop();
  notify('No se encontro rival. Buscando un equipo pasivo...', '⚠️');

  const opponent = await findPassiveOpponent();
  if (!opponent) {
    notify('No hay equipos pasivos disponibles ahora. Intenta mas tarde.', '⚠️');
    return;
  }

  const { data: oppProfile } = await sb.from('profiles').
    select('username').eq('id', opponent.user_id).single();
  const oppName = oppProfile?.username || 'Entrenador';

  const enemyTeam = (opponent.team_data || []).map(snap => ({
    ...snap,
    hp: snap.maxHp || snap.hp || 1,
    status: null,
    sleepTurns: 0,
  }));

  if (!enemyTeam.length) {
    notify('El rival pasivo no tiene equipo valido. Reintenta.', '⚠️');
    return;
  }

  const myTeam = getRankedPlayableTeam();
  if (!myTeam.length) {
    notify('Tu equipo ranked no tiene Pokemon disponibles.', '⚠️');
    return;
  }

  const gate = validateTeamForRanked(myTeam, getCurrentRankedRules(), 'equipo ranked');
  if (!gate.ok) {
    notify(gate.reason, '⚠️');
    return;
  }

  notify('Desafiando al equipo de ' + oppName + ' (ELO: ' + (opponent.elo_rating || 1000) + ')', '⚔️');

  state._passiveBattleOpponentId = opponent.user_id;
  state._passiveBattleOpponentName = oppName;

  await _clearOwnRankedQueueRow();

  if (typeof startPassiveBattleMode === 'function') {
    startPassiveBattleMode(myTeam, enemyTeam, oppName, opponent.user_id);
  }
}

async function cancelRankedMatchmaking(silent = false) {
  _matchmakingStop();
  await _clearOwnRankedQueueRow();
  if (!silent) notify('Busqueda cancelada', '✖️');
}

function _matchmakingStop() {
  window.isRankedSearching = false;
  if (_matchmakingInterval) { clearInterval(_matchmakingInterval); _matchmakingInterval = null; }
  if (_matchmakingTimeout)  { clearTimeout(_matchmakingTimeout);   _matchmakingTimeout  = null; }
  _showSearchingUI(false);
}

function _showSearchingUI(searching) {
  const btn    = document.getElementById('btn-ranked-search');
  const status = document.getElementById('ranked-search-status');
  if (btn) {
    btn.style.display = searching ? 'none' : 'block';
  }
  if (status) {
    status.style.display = searching ? 'block' : 'none';
  }
}

// ── Reportar resultado de batalla (pasiva o PvP activo) ───────────────
async function reportPassiveBattleResult(opponentId, result) {
  // Este resultado fue generado por una batalla local (ranked activa o ataque a equipo pasivo).
  // Evita que el watcher lo confunda con una defensa pasiva entrante.
  _markLocalRankedResult();
  const { data, error } = await sb.rpc('fn_report_passive_battle', {
    p_defender_id: opponentId,
    p_result:      result
  });
  if (error) {
    console.error('[PvP] Error reportando resultado:', error);
    notify('Error guardando resultado de batalla.', '⚠️');
    return;
  }
  const delta = data?.delta || 0;
  state.eloRating = data?.attacker_elo || state.eloRating;
  state.pvpStats  = state.pvpStats || { wins: 0, losses: 0, draws: 0 };
  if (result === 'win')  state.pvpStats.wins++;
  if (result === 'loss') state.pvpStats.losses++;
  if (result === 'draw') state.pvpStats.draws++;

  const maxEloChanged = _ensureRankedRewardProgress();
  if (maxEloChanged && typeof scheduleSave === 'function') scheduleSave();

  const tab = document.getElementById('tab-ranked');
  if (tab && tab.style.display !== 'none') renderRankedTab();

  const sign = delta >= 0 ? '+' : '';
  notify(`Resultado registrado. ELO: ${sign}${delta} → ${state.eloRating}`, '📊');
  refreshGlobalRankedLeaderboard(true).catch(() => {});
}

// ── Limpieza automática al cerrar pestaña (Antigosting) ───────────────
window.loadRankedRules = loadRankedRules;
window.getCurrentRankedRules = getCurrentRankedRules;
window.getRankedPlayableTeam = getRankedPlayableTeam;
window.normalizeRankedRules = normalizeRankedRules;
window.validatePokemonForRanked = validatePokemonForRanked;
window.validateTeamForRanked = validateTeamForRanked;
window.ensureRankedTeamEligibility = ensureRankedTeamEligibility;
window.refreshGlobalRankedLeaderboard = refreshGlobalRankedLeaderboard;
window.addEventListener('beforeunload', () => {
    if (window.isRankedSearching) {
        cancelRankedMatchmaking(true);
    }
    if (_rankedLeaderboardRefreshTimer) {
        clearInterval(_rankedLeaderboardRefreshTimer);
        _rankedLeaderboardRefreshTimer = null;
    }
});
function _calculateNextTierInfo(elo) {
  const milestones = [
    { name: 'Plata',    elo: 1200, icon: '🥈' },
    { name: 'Oro',      elo: 1600, icon: '🥇' },
    { name: 'Platino',  elo: 2100, icon: '💠' },
    { name: 'Diamante', elo: 2700, icon: '💎' },
    { name: 'Maestro',  elo: 3400, icon: '👑' }
  ];

  const currentTier = getEloTier(elo);
  const next = milestones.find(m => m.elo > elo);

  if (!next) {
    return { progress: 100, label: 'Rango Máximo', eloGoal: elo };
  }

  // Find the base ELO of the current tier to calculate percentage
  // Bronze starts at 0 (or 1000 in this game's context, but let's use the actual step)
  let baseElo = 0;
  if (elo >= 2700) baseElo = 2700;
  else if (elo >= 2100) baseElo = 2100;
  else if (elo >= 1600) baseElo = 1600;
  else if (elo >= 1200) baseElo = 1200;
  else if (elo >= 1000) baseElo = 1000;
  else baseElo = 0;

  const totalRange = next.elo - baseElo;
  const currentDiff = elo - baseElo;
  const progress = Math.max(0, Math.min(100, (currentDiff / totalRange) * 100));

  return {
    progress: progress,
    label: `Siguiente: ${next.name}`,
    eloGoal: next.elo
  };
}
