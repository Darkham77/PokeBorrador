// ===== SISTEMA DE EVENTOS =====
// Motor de eventos, panel de administrador y entrega de premios.

const ADMIN_EMAIL_EV = 'kodrol77@gmail.com';

const ALL_PRIZE_ITEMS = [
  'Poción', 'Super Poción', 'Hiper Poción', 'Poción Máxima',
  'Revivir', 'Revivir Máximo', 'Elixir', 'Elixir Máximo',
  'Antídoto', 'Cura Total', 'Repelente', 'Superrepelente', 'Máximo Repelente',
  'Pokéball', 'Súper Ball', 'Ultra Ball', 'Red Ball', 'Ocaso Ball', 'Turno Ball', 'Master Ball',
  'Piedra Eterna', 'Baya de Oro',
  'Pesa Recia', 'Brazal Recio', 'Cinto Recio', 'Lente Recia', 'Banda Recia', 'Franja Recia',
  'Restos', 'Cascabel Concha', 'Lente Zoom', 'Banda Focus',
  'Compartir EXP', 'Subida PP', 'Caramelo Raro', 'Huevo Suerte Pequeño', 'Cinta Elegida',
  'MT14 Ventisca', 'MT27 Retribución'
];

const EV_NATURES = [
  'Audaz', 'Firme', 'Pícaro', 'Manso', 'Serio', 'Osado', 'Plácido',
  'Agitado', 'Jovial', 'Ingenuo', 'Modesto', 'Moderado', 'Raro', 'Dócil',
  'Tímido', 'Activo', 'Alocado', 'Tranquilo', 'Grosero', 'Cauto'
];

const EV_DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ���� Estado del motor ��������������������������������������������������������������������������������������������������������������������
let _activeEvents = [];
let _eventsLoaded = false;
let _eventPollInterval = null;
let _finishedEvents = [];
let _adminConfig = null;
let _adminTab = 'events';
let _adminEntries = [];
let _currentPrizeRank = 'first';
let _currentCompetitionId = 'hora_magikarp';
window._currentCompetitionId = _currentCompetitionId; // Aseguramos acceso global
const _prizeTemplate = () => ({ type: 'money', amount: 0, item: 'Pokéball', qty: 1, species: 'magikarp', level: 5, nature: 'Serio', ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, shiny: false });
let _prizeStates = {
  first: _prizeTemplate(),
  second: _prizeTemplate(),
  third: _prizeTemplate()
};

// ���� Auth token ��������������������������������������������������������������������������������������������������������������������������������
async function _evGetToken() {
  try {
    const { data: { session } } = await window.sb.auth.getSession();
    return session?.access_token || null;
  } catch { return null; }
}

function isAdminUser() {
  return window.currentUser?.email === ADMIN_EMAIL_EV;
}


const ADMIN_RANKED_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel'
];

const ADMIN_RANKED_TYPE_META = {
  normal: { label: 'Normal', icon: '⬜' },
  fire: { label: 'Fuego', icon: '🔥' },
  water: { label: 'Agua', icon: '💧' },
  electric: { label: 'Eléctrico', icon: '⚡' },
  grass: { label: 'Planta', icon: '🌿' },
  ice: { label: 'Hielo', icon: '❄️' },
  fighting: { label: 'Lucha', icon: '🥊' },
  poison: { label: 'Veneno', icon: '☠️' },
  ground: { label: 'Tierra', icon: '🏜️' },
  flying: { label: 'Volador', icon: '🪶' },
  psychic: { label: 'Psíquico', icon: '🔮' },
  bug: { label: 'Bicho', icon: '🐛' },
  rock: { label: 'Roca', icon: '🪨' },
  ghost: { label: 'Fantasma', icon: '👻' },
  dragon: { label: 'Dragón', icon: '🐉' },
  dark: { label: 'Siniestro', icon: '🌑' },
  steel: { label: 'Acero', icon: '⚙️' }
};

const DEFAULT_ADMIN_RANKED_RULES = {
  seasonName: 'TEMPORADA ACTUAL',
  maxPokemon: 6,
  levelCap: 100,
  allowedTypes: [],
  bannedPokemonIds: []
};

let _adminRankedRules = { ...DEFAULT_ADMIN_RANKED_RULES };

function _normalizeAdminType(v) {
  const key = String(v || '').trim().toLowerCase();
  return ADMIN_RANKED_TYPES.includes(key) ? key : null;
}

function _normalizeAdminPokemonId(v) {
  return String(v || '').trim().toLowerCase();
}

function _uniqueAdminArray(values) {
  const set = new Set();
  const out = [];
  for (const value of (values || [])) {
    if (!value || set.has(value)) continue;
    set.add(value);
    out.push(value);
  }
  return out;
}

function _normalizeAdminRankedRules(rawConfig = {}, seasonNameRaw = DEFAULT_ADMIN_RANKED_RULES.seasonName) {
  const maxPokemonNum = Number(rawConfig?.maxPokemon);
  const levelCapNum = Number(rawConfig?.levelCap);
  return {
    seasonName: String(seasonNameRaw || DEFAULT_ADMIN_RANKED_RULES.seasonName).trim() || DEFAULT_ADMIN_RANKED_RULES.seasonName,
    maxPokemon: Number.isFinite(maxPokemonNum) ? Math.max(1, Math.min(6, Math.floor(maxPokemonNum))) : DEFAULT_ADMIN_RANKED_RULES.maxPokemon,
    levelCap: Number.isFinite(levelCapNum) ? Math.max(1, Math.min(100, Math.floor(levelCapNum))) : DEFAULT_ADMIN_RANKED_RULES.levelCap,
    allowedTypes: _uniqueAdminArray((rawConfig?.allowedTypes || []).map(_normalizeAdminType).filter(Boolean)),
    bannedPokemonIds: _uniqueAdminArray((rawConfig?.bannedPokemonIds || []).map(_normalizeAdminPokemonId).filter(Boolean))
  };
}

