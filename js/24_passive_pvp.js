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
  if (elo >= 2000) return { name: 'Maestro',  icon: '👑', color: '#FFD700' };
  if (elo >= 1600) return { name: 'Diamante', icon: '💎', color: '#89CFF0' };
  if (elo >= 1300) return { name: 'Platino',  icon: '🔶', color: '#E5C100' };
  if (elo >= 1100) return { name: 'Oro',      icon: '🥇', color: '#FFB800' };
  if (elo >= 900)  return { name: 'Plata',    icon: '🥈', color: '#9E9E9E' };
  return                   { name: 'Bronce',  icon: '🥉', color: '#c8a060' };
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
  const { data } = await sb.from('profiles')
    .select('elo_rating, pvp_wins, pvp_losses, pvp_draws')
    .eq('id', currentUser.id)
    .single();
  if (data) {
    state.eloRating   = data.elo_rating  || 1000;
    state.pvpStats    = {
      wins:   data.pvp_wins   || 0,
      losses: data.pvp_losses || 0,
      draws:  data.pvp_draws  || 0
    };
  }
  
  // También cargar el estado de activación del equipo pasivo
  const { data: passiveData } = await sb.from('passive_teams')
    .select('is_active')
    .eq('user_id', currentUser.id)
    .single();
  
  if (passiveData) {
    state.passiveTeamActive = passiveData.is_active;
  } else {
    state.passiveTeamActive = false;
  }
}

