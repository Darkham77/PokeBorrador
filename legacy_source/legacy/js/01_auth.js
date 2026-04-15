    // ===== SESSION UNIQUENESS =====
    window.mySessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // ===== SUPABASE =====
    const SUPABASE_URL = 'https://wakrkvizmoqdlrtnxcth.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indha3Jrdml6bW9xZGxydG54Y3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDA3MjYsImV4cCI6MjA4ODg3NjcyNn0.l_NYYNPDFOAr5CRqbuVf3jLv_TRnOw6shw9j9GzhQsA';
    const LOCAL_URL = 'http://localhost:3000';

    // Servidor activo: 'online' apunta a Supabase, 'local' apunta a localhost:3000
    window.currentServer = localStorage.getItem('currentServer') || SUPABASE_URL;
    
    // Detectar modo offline inicial basado en la URL persistida o si estamos en localhost
    const isLocalChoice = window.currentServer === LOCAL_URL || 
                          window.currentServer.includes('localhost') || 
                          window.currentServer.includes('127.0.0.1');

    // === DEEP CLEAN: Si estamos en local, limpiar rastro de Supabase en localStorage ===
    // Esto evita que la librería intente "validar" sesiones de local_ash contra la nube.
    if (isLocalChoice) {
        Object.keys(localStorage).forEach(key => {
            if (key.includes('sb-wakrkvizmoqdlrtnxcth-auth-token')) {
                localStorage.removeItem(key);
            }
        });
    }

    const realSb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            persistSession: !isLocalChoice, // Solo persistir si NO elegimos local
            autoRefreshToken: !isLocalChoice
        }
    });
    window.sb = new DBRouter(realSb);

    if (isLocalChoice) {
        console.log('[Router] Inicializando en modo OFFLINE (Local detectado)');
        window.sb.setOfflineMode(true);
    }
    window.currentUser = null;
    let _saveTimeout = null;
    let _isSaving = false; // Flag para evitar solapamientos
    let _saveLoaded = false; // Flag para prevenir guardado prematuro mientras se carga

    // ── Server Selector ───────────────────────────────────────────────────────
    function switchServer(server) {
      if (server === 'online') {
        currentServer = SUPABASE_URL;
        sb.setOfflineMode(false);
        localStorage.setItem('currentServer', SUPABASE_URL);
        // UI updates...
        document.getElementById('form-login').style.display = 'block';
        document.getElementById('form-signup').style.display = 'none';
        document.getElementById('form-local').style.display = 'none';
        document.getElementById('auth-tabs').style.display = 'flex';
        switchAuthTab('login');
      } else {
        currentServer = LOCAL_URL;
        sb.setOfflineMode(true);
        localStorage.setItem('currentServer', LOCAL_URL);
        // UI updates...
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

    function normalizeNotificationStateForBackCompat() {
      if (!Array.isArray(state.notificationHistory)) state.notificationHistory = [];
      state.notificationHistory = state.notificationHistory
        .filter((n) => n && typeof n.msg === 'string' && n.msg.trim().length > 0)
        .slice(-10)
        .map((n) => ({
          id: n.id || ('notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
          msg: String(n.msg || '').trim(),
          icon: n.icon || '🔔',
          type: n.type || 'general',
          ts: n.ts || new Date().toISOString()
        }));

      if (!Array.isArray(state.marketSoldSeenIds)) state.marketSoldSeenIds = [];
      state.marketSoldSeenIds = [...new Set(
        state.marketSoldSeenIds
          .filter((id) => typeof id === 'string' && id.trim().length > 0)
      )].slice(-250);
    }
    async function doLogin() {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) { showAuthError('Completá email y contraseña.'); return; }
      clearAuthMessages(); setAuthLoading(true);
      try {
        if (currentServer === LOCAL_URL) {
          // Ya no necesitamos fetch al puerto 3000. El Router usa SQLite.
          const fakeUser = { id: 'local_' + email.toLowerCase(), email, user_metadata: { username: email.split('@')[0] } };
          await onLogin(fakeUser);
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
      console.log("[AUTH] Finalizando sesión...");

      // 0. Si estamos en el entorno Vue y tenemos el store, usar su lógica nuclear
      if (window.authStore && typeof window.authStore.logout === 'function') {
        return window.authStore.logout();
      }

      try {
        // 1. Intentar guardado final solo si ya empezó a jugar
        if (currentUser && state.starterChosen) {
          try {
            await Promise.race([
              saveGame(false),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Save timeout')), 1500))
            ]);
          } catch (e) {
            console.warn('[AUTH] Guardado final omitido o lento:', e);
          }
        }
      } catch (e) {
        console.warn('[AUTH] Error al guardar antes de cerrar sesión:', e);
      }

      _saveLoaded = false;
      _isSaving = false; 
      
      // Bloqueamos futuros auto-saves
      const oldSave = window.saveGame;
      window.saveGame = async () => {}; 
      _isSaving = true;

      try {
        // 2. Clear Supabase Auth
        if (window.sb && window.sb.auth) {
           await window.sb.auth.signOut();
        }
      } catch (e) { 
        console.warn('[AUTH] Error in signOut:', e); 
      }

      // 3. DEEP CLEAN de tokens y estados
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (sbKey) localStorage.removeItem(sbKey);
      
      localStorage.removeItem('pokevicio_local_user');
      localStorage.removeItem('isOffline');
      localStorage.removeItem('currentServer'); 
      
      window.currentUser = null;
      
      // 4. Reset completo del estado
      if (typeof resetGameState === 'function') resetGameState();
      if (window.state) {
        window.state.starterChosen = false; 
      }
      
      // 5. FLAG para evitar auto-login inmediato tras refresco
      sessionStorage.setItem('block_autologin', 'true');
      
      // 6. Redirección total inmediata
      console.log("[AUTH] Redirigiendo al inicio...");
      setTimeout(() => { location.href = '/?logout=' + Date.now(); }, 100); 
    }

    // ── Login Local ────────────────────────────────────────────────────────────
    function doLocalLogin() {
      const username = document.getElementById('local-username').value.trim();
      if (!username || username.length < 3) { showAuthError('El nombre debe tener al menos 3 caracteres.'); return; }
      clearAuthMessages(); setAuthLoading(true);
      const fakeUser = { id: 'local_' + username.toLowerCase(), email: username + '@local', user_metadata: { username } };
      onLogin(fakeUser); // Usar onLogin unificado
    }

    // ── Login callback ─────────────────────────────────────────────────────────
    async function onLogin(user) {
      currentUser = user;
      _saveLoaded = false;
      resetGameState(); // Ensure clean slate before loading online save
      setAuthLoading(true);
      try {
        const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
        const username = profile?.username || user.user_metadata?.username || user.email.split('@')[0];
        
        if (profile) {
          state.playerClass = profile.player_class || null;
          state.faction = profile.faction || null;
        }
        
        // Registrar ID de sesión para unicidad (Last-In-Wins - SOLAMENTE ONLINE)
        if (!sb.isOffline && user.id.indexOf('local_') === -1) {
            sb.from('profiles').update({ current_session_id: window.mySessionId }).eq('id', user.id);
            monitorSession(user.id);
        }
        
        // 1. Obtener Guardado (El Router decidirá si Nube o SQLite)
        const { data: saves, error: saveError } = await sb
          .from('game_saves')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);
        
        const saveRow = Array.isArray(saves) ? saves[0] : (saves || null);
        if (LoginGuard.shouldAbortSaveLoad(saveError)) throw saveError;
        
        let finalSaveData = saveRow?.save_data;

        // 2. Obtener Guardado Local
        const localSaveKey = 'pokemon_local_save_' + user.id;
        const localRaw = localStorage.getItem(localSaveKey);
        if (localRaw) {
          try {
            const localData = JSON.parse(localRaw);
            const cloudTime = saveRow?.updated_at ? new Date(saveRow.updated_at).getTime() : 0;
            const localTime = localData._last_updated || 0;

            // Si el guardado local es más nuevo por al menos 3 segundos, lo usamos.
            // (3s de margen para evitar micro-diferencias de reloj/red)
            if (localTime > cloudTime + 3000) {
              console.log("[SAVE] El guardado local es más reciente. Sincronizando...");
              finalSaveData = localData;
              notify('Se restauró tu progreso local más reciente.', '🔄');
            }
          } catch(e) {
            console.warn('[SAVE] Error comparando guardado local:', e);
          }
        }

        if (finalSaveData) {
          const s = finalSaveData;
          Object.assign(state, s);
          normalizeNotificationStateForBackCompat();
          
          // Data Correction: Reset battleCoins if they were corrupted by the previous infinity bypass
          if (user.email === 'kodrol77@gmail.com' && (state.battleCoins || 0) > 1000000) {
            console.log("[AUTH] Corregido balance de BattleCoins para el administrador.");
            state.battleCoins = 15000;
            setTimeout(() => scheduleSave(), 2000); 
          }

          // Normalizar badges (si era array, convertir a contador)
          if (Array.isArray(state.badges)) state.badges = state.badges.length;
          else state.badges = parseInt(state.badges) || 0;

          // Ensure older saves get a UID for breeding system
          const getUidStr = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2,9) + Date.now().toString(36);
          if (state.team) state.team.forEach(p => { 
            if (!p.uid) p.uid = getUidStr(); 
            if (p.ivs) { delete p.ivs._cost; delete p.ivs._haBoost; delete p.ivs._haBoo; delete p.ivs._nature; }
          });
          if (state.box) state.box.forEach(p => { 
            if (!p.uid) p.uid = getUidStr(); 
            if (p.ivs) { delete p.ivs._cost; delete p.ivs._haBoost; delete p.ivs._haBoo; delete p.ivs._nature; }
          });
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
          normalizeNotificationStateForBackCompat();
          window.currentUser = user; // Asegurar que sea global
          _saveLoaded = true;
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
          normalizeNotificationStateForBackCompat();
          document.getElementById('hud-name').textContent = username.toUpperCase();
          _saveLoaded = true;
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
        if (typeof subscribeMarketSaleNotifs === 'function') setTimeout(() => subscribeMarketSaleNotifs(), 2200);
        // Sistema de Dominancia (solo online)
        if (typeof initDominanceSystem === 'function') setTimeout(() => initDominanceSystem(), 1500);
        // Cargar ELO de PvP
        if (typeof loadPlayerElo === 'function') setTimeout(() => loadPlayerElo(), 2000);
        if (typeof initEloWatcher === 'function') setTimeout(() => initEloWatcher(), 3000);
        // Sincronización inmediata de perfil para reflejar nivel/estética en rankings
        if (typeof saveGame === 'function') setTimeout(() => saveGame(false), 5000);
      } catch (e) {
        setAuthLoading(false);
        currentUser = null;
        showAuthError('No se pudo cargar tu progreso. Reintentá en unos minutos.');
      }
    }

    // ── Save / Load ────────────────────────────────────────────────────────────
    function serializeState() {
      // Guardar batalla activa: Trainer/Gym o PvP
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
      } else if (state.activeBattle && state.activeBattle.isPvP) {
        // Preservar metadatos de PvP para reconexión
        activeBattle = { ...state.activeBattle };
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
        lastRankedSeason: state.lastRankedSeason || null,
        nick_style: state.nick_style || null,
        avatar_style: state.avatar_style || null,
        stats: state.stats || {},
        eloRating: Number.isFinite(Number(state.eloRating)) ? Number(state.eloRating) : 1000,
        pvpStats: {
          wins: Number(state.pvpStats?.wins) || 0,
          losses: Number(state.pvpStats?.losses) || 0,
          draws: Number(state.pvpStats?.draws) || 0
        },
        rankedMaxElo: Number.isFinite(Number(state.rankedMaxElo))
          ? Math.max(1000, Math.floor(Number(state.rankedMaxElo)))
          : Math.max(1000, Number(state.eloRating) || 1000),
        rankedRewardsClaimed: Array.isArray(state.rankedRewardsClaimed)
          ? Array.from(new Set(state.rankedRewardsClaimed.map(id => String(id))))
          : [],
        passiveTeamUids: state.passiveTeamUids || [],
        passiveTeamActive: state.passiveTeamActive,
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
        },
        faction: state.faction || null,
        warCoins: state.warCoins || 0,
        warCoinsSpent: state.warCoinsSpent || 0,
        warDailyCap: state.warDailyCap || {},
        warDailyCoins: state.warDailyCoins || {},
        warMyPtsLocal: state.warMyPtsLocal || {},
        notificationHistory: state.notificationHistory || [],
        marketSoldSeenIds: state.marketSoldSeenIds || []
      };
    }

    /**
     * Realiza validaciones básicas para evitar guardar datos corruptos o exploitados.
     */
    function isValidState(data) {
      if (!data) return false;
      // Anti-exploit básico: valores no negativos
      if (data.money < 0 || data.battleCoins < 0) return false;
      if (data.trainerLevel < 1 || data.trainerLevel > 100) return false;
      // Estructura mínima
      if (!Array.isArray(data.team)) return false;
      return true;
    }

    async function saveGame(showNotif = true) {
      if (!currentUser || _isSaving || !_saveLoaded) return;
      
      const save_data = serializeState();
      if (!isValidState(save_data)) {
        console.error('[SAVE] Estado inválido detectado. Abortando guardado por seguridad.');
        return;
      }

      // Incluimos un timestamp preciso
      save_data._last_updated = Date.now();

      // 1. Guardado en LocalStorage SIEMPRE (es síncrono y ultra-rápido)
      try {
        const saveKey = 'pokemon_local_save_' + currentUser.id;
        localStorage.setItem(saveKey, JSON.stringify(save_data));
        const el = document.getElementById('profile-last-save');
        if (el) el.textContent = 'Guardado (Loc): ' + new Date().toLocaleTimeString();
      } catch (e) {
        console.warn('[SAVE] Error en localStorage:', e);
      }

      if (currentServer === LOCAL_URL) {
        if (showNotif) flashSaveIndicator();
        return;
      }

      _isSaving = true;
      try {
        const nowIso = new Date().toISOString();
        
        // El Router se encarga de dirigir esto a Supabase o SQLite
        const { error } = await sb.from('game_saves').upsert({
          user_id: currentUser.id,
          save_data,
          updated_at: nowIso,
        }, { onConflict: 'user_id' });

        if (error) throw error;

        // Sincronización de perfil (El Router fallará silenciosamente o irá a SQLite si no hay conexión)
        try {
          const profileUpdate = {
            nick_style: state.nick_style || null,
            avatar_style: state.avatar_style || null,
            trainer_level: Number(state.trainerLevel || 1),
            player_class: state.playerClass || null
          };
          
          await sb.from('profiles')
            .update(profileUpdate)
            .match({ id: currentUser.id });
        } catch (syncErr) {}

        if (showNotif) flashSaveIndicator();
        const el = document.getElementById('profile-last-save');
        if (el) el.textContent = 'Guardado: ' + new Date().toLocaleTimeString();
      } catch (e) {
        console.warn('[SAVE] Error en Router:', e);
      } finally {
        _isSaving = false;
      }
    }


    function scheduleSave() {
      // Debounced auto-save 2s after any action
      clearTimeout(_saveTimeout);
      _saveTimeout = setTimeout(() => saveGame(false), 2000);
    }

    // Listeners de salida para asegurar guardado final
    window.addEventListener('beforeunload', () => { if (currentUser) saveGame(false); });
    window.addEventListener('pagehide', () => { if (currentUser) saveGame(false); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && currentUser) {
        saveGame(false);
      }
    });

    function flashSaveIndicator() {
      const el = document.getElementById('save-indicator');
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 2500);
    }

    // ── Profile Panel ──────────────────────────────────────────────────────────
    function _normalizeProfileNotificationHistory() {
      if (!Array.isArray(state.notificationHistory)) state.notificationHistory = [];
      state.notificationHistory = state.notificationHistory
        .filter(n => n && typeof n.msg === 'string' && n.msg.trim().length > 0)
        .slice(-10);
      return state.notificationHistory;
    }

    function _formatProfileNotificationTime(ts) {
      if (!ts) return '--:--';
      const dt = new Date(ts);
      if (isNaN(dt.getTime())) return '--:--';
      return dt.toLocaleString();
    }

    function renderProfileNotificationHistory() {
      const listEl = document.getElementById('profile-notification-history');
      const btnEl = document.getElementById('profile-notification-toggle');
      if (!listEl) return;

      const history = _normalizeProfileNotificationHistory();
      if (btnEl) btnEl.textContent = `Ver ultimas 10 (${history.length})`;

      if (!history.length) {
        listEl.innerHTML = '<div style="font-size:10px;color:var(--gray);text-align:center;padding:10px;">Sin notificaciones recientes.</div>';
        return;
      }

      listEl.innerHTML = [...history].reverse().map((n) => {
        const icon = n.icon || '🔔';
        const msg = n.msg || '';
        const when = _formatProfileNotificationTime(n.ts);
        return `
          <div style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;gap:8px;align-items:flex-start;">
            <span style="font-size:12px;line-height:1.2;">${icon}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:10px;color:#fff;line-height:1.4;word-break:break-word;">${msg}</div>
              <div style="font-size:8px;color:var(--gray);margin-top:3px;">${when}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    function toggleProfileNotificationHistory() {
      const listEl = document.getElementById('profile-notification-history');
      if (!listEl) return;
      const opening = listEl.style.display === 'none' || !listEl.style.display;
      if (opening) renderProfileNotificationHistory();
      listEl.style.display = opening ? 'block' : 'none';
    }

    function toggleProfile() {
      const panel = document.getElementById('profile-panel');
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        renderProfileNotificationHistory();
      }
    }

    function updateProfilePanel(user, profile) {
      if (user && profile) {
        const nameEl = document.getElementById('profile-username');
        if (nameEl) {
          nameEl.textContent = profile?.username || '—';
          nameEl.className = 'profile-username ' + (state.nick_style || '');
          
          // Add Edit Button if it's the current user
          const existingEdit = document.getElementById('profile-edit-btn');
          if (existingEdit) existingEdit.remove();
          
          const editBtn = document.createElement('button');
          editBtn.id = 'profile-edit-btn';
          editBtn.innerHTML = '✏️ Editar';
          editBtn.style.cssText = 'font-size:10px; padding:4px 8px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:6px; color:var(--gray); cursor:pointer; margin-left:10px; font-family:"Press Start 2P",monospace;';
          editBtn.onclick = (e) => {
            e.stopPropagation();
            if (typeof openProfileEditor === 'function') openProfileEditor();
          };
          nameEl.parentNode.appendChild(editBtn);
        }
        document.getElementById('profile-email').textContent = user.email;
        const adminSection = document.getElementById('profile-admin-section');
        if (adminSection) adminSection.style.display = user.email === 'kodrol77@gmail.com' ? 'block' : 'none';
      }
      // Actualizar badge de facción
      if (typeof updateFactionBadge === 'function') {
        updateFactionBadge();
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

      renderProfileNotificationHistory();
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
            delete p.ivs._cost;
            delete p.ivs._haBoost;
            delete p.ivs._haBoo;
            delete p.ivs._nature;
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
        
        const spriteUrl = getSpriteUrl(p.id, p.isShiny) || getSpriteUrl('egg');
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
            if (typeof saveGame === 'function') saveGame(false);
            else scheduleSave();

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
      // 0. Bloqueo manual de auto-login (tras logout)
      if (sessionStorage.getItem('block_autologin') === 'true') {
        console.log("[AUTH] Auto-login omitido por cierre de sesión manual.");
        sessionStorage.removeItem('block_autologin');
        if (typeof showScreen === 'function') showScreen('auth-screen');
        return;
      }

      // Warn if opened as local file on mobile (no network access to Supabase)
      if (location.protocol === 'file:') {
        const warn = document.getElementById('auth-error');
        if (warn) {
          warn.textContent = '⚠️ Abrís el archivo localmente. En celular esto puede bloquear la conexión a internet. Intentá de todos modos o abrilo desde una PC.';
          warn.classList.add('show');
        }
      }
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) {
          await onLogin(session.user);
        } else {
          if (typeof showScreen === 'function') showScreen('auth-screen');
        }
      } catch (e) {
        const warn = document.getElementById('auth-error');
        if (warn) {
          warn.textContent = '⚠️ No se pudo conectar a Supabase: ' + e.message;
          warn.classList.add('show');
        }
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

    // ── Session Uniqueness ──────────────────────────────────────────────────────
    function monitorSession(userId) {
      if (!userId || window.currentServer === LOCAL_URL) return;
      
      const debugEl = document.getElementById('session-debug-id');
      if (debugEl) debugEl.textContent = window.mySessionId.substring(0, 8);

      // Suscribirse a cambios en la tabla profiles para este usuario
      const channel = sb.channel(`session_check_${userId}`)
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles', 
            filter: `id=eq.${userId}` 
        }, payload => {
            const newSessionId = payload.new.current_session_id;
            if (newSessionId && newSessionId !== window.mySessionId) {
                console.warn("[SESSION] Nueva sesión detectada en otro lugar. Bloqueando esta pestaña.");
                document.getElementById('session-blocked-modal').style.display = 'flex';
                // Detener el guardado automático para evitar sobrescribir datos de la nueva sesión
                _saveLoaded = false;
                _isSaving = true; // Forzar estado de "guardando" para bloquear saveGame
                
                // Opcional: Detener música si existe
                if (window.bgmInterval) clearInterval(window.bgmInterval);
            }
        })
        .subscribe();
        
      console.log("[SESSION] Monitoreo iniciado para el usuario:", userId);
    }

    // === EXPORTAR FUNCIONES AL SCOPE GLOBAL ===
    window.doLogin = doLogin;
    window.doSignup = doSignup;
    window.doLogout = doLogout;
    window.doLocalLogin = doLocalLogin;
    window.switchServer = switchServer;
    window.toggleProfile = toggleProfile;
