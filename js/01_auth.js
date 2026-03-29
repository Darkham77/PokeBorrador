
    // ===== SUPABASE =====
    const SUPABASE_URL = 'https://wakrkvizmoqdlrtnxcth.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indha3Jrdml6bW9xZGxydG54Y3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDA3MjYsImV4cCI6MjA4ODg3NjcyNn0.l_NYYNPDFOAr5CRqbuVf3jLv_TRnOw6shw9j9GzhQsA';
    const LOCAL_URL = 'http://localhost:3000';

    // Servidor activo: 'online' apunta a Supabase, 'local' apunta a localhost:3000
    window.currentServer = SUPABASE_URL;
    window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.currentUser = null;
    let _saveTimeout = null;

    // ── Server Selector ───────────────────────────────────────────────────────
    function switchServer(server) {
      if (server === 'online') {
        currentServer = SUPABASE_URL;
        document.getElementById('form-login').style.display = 'block';
        document.getElementById('form-signup').style.display = 'none';
        document.getElementById('form-local').style.display = 'none';
        document.getElementById('auth-tabs').style.display = 'flex';
        switchAuthTab('login');
      } else {
        currentServer = LOCAL_URL;
        document.getElementById('form-login').style.display = 'none';
        document.getElementById('form-signup').style.display = 'none';
        document.getElementById('form-local').style.display = 'block';
        document.getElementById('auth-tabs').style.display = 'none';
      }
      document.getElementById('tab-server-online').classList.toggle('active', server === 'online');
      document.getElementById('tab-server-local').classList.toggle('active', server === 'local');
      clearAuthMessages();
    }

    // ── Auth UI ───────────────────────────────────────────────────────────────
    function switchAuthTab(tab) {
      document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none';
      document.getElementById('form-signup').style.display = tab === 'signup' ? 'block' : 'none';
      document.getElementById('tab-login').classList.toggle('active', tab === 'login');
      document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
      clearAuthMessages();
    }

    function showAuthError(msg) { const el = document.getElementById('auth-error'); el.textContent = msg; el.classList.add('show'); }
    function showAuthSuccess(msg) { const el = document.getElementById('auth-success'); el.textContent = msg; el.classList.add('show'); }
    function clearAuthMessages() {
      document.getElementById('auth-error').classList.remove('show');
      document.getElementById('auth-success').classList.remove('show');
    }
    function setAuthLoading(on) {
      document.getElementById('auth-loading').style.display = on ? 'block' : 'none';
      document.getElementById('form-login').style.display = on ? 'none' : (document.getElementById('tab-login').classList.contains('active') ? 'block' : 'none');
      document.getElementById('form-signup').style.display = on ? 'none' : (document.getElementById('tab-signup').classList.contains('active') ? 'block' : 'none');
      document.getElementById('btn-login').disabled = on;
      document.getElementById('btn-signup').disabled = on;
    }

    async function doLogin() {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) { showAuthError('Completá email y contraseña.'); return; }
      clearAuthMessages(); setAuthLoading(true);
      try {
        if (currentServer === LOCAL_URL) {
          // Modo Local: POST a la API local en localhost:3000
          const res = await fetch(`${currentServer}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Error desconocido' }));
            setAuthLoading(false);
            showAuthError('Error: ' + (err.message || res.statusText));
            return;
          }
          const data = await res.json();
          await onLogin(data.user || { id: data.id, email, user_metadata: { username: data.username } });
        } else {
          // Modo Online: usar el cliente Supabase original
          const { data, error } = await sb.auth.signInWithPassword({ email, password });
          if (error) { setAuthLoading(false); showAuthError('Error: ' + error.message); return; }
          await onLogin(data.user);
        }
      } catch (e) {
        setAuthLoading(false);
        showAuthError('Error de conexión: ' + e.message);
      }
    }

    async function doSignup() {
      const username = document.getElementById('signup-username').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      if (!username || !email || !password) { showAuthError('Completá todos los campos.'); return; }
      if (username.length < 3) { showAuthError('El nombre debe tener al menos 3 caracteres.'); return; }
      if (password.length < 6) { showAuthError('La contraseña debe tener al menos 6 caracteres.'); return; }
      clearAuthMessages(); setAuthLoading(true);
      try {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username } } });
        if (error) { setAuthLoading(false); showAuthError('Error: ' + error.message); return; }
        await sb.from('profiles').upsert({ id: data.user.id, username, email, created_at: new Date().toISOString() });
        setAuthLoading(false);
        showAuthSuccess('¡Cuenta creada! Iniciando sesión...');
        setTimeout(() => doLogin(), 1500);
      } catch (e) {
        setAuthLoading(false);
        showAuthError('Error de conexión: ' + e.message);
      }
    }

    async function doLogout() {
      await saveGame(false);
      if (window.currentServer !== LOCAL_URL) await window.sb.auth.signOut();
      window.currentUser = null;
      // Reset state using central function
      resetGameState();
      toggleProfile();
      switchServer('online');
      showScreen('auth-screen');
    }

    // ── Login Local ────────────────────────────────────────────────────────────
    function doLocalLogin() {
      const username = document.getElementById('local-username').value.trim();
      if (!username || username.length < 3) { showAuthError('El nombre debe tener al menos 3 caracteres.'); return; }
      clearAuthMessages(); setAuthLoading(true);
      const fakeUser = { id: 'local_' + username.toLowerCase(), email: username + '@local', user_metadata: { username } };
      onLocalLogin(fakeUser, username);
    }

    function onLocalLogin(user, username) {
      currentUser = user;
      resetGameState(); // Ensure clean slate before loading local save
      const saveKey = 'pokemon_local_save_' + user.id;
      try {
        const raw = localStorage.getItem(saveKey);
        if (raw) {
          const s = JSON.parse(raw);
          Object.assign(state, s);
          if (Array.isArray(state.badges)) state.badges = state.badges.length;
          else state.badges = parseInt(state.badges) || 0;
          const getUidStr = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2,9) + Date.now().toString(36);
          if (state.team) state.team.forEach(p => { if (!p.uid) p.uid = getUidStr(); });
          if (state.box) state.box.forEach(p => { if (!p.uid) p.uid = getUidStr(); });
          
          if (typeof syncRetroactivePokedex === 'function') syncRetroactivePokedex();
          
          state.trainerChance = 5;
          state.trainer = username;
          window.currentUser = user; // Asegurar que sea global
          updateHud();
          document.getElementById('hud-name').textContent = username.toUpperCase();
          setAuthLoading(false);
          if (state.starterChosen || state.team.length > 0) {
            state.starterChosen = true;
            showScreen('game-screen');
            showTab('map');
            renderTeam();
            // Inicializar sistema de clases
            if (typeof initClassSystem === 'function') setTimeout(() => initClassSystem(), 500);
            if (typeof checkPendingAwards === 'function') setTimeout(() => checkPendingAwards(), 2000);
            if (typeof processOfflineClassMissions === 'function') setTimeout(() => processOfflineClassMissions(), 1000);
            // Restaurar batalla activa si el jugador hizo F5 durante un combate obligatorio
            if (state.activeBattle) {
              setTimeout(() => restoreActiveBattle(), 300);
            }
          } else {
            showScreen('title-screen');
          }
          notify('¡Bienvenido de vuelta, ' + username + '! (modo local)', '👋');
        } else {
          state.trainer = username;
          document.getElementById('hud-name').textContent = username.toUpperCase();
          setAuthLoading(false);
          showScreen('title-screen');
          notify('¡Bienvenido, ' + username + '! Nueva partida local creada.', '🎮');
        }
        updateProfilePanel(user, { username });
        if (state.starterChosen || (state.team && state.team.length > 0)) {
          setInterval(() => saveGame(false), 60000);
        }
      } catch (e) {
        setAuthLoading(false);
        currentUser = null;
        showAuthError('Error al cargar la partida local: ' + e.message);
      }
    }

    // ── Login callback ─────────────────────────────────────────────────────────
    async function onLogin(user) {
      currentUser = user;
      resetGameState(); // Ensure clean slate before loading online save
      setAuthLoading(true);
      try {
        const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
        const username = profile?.username || user.user_metadata?.username || user.email.split('@')[0];
        const { data: saves, error: saveError } = await sb
          .from('game_saves')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);
        const save = Array.isArray(saves) ? saves[0] : null;
        if (LoginGuard.shouldAbortSaveLoad(saveError)) throw saveError;
        if (save?.save_data) {
          const s = save.save_data;
          Object.assign(state, s);
          // Normalizar badges (si era array, convertir a contador)
          if (Array.isArray(state.badges)) state.badges = state.badges.length;
          else state.badges = parseInt(state.badges) || 0;

          // Ensure older saves get a UID for breeding system
          const getUidStr = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2,9) + Date.now().toString(36);
          if (state.team) state.team.forEach(p => { if (!p.uid) p.uid = getUidStr(); });
          if (state.box) state.box.forEach(p => { if (!p.uid) p.uid = getUidStr(); });
          // Backfill gender for existing Pokemon
          let _genderUpdated = false;
          if (state.team) state.team.forEach(p => { if (ensurePokemonGender(p)) _genderUpdated = true; });
          if (state.box) state.box.forEach(p => { if (ensurePokemonGender(p)) _genderUpdated = true; });
          if (_genderUpdated) scheduleSave();

          // Limpieza: evitar Pokémon duplicados (mismo uid) en team/box (por trades antiguos)
          const _seenUids = new Set();
          const _dedupeByUid = (arr) => (arr || []).filter(p => {
            if (!p) return false;
            if (!p.uid) return true;
            if (_seenUids.has(p.uid)) return false;
            _seenUids.add(p.uid);
            return true;
          });
          state.team = _dedupeByUid(state.team);
          state.box = _dedupeByUid(state.box);

          if (typeof syncRetroactivePokedex === 'function') syncRetroactivePokedex();

          state.trainerChance = 5; 
          console.log("[DEBUG] Pity forced to 5% on login");
          state.trainer = username;
          window.currentUser = user; // Asegurar que sea global
          updateHud();
          document.getElementById('hud-name').textContent = username.toUpperCase();
          setAuthLoading(false);
          // starterChosen flag prevents re-showing starter selection
          if (state.starterChosen || state.team.length > 0) {
            state.starterChosen = true; // fix saves that might be missing the flag
            showScreen('game-screen');
            showTab('map');
            renderTeam();
            // Inicializar sistema de clases
            if (typeof initClassSystem === 'function') setTimeout(() => initClassSystem(), 500);
            if (typeof checkPendingAwards === 'function') setTimeout(() => checkPendingAwards(), 2000);
            processOfflineBreeding(user.id);
            if (typeof processOfflineClassMissions === 'function') setTimeout(() => processOfflineClassMissions(), 1000);
            // Restaurar batalla activa si el jugador hizo F5 durante un combate obligatorio
            if (state.activeBattle) {
              setTimeout(() => restoreActiveBattle(), 300);
            }
          } else {
            showScreen('title-screen');
          }
          notify(`¡Bienvenido de vuelta, ${username}! ${state.eggs && state.eggs.length > 0 ? '(🥚 '+state.eggs.length+' huevos)' : ''}`, '👋');
        } else {
          state.trainer = username;
          document.getElementById('hud-name').textContent = username.toUpperCase();
          setAuthLoading(false);
          showScreen('title-screen');
        }
        updateProfilePanel(user, profile || { username });
        if (state.starterChosen || (state.team && state.team.length > 0)) {
          setInterval(() => saveGame(false), 60000);
        }
        initTrainerPityTimer();
        startPresence(); subscribeFriendNotifs(); subscribeTradeNotifs(); subscribeBattleInvites(); refreshFriendsBadge();
        if (typeof initGlobalChatListener === 'function') initGlobalChatListener();
      } catch (e) {
        setAuthLoading(false);
        currentUser = null;
        showAuthError('No se pudo cargar tu progreso. Reintentá en unos minutos.');
      }
    }

    // ── Save / Load ────────────────────────────────────────────────────────────
    function serializeState() {
      // Guardar batalla activa solo si es contra entrenador o líder de gimnasio (no salvajes)
      let activeBattle = null;
      if (state.battle && !state.battle.over && (state.battle.isTrainer || state.battle.isGym)) {
        try {
          activeBattle = {
            isGym: state.battle.isGym || false,
            gymId: state.battle.gymId || null,
            isTrainer: state.battle.isTrainer || false,
            trainerName: state.battle.trainerName || null,
            locationId: state.battle.locationId || null,
            enemyTeam: state.battle.enemyTeam
              ? state.battle.enemyTeam.map(p => ({
                  uid: p.uid, id: p.id, name: p.name, emoji: p.emoji, type: p.type,
                  level: p.level, hp: p.hp, maxHp: p.maxHp, atk: p.atk, def: p.def,
                  spa: p.spa, spd: p.spd, spe: p.spe, moves: p.moves,
                  status: p.status || null, isShiny: p.isShiny || false,
                  gender: p.gender || null, ivs: p.ivs, nature: p.nature,
                  ability: p.ability, exp: p.exp || 0, expNeeded: p.expNeeded || 100,
                  friendship: p.friendship || 70,
                  _revealed: p._revealed || false, _gymLeader: p._gymLeader || null,
                  _gymBadge: p._gymBadge || null,
                }))
              : null,
            timestamp: Date.now(),
          };
        } catch(e) {
          console.warn('[SAVE] Error serializando batalla activa:', e);
          activeBattle = null;
        }
      }
      return {
        trainer: state.trainer,
        badges: state.badges,
        balls: state.balls,
        money: state.money,
        battleCoins: state.battleCoins || 0,
        eggs: state.eggs || [],
        trainerLevel: state.trainerLevel,
        trainerExp: state.trainerExp,
        trainerExpNeeded: state.trainerExpNeeded,
        inventory: state.inventory,
        team: state.team,
        box: state.box || [],
        pokedex: state.pokedex,
        seenPokedex: state.seenPokedex || [],

        defeatedGyms: state.defeatedGyms,
        gymProgress: state.gymProgress || {},
        lastGymWins: state.lastGymWins || {},
        lastGymAttempts: state.lastGymAttempts || {},
        starterChosen: state.starterChosen || false,
        stats: state.stats || {},
        activeBattle,
        daycare_missions: state.daycare_missions || [],
        daycare_mission_refreshes: state.daycare_mission_refreshes !== undefined ? state.daycare_mission_refreshes : 3,
        safariTicketSecs: state.safariTicketSecs || 0,
        ceruleanTicketSecs: state.ceruleanTicketSecs || 0,
        articunoTicketSecs: state.articunoTicketSecs || 0,
        mewtwoTicketSecs: state.mewtwoTicketSecs || 0,
        repelSecs: state.repelSecs || 0,
        shinyBoostSecs: state.shinyBoostSecs || 0,
        amuletCoinSecs: state.amuletCoinSecs || 0,
        luckyEggSecs: state.luckyEggSecs || 0,
        daycare_berry_egg_time: state.daycare_berry_egg_time || 0,
        boxCount: state.boxCount || 4,
        chats: state.chats || {},
        playerClass: state.playerClass || null,
        classLevel: state.classLevel || 1,
        classXP: state.classXP || 0,
        classData: state.classData || {
          captureStreak: 0,
          longestStreak: 0,
          reputation: 0,
          blackMarketSales: 0,
          criminality: 0
        }
      };
    }

    async function saveGame(showNotif = true) {
      if (!currentUser) return;
      const save_data = serializeState();
      if (currentServer === LOCAL_URL) {
        // Modo local: guardar en localStorage del dispositivo
        try {
          const saveKey = 'pokemon_local_save_' + currentUser.id;
          localStorage.setItem(saveKey, JSON.stringify(save_data));
          if (showNotif) flashSaveIndicator();
          const el = document.getElementById('profile-last-save');
          if (el) el.textContent = 'Guardado: ' + new Date().toLocaleTimeString();
        } catch (e) {
          console.warn('Error al guardar localmente:', e);
        }
        return;
      }
      // Modo online: guardar en Supabase
      // Nota: si no hay UNIQUE(user_id) en la tabla, upsert puede generar duplicados o fallar.
      // Para evitarlo, actualizamos la fila más reciente del usuario (si existe) y, si no existe, insertamos.
      if (!state.starterChosen && (!state.team || state.team.length === 0)) return;

      let saveError = null;
      try {
        const nowIso = new Date().toISOString();
        const { data: existingRows, error: selectErr } = await sb
          .from('game_saves')
          .select('id')
          .eq('user_id', currentUser.id)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (selectErr) throw selectErr;

        const existingId = Array.isArray(existingRows) ? existingRows[0]?.id : null;

        if (existingId) {
          const { error } = await sb.from('game_saves').update({
            save_data,
            updated_at: nowIso,
          }).eq('id', existingId);
          saveError = error;
        } else {
          const { error } = await sb.from('game_saves').insert({
            user_id: currentUser.id,
            save_data,
            updated_at: nowIso,
          });
          saveError = error;
        }
      } catch (e) {
        console.warn('[SAVE] Error guardando en Supabase:', e);
        saveError = e;
      }

      if (!saveError) {
        if (showNotif) flashSaveIndicator();
        const el = document.getElementById('profile-last-save');
        if (el) el.textContent = 'Guardado: ' + new Date().toLocaleTimeString();
      }}

    function scheduleSave() {
      // Debounced auto-save 10s after any action
      clearTimeout(_saveTimeout);
      _saveTimeout = setTimeout(() => saveGame(false), 2000);
    }

    function flashSaveIndicator() {
      const el = document.getElementById('save-indicator');
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 2500);
    }

    // ── Profile Panel ──────────────────────────────────────────────────────────
    function toggleProfile() {
      const panel = document.getElementById('profile-panel');
      panel.classList.toggle('open');
    }

    function updateProfilePanel(user, profile) {
      if (user && profile) {
        document.getElementById('profile-username').textContent = profile?.username || '—';
        document.getElementById('profile-email').textContent = user.email;
        const adminSection = document.getElementById('profile-admin-section');
        if (adminSection) adminSection.style.display = user.email === 'kodrol77@gmail.com' ? 'block' : 'none';
      }
      const st = state.stats || {};
      const statsGrid = document.getElementById('profile-stats');
      if (statsGrid) {
        statsGrid.innerHTML = `
          <div class="profile-stat"><span class="profile-stat-val">${state.trainerLevel}</span><span class="profile-stat-lbl">Nivel</span></div>
          <div class="profile-stat"><span class="profile-stat-val">${state.badges}</span><span class="profile-stat-lbl">Medallas</span></div>
          <div class="profile-stat"><span class="profile-stat-val">${st.wins || 0}</span><span class="profile-stat-lbl">Vics. Salvaje</span></div>
          <div class="profile-stat"><span class="profile-stat-val">${st.trainersDefeated || 0}</span><span class="profile-stat-lbl">Entr. Derrotados</span></div>
          <div class="profile-stat"><span class="profile-stat-val">₽${state.money.toLocaleString()}</span><span class="profile-stat-lbl">Dinero</span></div>
          <div class="profile-stat"><span class="profile-stat-val"><i class="fas fa-coins coin-icon"></i>${state.battleCoins || 0}</span><span class="profile-stat-lbl">Battle Coins</span></div>
        `;
      }

      // Add Encounter Reset Button for users with stuck pity
      if (statsGrid) {
        const existingReset = document.getElementById('profile-reset-encounters');
        if (existingReset) existingReset.remove();
        const resetContainer = document.createElement('div');
        resetContainer.id = 'profile-reset-encounters';
        resetContainer.style.marginTop = '15px';
        resetContainer.innerHTML = `
          <button onclick="resetEncounterPity()" 
            style="width:100%; padding:10px; background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.2); border-radius:10px; font-family:'Press Start 2P',monospace; font-size:8px; cursor:pointer;">
            ⚠️ RESETEAR ENCUENTROS
          </button>
          <div style="font-size:8px; color:var(--gray); margin-top:5px; text-align:center;">Si solo te aparecen entrenadores, usa este botón.</div>
        `;
        statsGrid.parentElement.appendChild(resetContainer);
      }
    }

    function hatchEggs() {
      if (!state.eggs || state.eggs.length === 0) return;
      let anyReady = false;
      const hatchMult = (typeof getEventBonus === 'function') ? getEventBonus('hatch') : 1;
      
      for (let i = 0; i < state.eggs.length; i++) {
        const egg = state.eggs[i];
        if (!egg.ready && (typeof egg.steps === 'number') && egg.steps > 0) {
          egg.steps -= hatchMult;
          if (egg.steps <= 0) {
            egg.steps = 0;
            egg.ready = true;
            anyReady = true;
            notify('¡Un Huevo Pokémon está listo para eclosionar!', '🥚');
          }
        } else if (!egg.ready && (egg.steps === undefined || egg.steps === null || isNaN(egg.steps))) {
          // Si el huevo tiene pasos corruptos, le asignamos un valor seguro
          egg.steps = 150;
        }
      }
      if (anyReady) updateProfilePanel(); 
      updateHud();
    }

    function startManualHatch(eggIdx) {
      const egg = state.eggs[eggIdx];
      if (!egg) return;

      // Validación extra de seguridad (prevención de bugs de eclosión instantánea)
      const isReady = (egg.ready === true) || (typeof egg.steps === 'number' && egg.steps <= 0);
      
      if (!isReady) {
        notify(`¡Este huevo todavía no está listo! Faltan ${Math.ceil(egg.steps) || 150} pasos.`, '🥚');
        return;
      }

      // Guardar estado antes de empezar para evitar inconsistencias
      scheduleSave();
      let clicks = 0;
      const totalClicks = 5 + Math.floor(Math.random() * 3);
      
      const ov = document.createElement('div');
      ov.id = 'manual-hatch-overlay';
      ov.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(10px);`;
      
      ov.innerHTML = `
        <div id="hatch-container" style="text-align:center;">
          <div id="hatch-egg" style="font-size:120px; cursor:pointer; user-select:none; transition:transform 0.1s ease; filter:drop-shadow(0 0 20px rgba(255,217,61,0.3));">🥚</div>
          <div id="hatch-msg" style="font-family:'Press Start 2P',monospace; font-size:10px; color:var(--yellow); margin-top:30px; line-height:1.6;">¡TOCA EL HUEVO!<br><span style="font-size:8px; color:var(--gray);">¡Parece que está por romperse!</span></div>
        </div>
        <div id="hatch-reveal" style="display:none; text-align:center; animation: fadeIn 0.8s ease;">
          <div id="reveal-light" style="position:absolute; inset:0; background:radial-gradient(circle, #fff 0%, transparent 70%); opacity:0; pointer-events:none;"></div>
          <div id="pokemon-sprite-container" style="position:relative; margin-bottom:20px;"></div>
          <div id="reveal-info" style="color:white; font-family:'Press Start 2P',monospace;"></div>
          <button id="close-hatch" style="margin-top:30px; font-family:'Press Start 2P',monospace; font-size:10px; padding:15px 30px; background:var(--yellow); border:none; border-radius:14px; cursor:pointer; color:#000; display:none;">CONTINUAR</button>
        </div>
      `;
      document.body.appendChild(ov);

      const eggEl = ov.querySelector('#hatch-egg');
      eggEl.onclick = () => {
        clicks++;
        eggEl.style.transform = 'scale(0.9) rotate(' + (Math.random() * 10 - 5) + 'deg)';
        setTimeout(() => eggEl.style.transform = 'scale(1.1)', 50);
        
        // Custom shake/crack sound effect simulated with screen shake
        document.body.style.transform = `translate(${Math.random()*4-2}px, ${Math.random()*4-2}px)`;
        setTimeout(() => document.body.style.transform = '', 50);

        if (clicks >= totalClicks) {
          eggEl.onclick = null;
          performHatchRevelation(eggIdx);
        } else if (clicks > totalClicks / 2) {
          ov.querySelector('#hatch-msg').innerHTML = '¡SE ESTÁ ROMPIENDO!<br><span style="font-size:8px; color:var(--yellow);">¡Sigue tocando!</span>';
        }
      };
    }

    function performHatchRevelation(eggIdx) {
      const egg = state.eggs[eggIdx];
      const p = makePokemon(egg.pokemonId, 5);
      
      // Inherit breeding data if available
      if (egg.origin === 'breeding') {
        if (egg.inherited_ivs) {
            if (egg.inherited_ivs._nature) {
                p.nature = egg.inherited_ivs._nature;
                delete egg.inherited_ivs._nature;
            }
            p.ivs = { ...egg.inherited_ivs };
        }
        if (egg.isShiny !== undefined) p.isShiny = egg.isShiny;
        p.vigor = Math.floor(Math.random() * 3) + 1; // 1 a 3 para crías
        if (typeof recalcPokemonStats === 'function') { recalcPokemonStats(p); p.hp = p.maxHp; }
      }
      
      const ov = document.getElementById('manual-hatch-overlay');
      const container = ov.querySelector('#hatch-container');
      const reveal = ov.querySelector('#hatch-reveal');
      const light = ov.querySelector('#reveal-light');
      
      // Animation sequence
      container.style.animation = 'scaleOut 0.5s forwards';
      setTimeout(() => {
        container.style.display = 'none';
        reveal.style.display = 'block';
        light.style.opacity = '0.5';
        setTimeout(() => light.style.opacity = '0', 1000);
        
        const spriteUrl = getSpriteUrl(p.id, p.isShiny);
        ov.querySelector('#pokemon-sprite-container').innerHTML = `
          <img src="${spriteUrl}" style="width:200px; height:200px; image-rendering:pixelated; filter:drop-shadow(0 0 30px ${p.isShiny ? 'var(--yellow)' : 'rgba(255,255,255,0.3)'});">
          ${p.isShiny ? '<div style="position:absolute; top:0; right:0; font-size:30px; animation: bounce 1s infinite;">✨</div>' : ''}
        `;
        
        ov.querySelector('#reveal-info').innerHTML = `
          <div style="font-size:14px; margin-bottom:10px;">¡Eclosionó un ${p.name}!</div>
          <div style="font-size:8px; color:var(--gray); margin-bottom:20px;">Nivel ${p.level}</div>
          <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:14px; border:1px solid rgba(255,255,255,0.1);">
            <div style="font-size:8px; color:var(--yellow); margin-bottom:10px; text-align:left;">GENÉTICA (IVs):</div>
            <div style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:10px; font-size:9px; text-align:left;">
              <div>PS: ${p.ivs.hp}/31</div>
              <div>ATK: ${p.ivs.atk}/31</div>
              <div>DEF: ${p.ivs.def}/31</div>
              <div>VEL: ${p.ivs.spe}/31</div>
              <div>AT.E: ${p.ivs.spa}/31</div>
              <div>DF.E: ${p.ivs.spd}/31</div>
            </div>
          </div>
        `;
        
        // Add to team/box
        state.team.push(p);
        state.eggs.splice(eggIdx, 1);
        
        if (state.team.length > 6) {
          const moved = state.team.pop();
          if (!state.box) state.box = [];
          state.box.push(moved);
          notify(`${moved.name} enviado al PC`, '💻');
        }
        
        setTimeout(() => {
          ov.querySelector('#close-hatch').style.display = 'inline-block';
          ov.querySelector('#close-hatch').onclick = () => {
            ov.remove();
            renderTeam();
            updateProfilePanel();
            updateHud();
            scheduleSave();

            // Sinergia Criador: Escáner de Huevos post-eclosión (Nivel 20+)
            if (state.playerClass === 'criador' && (state.trainerLevel || 1) >= 20) {
              setTimeout(() => {
                if (typeof openEggScannerMenu === 'function') openEggScannerMenu();
              }, 600);
            }
          };
        }, 2000);
      }, 500);
    }

    function resetEncounterPity() {
      state.trainerChance = 5;
      notify('Encuentros reseteados. ¡Suerte explorando!', '🎲');
      console.log("[DEBUG] Trainer pity manually reset to 5%");
      updateProfilePanel();
    }

    // ── Check existing session on load ────────────────────────────────────────
    (async () => {
      // Warn if opened as local file on mobile (no network access to Supabase)
      if (location.protocol === 'file:') {
        const warn = document.getElementById('auth-error');
        warn.textContent = '⚠️ Abrís el archivo localmente. En celular esto puede bloquear la conexión a internet. Intentá de todos modos o abrilo desde una PC.';
        warn.classList.add('show');
      }
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) {
          await onLogin(session.user);
        }
      } catch (e) {
        const warn = document.getElementById('auth-error');
        warn.textContent = '⚠️ No se pudo conectar a Supabase: ' + e.message;
        warn.classList.add('show');
      }
    })();


    // Fix starter image fallbacks cleanly
    (function () {
      [['bulbasaur'], ['charmander'], ['squirtle']].forEach(([id]) => {
        const img = document.getElementById('starter-img-' + id);
        const emo = document.getElementById('starter-emo-' + id);
        if (!img || !emo) return;
        img.onerror = function () { this.style.display = 'none'; emo.style.display = ''; };
        img.onload = function () { emo.style.display = 'none'; this.style.display = ''; };
        // trigger if already cached/failed
        if (img.complete && !img.naturalWidth) { img.onerror(); }
      });
    })();