// ── Watcher de ELO en segundo plano ──────────────────────────────────
let _eloWatcherInterval = null;

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
function renderRankedTab() {
  const elo   = state.eloRating || 1000;
  const stats = state.pvpStats  || { wins: 0, losses: 0, draws: 0 };
  const tier  = getEloTier(elo);

  // ELO display
  const eloEl = document.getElementById('ranked-elo-display');
  if (eloEl) {
    eloEl.textContent = elo;
    eloEl.style.color = tier.color;
    eloEl.style.textShadow = `0 0 20px ${tier.color}88`;
  }
  const tierEl = document.getElementById('ranked-tier-label');
  if (tierEl) tierEl.textContent = tier.icon + ' ' + tier.name;

  // Stats
  const wEl = document.getElementById('ranked-wins');   if (wEl) wEl.textContent = stats.wins;
  const lEl = document.getElementById('ranked-losses'); if (lEl) lEl.textContent = stats.losses;
  const dEl = document.getElementById('ranked-draws');  if (dEl) dEl.textContent = stats.draws;

  const total = stats.wins + stats.losses;
  const wrEl  = document.getElementById('ranked-winrate');
  if (wrEl) wrEl.textContent = total > 0 ? Math.round((stats.wins / total) * 100) + '%' : '—';

  // Season timer
  const timerEl = document.getElementById('ranked-season-timer');
  if (timerEl) {
    const now  = new Date();
    const end  = getSeasonEndDate();
    const diff = end - now;
    if (diff <= 0) {
      timerEl.textContent = 'La temporada ha finalizado.';
    } else {
      const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      timerEl.textContent = `Termina en ${days}d ${hours}h`;
    }
  }

  renderPassiveTeamPreview();
  _renderRankedRulesCard();

  loadRankedRules().then(() => {
    _renderRankedRulesCard();
    _renderPassiveEditorRulesHint();
  }).catch(() => {});

  // Si hay una búsqueda activa, restaurar el estado visual
  if (_matchmakingInterval) {
    _showSearchingUI(true);
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
function _renderRankedRulesCard() {
  const rules = getCurrentRankedRules();
  const seasonEl = document.getElementById('ranked-season-name');
  const seasonDatesEl = document.getElementById('ranked-season-dates');
  const summaryEl = document.getElementById('ranked-rules-summary');
  const typesEl = document.getElementById('ranked-rules-types');
  const bansEl = document.getElementById('ranked-rules-bans');
  const passiveStatusEl = document.getElementById('ranked-rules-passive-team-status');

  if (seasonEl) seasonEl.textContent = rules.seasonName;

  if (seasonDatesEl) {
    const range = getRankedSeasonDateRange(rules);
    seasonDatesEl.textContent = `Inicio: ${_formatSeasonDate(range.startDate)} • Fin: ${_formatSeasonDate(range.endDate)}`;
  }

  if (summaryEl) {
    summaryEl.textContent = `Máximo ${rules.maxPokemon} Pokémon • Nivel máximo ${rules.levelCap}`;
  }

  if (typesEl) {
    if (!rules.allowedTypes.length) {
      typesEl.innerHTML = '<span style="font-size:11px;color:var(--gray);">Sin restricción de tipos.</span>';
    } else {
      typesEl.innerHTML = rules.allowedTypes.map((type) => {
        const meta = RANKED_TYPE_META[type] || { label: type, icon: '?' };
        return `<span style="font-size:10px;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);">${meta.icon} ${meta.label}</span>`;
      }).join('');
    }
  }

  if (bansEl) {
    if (!rules.bannedPokemonIds.length) {
      bansEl.innerHTML = '<span style="font-size:11px;color:var(--gray);">Sin baneos.</span>';
    } else {
      bansEl.innerHTML = rules.bannedPokemonIds.map((id) => {
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
  }

  if (passiveStatusEl) {
    const rankedTeam = getRankedPlayableTeam();
    const passiveCheck = validateTeamForRanked(rankedTeam, rules, 'equipo ranked');
    passiveStatusEl.textContent = passiveCheck.ok ? 'OK Equipo ranked: cumple reglas.' : `Error equipo ranked: ${passiveCheck.reason}`;
    passiveStatusEl.style.color = passiveCheck.ok ? 'var(--green)' : 'var(--red)';
  }
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
    
    let heldItemHtml = '';
    if (p.heldItem && typeof ITEM_DATA !== 'undefined' && ITEM_DATA[p.heldItem]) {
       if (ITEM_DATA[p.heldItem].sprite) {
         heldItemHtml = `<img src="${ITEM_DATA[p.heldItem].sprite}" style="position:absolute;top:2px;right:2px;width:12px;height:12px;image-rendering:pixelated;">`;
       } else if (ITEM_DATA[p.heldItem].icon) {
         heldItemHtml = `<span style="position:absolute;top:2px;right:2px;font-size:8px;">${ITEM_DATA[p.heldItem].icon}</span>`;
       }
    }

    htmlPool += `
      <div onclick="if(typeof _selectPassiveEditorItem==='function')_selectPassiveEditorItem('${p.uid}')"
      style="border:1px solid ${isPreviewing ? 'var(--purple)' : (isSelected ? 'var(--green)' : 'rgba(255,255,255,0.1)')};border-radius:8px;padding:4px;display:flex;flex-direction:column;align-items:center;cursor:pointer;background:${isPreviewing ? 'rgba(199,125,255,0.2)' : (isSelected ? 'rgba(107,203,119,0.1)' : 'rgba(0,0,0,0.3)')};opacity:${!isPreviewing && isSelected ? '0.5' : '1'};position:relative;">
        <img src="${poolSpriteUrl}" style="width:40px;height:40px;image-rendering:pixelated;" onerror="this.style.display='none'">
        <div style="font-family:'Press Start 2P',monospace;font-size:6px;margin-top:2px;text-align:center;word-break:break-all;">Lv${p.level}</div>
        ${heldItemHtml}
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
async function findPassiveOpponent() {
  if (!currentUser) return null;
  const myElo = state.eloRating || 1000;
  const range  = 200;

  const { data, error } = await sb.from('passive_teams')
    .select('user_id, team_data, elo_rating')
    .eq('is_active', true)
    .neq('user_id', currentUser.id)
    .gte('elo_rating', myElo - range)
    .lte('elo_rating', myElo + range)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error || !data?.length) return null;
  return data[Math.floor(Math.random() * data.length)];
}

// ── Estado de Matchmaking ─────────────────────────────────────────────
window.isRankedSearching = false;
let _matchmakingInterval = null;
let _matchmakingTimeout  = null;
let _matchmakingSeconds  = 60;
let _matchmakingQueueId  = null;   // Row en la tabla ranked_queue

// ── Entrada: Buscar Partida ───────────────────────────────────────────
async function startRankedMatchmaking() {
  if (!currentUser) { notify('Debes estar logueado', '\u26A0\uFE0F'); return; }
  if (_matchmakingInterval) return; // Ya buscando

  window.isRankedSearching = true;

  const myTeam = getRankedPlayableTeam();
  if (!myTeam.length) {
    notify('Configura tu equipo ranked antes de buscar partida.', '\u26A0\uFE0F');
    window.isRankedSearching = false;
    return;
  }

  const gate = await ensureRankedTeamEligibility(myTeam, 'equipo ranked', true);
  if (!gate.ok) {
    window.isRankedSearching = false;
    return;
  }

  // Registrar en la cola de matchmaking (tabla ranked_queue en Supabase)
  // Si la tabla no existe aun, sigue igual pero el matchmaking funcionara solo por fallback
  const myElo = state.eloRating || 1000;
  try {
    const { data: qRow, error: qErr } = await sb.from('ranked_queue').insert({
      user_id: currentUser.id,
      elo_rating: myElo,
      status: 'searching',
    }).select('id').single();

    if (!qErr && qRow?.id) {
      _matchmakingQueueId = qRow.id;
    }
  } catch (e) {
    // La tabla puede no existir aun ? el fallback a pasivo funciona igual
    console.warn('[Matchmaking] ranked_queue no disponible, modo fallback activo.');
  }

  _matchmakingSeconds = 60;
  _showSearchingUI(true);

  // Countdown visual cada segundo
  _matchmakingInterval = setInterval(() => {
    _matchmakingSeconds--;
    const timerEl = document.getElementById('ranked-search-timer');
    if (timerEl) {
      timerEl.textContent = _matchmakingSeconds;
      // Cambiar color cuando queda poco tiempo
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
    const { data, error } = await sb.from('ranked_queue')
      .select('id, user_id, elo_rating')
      .eq('status', 'searching')
      .neq('user_id', currentUser.id)
      .gte('elo_rating', myElo - 300)
      .lte('elo_rating', myElo + 300)
      .order('created_at', { ascending: true })
      .limit(1);

    if (error || !data?.length) return;

    const opponent = data[0];
    // Intentar "tomar" ese slot atómicamente
    const { error: matchErr } = await sb.from('ranked_queue')
      .update({ status: 'matched' })
      .eq('id', opponent.id)
      .eq('status', 'searching'); // Solo actualizar si sigue buscando

    if (matchErr) return; // Otro jugador llegó primero

    // Marcar el nuestro también
    if (_matchmakingQueueId) {
      await sb.from('ranked_queue')
        .update({ status: 'matched' })
        .eq('id', _matchmakingQueueId);
    }

    // ¡Rival encontrado! Iniciar PvP normal vía invite
    _matchmakingStop();
    notify('¡Rival encontrado! Iniciando batalla...', '⚔️');
    
    // Crear invitación forzada de Ranked Match
    if (typeof sb !== 'undefined') {
      await sb.from('battle_invites').insert({
        challenger_id: currentUser.id,
        opponent_id: opponent.user_id,
        status: 'ranked_match',
      });
      // El jugador anfitrión espera confirmación (si el rival es un fantasma, devolverá declined o timeout)
      const { data: rows } = await sb.from('battle_invites')
        .select('*').eq('challenger_id', currentUser.id).eq('status', 'ranked_match')
        .order('created_at', { ascending: false }).limit(1);
        
      if (rows && rows.length > 0) {
        const inviteId = rows[0].id;
        let checks = 0;
        const waitInterval = setInterval(async () => {
          checks++;
          const { data: currentInv } = await sb.from('battle_invites').select('status').eq('id', inviteId).single();
          
          if (currentInv?.status === 'ranked_accepted') {
            clearInterval(waitInterval);
            if (typeof startPvpBattle === 'function') startPvpBattle(rows[0], true, true);
          } else if (!currentInv || currentInv.status === 'declined' || checks > 10) {
            // Fantasma detectado o TimeOut (8 segundos)
            clearInterval(waitInterval);
            // Purgar de la DB el fantasma del rival solo por si acaso
            try { await sb.from('ranked_queue').delete().eq('user_id', opponent.user_id); } catch(e){}
            notify('El rival no respondió. Buscando IA...', '⚠️');
            _matchmakingFallbackToPassive();
          }
        }, 800);
      }
    }
  } catch(e) {
    // La tabla puede no existir — ignorar silenciosamente
  }
}

// ── Fallback: luchar contra equipo pasivo ─────────────────────────────
async function _matchmakingFallbackToPassive() {
  _matchmakingStop();
  notify('No se encontro rival. Buscando un equipo pasivo...', '\u26A0\uFE0F');

  const opponent = await findPassiveOpponent();
  if (!opponent) {
    notify('No hay equipos pasivos disponibles ahora. Intenta mas tarde.', '\u26A0\uFE0F');
    return;
  }

  const { data: oppProfile } = await sb.from('profiles').
    select('username').eq('id', opponent.user_id).single();
  const oppName = oppProfile?.username || 'Entrenador';

  const enemyTeam = opponent.team_data.map(snap => ({
    ...snap,
    hp: snap.maxHp,
    status: null,
    sleepTurns: 0,
  }));

  const myTeam = getRankedPlayableTeam();
  if (!myTeam.length) {
    notify('Tu equipo ranked no tiene Pokemon disponibles.', '\u26A0\uFE0F');
    return;
  }

  const gate = validateTeamForRanked(myTeam, getCurrentRankedRules(), 'equipo ranked');
  if (!gate.ok) {
    notify(gate.reason, '\u26A0\uFE0F');
    return;
  }

  notify('Desafiando al equipo de ' + oppName + ' (ELO: ' + opponent.elo_rating + ')', '??');

  state._passiveBattleOpponentId = opponent.user_id;
  state._passiveBattleOpponentName = oppName;

  if (typeof startPassiveBattleMode === 'function') {
    startPassiveBattleMode(myTeam, enemyTeam, oppName, opponent.user_id);
  }
}

async function cancelRankedMatchmaking(silent = false) {
  _matchmakingStop();
  // Limpiar TODA fila de la cola en Supabase bajo nuestro user_id (para matar el ghost queue)
  if (currentUser) {
    try {
      await sb.from('ranked_queue').delete().eq('user_id', currentUser.id);
    } catch(e) { /* ignorar */ }
  }
  _matchmakingQueueId = null;
  if (!silent) notify('Búsqueda cancelada', '✖️');
}

// ── Limpieza interna ──────────────────────────────────────────────────
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

  const sign = delta >= 0 ? '+' : '';
  notify(`Resultado registrado. ELO: ${sign}${delta} → ${state.eloRating}`, '📊');
}

// ── Limpieza automática al cerrar pestaña (Antigosting) ───────────────
window.loadRankedRules = loadRankedRules;
window.getCurrentRankedRules = getCurrentRankedRules;
window.getRankedPlayableTeam = getRankedPlayableTeam;
window.normalizeRankedRules = normalizeRankedRules;
window.validatePokemonForRanked = validatePokemonForRanked;
window.validateTeamForRanked = validateTeamForRanked;
window.ensureRankedTeamEligibility = ensureRankedTeamEligibility;
window.addEventListener('beforeunload', () => {
    if (window.isRankedSearching) {
        cancelRankedMatchmaking(true);
    }
});
