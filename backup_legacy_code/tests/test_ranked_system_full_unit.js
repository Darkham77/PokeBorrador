const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const rankedScriptPath = 'js/24_passive_pvp.js';
const rankedSource = fs.readFileSync(rankedScriptPath, 'utf8');

function createSupabaseMock(steps = [], rpcHandler = null) {
  const queue = Array.isArray(steps) ? [...steps] : [];
  const calls = [];

  function normalizeOp(ctx) {
    return ctx.op || 'select';
  }

  function consume(ctx, terminal) {
    const call = {
      table: ctx.table,
      op: normalizeOp(ctx),
      terminal,
      select: ctx.select,
      payload: ctx.payload,
      deleteOpts: ctx.deleteOpts,
      filters: [...ctx.filters],
      order: ctx.order,
      limit: ctx.limit
    };
    calls.push(call);

    if (!queue.length) return { data: null, error: null };
    const step = queue.shift();
    if (step.table && step.table !== call.table) {
      throw new Error(`Unexpected table. Expected ${step.table}, got ${call.table}`);
    }
    if (step.op && step.op !== call.op) {
      throw new Error(`Unexpected op for ${call.table}. Expected ${step.op}, got ${call.op}`);
    }
    if (step.terminal && step.terminal !== terminal) {
      throw new Error(`Unexpected terminal for ${call.table}. Expected ${step.terminal}, got ${terminal}`);
    }
    if (typeof step.result === 'function') return step.result(call, calls);
    return step.result;
  }

  function createBuilder(table) {
    const ctx = {
      table,
      op: null,
      select: null,
      payload: null,
      deleteOpts: null,
      filters: [],
      order: null,
      limit: null
    };

    const api = {
      select(cols) { if (!ctx.op) ctx.op = 'select'; ctx.select = cols; return api; },
      insert(payload) { ctx.op = 'insert'; ctx.payload = payload; return api; },
      update(payload) { ctx.op = 'update'; ctx.payload = payload; return api; },
      delete(opts) { ctx.op = 'delete'; ctx.deleteOpts = opts || null; return api; },
      upsert(payload, opts) { ctx.op = 'upsert'; ctx.payload = { payload, opts }; return api; },
      eq(col, val) { ctx.filters.push({ kind: 'eq', col, val }); return api; },
      neq(col, val) { ctx.filters.push({ kind: 'neq', col, val }); return api; },
      gte(col, val) { ctx.filters.push({ kind: 'gte', col, val }); return api; },
      lte(col, val) { ctx.filters.push({ kind: 'lte', col, val }); return api; },
      order(col, opts) { ctx.order = { col, opts: opts || {} }; return api; },
      limit(val) { ctx.limit = val; return api; },
      single() { return Promise.resolve(consume(ctx, 'single')); },
      maybeSingle() { return Promise.resolve(consume(ctx, 'maybeSingle')); },
      then(resolve, reject) {
        return Promise.resolve(consume(ctx, 'then')).then(resolve, reject);
      }
    };

    return api;
  }

  const sb = {
    from(table) {
      return createBuilder(table);
    },
    rpc(fnName, args) {
      calls.push({ rpc: fnName, args });
      if (typeof rpcHandler === 'function') {
        return Promise.resolve(rpcHandler(fnName, args, calls));
      }
      return Promise.resolve({ data: null, error: null });
    }
  };

  return {
    sb,
    calls,
    remainingSteps() {
      return queue.length;
    }
  };
}

