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

// ── Estado del motor ──────────────────────────────────────────────────────────
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

// ── Auth token ────────────────────────────────────────────────────────────────
async function _evGetToken() {
  try {
    const { data: { session } } = await window.sb.auth.getSession();
    return session?.access_token || null;
  } catch { return null; }
}

function isAdminUser() {
  return window.currentUser?.email === ADMIN_EMAIL_EV;
}

// ── Motor de eventos (Supabase) ────────────────────────────────────────────────
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
    if (sched.startHour !== undefined && hour < sched.startHour) return false;
    if (sched.endHour !== undefined && hour >= sched.endHour) return false;
    return true;
  }
  
  return false;
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

function _startEventPolling() {
  if (_eventPollInterval) clearInterval(_eventPollInterval);
  _eventPollInterval = setInterval(loadActiveEvents, 5 * 60 * 1000);
}

// ── Banner de eventos activos ─────────────────────────────────────────────────
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

  const cfg = ev.config || {};

  // ── Bonificaciones activas ──────────────────────────────────────
  const bonusMap = {
    expMult:   { label: '⚡ EXP', color: '#a78bfa' },
    moneyMult: { label: '💰 Dinero', color: '#fbbf24' },
    bcMult:    { label: '🪙 Battle Coins', color: '#60a5fa' },
    shinyMult: { label: '✨ Shiny Rate', color: '#f472b6' },
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

  // ── Premio del 1er puesto ────────────────────────────────────────
  let prizeHtml = '';
  const prize = cfg.prizes?.first;
  if (prize) {
    let prizeDesc = '';
    if (prize.type === 'money')   prizeDesc = `💰 ₽${(prize.amount || 0).toLocaleString()}`;
    if (prize.type === 'bc')      prizeDesc = `🪙 ${(prize.amount || 0).toLocaleString()} Battle Coins`;
    if (prize.type === 'item')    prizeDesc = `📦 ${prize.qty || 1}x ${prize.item}`;
    if (prize.type === 'pokemon') {
      const name = (typeof POKEMON_DB !== 'undefined' && POKEMON_DB[prize.species]?.name) || prize.species;
      prizeDesc = `🐾 ${name}${prize.shiny ? ' ✨' : ''} Nv.${prize.level} — ${prize.nature}`;
    }

    prizeHtml = `
      <div style="margin-bottom:16px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#64748b;margin-bottom:8px;letter-spacing:1px;">🥇 PREMIO AL GANADOR</div>
        <div style="background:linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.06));
                    border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:12px 16px;
                    font-size:13px;color:#fde68a;font-weight:700;">
          ${prizeDesc}
        </div>
      </div>`;
  }

  // ── Métrica del concurso ─────────────────────────────────────────
  let metricHtml = '';
  const sortBy = cfg.sortBy;
  if (sortBy) {
    const metricLabels = {
      'data.total_ivs': '🧬 Mayor cantidad de IVs totales del Magikarp',
    };
    const metricText = metricLabels[sortBy] || sortBy;
    metricHtml = `
      <div style="margin-bottom:16px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#64748b;margin-bottom:8px;letter-spacing:1px;">CRITERIO DE VICTORIA</div>
        <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 14px;font-size:12px;color:#94a3b8;">
          ${metricText}
        </div>
      </div>`;
  }

  // ── Horario ──────────────────────────────────────────────────────
  let schedHtml = '';
  const sched = ev.schedule;
  if (sched?.type === 'weekly' && sched.days?.length) {
    const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const days = sched.days.map(d => dayNames[d]).join(', ');
    const hours = (sched.startHour !== undefined && sched.endHour !== undefined)
      ? ` · ${sched.startHour}:00 – ${sched.endHour}:00 hs (ARG)` : '';
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
          🟢 Evento activo ahora mismo
        </div>
      </div>`;
  }

  content.innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:52px;margin-bottom:10px;">${ev.icon || '🎁'}</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:13px;color:#fbbf24;
                  margin-bottom:10px;line-height:1.5;">${ev.name}</div>
      <div style="font-size:13px;color:#94a3b8;line-height:1.6;">${ev.description || '¡Aprovechá este evento especial mientras esté activo!'}</div>
    </div>
    <div style="height:1px;background:rgba(255,255,255,0.08);margin-bottom:16px;"></div>
    ${bonusHtml}${prizeHtml}${metricHtml}${schedHtml}
  `;

  modal.style.display = 'flex';
}


// ── Concurso de Magikarp ──────────────────────────────────────────────────────
async function submitMagikarpEntry(pokemon, eventId = 'hora_magikarp') {
  if (!isEventActive(eventId) || !window.currentUser) return;
  const totalIvs = Object.values(pokemon.ivs || {}).reduce((a, b) => a + b, 0);
  try {
    const { data: existing } = await window.sb.from('competition_entries')
      .select('data')
      .eq('event_id', eventId)
      .eq('player_id', window.currentUser.id)
      .single();

    if (existing && (existing.data?.total_ivs || 0) >= totalIvs) {
      notify('Ya tenés una inscripción mejor en este concurso.', '🎣');
      return;
    }

    const { error } = await window.sb.from('competition_entries').upsert({
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
    });

    if (error) throw error;
    notify(`¡Registro exitoso! Puntuación actual: ${totalIvs}`, '🎣');
  } catch (e) {
    console.warn('[Events] Error al inscribir:', e);
    notify('Error al inscribir en el concurso.', '❌');
  }
}

// ── Verificación de récord antes de mostrar el diálogo ────────────────────────
async function checkMagikarpAndPrompt(pokemon) {
  if (!isEventActive('hora_magikarp') || !window.currentUser) return;
  
  const totalIvs = Object.values(pokemon.ivs || {}).reduce((a, b) => a + b, 0);
  
  try {
    // Verificar si el jugador ya tiene un Magikarp registrado
    const { data: existing } = await window.sb.from('competition_entries')
      .select('data')
      .eq('event_id', 'hora_magikarp')
      .eq('player_id', window.currentUser.id)
      .single();
    
    // Si existe un registro y el nuevo Magikarp no es mejor, no mostrar diálogo
    if (existing && (existing.data?.total_ivs || 0) >= totalIvs) {
      return; // Silenciosamente ignorar Magikarp peores
    }
    
    // Si el nuevo Magikarp es mejor (o no hay registro), mostrar el diálogo
    promptMagikarpSubmit(pokemon);
  } catch (e) {
    // Si hay error en la consulta, mostrar el diálogo de todas formas
    console.warn('[Events] Error verificando récord de Magikarp:', e);
    promptMagikarpSubmit(pokemon);
  }
}

function promptMagikarpSubmit(pokemon) {
  if (!isEventActive('hora_magikarp')) return;
  const totalIvs = Object.values(pokemon.ivs || {}).reduce((a, b) => a + b, 0);
  const ov = document.createElement('div');
  ov.id = 'magikarp-submit-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = `
    <div style="background:#1e293b;border-radius:20px;padding:24px;max-width:360px;width:100%;border:2px solid #22c55e44;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">🎣</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:#22c55e;margin-bottom:12px;">HORA DE PESCA ACTIVA</div>
      <div style="font-size:12px;color:#e2e8f0;margin-bottom:8px;">¡Capturaste un Magikarp con <strong style="color:#f59e0b;">${totalIvs}/186 IVs</strong>!</div>
      <div style="font-size:11px;color:#9ca3af;margin-bottom:20px;">¿Querés inscribirlo en el concurso?${pokemon.isShiny ? ' <span style="color:#fbbf24;">✨ ¡Es Shiny!</span>' : ''}</div>
      <div style="display:flex;gap:10px;">
        <button onclick="submitMagikarpEntry(_magikarpPrize);document.getElementById('magikarp-submit-overlay').remove()"
          style="flex:1;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">
          🏆 INSCRIBIR
        </button>
        <button onclick="document.getElementById('magikarp-submit-overlay').remove()"
          style="flex:1;padding:12px;border:none;border-radius:12px;background:rgba(255,255,255,0.07);color:#9ca3af;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">
          NO GRACIAS
        </button>
      </div>
    </div>`;
  window._magikarpPrize = pokemon;
  document.body.appendChild(ov);
}

// ── Entrega de premios ────────────────────────────────────────────────────────
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

// ── Banner de premio pendiente ────────────────────────────────────────────────
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
    <span style="font-size:24px;">🏆</span>
    <div>
      <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#fff;letter-spacing:1px;">
        ${count > 1 ? `¡TENÉS ${count} PREMIOS!` : '¡HAS GANADO!'}
      </div>
      <div style="font-size:10px;color:rgba(255,255,255,0.85);margin-top:3px;">
        Tocá aquí para reclamar tus premios
      </div>
    </div>
    <span style="font-size:20px;">🎁</span>
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
    if (prize.type === 'money') desc = `💰 ₽${(prize.amount || 0).toLocaleString()}`;
    else if (prize.type === 'bc') desc = `🪙 ${(prize.amount || 0).toLocaleString()} Battle Coins`;
    else if (prize.type === 'item') desc = `📦 ${prize.qty || 1}x ${prize.item}`;
    else if (prize.type === 'pokemon') {
      const name = (typeof POKEMON_DB !== 'undefined' && POKEMON_DB[prize.species]?.name) || prize.species;
      desc = `🐾 ${name}${prize.shiny ? ' ✨' : ''} Nv.${prize.level}`;
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
        <div style="font-size:44px;margin-bottom:8px;">🏆</div>
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
      notify('¡Premio reclamado con éxito!', '🎉');
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
    notify('Error al reclamar el premio.', '❌');
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
    notify(`🏆 Premio de torneo: ₽${(prize.amount || 0).toLocaleString()}`, '🎉');
    delivered = true;
  } else if (prize.type === 'bc') {
    state.battleCoins = (state.battleCoins || 0) + (prize.amount || 0);
    notify(`🏆 Premio de torneo: ${(prize.amount || 0).toLocaleString()} Battle Coins`, '🎉');
    delivered = true;
  } else if (prize.type === 'item') {
    state.inventory = state.inventory || {};
    state.inventory[prize.item] = (state.inventory[prize.item] || 0) + (prize.qty || 1);
    notify(`🏆 Premio de torneo: ${prize.qty || 1}x ${prize.item}`, '🎉');
    delivered = true;
  } else if (prize.type === 'pokemon') {
    if (typeof makePokemon === 'function' && POKEMON_DB[prize.species]) {
      const poke = makePokemon(prize.species, prize.level || 5);
      if (prize.nature) poke.nature = prize.nature;
      if (prize.ivs) poke.ivs = { ...poke.ivs, ...prize.ivs };
      if (prize.shiny) poke.isShiny = true;
      poke.originalTrainer = 'EVENTO';
      state.box = state.box || [];
      state.box.push(poke);
      const shinyTag = prize.shiny ? ' ✨' : '';
      notify(`🏆 Premio de torneo: ${POKEMON_DB[prize.species]?.name || prize.species}${shinyTag} añadido a tu PC`, '🎉');
      delivered = true;
    }
  }

  if (delivered) {
    if (typeof updateHud === 'function') updateHud();
    if (typeof saveGame === 'function') saveGame(false);
  }

  return delivered;
}

// ── Panel de Administrador ────────────────────────────────────────────────────
async function openAdminPanel() {
  if (!isAdminUser()) { notify('Sin acceso.', '🚫'); return; }
  const existing = document.getElementById('admin-panel-overlay');
  if (existing) existing.remove();

  try {
    const { data: events, error } = await window.sb.from('events_config').select('*').order('id');
    if (error) throw error;
    
    _adminConfig = { events };
    _renderAdminPanel();
    
    // Cargamos los participantes del concurso de inmediato
    await _evLoadEntries();
  } catch (e) {
    console.error('[Admin] Error:', e);
    notify('Error: ' + e.message, '❌');
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

  const eventsHtml = (_adminConfig?.events || []).map((ev, i) => _renderEventCard(ev, i)).join('');
  const compHtml = _renderCompetitionTab();

  ov.innerHTML = `
    <div style="background:#0f172a;border-radius:20px;padding:24px;width:100%;max-width:560px;border:2px solid #f59e0b44;box-shadow:0 8px 60px rgba(0,0,0,0.8);margin:auto;">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:28px;">🛡️</span>
          <div>
            <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:#f59e0b;">ADMINISTRADOR</div>
            <div style="font-size:9px;color:#6b7280;margin-top:3px;">Solo visible para ti (Online)</div>
          </div>
        </div>
        <button onclick="document.getElementById('admin-panel-overlay').remove()"
          style="background:none;border:none;color:#6b7280;font-size:24px;cursor:pointer;line-height:1;">✕</button>
      </div>

      <!-- Tabs -->
      <div style="display:flex;background:rgba(255,255,255,0.05);border-radius:12px;padding:4px;margin-bottom:20px;gap:4px;">
        <button onclick="window._evAdminSwitchTab('events')"
          style="flex:1;padding:10px;border:none;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;background:${tab1Active ? '#f59e0b' : 'transparent'};color:${tab1Active ? '#000' : '#9ca3af'};">
          ⚙️ EVENTOS
        </button>
        <button onclick="window._evAdminSwitchTab('competition')"
          style="flex:1;padding:10px;border:none;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;background:${tab2Active ? '#22c55e' : 'transparent'};color:${tab2Active ? '#000' : '#9ca3af'};">
          🎣 CONCURSO
        </button>
      </div>

      <!-- Events Tab -->
      <div id="admin-tab-events" style="display:${tab1Active ? 'block' : 'none'};">
        <div style="display:flex;flex-direction:column;gap:14px;" id="admin-events-list">
          ${eventsHtml}
        </div>
        <button onclick="window._evAdminSave()"
          style="width:100%;margin-top:16px;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">
          💾 GUARDAR CAMBIOS
        </button>
      </div>

      <!-- Competition Tab -->
      <div id="admin-tab-competition" style="display:${tab2Active ? 'block' : 'none'};">
        ${compHtml}
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

  window._evAdminSave = async () => {
    try {
      // Guardamos cada evento modificado
      for (const ev of (_adminConfig?.events || [])) {
        const { error } = await window.sb.from('events_config').update({
          active: ev.active,
          manual: ev.manual,
          schedule: ev.schedule,
          config: ev.config
        }).eq('id', ev.id);
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
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:22px;">${ev.icon}</span>
          <div>
            <div style="font-size:11px;font-weight:700;color:#e2e8f0;">${ev.name}</div>
            <div style="font-size:9px;color:#6b7280;margin-top:2px;">${ev.description}</div>
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex-shrink:0;">
          <input type="checkbox" data-ev="${idx}" data-field="active" ${ev.active ? 'checked' : ''}
            style="accent-color:#22c55e;width:16px;height:16px;cursor:pointer;" onchange="window._evFieldChange(${idx},'active',this.checked)">
          <span style="font-size:9px;color:${ev.active ? '#22c55e' : '#6b7280'};font-family:'Press Start 2P',monospace;">${ev.active ? 'ON' : 'OFF'}</span>
        </label>
      </div>

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
            <span style="font-size:9px;color:#22c55e;font-family:'Press Start 2P',monospace;">🏆 TIENE COMPETENCIA/PREMIOS</span>
            <div style="font-size:8px;color:#6b7280;margin-top:2px;">Desactivar para eventos solo de bonificaciones (EXP doble, etc.)</div>
          </div>
        </label>
      </div>

      <div style="font-size:9px;color:#9ca3af;margin-bottom:8px;font-family:'Press Start 2P',monospace;">DÍAS DE LA SEMANA (ARG)</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">${daysHtml}</div>

      ${hasHours ? `
      <div style="display:flex;gap:12px;align-items:center;">
        <div>
          <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">HORA INICIO</div>
          <input type="number" min="0" max="23" value="${sched.startHour ?? 0}"
            data-ev="${idx}" data-field="startHour"
            onchange="window._evHourChange(${idx},'startHour',this.value)"
            style="width:60px;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;text-align:center;font-size:13px;">
        </div>
        <div style="color:#6b7280;padding-top:16px;">—</div>
        <div>
          <div style="font-size:8px;color:#9ca3af;margin-bottom:4px;">HORA FIN</div>
          <input type="number" min="0" max="24" value="${sched.endHour ?? 24}"
            data-ev="${idx}" data-field="endHour"
            onchange="window._evHourChange(${idx},'endHour',this.value)"
            style="width:60px;padding:6px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;text-align:center;font-size:13px;">
        </div>
        <div style="font-size:8px;color:#4b5563;padding-top:14px;">hs. (ARG)</div>
      </div>` : `
      <div style="font-size:9px;color:#4b5563;">⏰ Todo el día</div>`}
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
      <div style="color:#fbbf24;">🥇 1°. ${p1}</div>
      <div style="color:#94a3b8;">🥈 2°. ${p2}</div>
      <div style="color:#b45309;">🥉 3°. ${p3}</div>
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
      <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#f59e0b;margin-bottom:14px;">🏆 CONFIGURAR PREMIO</div>

      <div style="display:flex;gap:4px;margin-bottom:12px;">
        ${[['first','🥇 1ro'],['second','🥈 2do'],['third','🥉 3ro']].map(([v,l]) => `
          <button onclick="window._evSwitchPrizeRank('${v}')"
            style="flex:1;padding:8px;border:none;border-radius:8px;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;background:${_currentPrizeRank===v?'#f59e0b':'rgba(255,255,255,0.05)'};color:${_currentPrizeRank===v?'#000':'#9ca3af'};">
            ${l}
          </button>`).join('')}
      </div>

      <div style="margin-bottom:12px;">
        <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">TIPO DE PREMIO</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${[['money','💰 Dinero (₽)'],['bc','🪙 Battle Coins'],['item','📦 Ítem'],['pokemon','🐾 Pokémon']].map(([v,l]) => `
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;background:rgba(0,0,0,0.3);border-radius:8px;padding:6px 10px;border:1px solid ${state.type===v?'#f59e0b':'rgba(255,255,255,0.08)'};">
              <input type="radio" name="prize-type" value="${v}" ${state.type===v?'checked':''} onchange="window._evPrizeType('${v}')" style="accent-color:#f59e0b;">
              <span style="font-size:10px;color:${state.type===v?'#f59e0b':'#9ca3af'};">${l}</span>
            </label>`).join('')}
        </div>
      </div>

      <!-- Money / BC -->
      <div id="prize-field-amount" style="display:${['money','bc'].includes(state.type)?'block':'none'};margin-bottom:12px;">
        <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">CANTIDAD ${state.type === 'bc' ? 'BC' : '₽'}</div>
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
          <div style="font-size:9px;color:#9ca3af;margin-bottom:6px;">GENÉTICA (IVs)</div>
          <div style="display:flex;justify-content:space-between;gap:4px;">${ivInputs}</div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="prize-shiny" ${state.shiny?'checked':''} onchange="_prizeStates[_currentPrizeRank].shiny=this.checked" style="accent-color:#f59e0b;width:16px;height:16px;">
          <span style="font-size:10px;color:#f59e0b;">✨ ES SHINY</span>
        </label>
      </div>

      <button onclick="window._evSavePrize()"
        style="width:100%;padding:12px;border:none;border-radius:12px;background:rgba(255,255,255,0.07);color:#fff;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">
        💾 GUARDAR PODIO
      </button>
    </div>

    <!-- Participantes -->
    <div style="background:rgba(255,255,255,0.04);border-radius:14px;padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#22c55e;">🎣 PARTICIPANTES (${_adminEntries.length})</div>
        <div style="display:flex;gap:12px;align-items:center;">
          <button onclick="window._evClearEntries(window._currentCompetitionId)" title="Reiniciar lista" 
            style="background:none;border:none;color:#ef4444;font-size:16px;cursor:pointer;opacity:0.7;padding:4px;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">🗑️</button>
          <button onclick="window._evLoadEntriesGlobal()" style="background:none;border:none;color:#6b7280;font-size:16px;cursor:pointer;padding:4px;">🔄</button>
        </div>
      </div>
      <div id="admin-entries-container">
        <div style="font-size:11px;color:#6b7280;text-align:center;padding:20px;">Cargando...</div>
      </div>

      <button onclick="window._evAwardFullEvent(_currentCompetitionId)"
        style="width:100%;margin-top:16px;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;box-shadow:0 4px 15px rgba(34,197,94,0.3);">
        🏆 CERRAR Y PREMIAR PODIO
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
    const ivDetail = d.ivs ? Object.values(d.ivs).join('/') : '—';
    const shinyTag = d.isShiny ? ' ✨' : '';
    const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}.`;
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
          🏆 PREMIAR
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
    notify('¡Podio guardado correctamente!', '🏆'); 
    _renderAdminPanel();
  } catch (e) { 
    console.error(e);
    notify('Error al guardar podio en Supabase.', '❌'); 
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
  if (prize.type === 'money') return `₽${(prize.amount || 0).toLocaleString()}`;
  if (prize.type === 'bc') return `${(prize.amount || 0).toLocaleString()} Battle Coins`;
  if (prize.type === 'item') return `${prize.qty || 1}x ${prize.item}`;
  if (prize.type === 'pokemon') {
    const name = (typeof POKEMON_DB !== 'undefined' && POKEMON_DB[prize.species]?.name) || prize.species;
    const shinyTag = prize.shiny ? ' ✨' : '';
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
      winner_email: playerEmail || '—', // Garantizamos el email
      event_id: evId,
      prize,
      awarded_at: new Date().toISOString()
    });

    if (error) throw error;
    notify(`¡Recompensa enviada a ${playerName}!`, '🎁');
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
    // 1. Obtener config
    const { data: ev, error: fetchEvErr } = await window.sb.from('events_config').select('*').eq('id', eventId).single();
    if (fetchEvErr) throw fetchEvErr;

    // 2. Obtener participantes
    const { data: entries, error: fetchEntErr } = await window.sb.from('competition_entries').select('*').eq('event_id', eventId);
    if (fetchEntErr) throw fetchEntErr;

    // Evitar premiación doble (< 10 min)
    const lastAwarded = ev.config?.lastAwardedAt ? new Date(ev.config.lastAwardedAt) : new Date(0);
    if (!manual && (new Date() - lastAwarded < 10 * 60 * 1000)) return;

    const prizes = ev.config?.prizes;
    if (!prizes) {
      if (manual) alert('ERROR: No hay premios configurados.\nConfigure los premios en el Panel Admin → Concurso → Configurar Premio.');
      return;
    }

    if (!entries || entries.length === 0) {
      if (manual) alert('No hay participantes para premiar.\n\nEl evento terminó sin inscriptos, o ya fueron borrados previamente.');
      return;
    }

    notify('Procesando premios...', '🏆');

    // 3. Ordenar
    const sortBy = ev.config?.sortBy || 'data.total_ivs';
    const sorted = [...entries].sort((a, b) => {
      const valA = sortBy.startsWith('data.') ? a.data?.[sortBy.split('.')[1]] : a[sortBy];
      const valB = sortBy.startsWith('data.') ? b.data?.[sortBy.split('.')[1]] : b[sortBy];
      return (valB || 0) - (valA || 0);
    });

    const winners = [
      { rank: 'first', entry: sorted[0] },
      { rank: 'second', entry: sorted[1] },
      { rank: 'third', entry: sorted[2] }
    ].filter(w => w.entry);

    // 4. Insertar premios en 'awards'
    for (const winner of winners) {
      const prize = prizes[winner.rank];
      if (!prize) continue;
      const { error: awardErr } = await window.sb.from('awards').insert({
        winner_id: winner.entry.player_id,
        winner_name: winner.entry.player_name,
        winner_email: winner.entry.player_email || '—',
        event_id: eventId,
        prize,
        claimed: false,
        awarded_at: new Date().toISOString()
      });
      if (awardErr) {
        throw new Error(
          `No se pudo guardar el premio de ${winner.entry.player_name}.\n` +
          `Error: ${awardErr.message}\n\n` +
          `Si es un error de permisos (RLS), ejecutá este SQL en Supabase:\n` +
          `CREATE POLICY "Admin inserta premios" ON awards FOR INSERT TO authenticated ` +
          `WITH CHECK (auth.jwt() ->> 'email' = 'kodrol77@gmail.com');`
        );
      }
    }

    // 5. Guardar "foto" del podio en historial (competition_results)
    try {
      const winnersSnapshot = winners.map(w => ({
        rank: w.rank,
        player_name: w.entry.player_name,
        score: w.entry.data?.total_ivs || 0,
        player_id: w.entry.player_id
      }));

      await window.sb.from('competition_results').insert({
        event_id: eventId,
        winners: winnersSnapshot,
        ended_at: new Date().toISOString()
      });
    } catch (histErr) {
      console.warn('[Events] No se pudo guardar el historial del podio:', histErr);
    }

    // 6. Limpiar participantes
    const { error: delErr } = await window.sb.from('competition_entries').delete().eq('event_id', eventId);
    if (delErr) throw delErr;

    // 6. Actualizar lastAwardedAt
    const newConfig = { ...ev.config, lastAwardedAt: new Date().toISOString() };
    await window.sb.from('events_config').update({ config: newConfig }).eq('id', eventId);

    const lista = winners.map(w => {
      const num = w.rank === 'first' ? '1°' : w.rank === 'second' ? '2°' : '3°';
      return `${num} ${w.entry.player_name}`;
    }).join('\n');

    if (manual) alert(`¡EVENTO PREMIADO!\n\nPremios entregados:\n${lista}\n\nLos jugadores los recibirán al abrir el juego.`);
    else console.log(`[Events] Auto: Evento ${eventId} premiado (${winners.length} ganadores).`);

    _adminEntries = [];
    _renderAdminPanel();
    await _evLoadEntries();
  } catch (e) {
    console.error('[Events] Error en awardEvent:', e);
    alert('ERROR EN PREMIACIÓN:\n' + (e.message || e));
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
      const medal = w.rank === 'first' ? '🥇' : w.rank === 'second' ? '🥈' : '🥉';
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
      <div style="background:#0f172a; width:100%; max-width:480px; border-radius:24px; border:2px solid #334155; padding:32px; position:relative; overflow:hidden; box-shadow: 0 0 50px rgba(0,0,0,0.5);">
        <button onclick="document.getElementById('podium-modal-overlay').remove()" 
          style="position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.05); border:none; color:#94a3b8; font-size:20px; cursor:pointer; z-index:10; width:36px; height:36px; border-radius:50%;">✕</button>

        <div style="text-align:center; margin-bottom:28px;">
          <div style="font-size:48px; margin-bottom:12px;">${eventData.icon || '🏆'}</div>
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

async function checkAndDistributePrizes(allEvents) {
  for (const ev of allEvents) {
    // Saltar eventos sin competencia/premios
    if (ev.config?.hasCompetition === false) continue;
    const isActive = _isEventActiveNow(ev);
    const lastAwarded = ev.config?.lastAwardedAt ? new Date(ev.config.lastAwardedAt) : new Date(0);
    if (!isActive && ev.config?.prizes) {
      const sched = ev.schedule;
      if (sched && sched.type === 'weekly') {
        awardEvent(ev.id);
      }
    }
  }
}

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
          alert('AVISO: No se pudo borrar ningún participante.\n\nNecesitás agregar una política RLS en Supabase.\nAbrí la consola de Supabase → SQL Editor y ejecutá la consulta que aparece en los pasos de configuración.');
          await _evLoadEntries();
          return;
        }
      }
    }

    _adminEntries = [];
    notify('¡Lista de participantes vaciada!', '🗑️');
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


window._evLoadEntriesGlobal = _evLoadEntries;

// Se renombra la función global para evitar colisión con la local y recursión infinita
window._evLoadEntriesGlobal = async () => {
  await _evLoadEntries();
};

// Se elimina _evReadFormIntoConfig ya que ahora guardamos directamente del objeto _adminConfig modificado por los eventos de los inputs

// ── Init ──────────────────────────────────────────────────────────────────────
(function _initEvents() {
  loadActiveEvents();
  _startEventPolling();
  // Verificar premios pendientes al cargar la página
  setTimeout(checkPendingAwards, 3000); // Esperar 3s a que el usuario esté logueado
})();