function _getAdminPokemonOptions() {
  if (typeof POKEMON_DB === 'undefined' || !POKEMON_DB) return [];
  return Object.keys(POKEMON_DB)
    .map(id => ({ id, name: POKEMON_DB[id]?.name || id }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

async function _loadAdminRankedRules() {
  try {
    const { data, error } = await window.sb
      .from('ranked_rules_config')
      .select('season_name, config')
      .eq('id', 'current')
      .maybeSingle();

    if (error) throw error;
    _adminRankedRules = _normalizeAdminRankedRules(data?.config || {}, data?.season_name || DEFAULT_ADMIN_RANKED_RULES.seasonName);
  } catch (e) {
    _adminRankedRules = { ...DEFAULT_ADMIN_RANKED_RULES };
  }
  return _adminRankedRules;
}

async function _saveAdminRankedRules() {
  const payload = _normalizeAdminRankedRules(_adminRankedRules, _adminRankedRules?.seasonName);

  const { error } = await window.sb.from('ranked_rules_config').upsert({
    id: 'current',
    season_name: payload.seasonName,
    config: {
      maxPokemon: payload.maxPokemon,
      levelCap: payload.levelCap,
      allowedTypes: payload.allowedTypes,
      bannedPokemonIds: payload.bannedPokemonIds
    },
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });

  if (error) throw error;

  _adminRankedRules = payload;
  notify('¡Reglas ranked guardadas!', '✅');

  if (typeof loadRankedRules === 'function') {
    await loadRankedRules(true);
  }

  const tab = document.getElementById('tab-ranked');
  if (tab && tab.style.display !== 'none' && typeof renderRankedTab === 'function') {
    renderRankedTab();
  }
}

function _renderAdminRankedTab() {
  const rules = _normalizeAdminRankedRules(_adminRankedRules, _adminRankedRules?.seasonName);
  const typeButtons = ADMIN_RANKED_TYPES.map(type => {
    const active = rules.allowedTypes.includes(type);
    const meta = ADMIN_RANKED_TYPE_META[type] || { label: type, icon: '❓' };
    return `<button onclick="window._rankedToggleType('${type}')" style="padding:8px 10px;border-radius:10px;border:1px solid ${active ? '#60a5fa' : 'rgba(255,255,255,0.14)'};background:${active ? 'rgba(96,165,250,0.22)' : 'rgba(0,0,0,0.25)'};color:${active ? '#dbeafe' : '#9ca3af'};font-size:11px;cursor:pointer;">${meta.icon} ${meta.label}</button>`;
  }).join('');

  const allPokemon = _getAdminPokemonOptions();
  const selectOptions = ['<option value="">Seleccionar Pokémon...</option>']
    .concat(allPokemon.map(p => `<option value="${p.id}">${p.name}</option>`))
    .join('');

  const bannedList = rules.bannedPokemonIds.length
    ? rules.bannedPokemonIds.map(id => {
        const label = POKEMON_DB?.[id]?.name || id;
        return `<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,59,59,0.08);border:1px solid rgba(255,59,59,0.2);border-radius:10px;padding:8px 10px;gap:10px;"><span style="font-size:11px;color:#fecaca;">${label}</span><button onclick="window._rankedRemoveBan('${id}')" style="border:none;background:none;color:#f87171;cursor:pointer;font-size:12px;">✕</button></div>`;
      }).join('')
    : '<div style="font-size:11px;color:#6b7280;">No hay baneos configurados.</div>';

  return `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#60a5fa;margin-bottom:10px;">CONFIGURACIÓN DE TEMPORADA</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <label style="font-size:10px;color:#9ca3af;">Nombre de temporada</label>
          <input value="${rules.seasonName}" onchange="window._rankedSetSeasonName(this.value)" style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);background:rgba(0,0,0,0.3);color:#fff;font-size:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div>
              <label style="display:block;font-size:10px;color:#9ca3af;margin-bottom:6px;">Máx. Pokémon</label>
              <input type="number" min="1" max="6" value="${rules.maxPokemon}" onchange="window._rankedSetMaxPokemon(this.value)" style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);background:rgba(0,0,0,0.3);color:#fff;font-size:12px;">
            </div>
            <div>
              <label style="display:block;font-size:10px;color:#9ca3af;margin-bottom:6px;">Nivel máximo</label>
              <input type="number" min="1" max="100" value="${rules.levelCap}" onchange="window._rankedSetLevelCap(this.value)" style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);background:rgba(0,0,0,0.3);color:#fff;font-size:12px;">
            </div>
          </div>
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#a78bfa;margin-bottom:10px;">TIPOS PERMITIDOS</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${typeButtons}
        </div>
        <div style="margin-top:8px;font-size:10px;color:#6b7280;">Si no seleccionás ninguno, se permiten todos.</div>
      </div>

      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#f87171;margin-bottom:10px;">POKÉMON BANEADOS</div>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <select id="admin-ranked-ban-select" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);background:rgba(0,0,0,0.3);color:#fff;font-size:11px;">${selectOptions}</select>
          <button onclick="window._rankedAddBanFromSelect()" style="padding:10px 12px;border:none;border-radius:10px;background:rgba(248,113,113,0.2);color:#fecaca;cursor:pointer;font-size:11px;">+ Banear</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;max-height:220px;overflow-y:auto;">${bannedList}</div>
      </div>

      <button onclick="window._evAdminSave()" style="padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#60a5fa,#2563eb);color:#fff;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">💾 GUARDAR REGLAS RANKED</button>
    </div>
  `;
}
// ���� Motor de eventos (Supabase) ������������������������������������������������������������������������������������������������
async function loadActiveEvents() {
  try {
    const { data: events, error } = await window.sb.from('events_config').select('*');
    if (error) throw error;
    
    // 1. Eventos actualmente activos por horario
    const active = events.filter(ev => _isEventActiveNow(ev));

    // 2. Buscar eventos terminados en las últimas 24hs que tengan resultados
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: results } = await window.sb.from('competition_results')
      .select('*')
      .gt('ended_at', twentyFourHoursAgo)
      .order('ended_at', { ascending: false });

    const finished = [];
    if (results && results.length > 0) {
      // Evitar duplicados: si el evento está activo, no lo mostramos como terminado
      const activeIds = new Set(active.map(a => a.id));
      const processedIds = new Set();

      for (const res of results) {
        if (activeIds.has(res.event_id) || processedIds.has(res.event_id)) continue;
        
        const baseEv = events.find(e => e.id === res.event_id);
        if (baseEv) {
          finished.push({
            ...baseEv,
            isFinished: true,
            resultData: res.winners,
            endedAt: res.ended_at
          });
          processedIds.add(res.event_id);
        }
      }
    }

    _activeEvents = active;
    _finishedEvents = finished;
    _eventsLoaded = true;
    _updateEventBanner();

    // Verificación automática de premios al cargar/actualizar
    checkAndDistributePrizes(events);
  } catch (e) {
    console.warn('[Events] Error:', e);
  }
}

function _isEventActiveNow(ev) {
  if (!ev.active) return false;
  if (ev.manual) return true;

  const now = new Date();
  
  // 1. Verificar por fechas absolutas si existen
  if (ev.start_at && ev.end_at) {
    const start = new Date(ev.start_at);
    const end = new Date(ev.end_at);
    if (now >= start && now <= end) return true;
  }

  // 2. Verificar por horario programado (Weekly)
  const sched = ev.schedule;
  if (!sched) return false;
  
  const argTime = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
  const day = argTime.getDay();
  const hour = argTime.getHours() + argTime.getMinutes() / 60;
  
  if (sched.type === 'weekly' && sched.days) {
    if (!sched.days.includes(day)) return false;
    
    if (sched.startHour !== undefined && sched.endHour !== undefined) {
      const start = sched.startHour;
      const end = sched.endHour;
      if (start < end) {
        // Rango normal (ej: 10 a 18)
        if (hour < start || hour >= end) return false;
      } else {
        // Rango que cruza medianoche (ej: 23 a 01)
        // Activo si: hora >= 23:00 O hora < 01:00
      }
    }
    return true;
  }
  return false;
}


function getActiveShinyRate(customBase, bonusType = 'shiny') {
  let base = customBase;
  if (base === undefined) {
    base = (state.shinyBoostSecs || 0) > 0 ? Math.floor(GAME_RATIOS.shinyRate / 2) : GAME_RATIOS.shinyRate;
  }
  const eventMult = getEventBonus(bonusType);
  return Math.max(1, Math.floor(base / eventMult));
}



function isEventActive(id) {
  return _activeEvents.some(e => e.id === id);
}

function getEventBonus(type) {
  for (const ev of _activeEvents) {
    if (ev.config && ev.config[type + 'Mult']) return ev.config[type + 'Mult'];
  }
  return 1;
}

function isEventTargetSpecies(targetStr, id) {
  if (!targetStr || !id) return false;
  const array = targetStr.split(',').map(s => s.trim().toLowerCase());
  return array.includes(id.toLowerCase());
}

window.getEventSpeciesBoost = (speciesId) => {
  let mult = 1;
  for (const ev of _activeEvents) {
    if (isEventTargetSpecies(ev.config?.species, speciesId) && ev.config?.speciesRateMult) {
      mult *= parseFloat(ev.config.speciesRateMult);
    }
  }
  return isNaN(mult) ? 1 : mult;
};

window.getEventSpeciesShiny = (speciesId) => {
  let mult = 1;
  for (const ev of _activeEvents) {
    if (isEventTargetSpecies(ev.config?.species, speciesId) && ev.config?.speciesShinyMult) {
      mult *= parseFloat(ev.config.speciesShinyMult);
    }
  }
  return isNaN(mult) ? 1 : mult;
};

function _startEventPolling() {
  if (_eventPollInterval) clearInterval(_eventPollInterval);
  _eventPollInterval = setInterval(loadActiveEvents, 5 * 60 * 1000);
}

// ���� Banner de eventos activos ��������������������������������������������������������������������������������������������������
function _updateEventBanner() {
  // Ahora los eventos se muestran como Buffs dorados en el panel lateral
  if (typeof updateBuffPanel === 'function') updateBuffPanel();
  
  // Refrescar la pestaña de Mapa si está abierta para actualizar el carrusel del HUD
  const mapTab = document.getElementById('tab-map');
  if (mapTab && mapTab.style.display !== 'none') {
    if (typeof renderMaps === 'function') renderMaps();
  }
}

function showEventDetail(evId) {
  const ev = _activeEvents.find(e => e.id === evId);
  if (!ev) return;

  const modal = document.getElementById('event-detail-modal');
  const content = document.getElementById('event-detail-content');
  if (!modal || !content) return;

  // Ajuste de ancho adaptativo
  const container = modal.querySelector('div');
  if (container) container.style.maxWidth = '550px';

  const cfg = ev.config || {};

  // ���� Bonificaciones activas ����������������������������������������������������������������������������
  const bonusMap = {
    expMult:      { label: '�a� EXP', color: '#a78bfa' },
    moneyMult:    { label: '�x� Dinero', color: '#fbbf24' },
    bcMult:       { label: '�x�" Battle Coins', color: '#60a5fa' },
    shinyMult:    { label: '�S� Shiny Rate (Salvaje)', color: '#f472b6' },
    eggShinyMult: { label: '�S� Shiny Rate (Huevos)', color: '#f472b6' },
    hatchMult:    { label: '�x�a Eclosión Rápida', color: '#34d399' },
    rivalMult:    { label: '�x�� Aparición de Rival', color: '#ef4444' },
    trainerMult:  { label: '�x} Aparición de Entrenadores', color: '#3b82f6' },
    fishingMult:  { label: '�x}� Eventos de Pesca', color: '#0ea5e9' },
  };


  const bonusItems = Object.entries(bonusMap)
    .filter(([key]) => cfg[key] && cfg[key] > 1)
    .map(([key, meta]) => `
      <div style="display:flex;align-items:center;justify-content:space-between;
                  background:rgba(255,255,255,0.05);border-radius:10px;padding:10px 14px;">
        <span style="font-size:12px;color:#cbd5e1;">${meta.label}</span>
        <span style="font-family:'Press Start 2P',monospace;font-size:10px;color:${meta.color};">x${cfg[key]}</span>
      </div>`).join('');

  const bonusHtml = bonusItems
    ? `<div style="margin-bottom:16px;">
         <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#64748b;margin-bottom:8px;letter-spacing:1px;">BONIFICACIONES</div>
         <div style="display:flex;flex-direction:column;gap:6px;">${bonusItems}</div>
       </div>`
    : '';

  // ���� Premios del podio ��������������������������������������������������������������������������������������
  let prizeHtml = '';
  if (cfg.hasCompetition !== false && cfg.prizes && (cfg.prizes.first || cfg.prizes.second || cfg.prizes.third)) {
    
    const getPrizeDesc = (p) => {
      if (!p) return null;
      if (p.type === 'money') return `�x� ��${(p.amount || 0).toLocaleString()}`;
      if (p.type === 'bc') return `�x�" ${(p.amount || 0).toLocaleString()} BC`;
      if (p.type === 'item') return `�x� ${p.qty || 1}x ${p.item}`;
      if (p.type === 'pokemon') {
        const name = (typeof POKEMON_DB !== 'undefined' && POKEMON_DB[p.species]?.name) || p.species;
        return `�x�� ${name}${p.shiny ? ' �S�' : ''} Nv.${p.level}`;
      }
      return null;
    };

    let prizesList = '';
    const p1 = getPrizeDesc(cfg.prizes.first);
    if (p1) prizesList += `<div style="font-size:13px;color:#fde68a;font-weight:700;margin-bottom:8px;">�x�! 1° � ${p1}</div>`;
    
    const p2 = getPrizeDesc(cfg.prizes.second);
    if (p2) prizesList += `<div style="font-size:11px;color:#cbd5e1;font-weight:600;margin-bottom:6px;">�x�� 2° � ${p2}</div>`;
    
    const p3 = getPrizeDesc(cfg.prizes.third);
    if (p3) prizesList += `<div style="font-size:10px;color:#b45309;font-weight:600;">�x�0 3° � ${p3}</div>`;

    prizeHtml = `
      <div style="margin-bottom:16px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#64748b;margin-bottom:8px;letter-spacing:1px;">�x�  PREMIOS DEL PODIO</div>
        <div style="background:linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.06));
                    border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:14px 16px;">
          ${prizesList}
        </div>
      </div>`;
  }

  // ���� Métrica del concurso ����������������������������������������������������������������������������������
  let metricHtml = '';
  if (cfg.hasCompetition !== false) {
    const sortBy = cfg.sortBy;
    if (sortBy) {
      const metricLabels = {
        'data.total_ivs': '�x�� Mayor cantidad de IVs totales',
        'data.level': '�x� Mayor Nivel',
        'data.isShiny': '�S� Criterio Shiny',
      };
      
      let metricText = metricLabels[sortBy] || sortBy;
      if (cfg.species && metricLabels[sortBy]) {
         const especieTarget = cfg.species.split(',')[0].trim();
         const targetName = (typeof POKEMON_DB !== 'undefined' && POKEMON_DB[especieTarget]?.name) || especieTarget;
         metricText = metricLabels[sortBy] + ' del ' + targetName;
      }
      
      metricHtml = `
        <div style="margin-bottom:16px;">
          <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#64748b;margin-bottom:8px;letter-spacing:1px;">CRITERIO DE VICTORIA</div>
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 14px;font-size:12px;color:#94a3b8;">
            ${metricText}
          </div>
        </div>`;
    }
  }

  // ���� Horario ������������������������������������������������������������������������������������������������������������
  let schedHtml = '';
  const sched = ev.schedule;
  if (sched?.type === 'weekly' && sched.days?.length) {
    const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const days = sched.days.map(d => dayNames[d]).join(', ');
    const hours = (sched.startHour !== undefined && sched.endHour !== undefined)
      ? ` · ${sched.startHour}:00 � ${sched.endHour}:00 hs (ARG)` : '';
    schedHtml = `
      <div style="margin-bottom:8px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#64748b;margin-bottom:8px;letter-spacing:1px;">⏰ HORARIO</div>
        <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 14px;font-size:12px;color:#94a3b8;">
          ${days}${hours}
        </div>
      </div>`;
  } else if (ev.manual) {
    schedHtml = `
      <div style="margin-bottom:8px;">
        <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:10px;padding:10px 14px;font-size:12px;color:#4ade80;text-align:center;">
          �xx� Evento activo ahora mismo
        </div>
      </div>`;
  }

  // ���� Imagen / Banner ��������������������������������������������������������������������������������������������
  let bannerHtml = '';
  if (cfg.banner) {
    bannerHtml = `
      <div style="width:100%; border-radius:18px; overflow:hidden; margin-bottom:24px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.2);">
        <img src="assets/eventos/${cfg.banner}" style="width:100%; height:auto; display:block; max-height:300px; object-fit:cover;" onerror="this.parentElement.style.display='none'">
      </div>`;
  }

  content.innerHTML = `
    ${bannerHtml}
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:52px;margin-bottom:10px;">${ev.icon || '�x}�'}</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:13px;color:#fbbf24;
                  margin-bottom:10px;line-height:1.5;">${ev.name}</div>
      <div style="font-size:13px;color:#94a3b8;line-height:1.6;">${ev.description || '¡Aprovechá este evento especial mientras esté activo!'}</div>
    </div>
    <div style="height:1px;background:rgba(255,255,255,0.08);margin-bottom:16px;"></div>
    ${bonusHtml}${prizeHtml}${metricHtml}${schedHtml}
  `;

  modal.style.display = 'flex';
}


// ���� Concursos � Registro genérico ������������������������������������������������������������������������������������������
async function submitCompetitionEntry(pokemon, eventId) {
  if (!isEventActive(eventId) || !window.currentUser) return;
  const ev = _activeEvents.find(e => e.id === eventId);
  const cfg = ev?.config || {};
  const sortBy = cfg.sortBy || 'data.total_ivs';
  const totalIvs = Object.values(pokemon.ivs || {}).reduce((a, b) => a + b, 0);
  
  // Determinamos el score comparativo basado en sortBy
  const currentScore = sortBy.startsWith('data.') ? (pokemon.data?.[sortBy.split('.')[1]] || totalIvs) : (pokemon[sortBy] || totalIvs);

  try {
    const { data: existing, error: fetchErr } = await window.sb.from('competition_entries')
      .select('id, data')
      .eq('event_id', eventId)
      .eq('player_id', window.currentUser.id)
      .maybeSingle(); // maybeSingle es más limpio si puede no existir

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      console.warn('[Events] Error al buscar registro previo:', fetchErr);
    }

    if (existing) {
      const oldScore = existing.data?.total_ivs || 0;
      if (oldScore >= totalIvs) {
        notify('Ya tenés una inscripción mejor en este concurso.', '�x� ');
        return;
      }
    }

    const upsertData = {
      event_id: eventId,
      player_id: window.currentUser.id,
      player_name: state.trainer || 'Jugador',
      player_email: window.currentUser.email,
      data: {
        pokemon_name: pokemon.name,
        ivs: pokemon.ivs,
        total_ivs: totalIvs,
        level: pokemon.level,
        isShiny: pokemon.isShiny || false
      },
      submitted_at: new Date().toISOString()
    };

    // Si ya existe, incluimos el ID para asegurar el update
    if (existing?.id) upsertData.id = existing.id;

    const { error: upsertErr } = await window.sb.from('competition_entries').upsert(upsertData, {
      onConflict: 'event_id, player_id'
    });

    if (upsertErr) throw upsertErr;

    notify(`¡Registro exitoso en ${ev.name}! Puntuación: ${totalIvs}`, ev.icon || '�x� ');
  } catch (e) {
    console.error('[Events] Error detallado al inscribir:', e);
    notify('Error al inscribir en el concurso.', '�R');
  }
}

// ���� Aliases para compatibilidad con código viejo (si lo hubiera) ����������������������
async function submitMagikarpEntry(pokemon) { await submitCompetitionEntry(pokemon, 'hora_magikarp'); }


// ���� Verificación de récords para todos los eventos activos ��������������������������������������
async function checkCompetitionsAndPrompt(pokemon) {
  if (!window.currentUser || _activeEvents.length === 0) return;
  
  const totalIvs = Object.values(pokemon.ivs || {}).reduce((a, b) => a + b, 0);
  const pokeId = pokemon.id || pokemon.name?.toLowerCase();

  for (const ev of _activeEvents) {
    // Si el evento no tiene competencia activa, lo salteamos
    if (ev.config?.hasCompetition === false) continue;

    // Verificar si la especie coincide (soporta una especie o varias separadas por coma)
    // Fallback: si no hay species configurada y el ID es 'hora_magikarp', asumimos 'magikarp'
    const targetSpecies = ev.config?.species || (ev.id === 'hora_magikarp' ? 'magikarp' : null);
    if (!targetSpecies) continue;

    const speciesList = targetSpecies.split(',').map(s => s.trim().toLowerCase());
    if (!speciesList.includes(pokeId)) continue;

    try {
      // Verificar si el jugador ya tiene un registro en ESTE evento
      const { data: existing } = await window.sb.from('competition_entries')
        .select('data')
        .eq('event_id', ev.id)
        .eq('player_id', window.currentUser.id)
        .single();
      
      // Si existe un registro y el nuevo Pokémon no es mejor, ignorar
      if (existing && (existing.data?.total_ivs || 0) >= totalIvs) continue;
      
      // Si el nuevo es mejor, mostrar el diálogo específico para este evento
      promptCompetitionSubmit(pokemon, ev);
    } catch (e) {
      console.warn(`[Events] Error verificando récord para ${ev.id}:`, e);
      promptCompetitionSubmit(pokemon, ev);
    }
  }
}

// Alias para compatibilidad con código viejo en js/07_battle.js
async function checkMagikarpAndPrompt(pokemon) { await checkCompetitionsAndPrompt(pokemon); }

function promptCompetitionSubmit(pokemon, event) {
  const totalIvs = Object.values(pokemon.ivs || {}).reduce((a, b) => a + b, 0);
  const ov = document.createElement('div');
  ov.id = `comp-submit-overlay-${event.id}`;
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s;';
  
  const icon = event.icon || '�x� ';
  const name = event.name || 'Concurso';

  ov.innerHTML = `
    <div style="background:#1e293b;border-radius:20px;padding:24px;max-width:360px;width:100%;border:2px solid rgba(251,191,36,0.2);text-align:center;box-shadow:0 0 40px rgba(0,0,0,0.5);">
      <div style="font-size:40px;margin-bottom:12px;">${icon}</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:#fbbf24;margin-bottom:12px;">${name.toUpperCase()}</div>
      <div style="font-size:12px;color:#e2e8f0;margin-bottom:8px;">¡Capturaste un ${pokemon.name} con <strong style="color:#f59e0b;">${totalIvs}/186 IVs</strong>!</div>
      <div style="font-size:11px;color:#9ca3af;margin-bottom:20px;">¿Querés inscribirlo en el concurso?${pokemon.isShiny ? ' <span style="color:#fbbf24;">�S� ¡Es Shiny!</span>' : ''}</div>
      <div style="display:flex;gap:10px;">
        <button id="btn-submit-comp-${event.id}"
          style="flex:1;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;font-weight:bold;">
          �x�  INSCRIBIR
        </button>
        <button onclick="this.closest('#comp-submit-overlay-${event.id}').remove()"
          style="flex:1;padding:12px;border:none;border-radius:12px;background:rgba(255,255,255,0.07);color:#9ca3af;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">
          NO GRACIAS
        </button>
      </div>
    </div>`;
  
  document.body.appendChild(ov);
  
  document.getElementById(`btn-submit-comp-${event.id}`).onclick = () => {
    submitCompetitionEntry(pokemon, event.id);
    ov.remove();
  };
}


// ���� Entrega de premios ����������������������������������������������������������������������������������������������������������������
async function checkPendingAwards() {
  if (!window.currentUser) return;
  try {
    const seventyTwoHoursAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: awards, error } = await window.sb.from('awards')
      .select('*')
      .eq('winner_id', window.currentUser.id)
      .eq('claimed', false)
      .gt('awarded_at', seventyTwoHoursAgo);
    
    if (error) throw error;
    state._pendingAwards = awards || [];
    _renderPendingAwardBanner(); // Mostrar/ocultar banner según premios pendientes
  } catch (e) {
    console.warn('[Events] Error al verificar premios pendientes:', e);
  }
}