function createRankedSandbox({ sbSteps = [], rpcHandler = null, mathRandom = null } = {}) {
  const notifications = [];
  const dom = new Map();

  const timers = {
    intervals: [],
    timeouts: []
  };

  let timerId = 1;
  function fakeSetInterval(fn, ms) {
    const id = timerId++;
    timers.intervals.push({ id, fn, ms, active: true });
    return id;
  }
  function fakeClearInterval(id) {
    const t = timers.intervals.find(x => x.id === id);
    if (t) t.active = false;
  }
  function fakeSetTimeout(fn, ms) {
    const id = timerId++;
    timers.timeouts.push({ id, fn, ms, active: true });
    return id;
  }
  function fakeClearTimeout(id) {
    const t = timers.timeouts.find(x => x.id === id);
    if (t) t.active = false;
  }

  const mock = createSupabaseMock(sbSteps, rpcHandler);

  const doc = {
    getElementById(id) {
      if (!dom.has(id)) {
        dom.set(id, { id, style: { display: '' }, textContent: '', innerHTML: '' });
      }
      return dom.get(id);
    }
  };

  const mathObj = Object.create(Math);
  if (typeof mathRandom === 'function') {
    mathObj.random = mathRandom;
  }

  const sandbox = {
    console,
    Date,
    Math: mathObj,
    setInterval: fakeSetInterval,
    clearInterval: fakeClearInterval,
    setTimeout: fakeSetTimeout,
    clearTimeout: fakeClearTimeout,
    sessionStorage: {
      _s: {},
      setItem(k, v) { this._s[k] = String(v); },
      getItem(k) { return this._s[k] || null; },
      removeItem(k) { delete this._s[k]; }
    },
    window: { addEventListener: () => {} },
    document: doc,
    currentUser: null,
    sb: mock.sb,
    state: {
      team: [],
      box: [],
      passiveTeamUids: [],
      eloRating: 1000,
      pvpStats: { wins: 0, losses: 0, draws: 0 }
    },
    POKEMON_DB: {
      bulbasaur: { name: 'Bulbasaur', type: 'grass' },
      charmander: { name: 'Charmander', type: 'fire' },
      squirtle: { name: 'Squirtle', type: 'water' },
      pikachu: { name: 'Pikachu', type: 'electric' },
      poliwag: { name: 'Poliwag', type: ['water'] }
    },
    notify: (msg, icon) => notifications.push({ msg, icon }),
    scheduleSave: () => {},
    getSpriteUrl: () => '',
    ITEM_DATA: {},
    startPassiveBattleMode: null,
    startPvpBattle: null
  };

  vm.createContext(sandbox);
  vm.runInContext(rankedSource, sandbox, { filename: rankedScriptPath });

  return {
    sandbox,
    notifications,
    dom,
    timers,
    dbCalls: mock.calls,
    remainingSteps: mock.remainingSteps
  };
}

function createAdminRankedSandbox() {
  const evPath = 'js/21_events.js';
  const evSource = fs.readFileSync(evPath, 'utf8');
  const start = evSource.indexOf('const ADMIN_RANKED_TYPES = [');
  const end = evSource.indexOf('function _getAdminPokemonOptions()');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('Could not extract admin ranked normalization block');
  }
  const snippet = evSource.slice(start, end);

  const sandbox = { console, Date };
  vm.createContext(sandbox);
  vm.runInContext(snippet, sandbox, { filename: 'js/21_events.js#admin_ranked' });
  return sandbox;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('normalizeRankedRules clamps invalid values and deduplicates arrays', () => {
  const { sandbox } = createRankedSandbox();
  const out = sandbox.normalizeRankedRules({
    seasonStartDate: '2026-05-10',
    seasonEndDate: '2026-05-01',
    maxPokemon: 10,
    levelCap: 500,
    allowedTypes: ['fire', 'fire', 'invalid', 'water'],
    bannedPokemonIds: ['Pikachu', 'pikachu']
  }, 'S test');

  assert.strictEqual(out.seasonName, 'S test');
  assert.strictEqual(out.seasonStartDate, '2026-05-10');
  assert.strictEqual(out.seasonEndDate, '2026-05-10');
  assert.strictEqual(out.maxPokemon, 6);
  assert.strictEqual(out.levelCap, 100);
  assert.deepStrictEqual(Array.from(out.allowedTypes), ['fire', 'water']);
  assert.deepStrictEqual(Array.from(out.bannedPokemonIds), ['pikachu']);
});

test('getRankedSeasonDateRange keeps end >= start and returns iso fields', () => {
  const { sandbox } = createRankedSandbox();
  const range = sandbox.getRankedSeasonDateRange({ seasonStartDate: '2026-08-01', seasonEndDate: '2026-07-01' });
  assert.strictEqual(range.startIso, '2026-08-01');
  assert.strictEqual(range.endIso, '2026-08-01');
  assert.ok(range.endDate >= range.startDate);

  const endDate = sandbox.getSeasonEndDate({ seasonStartDate: '2026-09-01', seasonEndDate: '2026-10-01' });
  assert.ok(endDate instanceof Date);
});

