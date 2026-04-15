const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;
const ADMIN_EMAIL = 'kodrol77@gmail.com';
const DATA_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const ENTRIES_FILE = path.join(DATA_DIR, 'competition_entries.json');
const AWARDS_FILE = path.join(DATA_DIR, 'awards.json');

const MIME_TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.woff': 'font/woff', '.woff2': 'font/woff2'
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return fallback; }
}

function writeJson(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

function getEmailFromHeader(authHeader) {
  try {
    const token = (authHeader || '').replace('Bearer ', '').trim();
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
    return payload.email || null;
  } catch { return null; }
}

function isAdmin(req) {
  return getEmailFromHeader(req.headers['authorization']) === ADMIN_EMAIL;
}

function respond(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function isEventActiveNow(ev) {
  if (!ev.active) return false;
  if (ev.manual) return true;
  const sched = ev.schedule;
  if (!sched) return false;
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const day = now.getUTCDay();
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60;
  if (sched.type === 'weekly') {
    if (!sched.days.includes(day)) return false;
    if (sched.startHour !== undefined && hour < sched.startHour) return false;
    if (sched.endHour !== undefined && hour >= sched.endHour) return false;
  }
  return true;
}

const DEFAULT_EVENTS = {
  events: [
    {
      id: 'doble_exp',
      name: 'Fin de Semana de Doble EXP',
      icon: '⚡',
      type: 'passive_bonus',
      active: false,
      manual: false,
      schedule: { type: 'weekly', days: [6, 0] },
      config: { expMult: 2 },
      description: '¡EXP x2 en todos los combates durante el fin de semana!'
    },
    {
      id: 'hora_magikarp',
      name: 'Hora de Pesca del Magikarp',
      icon: '🎣',
      type: 'competition',
      active: false,
      manual: false,
      schedule: { type: 'weekly', days: [2], startHour: 18, endHour: 20 },
      config: { species: 'magikarp', metric: 'total_ivs', prize: null },
      description: '¡Capturá el Magikarp con mejores IVs y ganá un premio especial!'
    }
  ]
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = req.url.split('?')[0];

  if (url === '/api/time' && req.method === 'GET') {
    respond(res, 200, { now: Date.now() });
    return;
  }

  if (url === '/api/events' && req.method === 'GET') {
    const config = readJson(EVENTS_FILE, DEFAULT_EVENTS);
    const active = config.events.filter(ev => isEventActiveNow(ev));
    respond(res, 200, { events: active });
    return;
  }

  if (url === '/api/events/config') {
    if (req.method === 'GET') {
      if (!isAdmin(req)) { respond(res, 403, { error: 'No autorizado' }); return; }
      const config = readJson(EVENTS_FILE, DEFAULT_EVENTS);
      respond(res, 200, config);
      return;
    }
    if (req.method === 'POST') {
      if (!isAdmin(req)) { respond(res, 403, { error: 'No autorizado' }); return; }
      const body = await parseBody(req);
      if (!body.events) { respond(res, 400, { error: 'Config inválida' }); return; }
      writeJson(EVENTS_FILE, body);
      respond(res, 200, { ok: true });
      return;
    }
  }

  if (url.startsWith('/api/events/entries')) {
    const parts = url.split('/');
    const eventId = parts[4] || null;

    if (req.method === 'GET') {
      if (!isAdmin(req)) { respond(res, 403, { error: 'No autorizado' }); return; }
      const entries = readJson(ENTRIES_FILE, {});
      const result = eventId ? (entries[eventId] || []) : entries;
      respond(res, 200, { entries: result });
      return;
    }

    if (req.method === 'POST') {
      const email = getEmailFromHeader(req.headers['authorization']);
      if (!email) { respond(res, 401, { error: 'No autenticado' }); return; }
      const body = await parseBody(req);
      const { event_id, player_name, data } = body;
      const config = readJson(EVENTS_FILE, DEFAULT_EVENTS);
      const ev = config.events.find(e => e.id === event_id);
      if (!ev || !isEventActiveNow(ev)) {
        respond(res, 400, { error: 'El evento no está activo ahora' });
        return;
      }
      const entries = readJson(ENTRIES_FILE, {});
      if (!entries[event_id]) entries[event_id] = [];
      const entry = {
        id: Math.random().toString(36).substr(2, 9),
        event_id,
        player_email: email,
        player_name: player_name || email.split('@')[0],
        data,
        submitted_at: new Date().toISOString()
      };
      const existingIdx = entries[event_id].findIndex(e => e.player_email === email);
      if (existingIdx >= 0) {
        const prev = entries[event_id][existingIdx];
        if ((data.total_ivs || 0) > (prev.data.total_ivs || 0)) {
          entries[event_id][existingIdx] = entry;
        } else {
          respond(res, 200, { ok: true, kept: 'previous', entry: prev });
          return;
        }
      } else {
        entries[event_id].push(entry);
      }
      writeJson(ENTRIES_FILE, entries);
      respond(res, 200, { ok: true, entry });
      return;
    }
  }

  if (url === '/api/awards' && req.method === 'GET') {
    const email = getEmailFromHeader(req.headers['authorization']);
    if (!email) { respond(res, 401, { error: 'No autenticado' }); return; }
    const awards = readJson(AWARDS_FILE, []);
    const pending = awards.filter(a => a.winner_email === email && !a.claimed);
    respond(res, 200, { awards: pending });
    return;
  }

  if (url === '/api/awards/create' && req.method === 'POST') {
    if (!isAdmin(req)) { respond(res, 403, { error: 'No autorizado' }); return; }
    const body = await parseBody(req);
    const { winner_email, winner_name, event_id, prize } = body;
    if (!winner_email || !prize) { respond(res, 400, { error: 'Datos incompletos' }); return; }
    const awards = readJson(AWARDS_FILE, []);
    const award = {
      id: Math.random().toString(36).substr(2, 9),
      event_id,
      winner_email,
      winner_name,
      prize,
      awarded_at: new Date().toISOString(),
      claimed: false
    };
    awards.push(award);
    writeJson(AWARDS_FILE, awards);
    respond(res, 200, { ok: true, award });
    return;
  }

  if (url === '/api/awards/claim' && req.method === 'POST') {
    const email = getEmailFromHeader(req.headers['authorization']);
    if (!email) { respond(res, 401, { error: 'No autenticado' }); return; }
    const body = await parseBody(req);
    const { award_id } = body;
    const awards = readJson(AWARDS_FILE, []);
    const idx = awards.findIndex(a => a.id === award_id && a.winner_email === email);
    if (idx < 0) { respond(res, 404, { error: 'Premio no encontrado' }); return; }
    awards[idx].claimed = true;
    awards[idx].claimed_at = new Date().toISOString();
    writeJson(AWARDS_FILE, awards);
    respond(res, 200, { ok: true });
    return;
  }

  let filePath = '.' + req.url.split('?')[0];
  if (filePath === './') filePath = './index.html';
  if (filePath.includes('..')) { res.writeHead(403); res.end('Forbidden'); return; }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') { res.writeHead(404); res.end('Not found'); }
      else { res.writeHead(500); res.end('Server error: ' + error.code); }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  ensureDataDir();
  console.log(`Server running at http://localhost:${PORT}/`);
});