// ���� Banner de premio pendiente ������������������������������������������������������������������������������������������������
function _renderPendingAwardBanner() {
  const existing = document.getElementById('pending-award-banner');
  const awards = state._pendingAwards || [];

  if (awards.length === 0) {
    if (existing) existing.remove();
    return;
  }

  if (existing) return; // Ya está visible, no duplicar

  // Agregar la animación de pulso si no existe
  if (!document.getElementById('award-banner-style')) {
    const style = document.createElement('style');
    style.id = 'award-banner-style';
    style.innerHTML = `
      @keyframes awardPulse {
        0%, 100% { box-shadow: 0 0 20px rgba(251,191,36,0.4), 0 4px 24px rgba(0,0,0,0.5); }
        50% { box-shadow: 0 0 40px rgba(251,191,36,0.9), 0 4px 24px rgba(0,0,0,0.5); }
      }
      @keyframes awardSlideIn {
        from { transform: translateY(100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      #pending-award-banner:hover { transform: scale(1.02); }
      #pending-award-banner { transition: transform 0.2s; }
    `;
    document.head.appendChild(style);
  }

  const banner = document.createElement('div');
  banner.id = 'pending-award-banner';
  banner.style.cssText = [
    'position:fixed',
    'bottom:20px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:8500',
    'background:linear-gradient(135deg,#92400e,#b45309,#d97706,#fbbf24,#d97706,#b45309)',
    'background-size:300% 300%',
    'border-radius:20px',
    'padding:14px 24px',
    'cursor:pointer',
    'animation:awardPulse 2s ease-in-out infinite, awardSlideIn 0.5s ease-out',
    'display:flex',
    'align-items:center',
    'gap:12px',
    'max-width:90vw',
    'white-space:nowrap'
  ].join(';');

  const count = awards.length;
  banner.innerHTML = `
    <span style="font-size:24px;">�x� </span>
    <div>
      <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#fff;letter-spacing:1px;">
        ${count > 1 ? `¡TEN�0S ${count} PREMIOS!` : '¡HAS GANADO!'}
      </div>
      <div style="font-size:10px;color:rgba(255,255,255,0.85);margin-top:3px;">
        Tocá aquí para reclamar tus premios
      </div>
    </div>
    <span style="font-size:20px;">�x}�</span>
  `;

  banner.onclick = () => _openPendingAwardsModal();
  document.body.appendChild(banner);
}