test('validatePokemonForRanked enforces banned id, type and level cap', () => {
  const { sandbox } = createRankedSandbox();
  const rules = {
    seasonName: 'S1',
    maxPokemon: 3,
    levelCap: 50,
    allowedTypes: ['fire'],
    bannedPokemonIds: ['charmander']
  };

  assert.strictEqual(sandbox.validatePokemonForRanked({ id: 'charmander', name: 'Charmander', level: 20, type: 'fire' }, rules).ok, false);
  assert.strictEqual(sandbox.validatePokemonForRanked({ id: 'squirtle', name: 'Squirtle', level: 20, type: 'water' }, rules).ok, false);
  assert.strictEqual(sandbox.validatePokemonForRanked({ id: 'pikachu', name: 'Pikachu', level: 80, type: 'fire' }, rules).ok, false);
  assert.strictEqual(sandbox.validatePokemonForRanked({ id: 'pikachu', name: 'Pikachu', level: 40, type: 'fire' }, rules).ok, true);
});

test('validateTeamForRanked fails empty and oversize teams', () => {
  const { sandbox } = createRankedSandbox();
  const rules = { seasonName: 'S1', maxPokemon: 2, levelCap: 100, allowedTypes: [], bannedPokemonIds: [] };

  assert.strictEqual(sandbox.validateTeamForRanked([], rules, 'equipo ranked').ok, false);
  assert.strictEqual(sandbox.validateTeamForRanked([
    { id: 'a', name: 'A', level: 1, type: 'fire' },
    { id: 'b', name: 'B', level: 1, type: 'fire' },
    { id: 'c', name: 'C', level: 1, type: 'fire' }
  ], rules, 'equipo ranked').ok, false);
});

test('getRankedPlayableTeam deduplicates and filters KO or mission pokemon', () => {
  const { sandbox } = createRankedSandbox();
  sandbox.state.team = [
    { uid: 'u1', id: 'charmander', name: 'Charmander', level: 10, type: 'fire', hp: 10, onMission: false },
    { uid: 'u2', id: 'squirtle', name: 'Squirtle', level: 10, type: 'water', hp: 0, onMission: false }
  ];
  sandbox.state.box = [
    { uid: 'u3', id: 'pikachu', name: 'Pikachu', level: 10, type: 'electric', hp: 20, onMission: false },
    { uid: 'u4', id: 'bulbasaur', name: 'Bulbasaur', level: 10, type: 'grass', hp: 20, onMission: true }
  ];
  sandbox.state.passiveTeamUids = ['u1', 'u2', 'u3', 'u4', 'u1'];

  const got = sandbox.getRankedPlayableTeam().map(p => p.uid);
  assert.strictEqual(Array.from(got).join(','), 'u1,u3');
});

test('buildPassiveSnapshot keeps held item and normalizes move pp', () => {
  const { sandbox } = createRankedSandbox();
  const snap = sandbox.buildPassiveSnapshot({
    id: 'pikachu',
    name: 'Pikachu',
    level: 25,
    type: 'electric',
    maxHp: 60,
    atk: 40,
    def: 30,
    spa: 50,
    spd: 35,
    spe: 70,
    heldItem: 'Banda Focus',
    moves: [
      { name: 'Impactrueno', pp: 20, maxPP: 30, ppUps: 2 },
      { name: 'Placaje', pp: 35 }
    ]
  });

  assert.strictEqual(snap.heldItem, 'Banda Focus');
  assert.strictEqual(snap.moves[0].pp, 30);
  assert.strictEqual(snap.moves[1].maxPP, 35);
});

test('ensureRankedTeamEligibility loads rules and notifies on failure', async () => {
  const ctx = createRankedSandbox({
    sbSteps: [
      {
        table: 'ranked_rules_config',
        op: 'select',
        terminal: 'maybeSingle',
        result: {
          data: {
            season_name: 'S test',
            config: { maxPokemon: 6, levelCap: 5, allowedTypes: [], bannedPokemonIds: [] }
          },
          error: null
        }
      }
    ]
  });

  const result = await ctx.sandbox.ensureRankedTeamEligibility([
    { id: 'charmander', name: 'Charmander', level: 20, type: 'fire' }
  ], 'equipo ranked', true);

  assert.strictEqual(result.ok, false);
  assert.ok(ctx.notifications.length > 0);
  assert.ok(/nivel maximo/i.test(ctx.notifications[0].msg));
  assert.strictEqual(ctx.remainingSteps(), 0);
});

test('ensureRankedTeamEligibility can fail silently', async () => {
  const ctx = createRankedSandbox({
    sbSteps: [
      {
        table: 'ranked_rules_config',
        op: 'select',
        terminal: 'maybeSingle',
        result: {
          data: {
            season_name: 'S test',
            config: { maxPokemon: 1, levelCap: 100, allowedTypes: [], bannedPokemonIds: [] }
          },
          error: null
        }
      }
    ]
  });

  const result = await ctx.sandbox.ensureRankedTeamEligibility([
    { id: 'a', name: 'A', level: 1, type: 'fire' },
    { id: 'b', name: 'B', level: 1, type: 'fire' }
  ], 'equipo ranked', false);

  assert.strictEqual(result.ok, false);
  assert.strictEqual(ctx.notifications.length, 0);
});

test('findPassiveOpponent filters by elo window and returns deterministic target', async () => {
  const ctx = createRankedSandbox({
    sbSteps: [
      {
        table: 'passive_teams',
        op: 'select',
        terminal: 'then',
        result: {
          data: [
            { user_id: 'u2', team_data: [{ id: 'x' }], elo_rating: 1030 },
            { user_id: 'u3', team_data: [{ id: 'y' }], elo_rating: 980 }
          ],
          error: null
        }
      }
    ],
    mathRandom: () => 0
  });

  ctx.sandbox.currentUser = { id: 'u1' };
  ctx.sandbox.state.eloRating = 1000;

  const picked = await ctx.sandbox.findPassiveOpponent();
  assert.strictEqual(picked.user_id, 'u2');

  const q = ctx.dbCalls.find(c => c.table === 'passive_teams');
  assert.ok(q);
  const gte = q.filters.find(f => f.kind === 'gte' && f.col === 'elo_rating');
  const lte = q.filters.find(f => f.kind === 'lte' && f.col === 'elo_rating');
  assert.strictEqual(gte.val, 800);
  assert.strictEqual(lte.val, 1200);
});

test('startRankedMatchmaking rejects logged out users', async () => {
  const ctx = createRankedSandbox();
  await ctx.sandbox.startRankedMatchmaking();
  assert.strictEqual(ctx.sandbox.window.isRankedSearching, false);
  assert.ok(ctx.notifications.some(n => /logueado/i.test(n.msg)));
});

test('startRankedMatchmaking rejects when ranked team is missing', async () => {
  const ctx = createRankedSandbox();
  ctx.sandbox.currentUser = { id: 'u1' };
  await ctx.sandbox.startRankedMatchmaking();
  assert.strictEqual(ctx.sandbox.window.isRankedSearching, false);
  assert.ok(ctx.notifications.some(n => /equipo ranked/i.test(n.msg)));
});

test('startRankedMatchmaking rejects invalid team under loaded rules', async () => {
  const ctx = createRankedSandbox({
    sbSteps: [
      {
        table: 'ranked_rules_config',
        op: 'select',
        terminal: 'maybeSingle',
        result: {
          data: {
            season_name: 'S strict',
            config: { maxPokemon: 6, levelCap: 10, allowedTypes: [], bannedPokemonIds: [] }
          },
          error: null
        }
      }
    ]
  });

  ctx.sandbox.currentUser = { id: 'u1' };
  ctx.sandbox.state.team = [{ uid: 'a', id: 'charmander', name: 'Charmander', level: 40, type: 'fire', hp: 10, onMission: false }];
  ctx.sandbox.state.passiveTeamUids = ['a'];

  await ctx.sandbox.startRankedMatchmaking();
  assert.strictEqual(ctx.sandbox.window.isRankedSearching, false);
  assert.ok(ctx.notifications.some(n => /nivel maximo/i.test(n.msg)));
  assert.strictEqual(ctx.dbCalls.some(c => c.table === 'ranked_queue' && c.op === 'insert'), false);
});