function _openPendingAwardsModal() {
  const awards = state._pendingAwards || [];
  if (awards.length === 0) return;

  const existing = document.getElementById('pending-awards-modal');
  if (existing) existing.remove();

  const ov = document.createElement('div');
  ov.id = 'pending-awards-modal';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9900;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.3s;';

  const rows = awards.map(a => {
    const prize = a.prize || {};
    let desc = '';
    if (prize.type === 'money') desc = `�x� ��${(prize.amount || 0).toLocaleString()}`;
    else if (prize.type === 'bc') desc = `�x�" ${(prize.amount || 0).toLocaleString()} Battle Coins`;
    else if (prize.type === 'item') desc = `�x� ${prize.qty || 1}x ${prize.item}`;
    else if (prize.type === 'pokemon') {
      const name = (typeof POKEMON_DB !== 'undefined' && POKEMON_DB[prize.species]?.name) || prize.species;
      desc = `�x�� ${name}${prize.shiny ? ' �S�' : ''} Nv.${prize.level}`;
    }
    const fecha = new Date(a.awarded_at).toLocaleDateString('es-AR');
    return `
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(251,191,36,0.2);border-radius:14px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div>
          <div style="font-size:13px;color:#fde68a;font-weight:700;margin-bottom:4px;">${desc}</div>
          <div style="font-size:10px;color:#64748b;">Ganado el ${fecha}</div>
        </div>
        <button onclick="claimAward('${a.id}')" 
          style="padding:10px 14px;border:none;border-radius:12px;background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;white-space:nowrap;flex-shrink:0;">
          ¡RECLAMAR!
        </button>
      </div>`;
  }).join('');

  ov.innerHTML = `
    <div style="background:#0f172a;border-radius:24px;padding:28px;width:100%;max-width:480px;border:2px solid rgba(251,191,36,0.4);box-shadow:0 0 60px rgba(251,191,36,0.15);">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:44px;margin-bottom:8px;">�x� </div>
        <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:#fbbf24;margin-bottom:6px;">¡PREMIOS PENDIENTES!</div>
        <div style="font-size:11px;color:#64748b;">Tenés ${awards.length} premio(s) esperándote</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">${rows}</div>
      <button onclick="document.getElementById('pending-awards-modal').remove()"
        style="width:100%;padding:12px;border:none;border-radius:12px;background:rgba(255,255,255,0.06);color:#6b7280;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">
        CERRAR
      </button>
    </div>`;

  document.body.appendChild(ov);
}

// IDs de premios que están siendo procesados (evita doble-click)
const _claimingIds = new Set();

async function claimAward(awardId) {
  if (!window.currentUser) return;
  // Guard: si ya estamos procesando este premio, ignorar
  if (_claimingIds.has(awardId)) return;
  _claimingIds.add(awardId);

  // Deshabilitar el botón correspondiente inmediatamente
  document.querySelectorAll(`[onclick*="claimAward('${awardId}')"]`).forEach(btn => {
    btn.disabled = true;
    btn.textContent = '...';
    btn.style.opacity = '0.5';
  });

  try {
    const award = state._pendingAwards?.find(a => a.id === awardId);
    if (!award) { _claimingIds.delete(awardId); return; }

    // Eliminar del array local ANTES de entregar (previene segunda ejecución)
    state._pendingAwards = state._pendingAwards.filter(a => a.id !== awardId);

    const delivered = await _deliverAward(award);
    if (delivered) {
      notify('¡Premio reclamado con éxito!', '�x}0');
      _renderPendingAwardBanner();
      const modal = document.getElementById('pending-awards-modal');
      if (modal) {
        if ((state._pendingAwards || []).length === 0) { modal.remove(); }
        else { _openPendingAwardsModal(); }
      }
      if (typeof renderMaps === 'function') renderMaps();
    } else {
      // Si falló la entrega, restaurar el award
      state._pendingAwards = [...(state._pendingAwards || []), award];
    }
  } catch (e) {
    console.warn('[Events] Error al reclamar premio:', e);
    notify('Error al reclamar el premio.', '�R');
  } finally {
    _claimingIds.delete(awardId);
  }
}

async function _deliverAward(award) {
  const prize = award.prize;
  if (!prize) return false;

  // PASO 1: Marcar como reclamado en la DB PRIMERO (previene doble entrega)
  try {
    const { error: claimErr } = await window.sb.from('awards').update({
      claimed: true,
      claimed_at: new Date().toISOString()
    }).eq('id', award.id).eq('claimed', false); // La condición .eq('claimed', false) es la segunda capa de protección

    if (claimErr) {
      console.warn('[Events] Error al marcar claimed:', claimErr);
      return false; // No continuar si falló el marqueo
    }
  } catch (e) {
    console.warn('[Events] Error actualizando award:', e);
    return false;
  }

  // PASO 2: Entregar el premio localmente
  let delivered = false;

  if (prize.type === 'money') {
    state.money = (state.money || 0) + (prize.amount || 0);
    notify(`�x�  Premio de torneo: ��${(prize.amount || 0).toLocaleString()}`, '�x}0');
    delivered = true;
  } else if (prize.type === 'bc') {
    state.battleCoins = (state.battleCoins || 0) + (prize.amount || 0);
    notify(`�x�  Premio de torneo: ${(prize.amount || 0).toLocaleString()} Battle Coins`, '�x}0');
    delivered = true;
  } else if (prize.type === 'item') {
    state.inventory = state.inventory || {};
    state.inventory[prize.item] = (state.inventory[prize.item] || 0) + (prize.qty || 1);
    notify(`�x�  Premio de torneo: ${prize.qty || 1}x ${prize.item}`, '�x}0');
    delivered = true;
  } else if (prize.type === 'pokemon') {
    if (typeof makePokemon === 'function' && POKEMON_DB[prize.species]) {
      const poke = makePokemon(prize.species, prize.level || 5);
      if (prize.nature) poke.nature = prize.nature;
      if (prize.ivs) {
        ['hp','atk','def','spa','spd','spe'].forEach(k => {
          if (prize.ivs[k] !== undefined) poke.ivs[k] = prize.ivs[k];
        });
      }
      if (prize.shiny) poke.isShiny = true;
      poke.originalTrainer = 'EVENTO';
      state.box = state.box || [];
      state.box.push(poke);
      const shinyTag = prize.shiny ? ' �S�' : '';
      notify(`�x�  Premio de torneo: ${POKEMON_DB[prize.species]?.name || prize.species}${shinyTag} añadido a tu PC`, '�x}0');
      delivered = true;
    }
  }

  if (delivered) {
    if (typeof updateHud === 'function') updateHud();
    if (typeof saveGame === 'function') saveGame(false);
  }

  return delivered;
}

// ���� Panel de Administrador ��������������������������������������������������������������������������������������������������������
async function openAdminPanel() {
  if (!isAdminUser()) { notify('Sin acceso.', '�xa�'); return; }
  const existing = document.getElementById('admin-panel-overlay');
  if (existing) existing.remove();

  try {
    const { data: events, error } = await window.sb.from('events_config').select('*').order('id');
    if (error) throw error;

    await _loadAdminRankedRules();
    _adminConfig = { events };
    _renderAdminPanel();
    
    // Cargamos los participantes del concurso de inmediato
    await _evLoadEntries();
  } catch (e) {
    console.error('[Admin] Error:', e);
    notify('Error: ' + e.message, '�R');
  }
}