test('startRankedMatchmaking enqueues and cancelRankedMatchmaking cleans queue', async () => {
  const ctx = createRankedSandbox({
    sbSteps: [
      {
        table: 'ranked_rules_config',
        op: 'select',
        terminal: 'maybeSingle',
        result: {
          data: {
            season_name: 'S open',
            config: { maxPokemon: 6, levelCap: 100, allowedTypes: [], bannedPokemonIds: [] }
          },
          error: null
        }
      },
      {
        table: 'ranked_queue',
        op: 'insert',
        terminal: 'single',
        result: { data: { id: 'queue-1' }, error: null }
      },
      {
        table: 'ranked_queue',
        op: 'delete',
        terminal: 'then',
        result: { data: null, error: null }
      }
    ]
  });

  ctx.sandbox.currentUser = { id: 'u1' };
  ctx.sandbox.state.eloRating = 1111;
  ctx.sandbox.state.team = [{ uid: 'a', id: 'charmander', name: 'Charmander', level: 20, type: 'fire', hp: 10, onMission: false }];
  ctx.sandbox.state.passiveTeamUids = ['a'];

  await ctx.sandbox.startRankedMatchmaking();
  assert.strictEqual(ctx.sandbox.window.isRankedSearching, true);
  assert.strictEqual(ctx.dom.get('btn-ranked-search').style.display, 'none');
  assert.strictEqual(ctx.dom.get('ranked-search-status').style.display, 'block');

  const insertCall = ctx.dbCalls.find(c => c.table === 'ranked_queue' && c.op === 'insert');
  assert.ok(insertCall);
  assert.strictEqual(insertCall.payload.user_id, 'u1');
  assert.strictEqual(insertCall.payload.elo_rating, 1111);
  assert.strictEqual(insertCall.payload.status, 'searching');

  await ctx.sandbox.cancelRankedMatchmaking(true);
  assert.strictEqual(ctx.sandbox.window.isRankedSearching, false);
  assert.strictEqual(ctx.dom.get('btn-ranked-search').style.display, 'block');
  assert.strictEqual(ctx.dom.get('ranked-search-status').style.display, 'none');

  const deleteCall = ctx.dbCalls.find(c => c.table === 'ranked_queue' && c.op === 'delete');
  assert.ok(deleteCall);
  const eqUser = deleteCall.filters.find(f => f.kind === 'eq' && f.col === 'user_id');
  assert.strictEqual(eqUser.val, 'u1');
});

test('_matchmakingFallbackToPassive notifies when no passive opponents are available', async () => {
  const ctx = createRankedSandbox({
    sbSteps: [
      {
        table: 'passive_teams',
        op: 'select',
        terminal: 'then',
        result: { data: [], error: null }
      }
    ]
  });

  ctx.sandbox.currentUser = { id: 'u1' };
  await ctx.sandbox._matchmakingFallbackToPassive();
  assert.ok(ctx.notifications.some(n => /No hay equipos pasivos/i.test(n.msg)));
});

test('_matchmakingFallbackToPassive builds enemy team and starts passive battle', async () => {
  const ctx = createRankedSandbox({
    sbSteps: [
      {
        table: 'passive_teams',
        op: 'select',
        terminal: 'then',
        result: {
          data: [{
            user_id: 'u2',
            elo_rating: 1200,
            team_data: [
              { id: 'squirtle', name: 'Squirtle', level: 30, type: 'water', maxHp: 88, hp: 1, status: 'burn', sleepTurns: 2 }
            ]
          }],
          error: null
        }
      },
      {
        table: 'profiles',
        op: 'select',
        terminal: 'single',
        result: { data: { username: 'RivalX' }, error: null }
      }
    ],
    mathRandom: () => 0
  });

  let battleArgs = null;
  ctx.sandbox.startPassiveBattleMode = (...args) => { battleArgs = args; };

  ctx.sandbox.currentUser = { id: 'u1' };
  ctx.sandbox.state.team = [{ uid: 'a', id: 'charmander', name: 'Charmander', level: 20, type: 'fire', hp: 10, onMission: false }];
  ctx.sandbox.state.passiveTeamUids = ['a'];

  await ctx.sandbox._matchmakingFallbackToPassive();

  assert.ok(battleArgs, 'startPassiveBattleMode should be called');
  assert.strictEqual(battleArgs[2], 'RivalX');
  assert.strictEqual(battleArgs[3], 'u2');
  const enemyTeam = battleArgs[1];
  assert.strictEqual(enemyTeam[0].hp, 88);
  assert.strictEqual(enemyTeam[0].status, null);
  assert.strictEqual(enemyTeam[0].sleepTurns, 0);
  assert.strictEqual(ctx.sandbox.state._passiveBattleOpponentId, 'u2');
});

test('reportPassiveBattleResult updates elo and stats on success', async () => {
  const ctx = createRankedSandbox({
    rpcHandler: (fnName, args) => {
      assert.strictEqual(fnName, 'fn_report_passive_battle');
      assert.strictEqual(args.p_defender_id, 'def-1');
      assert.strictEqual(args.p_result, 'win');
      return { data: { delta: 20, attacker_elo: 1020 }, error: null };
    }
  });

  ctx.sandbox.state.eloRating = 1000;
  ctx.sandbox.state.pvpStats = { wins: 3, losses: 1, draws: 0 };

  await ctx.sandbox.reportPassiveBattleResult('def-1', 'win');

  assert.strictEqual(ctx.sandbox.state.eloRating, 1020);
  assert.strictEqual(ctx.sandbox.state.pvpStats.wins, 4);
  assert.ok(ctx.notifications.some(n => /\+20/.test(n.msg)));
});

test('reportPassiveBattleResult notifies and exits on rpc error', async () => {
  const ctx = createRankedSandbox({
    rpcHandler: () => ({ data: null, error: { message: 'rpc failed' } })
  });

  ctx.sandbox.state.eloRating = 1000;
  ctx.sandbox.state.pvpStats = { wins: 1, losses: 2, draws: 0 };

  await ctx.sandbox.reportPassiveBattleResult('def-2', 'loss');

  assert.strictEqual(ctx.sandbox.state.eloRating, 1000);
  assert.strictEqual(ctx.sandbox.state.pvpStats.losses, 2);
  assert.ok(ctx.notifications.some(n => /Error guardando resultado/i.test(n.msg)));
});

test('_checkForHumanOpponent no-op when no queued rivals found', async () => {
  const ctx = createRankedSandbox({
    sbSteps: [
      {
        table: 'ranked_rules_config',
        op: 'select',
        terminal: 'maybeSingle',
        result: {
          data: {
            season_name: 'S open',
            config: { maxPokemon: 6, levelCap: 100, allowedTypes: [], bannedPokemonIds: [] }
          },
          error: null
        }
      },
      {
        table: 'ranked_queue',
        op: 'insert',
        terminal: 'single',
        result: { data: { id: 'queue-2' }, error: null }
      },
      {
        table: 'ranked_queue',
        op: 'select',
        terminal: 'then',
        result: { data: [], error: null }
      },
      {
        table: 'ranked_queue',
        op: 'delete',
        terminal: 'then',
        result: { data: null, error: null }
      }
    ]
  });

  ctx.sandbox.currentUser = { id: 'u1' };
  ctx.sandbox.state.team = [{ uid: 'a', id: 'charmander', name: 'Charmander', level: 20, type: 'fire', hp: 10, onMission: false }];
  ctx.sandbox.state.passiveTeamUids = ['a'];

  await ctx.sandbox.startRankedMatchmaking();
  await ctx.sandbox._checkForHumanOpponent();
  assert.strictEqual(ctx.sandbox.window.isRankedSearching, true);

  await ctx.sandbox.cancelRankedMatchmaking(true);
});

test('admin ranked normalization enforces season dates, clamps and dedupes', () => {
  const admin = createAdminRankedSandbox();
  assert.strictEqual(typeof admin._normalizeAdminRankedRules, 'function');

  const out = admin._normalizeAdminRankedRules({
    seasonStartDate: '2026-10-10',
    seasonEndDate: '2026-09-01',
    maxPokemon: 10,
    levelCap: 120,
    allowedTypes: ['fire', 'invalid', 'fire', 'water'],
    bannedPokemonIds: ['Pikachu', 'pikachu']
  }, 'ADMIN S');

  assert.strictEqual(out.seasonName, 'ADMIN S');
  assert.strictEqual(out.seasonStartDate, '2026-10-10');
  assert.strictEqual(out.seasonEndDate, '2026-10-10');
  assert.strictEqual(out.maxPokemon, 6);
  assert.strictEqual(out.levelCap, 100);
  assert.deepStrictEqual(Array.from(out.allowedTypes), ['fire', 'water']);
  assert.deepStrictEqual(Array.from(out.bannedPokemonIds), ['pikachu']);
});

(async () => {
  let passed = 0;
  let failed = 0;
  const failedCases = [];

  for (const t of tests) {
    try {
      await t.fn();
      passed += 1;
      console.log(`PASS - ${t.name}`);
    } catch (err) {
      failed += 1;
      failedCases.push({ name: t.name, error: err });
      console.error(`FAIL - ${t.name}`);
      console.error(err && err.stack ? err.stack : err);
    }
  }

  console.log(`\nRanked full unit suite: ${passed}/${tests.length} passed.`);
  if (failed > 0) {
    console.error(`Failed: ${failed}`);
    process.exit(1);
  }
})();