function _renderAdminPanel() {
  const existing = document.getElementById('admin-panel-overlay');
  if (existing) existing.remove();

  const ov = document.createElement('div');
  ov.id = 'admin-panel-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9800;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;animation:fadeIn 0.2s;';

  const tab1Active = _adminTab === 'events';
  const tab2Active = _adminTab === 'competition';
  const tab3Active = _adminTab === 'ranked';

  const eventsHtml = (_adminConfig?.events || []).map((ev, i) => _renderEventCard(ev, i)).join('');
  const compHtml = _renderCompetitionTab();
  const rankedHtml = _renderAdminRankedTab();

  ov.innerHTML = `
    <div style="background:#0f172a;border-radius:20px;padding:24px;width:100%;max-width:560px;border:2px solid #f59e0b44;box-shadow:0 8px 60px rgba(0,0,0,0.8);margin:auto;">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:28px;">�x:�️</span>
          <div>
            <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:#f59e0b;">ADMINISTRADOR</div>
            <div style="font-size:9px;color:#6b7280;margin-top:3px;">Solo visible para ti (Online)</div>
          </div>
        </div>
        <button onclick="document.getElementById('admin-panel-overlay').remove()"
          style="background:none;border:none;color:#6b7280;font-size:24px;cursor:pointer;line-height:1;">�S"</button>
      </div>

      <!-- Tabs -->
      <div style="display:flex;background:rgba(255,255,255,0.05);border-radius:12px;padding:4px;margin-bottom:20px;gap:4px;">
        <button onclick="window._evAdminSwitchTab('events')"
          style="flex:1;padding:10px;border:none;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;background:${tab1Active ? '#f59e0b' : 'transparent'};color:${tab1Active ? '#000' : '#9ca3af'};">
          �a"️ EVENTOS
        </button>
        <button onclick="window._evAdminSwitchTab('competition')"
          style="flex:1;padding:10px;border:none;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;background:${tab2Active ? '#22c55e' : 'transparent'};color:${tab2Active ? '#000' : '#9ca3af'};">
          �x}� CONCURSO
        </button>
              <button onclick="window._evAdminSwitchTab('ranked')"
          style="flex:1;padding:10px;border:none;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;background:${tab3Active ? '#60a5fa' : 'transparent'};color:${tab3Active ? '#000' : '#9ca3af'};">
          🏅 RANKED
        </button>
      </div>

      <!-- Events Tab -->
      <div id="admin-tab-events" style="display:${tab1Active ? 'block' : 'none'};">
        <div style="display:flex;flex-direction:column;gap:14px;" id="admin-events-list">
          ${eventsHtml}
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button onclick="window._evAdminAddEvent()"
            style="flex:1;padding:14px;border:none;border-radius:14px;background:rgba(255,255,255,0.08);color:#fff;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">
            �~" CREAR EVENTO
          </button>
          <button onclick="window._evAdminSave()"
            style="flex:1;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">
            �x� GUARDAR CAMBIOS
          </button>
        </div>
      </div>

      <!-- Competition Tab -->
      <div id="admin-tab-competition" style="display:${tab2Active ? 'block' : 'none'};">
        ${compHtml}
      </div>

      <!-- Ranked Tab -->
      <div id="admin-tab-ranked" style="display:${tab3Active ? 'block' : 'none'};">
        ${rankedHtml}
      </div>
    </div>`;

  document.body.appendChild(ov);

  window._evAdminSwitchTab = (tab) => {
    _adminTab = tab;
    _renderAdminPanel();
    // Cargamos los participantes con un pequeño delay para que el DOM esté listo
    if (tab === 'competition') {
      setTimeout(() => _evLoadEntriesGlobal(), 100);
    }
  };
  window._rankedSetSeasonName = (value) => {
    _adminRankedRules = _normalizeAdminRankedRules(_adminRankedRules, value);
  };

  window._rankedSetMaxPokemon = (value) => {
    _adminRankedRules = _normalizeAdminRankedRules({ ..._adminRankedRules, maxPokemon: Number(value) }, _adminRankedRules?.seasonName);
    _renderAdminPanel();
  };

  window._rankedSetLevelCap = (value) => {
    _adminRankedRules = _normalizeAdminRankedRules({ ..._adminRankedRules, levelCap: Number(value) }, _adminRankedRules?.seasonName);
    _renderAdminPanel();
  };

  window._rankedToggleType = (typeKey) => {
    const rules = _normalizeAdminRankedRules(_adminRankedRules, _adminRankedRules?.seasonName);
    const allowed = new Set(rules.allowedTypes);
    if (allowed.has(typeKey)) allowed.delete(typeKey);
    else allowed.add(typeKey);
    _adminRankedRules = _normalizeAdminRankedRules({ ...rules, allowedTypes: Array.from(allowed) }, rules.seasonName);
    _renderAdminPanel();
  };

  window._rankedAddBanFromSelect = () => {
    const select = document.getElementById('admin-ranked-ban-select');
    const selectedId = select?.value ? String(select.value).trim().toLowerCase() : '';
    if (!selectedId) return;
    const rules = _normalizeAdminRankedRules(_adminRankedRules, _adminRankedRules?.seasonName);
    const bans = new Set(rules.bannedPokemonIds || []);
    bans.add(selectedId);
    _adminRankedRules = _normalizeAdminRankedRules({ ...rules, bannedPokemonIds: Array.from(bans) }, rules.seasonName);
    _renderAdminPanel();
  };

  window._rankedRemoveBan = (pokemonId) => {
    const rules = _normalizeAdminRankedRules(_adminRankedRules, _adminRankedRules?.seasonName);
    _adminRankedRules = _normalizeAdminRankedRules({
      ...rules,
      bannedPokemonIds: (rules.bannedPokemonIds || []).filter(id => id !== pokemonId)
    }, rules.seasonName);
    _renderAdminPanel();
  };

  window._evAdminAddEvent = () => {
    const newId = 'custom_' + Date.now();
    _adminConfig.events.push({
      id: newId,
      name: 'Nuevo Evento',
      icon: '�x}�',
      description: 'Descripción del evento',
      active: false,
      manual: false,
      schedule: { type: 'weekly', days: [], startHour: 0, endHour: 24 },
      config: {
        banner: '',
        hasCompetition: false,
        species: '',
        speciesRateMult: 1,
        speciesShinyMult: 1,
        sortBy: 'data.total_ivs',
        expMult: 1,
        moneyMult: 1,
        bcMult: 1,
        shinyMult: 1,
        eggShinyMult: 1,
        hatchMult: 1,
        rivalMult: 1,
        trainerMult: 1,
        fishingMult: 1,
        ignoreTimeRestrictions: false,
        prizes: {}
      },
      _collapsed: false
    });
    _renderAdminPanel();
  };

  window._evToggleCollapse = (idx) => {
    const ev = _adminConfig.events[idx];
    ev._collapsed = !ev._collapsed;
    _renderAdminPanel();
  };

  window._evAdminDeleteEvent = async (idx) => {
    if(!confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return;
    
    // Guardamos una copia por si falla el borrado en el servidor
    const ev = _adminConfig.events[idx];
    
    // Lo quitamos de la UI temporalmente
    _adminConfig.events.splice(idx, 1);
    _renderAdminPanel();
    
    try {
      // 1. Intentamos borrar de forma segura los registros asociados antes para evitar errores de FK (Foreign Key)
      // Si la BD no tiene ON DELETE CASCADE, esto es necesario.
      await window.sb.from('competition_entries').delete().eq('event_id', ev.id);
      await window.sb.from('competition_results').delete().eq('event_id', ev.id);
      
      // 2. Borramos la configuración del evento
      const { error } = await window.sb.from('events_config').delete().eq('id', ev.id);
      
      if (error) throw error;

      notify('Evento eliminado del servidor', '�x️');
      await loadActiveEvents();
    } catch(e) {
       console.error('[Admin] Error al eliminar evento:', e);
       notify('Error al borrar: ' + (e.message || 'Error de red o permisos'), '�R');
       
       // Si falló en la DB, restauramos el evento a la lista local para que la UI diga la verdad
       // Intentamos restaurarlo en su posición original si es posible
       _adminConfig.events.splice(idx, 0, ev);
       _renderAdminPanel();
    }
  };


  window._evAdminSave = async () => {
    try {
      if (_adminTab === 'ranked') {
        await _saveAdminRankedRules();
        return;
      }

      for (const ev of (_adminConfig?.events || [])) {
        const { error } = await window.sb.from('events_config').upsert({
          id: ev.id,
          name: ev.name,
          description: ev.description,
          icon: ev.icon,
          active: ev.active,
          manual: ev.manual,
          schedule: ev.schedule,
          config: ev.config
        }, { onConflict: 'id' });
        if (error) throw error;
      }
      notify('¡Cambios guardados!', '✅');
      await loadActiveEvents();
    } catch (e) {
      console.error(e);
      notify('Error al guardar en Supabase.', '❌');
    }
  };
}

function _renderEventCard(ev, idx) {
  const sched = ev.schedule || {};
  const days = sched.days || [];
  const daysHtml = EV_DAY_NAMES.map((d, i) => `
    <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:10px;color:${days.includes(i) ? '#22c55e' : '#6b7280'};">
      <input type="checkbox" data-ev="${idx}" data-day="${i}" ${days.includes(i) ? 'checked' : ''}
        style="accent-color:#22c55e;cursor:pointer;" onchange="window._evDayToggle(${idx},${i},this.checked)">
      ${d}
    </label>`).join('');

  const hasHours = sched.startHour !== undefined;

  return `
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#9ca3af;">ID INTERNO: ${ev.id}</div>
        <button onclick="window._evToggleCollapse(${idx})" style="background:none;border:none;color:#9ca3af;font-size:10px;font-family:'Press Start 2P',monospace;cursor:pointer;">
          ${ev._collapsed ? '�x� DESPLEGAR' : '�x� OCULTAR'}
        </button>
      </div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <div style="display:flex;flex:1;gap:10px;">
          <input type="text" value="${ev.icon}" title="Icono"
            onchange="window._evPropChange(${idx}, 'icon', this.value)"
            style="font-size:22px; width:45px; height:45px; text-align:center; background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;">
          <div style="flex:1;">
            <input type="text" value="${ev.name}" placeholder="Nombre del Evento"
              onchange="window._evPropChange(${idx}, 'name', this.value)"
              style="width:100%;font-size:11px;font-weight:700;color:#e2e8f0;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:4px;margin-bottom:4px;box-sizing:border-box;">
            <input type="text" value="${ev.description}" placeholder="Descripción breve"
              onchange="window._evPropChange(${idx}, 'description', this.value)"
              style="width:100%;font-size:9px;color:#6b7280;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:4px;box-sizing:border-box;">
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
            <button onclick="window._evAdminDeleteEvent(${idx})" title="Eliminar Evento" style="background:none;border:none;color:#ef4444;font-size:14px;cursor:pointer;padding:4px;">�x️</button>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex-shrink:0;">
              <input type="checkbox" data-ev="${idx}" data-field="active" ${ev.active ? 'checked' : ''}
                style="accent-color:#22c55e;width:16px;height:16px;cursor:pointer;" onchange="window._evFieldChange(${idx},'active',this.checked)">
              <span style="font-size:9px;color:${ev.active ? '#22c55e' : '#6b7280'};font-family:'Press Start 2P',monospace;">${ev.active ? 'ON' : 'OFF'}</span>
            </label>
        </div>
      </div>
      
      <div id="ev-body-${idx}" style="display:${ev._collapsed ? 'none' : 'block'};">
      <div style="background:rgba(245,158,11,0.08);border-radius:10px;padding:10px;margin-bottom:10px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" data-ev="${idx}" data-field="manual" ${ev.manual ? 'checked' : ''}
            style="accent-color:#f59e0b;cursor:pointer;" onchange="window._evFieldChange(${idx},'manual',this.checked)">
          <div>
            <span style="font-size:9px;color:#f59e0b;font-family:'Press Start 2P',monospace;">ACTIVAR AHORA (MANUAL)</span>
            <div style="font-size:8px;color:#6b7280;margin-top:2px;">Ignora el horario programado</div>
          </div>
        </label>
      </div>
      <div style="background:rgba(34,197,94,0.06);border-radius:10px;padding:10px;margin-bottom:10px;border:1px solid rgba(34,197,94,0.15);">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" data-ev="${idx}" data-field="hasCompetition" ${ev.config?.hasCompetition !== false ? 'checked' : ''}
            style="accent-color:#22c55e;cursor:pointer;" onchange="window._evConfigToggle(${idx},'hasCompetition',this.checked)">
          <div>
            <span style="font-size:9px;color:#22c55e;font-family:'Press Start 2P',monospace;">�x�  TIENE COMPETENCIA/PREMIOS</span>
            <div style="font-size:8px;color:#6b7280;margin-top:2px;">Desactivar para eventos solo de bonificaciones (EXP doble, etc.)</div>
          </div>
        </label>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;background:rgba(255,255,255,0.03);padding:8px;border-radius:10px;">
        <span style="font-size:18px;">�x�️</span>
        <div style="flex:1;">
          <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">IMAGEN DE EVENTO (assets/eventos/...)</div>
          <input type="text" value="${ev.config?.banner || ''}" placeholder="ej: capturamagikarp.png"
            onchange="window._evBannerChange(${idx}, this.value)"
            style="width:100%;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:11px;">
        </div>
      </div>

      <div style="font-size:9px;color:#9ca3af;margin-bottom:8px;font-family:'Press Start 2P',monospace;">DÍAS DE LA SEMANA (ARG)</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">${daysHtml}</div>

      ${hasHours ? `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">
        <div>
          <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">HORA INICIO</div>
          <input type="number" min="0" max="23" value="${sched.startHour ?? 0}"
            data-ev="${idx}" data-field="startHour"
            onchange="window._evHourChange(${idx},'startHour',this.value)"
            style="width:60px;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;text-align:center;font-size:13px;">
        </div>
        <div style="color:#6b7280;padding-top:16px;">�</div>
        <div>
          <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">HORA FIN</div>
          <input type="number" min="0" max="24" value="${sched.endHour ?? 24}"
            data-ev="${idx}" data-field="endHour"
            onchange="window._evHourChange(${idx},'endHour',this.value)"
            style="width:60px;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;text-align:center;font-size:13px;">
        </div>
        <div style="font-size:8px;color:#4b5563;padding-top:14px;">hs. (ARG)</div>
      </div>` : `
      <div style="font-size:9px;color:#4b5563;margin-bottom:12px;">⏰ Todo el día</div>`}

      <div style="background:rgba(239,68,68,0.06);border-radius:10px;padding:10px;margin-bottom:10px;border:1px solid rgba(239,68,68,0.15);">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" data-ev="${idx}" data-field="ignoreTimeRestrictions" ${ev.config?.ignoreTimeRestrictions ? 'checked' : ''}
            style="accent-color:#ef4444;cursor:pointer;" onchange="window._evConfigToggle(${idx},'ignoreTimeRestrictions',this.checked)">
          <div>
            <span style="font-size:9px;color:#ef4444;font-family:'Press Start 2P',monospace;">⏰ IGNORAR HORARIOS</span>
            <div style="font-size:8px;color:#6b7280;margin-top:2px;">El Pokémon del evento aparecerá en su mapa a cualquier hora (IGNORA DÍA/NOCHE)</div>
          </div>
        </label>
      </div>

      <!-- Configuración de Competencia -->
      <div style="background:rgba(34,197,94,0.03); border:1px solid rgba(34,197,94,0.1); border-radius:10px; padding:10px;">
        <div style="font-size:8px; color:#22c55e; font-family:'Press Start 2P',monospace; margin-bottom:10px;">�x}� CONFIG. COMPETENCIA</div>
        
        <div style="margin-bottom:8px;">
           <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">POK�0MON OBJETIVO (ID)</div>
           <div style="display:flex;gap:8px;">
             <input type="text" value="${ev.config?.species || ''}" placeholder="ej: magikarp"
               onchange="window._evConfigFieldChange(${idx}, 'species', this.value)"
               style="flex:1;padding:8px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;box-sizing:border-box;">
             <div style="display:flex;flex-direction:column;">
               <div style="font-size:6px;color:#9ca3af;margin-bottom:2px;">MAPA x</div>
               <input type="number" step="0.1" value="${ev.config?.speciesRateMult || 1}" title="Multiplicador de aparición salvaje"
                 onchange="window._evConfigFieldChange(${idx}, 'speciesRateMult', parseFloat(this.value))"
                 style="width:50px;padding:8px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;text-align:center;">
             </div>
             <div style="display:flex;flex-direction:column;">
               <div style="font-size:6px;color:#9ca3af;margin-bottom:2px;">SHINY x</div>
               <input type="number" step="0.1" value="${ev.config?.speciesShinyMult || 1}" title="Multiplicador Shiny específico"
                 onchange="window._evConfigFieldChange(${idx}, 'speciesShinyMult', parseFloat(this.value))"
                 style="width:50px;padding:8px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;text-align:center;">
             </div>
           </div>
        </div>

        <div>
           <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">CRITERIO (sortBy)</div>
           <select onchange="window._evConfigFieldChange(${idx}, 'sortBy', this.value)"
             style="width:100%;padding:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;box-sizing:border-box;">
             <option value="data.total_ivs" ${ev.config?.sortBy==='data.total_ivs'?'selected':''}>�x�� IVs Totales</option>
             <option value="data.level" ${ev.config?.sortBy==='data.level'?'selected':''}>�x� Nivel</option>
             <option value="data.isShiny" ${ev.config?.sortBy==='data.isShiny'?'selected':''}>�S� Shiny</option>
           </select>
        </div>

        <div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
          <div>
            <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">EXP x</div>
            <input type="number" step="0.1" value="${ev.config?.expMult || 1}" 
              onchange="window._evConfigFieldChange(${idx}, 'expMult', parseFloat(this.value))"
              style="width:100%;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;text-align:center;">
          </div>
          <div>
            <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">DINERO x</div>
            <input type="number" step="0.1" value="${ev.config?.moneyMult || 1}" 
              onchange="window._evConfigFieldChange(${idx}, 'moneyMult', parseFloat(this.value))"
              style="width:100%;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;text-align:center;">
          </div>
          <div>
            <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">BC x</div>
            <input type="number" step="0.1" value="${ev.config?.bcMult || 1}" 
              onchange="window._evConfigFieldChange(${idx}, 'bcMult', parseFloat(this.value))"
              style="width:100%;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;text-align:center;">
          </div>
        </div>
        <div style="margin-top:8px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
          <div>
            <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">SHINY SALV. x</div>
            <input type="number" step="0.1" value="${ev.config?.shinyMult || 1}"
              onchange="window._evConfigFieldChange(${idx}, 'shinyMult', parseFloat(this.value))"
              style="width:100%;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;text-align:center;">
          </div>
          <div>
            <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">SHINY HUEVO x</div>
            <input type="number" step="0.1" value="${ev.config?.eggShinyMult || 1}"
              onchange="window._evConfigFieldChange(${idx}, 'eggShinyMult', parseFloat(this.value))"
              style="width:100%;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;text-align:center;">
          </div>
          <div>
            <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">ECLOSI�N x</div>
            <input type="number" step="0.1" value="${ev.config?.hatchMult || 1}"
              onchange="window._evConfigFieldChange(${idx}, 'hatchMult', parseFloat(this.value))"
              style="width:100%;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;text-align:center;">
          </div>
        </div>
        <div style="margin-top:8px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
          <div>
            <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">RIVAL x</div>
            <input type="number" step="0.1" value="${ev.config?.rivalMult || 1}"
              onchange="window._evConfigFieldChange(${idx}, 'rivalMult', parseFloat(this.value))"
              style="width:100%;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;text-align:center;">
          </div>
          <div>
            <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">ENTREN. x</div>
            <input type="number" step="0.1" value="${ev.config?.trainerMult || 1}"
              onchange="window._evConfigFieldChange(${idx}, 'trainerMult', parseFloat(this.value))"
              style="width:100%;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;text-align:center;">
          </div>
          <div>
            <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">PESCA x</div>
            <input type="number" step="0.1" value="${ev.config?.fishingMult || 1}"
              onchange="window._evConfigFieldChange(${idx}, 'fishingMult', parseFloat(this.value))"
              style="width:100%;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;text-align:center;">
          </div>
        </div>
      </div>
      </div>
    </div>`;


}

function _renderCompetitionTab() {
  const compEvents = _adminConfig?.events || [];
  const compEv = compEvents.find(e => e.id === _currentCompetitionId) || compEvents[0];
  if (!compEv) return '<div style="color:#6b7280;text-align:center;padding:20px;">No hay eventos disponibles.</div>';

  const prizes = compEv.config?.prizes || {};
  
  const p1 = prizes.first ? _prizeSummary(prizes.first) : 'Sin configurar';
  const p2 = prizes.second ? _prizeSummary(prizes.second) : 'Sin configurar';
  const p3 = prizes.third ? _prizeSummary(prizes.third) : 'Sin configurar';

  const competitionOptions = compEvents.map(e => `<option value="${e.id}" ${_currentCompetitionId === e.id ? 'selected' : ''}>${e.icon} ${e.name}</button>`).join('');

  const prizePreview = `
    <div style="font-size:10px;margin-top:4px;display:flex;flex-direction:column;gap:4px;">
      <div style="color:#fbbf24;">�x�! 1°. ${p1}</div>
      <div style="color:#94a3b8;">�x�� 2°. ${p2}</div>
      <div style="color:#b45309;">�x�0 3°. ${p3}</div>
    </div>`;

  const state = _prizeStates[_currentPrizeRank];

  const pokemonOptions = typeof POKEMON_DB !== 'undefined'
    ? Object.entries(POKEMON_DB).map(([k, v]) => `<option value="${k}" ${state.species === k ? 'selected' : ''}>${v.name}</option>`).join('')
    : '';

  const itemOptions = ALL_PRIZE_ITEMS.map(it => `<option value="${it}" ${state.item === it ? 'selected' : ''}>${it}</option>`).join('');
  const natureOptions = EV_NATURES.map(n => `<option value="${n}" ${state.nature === n ? 'selected' : ''}>${n}</option>`).join('');

  const statsFields = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const statLabels = { hp: 'PS', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Vel' };
  const ivInputs = statsFields.map(s => `
    <div style="text-align:center;">
      <div style="font-size:8px;color:#6b7280;margin-bottom:3px;">${statLabels[s]}</div>
      <input type="number" min="0" max="31" value="${state.ivs[s] ?? 31}"
        id="prize-iv-${s}"
        style="width:40px;padding:5px 2px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;text-align:center;font-size:11px;">
    </div>`).join('');

  return `
    <!-- Selector de Evento -->
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.08);">
      <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#9ca3af;margin-bottom:8px;">SELECCIONAR EVENTO</div>
      <select onchange="window._evSwitchCompetition(this.value)"
        style="width:100%;padding:10px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:11px;box-sizing:border-box;">
        ${competitionOptions}
      </select>
    </div>

    <!-- Premio actual -->
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:16px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#9ca3af;margin-bottom:6px;">PREMIO ACTUAL</div>
      ${prizePreview}
    </div>

    <!-- Constructor de premio -->
    <div style="background:rgba(255,255,255,0.04);border-radius:14px;padding:16px;margin-bottom:16px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#f59e0b;margin-bottom:14px;">�x�  CONFIGURAR PREMIO</div>

      <div style="display:flex;gap:4px;margin-bottom:12px;">
        ${[['first','�x�! 1ro'],['second','�x�� 2do'],['third','�x�0 3ro']].map(([v,l]) => `
          <button onclick="window._evSwitchPrizeRank('${v}')"
            style="flex:1;padding:8px;border:none;border-radius:8px;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;background:${_currentPrizeRank===v?'#f59e0b':'rgba(255,255,255,0.05)'};color:${_currentPrizeRank===v?'#000':'#9ca3af'};">
            ${l}
          </button>`).join('')}
      </div>

      <div style="margin-bottom:12px;">
        <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">TIPO DE PREMIO</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${[['money','�x� Dinero (��)'],['bc','�x�" Battle Coins'],['item','�x� Ítem'],['pokemon','�x�� Pokémon']].map(([v,l]) => `
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;background:rgba(0,0,0,0.3);border-radius:8px;padding:6px 10px;border:1px solid ${state.type===v?'#f59e0b':'rgba(255,255,255,0.08)'};">
              <input type="radio" name="prize-type" value="${v}" ${state.type===v?'checked':''} onchange="window._evPrizeType('${v}')" style="accent-color:#f59e0b;">
              <span style="font-size:10px;color:${state.type===v?'#f59e0b':'#9ca3af'};">${l}</span>
            </label>`).join('')}
        </div>
      </div>

      <!-- Money / BC -->
      <div id="prize-field-amount" style="display:${['money','bc'].includes(state.type)?'block':'none'};margin-bottom:12px;">
        <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">CANTIDAD ${state.type === 'bc' ? 'BC' : '��'}</div>
        <input type="number" min="0" id="prize-amount" value="${state.amount}"
          oninput="_prizeStates[_currentPrizeRank].amount=parseInt(this.value)||0"
          style="width:100%;padding:10px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;box-sizing:border-box;">
      </div>

      <!-- Item -->
      <div id="prize-field-item" style="display:${state.type==='item'?'block':'none'};margin-bottom:12px;">
        <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">ÍTEM</div>
        <select id="prize-item" onchange="_prizeStates[_currentPrizeRank].item=this.value"
          style="width:100%;padding:10px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:12px;margin-bottom:8px;box-sizing:border-box;">
          ${itemOptions}
        </select>
        <div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">CANTIDAD</div>
        <input type="number" min="1" id="prize-qty" value="${state.qty}"
          oninput="_prizeStates[_currentPrizeRank].qty=parseInt(this.value)||1"
          style="width:80px;padding:8px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:13px;">
      </div>

      <!-- Pokémon -->
      <div id="prize-field-pokemon" style="display:${state.type==='pokemon'?'block':'none'};margin-bottom:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div>
            <div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">ESPECIE</div>
            <select id="prize-species" onchange="_prizeStates[_currentPrizeRank].species=this.value"
              style="width:100%;padding:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;box-sizing:border-box;">
              ${pokemonOptions}
            </select>
          </div>
          <div>
            <div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">NIVEL</div>
            <input type="number" min="1" max="100" id="prize-level" value="${state.level}"
              oninput="_prizeStates[_currentPrizeRank].level=parseInt(this.value)||5"
              style="width:100%;padding:8px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:13px;box-sizing:border-box;">
          </div>
        </div>
        <div style="margin-bottom:10px;">
          <div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">NATURALEZA</div>
          <select id="prize-nature" onchange="_prizeStates[_currentPrizeRank].nature=this.value"
            style="width:100%;padding:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:11px;box-sizing:border-box;">
            ${natureOptions}
          </select>
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">GEN�0TICA (IVs)</div>
          <div style="display:flex;justify-content:space-between;gap:4px;">${ivInputs}</div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="prize-shiny" ${state.shiny?'checked':''} onchange="_prizeStates[_currentPrizeRank].shiny=this.checked" style="accent-color:#f59e0b;width:16px;height:16px;">
          <span style="font-size:10px;color:#f59e0b;">�S� ES SHINY</span>
        </label>
      </div>

      <button onclick="window._evSavePrize()"
        style="width:100%;padding:12px;border:none;border-radius:12px;background:rgba(255,255,255,0.07);color:#fff;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">
        �x� GUARDAR PODIO
      </button>
    </div>

    <!-- Participantes -->
    <div style="background:rgba(255,255,255,0.04);border-radius:14px;padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#22c55e;">�x}� PARTICIPANTES (${_adminEntries.length})</div>
        <div style="display:flex;gap:12px;align-items:center;">
          <button onclick="window._evClearEntries(window._currentCompetitionId)" title="Reiniciar lista" 
            style="background:none;border:none;color:#ef4444;font-size:16px;cursor:pointer;opacity:0.7;padding:4px;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">�x️</button>
          <button onclick="window._evLoadEntriesGlobal()" style="background:none;border:none;color:#6b7280;font-size:16px;cursor:pointer;padding:4px;">�x</button>
        </div>
      </div>
      <div id="admin-entries-container">
        <div style="font-size:11px;color:#6b7280;text-align:center;padding:20px;">Cargando...</div>
      </div>

      <button onclick="window._evAwardFullEvent(_currentCompetitionId)"
        style="width:100%;margin-top:16px;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;box-shadow:0 4px 15px rgba(34,197,94,0.3);">
        �x�  CERRAR Y PREMIAR PODIO
      </button>
    </div>`;
}

async function _evLoadEntries() {
  if (!isAdminUser()) return;
  try {
    const { data: entries, error } = await window.sb.from('competition_entries')
      .select('*')
      .eq('event_id', window._currentCompetitionId);
    
    if (error) throw error;
    
    const compEv = _adminConfig?.events?.find(e => e.id === _currentCompetitionId);
    const sortBy = compEv?.config?.sortBy || 'data.total_ivs';
    
    _adminEntries = (entries || []).sort((a, b) => {
      const valA = sortBy.startsWith('data.') ? a.data?.[sortBy.split('.')[1]] : a[sortBy];
      const valB = sortBy.startsWith('data.') ? b.data?.[sortBy.split('.')[1]] : b[sortBy];
      return (valB || 0) - (valA || 0);
    });
    
    _renderEntriesTable();
  } catch (e) { 
    console.warn('[Events] Error cargando participantes:', e); 
  }
}

function _renderEntriesTable() {
  const container = document.getElementById('admin-entries-container');
  if (!container) return;
  if (_adminEntries.length === 0) {
    container.innerHTML = '<div style="font-size:11px;color:#6b7280;text-align:center;padding:20px;">Sin participantes aún.</div>';
    return;
  }
  
  const sortBy = _adminConfig?.events?.find(e => e.id === _currentCompetitionId)?.config?.sortBy || 'data.total_ivs';
  const scoreLabel = sortBy.includes('ivs') ? 'IVs' : 'Puntos';

  const rows = _adminEntries.map((entry, rank) => {
    const d = entry.data || {};
    const ivDetail = d.ivs ? Object.values(d.ivs).join('/') : '�';
    const shinyTag = d.isShiny ? ' �S�' : '';
    const medal = rank === 0 ? '�x�!' : rank === 1 ? '�x��' : rank === 2 ? '�x�0' : `${rank + 1}.`;
    return `
      <div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;flex-shrink:0;">${medal}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:700;color:#e2e8f0;margin-bottom:3px;">${entry.player_name}${shinyTag}</div>
          <div style="font-size:10px;color:#f59e0b;font-weight:800;">${d.total_ivs || '?'}/186 IVs</div>
          <div style="font-size:9px;color:#6b7280;margin-top:2px;">${ivDetail}</div>
          <div style="font-size:8px;color:#4b5563;margin-top:1px;">${new Date(entry.submitted_at).toLocaleString('es-AR')}</div>
        </div>
        <button onclick="window._evAwardEntry('${entry.player_id}', '${entry.player_name.replace(/'/g,"\\\\'")}', '${entry.player_email}')"
          style="padding:8px 10px;border:none;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;flex-shrink:0;white-space:nowrap;">
          �x�  PREMIAR
        </button>
      </div>`;
  }).join('');
  container.innerHTML = rows;
}

async function _evSavePrize() {
  if (!isAdminUser()) return;
  
  const stats = ['hp','atk','def','spa','spd','spe'];
  const state = _prizeStates[_currentPrizeRank];

  if (state.type === 'pokemon') {
    stats.forEach(s => {
      const el = document.getElementById(`prize-iv-${s}`);
      if (el) state.ivs[s] = parseInt(el.value) || 0;
    });
    const specEl = document.getElementById('prize-species');
    const lvEl = document.getElementById('prize-level');
    const natEl = document.getElementById('prize-nature');
    const shinyEl = document.getElementById('prize-shiny');
    if (specEl) state.species = specEl.value;
    if (lvEl) state.level = parseInt(lvEl.value) || 5;
    if (natEl) state.nature = natEl.value;
    if (shinyEl) state.shiny = shinyEl.checked;
  }
  
  const ev = _adminConfig?.events?.find(e => e.id === _currentCompetitionId);
  if (ev) {
    ev.config = ev.config || {};
    ev.config.prizes = {
      first: _buildPrizeObject(_prizeStates.first),
      second: _buildPrizeObject(_prizeStates.second),
      third: _buildPrizeObject(_prizeStates.third)
    };
    // Mantenemos el criterio si ya existe, sino total_ivs
    ev.config.sortBy = ev.config.sortBy || 'data.total_ivs';
  }

  try {
    const { error } = await window.sb.from('events_config').update({
      config: ev.config
    }).eq('id', _currentCompetitionId);
    
    if (error) throw error;
    notify('¡Podio guardado correctamente!', '�x� '); 
    _renderAdminPanel();
  } catch (e) { 
    console.error(e);
    notify('Error al guardar podio en Supabase.', '�R'); 
  }
}

function _buildPrizeObject(state) {
  if (!state) return null;
  if (state.type === 'money') return { type: 'money', amount: state.amount };
  if (state.type === 'bc') return { type: 'bc', amount: state.amount };
  if (state.type === 'item') return { type: 'item', item: state.item, qty: state.qty };
  if (state.type === 'pokemon') {
    return {
      type: 'pokemon',
      species: state.species,
      level: state.level,
      nature: state.nature,
      ivs: { ...state.ivs },
      shiny: state.shiny
    };
  }
  return null;
}

function _prizeSummary(prize) {
  if (!prize) return 'Sin configurar';
  if (prize.type === 'money') return `��${(prize.amount || 0).toLocaleString()}`;
  if (prize.type === 'bc') return `${(prize.amount || 0).toLocaleString()} Battle Coins`;
  if (prize.type === 'item') return `${prize.qty || 1}x ${prize.item}`;
  if (prize.type === 'pokemon') {
    const name = (typeof POKEMON_DB !== 'undefined' && POKEMON_DB[prize.species]?.name) || prize.species;
    const shinyTag = prize.shiny ? ' �S�' : '';
    const totalIvs = Object.values(prize.ivs || {}).reduce((a, b) => a + b, 0);
    return `${name}${shinyTag} Nv.${prize.level} ${prize.nature} [${totalIvs}/186 IVs]`;
  }
  return 'Premio desconocido';
}

async function _evAwardEntry(playerId, playerName, playerEmail) {
  if (!confirm(`¿Premiar directamente a ${playerName}? (Solo 1er puesto)`)) return;
  try {
    const evId = window._currentCompetitionId || 'hora_magikarp';
    const { data: ev, error: fetchErr } = await window.sb.from('events_config').select('config').eq('id', evId).single();
    if (fetchErr) throw fetchErr;

    const prize = ev?.config?.prizes?.first;
    if (!prize) { alert('ERROR: El premio del 1er puesto no está configurado para este evento.'); return; }

    const { error } = await window.sb.from('awards').insert({
      winner_id: playerId,
      winner_name: playerName,
      winner_email: playerEmail || '�', // Garantizamos el email
      event_id: evId,
      prize,
      awarded_at: new Date().toISOString()
    });

    if (error) throw error;
    notify(`¡Recompensa enviada a ${playerName}!`, '�x}�');
    if (typeof checkPendingAwards === 'function') checkPendingAwards();
  } catch (e) {
    console.error('[Admin] Error al premiar:', e);
    alert('ERROR AL ENVIAR PREMIO:\n' + (e.message || e));
  }
}

window._evAwardEntry = _evAwardEntry;

window._evPrizeType = (type) => {
  const state = _prizeStates[_currentPrizeRank];
  state.type = type;
  document.getElementById('prize-field-amount').style.display = ['money','bc'].includes(type) ? 'block' : 'none';
  document.getElementById('prize-field-item').style.display = type === 'item' ? 'block' : 'none';
  document.getElementById('prize-field-pokemon').style.display = type === 'pokemon' ? 'block' : 'none';
  document.querySelectorAll('input[name="prize-type"]').forEach(r => {
    r.parentElement.style.borderColor = r.value === type ? '#f59e0b' : 'rgba(255,255,255,0.08)';
    r.parentElement.querySelector('span').style.color = r.value === type ? '#f59e0b' : '#9ca3af';
  });
};

window._evSwitchPrizeRank = (rank) => {
  _currentPrizeRank = rank;
  _renderAdminPanel();
};

window._evSwitchCompetition = (val) => {
  _currentCompetitionId = val;
  window._currentCompetitionId = val;
  _evLoadEntries();
  _renderAdminPanel();
};

async function awardEvent(eventId, manual = false) {
  try {
    if (manual && !isAdminUser()) return;
    if (manual) notify('Procesando premios...', '�x� ');
    
    // Llamar a la función segura en el servidor (Supabase RPC)
    const { data: res, error } = await window.sb.rpc('fn_award_event_automated', { 
      target_event_id: eventId 
    });

    if (error) throw error;

    if (res.ok) {
      if (manual) {
        const winners = res.winners || [];
        const lista = winners.map(w => {
          const num = w.rank === 'first' ? '1°' : w.rank === 'second' ? '2°' : '3°';
          return `${num} ${w.player_name}`;
        }).join('\n');
        alert(`¡EVENTO PREMIADO!\n\nPremios entregados:\n${lista}\n\nLos jugadores recibirán sus premios al entrar al juego.`);
      } else {
        console.log(`[Events] Auto: Evento ${eventId} premiado exitosamente.`);
      }
    } else {
      // Si el error es "Ya premiado", no molestamos en automático
      if (!manual && res.error?.includes('Ya premiado')) return;
      if (manual) alert('AVISO: ' + res.error);
    }

    if (manual) {
      _adminEntries = [];
      _renderAdminPanel();
      await _evLoadEntries();
    }
  } catch (e) {
    console.error('[Events] Error en awardEvent RPC:', e);
    if (manual) alert('ERROR EN PREMIACI�N:\n' + (e.message || e));
  }
}

async function checkAndDistributePrizes(allEvents) {
  // Ahora CUALQUIER jugador puede disparar la función segura de Supabase.
  // La función misma en Postgres verifica si ya se premió para no duplicar.

  for (const ev of allEvents) {
    if (ev.config?.hasCompetition === false) continue;
    
    const isActive = _isEventActiveNow(ev);
    if (!isActive && ev.config?.prizes) {
      // Para eventos semanales/programados que terminaron
      if (ev.schedule && ev.schedule.type === 'weekly') {
        // Solo intentamos premiar si no hay registro de premiación reciente en la tabla local o en el config
        const lastAwarded = ev.last_awarded_at ? new Date(ev.last_awarded_at) : new Date(0);
        if (new Date() - lastAwarded > 10 * 60 * 1000) {
          awardEvent(ev.id, false);
        }
      }
    }
  }
}

async function showEventResultsModal(eventId) {
  try {
    // Buscar si el evento es uno de los terminados en la lista activa
    const ev = _activeEvents.find(e => e.id === eventId);
    if (!ev) {
      // Si no lo encontramos en la lista local, pedimos los datos básicos
      const { data: baseEv } = await window.sb.from('events_config').select('name, icon').eq('id', eventId).single();
      if (!baseEv) return;
      var eventData = baseEv;
    } else {
      var eventData = ev;
    }

    let podium = eventData.resultData;
    
    // Si no tenemos los datos del podio (porque entramos directo), los buscamos
    if (!podium) {
      const { data: res } = await window.sb.from('competition_results')
        .select('winners')
        .eq('event_id', eventId)
        .order('ended_at', { ascending: false })
        .limit(1)
        .single();
      podium = res?.winners;
    }

    if (!podium) {
      alert('No se encontraron resultados para este evento.');
      if (typeof checkPendingAwards === 'function') checkPendingAwards();
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'podium-modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.3s;';

    const rows = podium.map(w => {
      const medal = w.rank === 'first' ? '�x�!' : w.rank === 'second' ? '�x��' : '�x�0';
      const color = w.rank === 'first' ? '#fbbf24' : w.rank === 'second' ? '#94a3b8' : '#b45309';
      return `
        <div style="background:rgba(255,255,255,0.05); border:1px solid ${color}44; border-radius:16px; padding:16px; display:flex; align-items:center; gap:16px; margin-bottom:12px;">
          <div style="font-size:28px;">${medal}</div>
          <div style="flex:1;">
            <div style="font-family:'Press Start 2P',monospace; font-size:10px; color:#fff; margin-bottom:4px;">${w.player_name}</div>
            <div style="font-size:12px; color:${color}; font-weight:bold;">${w.score} IVs Totales</div>
          </div>
        </div>`;
    }).join('');

    modal.innerHTML = `
      <div style="background:#0f172a; width:100%; max-width:550px; border-radius:32px; border:2px solid #334155; padding:32px; position:relative; overflow:hidden; box-shadow: 0 0 50px rgba(0,0,0,0.5); animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
        <button onclick="document.getElementById('podium-modal-overlay').remove()" 
          style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.05); border:none; color:#94a3b8; font-size:22px; cursor:pointer; z-index:10; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition: all 0.2s;">�S"</button>

        <div style="text-align:center; margin-bottom:28px;">
          ${eventData.config?.banner ? `
            <div style="width:100%; border-radius:20px; overflow:hidden; margin-bottom:24px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.2);">
              <img src="assets/eventos/${eventData.config.banner}" style="width:100%; height:auto; max-height:280px; object-fit:cover; display:block;">
            </div>
          ` : `<div style="font-size:48px; margin-bottom:12px;">${eventData.icon || '�x� '}</div>`}
          <div style="font-family:'Press Start 2P',monospace; font-size:12px; color:#fbbf24; margin-bottom:8px; letter-spacing:1px;">¡PODIO FINAL!</div>
          <div style="color:#64748b; font-size:12px;">${eventData.name}</div>
        </div>

        <div style="max-height:400px; overflow-y:auto; padding-right:4px;">
          ${rows}
        </div>

        <div style="margin-top:24px; text-align:center;">
          <div style="font-size:11px; color:#475569; font-style:italic;">Resultados finales del evento</div>
          <button onclick="document.getElementById('podium-modal-overlay').remove()"
            style="margin-top:20px; width:100%; padding:14px; border:none; border-radius:12px; background:rgba(255,255,255,0.08); color:#94a3b8; font-family:'Press Start 2P',monospace; font-size:9px; cursor:pointer;">
            CERRAR
          </button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    // Animaciones CSS
    if (!document.getElementById('podium-animations')) {
      const style = document.createElement('style');
      style.id = 'podium-animations';
      style.innerHTML = `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  } catch (e) {
    console.error('[Events] Error al mostrar podio:', e);
    alert('No se pudieron cargar los resultados.');
  }
}

window._evShowPodium = (eventId) => showEventResultsModal(eventId);

window._evAwardFullEvent = async (eventId) => {
  if (!confirm('¿Estás seguro de cerrar el concurso y repartir los premios del podio ahora? Esto eliminará a los participantes actuales.')) return;
  await awardEvent(eventId, true);
};

window._evClearEntries = async (eventId) => {
  const targetId = eventId || window._currentCompetitionId;
  if (!targetId) { alert('Error: No se encontró el ID del evento.'); return; }
  
  if (!confirm(`¿Estás seguro de ELIMINAR a todos los participantes del evento [${targetId}]?\n\nEsta acción es irreversible.`)) return;
  
  try {
    const { error, count } = await window.sb
      .from('competition_entries')
      .delete({ count: 'exact' })
      .eq('event_id', targetId);

    if (error) throw error;
    
    if (count === 0) {
      // RLS no dejó borrar nada - intentar borrar solo la entrada propia
      const myId = window.currentUser?.id;
      if (myId) {
        const { error: err2, count: cnt2 } = await window.sb
          .from('competition_entries')
          .delete({ count: 'exact' })
          .eq('event_id', targetId)
          .eq('player_id', myId);
        
        if (err2) throw err2;
        if (cnt2 === 0) {
          alert('AVISO: No se pudo borrar ningún participante.\n\nNecesitás agregar una política RLS en Supabase.\nAbrí la consola de Supabase �  SQL Editor y ejecutá la consulta que aparece en los pasos de configuración.');
          await _evLoadEntries();
          return;
        }
      }
    }

    _adminEntries = [];
    notify('¡Lista de participantes vaciada!', '�x️');
    _renderAdminPanel();
    await _evLoadEntries(); 
  } catch (e) {
    console.error('[Events] Error al limpiar:', e);
    alert('ERROR AL BORRAR:\n' + (e.message || e));
    await _evLoadEntries();
  }
};

window._evSavePrize = _evSavePrize;

window._evFieldChange = (idx, field, val) => {
  if (_adminConfig?.events?.[idx]) {
    _adminConfig.events[idx][field] = val;
    // Forzamos re-render para actualizar el texto ON/OFF inmediatamente
    _renderAdminPanel();
  }
};

window._evDayToggle = (idx, day, checked) => {
  if (!_adminConfig?.events?.[idx]) return;
  const ev = _adminConfig.events[idx];
  ev.schedule = ev.schedule || { type: 'weekly', days: [] };
  const days = ev.schedule.days || [];
  if (checked && !days.includes(day)) days.push(day);
  if (!checked) ev.schedule.days = days.filter(d => d !== day);
  else ev.schedule.days = days;
};

window._evHourChange = (idx, field, val) => {
  if (!_adminConfig?.events?.[idx]) return;
  _adminConfig.events[idx].schedule = _adminConfig.events[idx].schedule || {};
  _adminConfig.events[idx].schedule[field] = parseInt(val) || 0;
};

window._evConfigToggle = (idx, field, val) => {
  if (!_adminConfig?.events?.[idx]) return;
  _adminConfig.events[idx].config = _adminConfig.events[idx].config || {};
  _adminConfig.events[idx].config[field] = val;
};

window._evBannerChange = (idx, val) => {
  if (!_adminConfig?.events?.[idx]) return;
  _adminConfig.events[idx].config = _adminConfig.events[idx].config || {};
  _adminConfig.events[idx].config.banner = val;
};

window._evConfigFieldChange = (idx, field, val) => {
  if (!_adminConfig?.events?.[idx]) return;
  _adminConfig.events[idx].config = _adminConfig.events[idx].config || {};
  _adminConfig.events[idx].config[field] = val;
};

window._evPropChange = (idx, field, val) => {
  if (_adminConfig?.events?.[idx]) {
    _adminConfig.events[idx][field] = val;
  }
};
window._evLoadEntriesGlobal = _evLoadEntries;

// Se renombra la función global para evitar colisión con la local y recursión infinita
window._evLoadEntriesGlobal = async () => {
  await _evLoadEntries();
};

// Se elimina _evReadFormIntoConfig ya que ahora guardamos directamente del objeto _adminConfig modificado por los eventos de los inputs

// ���� Init ��������������������������������������������������������������������������������������������������������������������������������������������
(function _initEvents() {
  loadActiveEvents();
  _startEventPolling();
  // Verificar premios pendientes al cargar la página
  setTimeout(checkPendingAwards, 3000); // Esperar 3s a que el usuario esté logueado
})();








