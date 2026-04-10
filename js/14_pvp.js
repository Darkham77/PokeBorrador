    // ===== PVP BATTLE SYSTEM =====

    let _pvpState = null;
    let _pvpBattleInvitesCh = null;
    let _pvpLock = false;   // prevents double-clicking during animations

    const PVP_TURN_PICK_TIMEOUT_MS = 40000;
    const PVP_TURN_WARN_SECONDS = 10;
    const PVP_AFK_FORFEIT_GRACE_MS = 2500;
    function _pvpEscHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function _pvpTrainerClassDef(classId) {
      if (typeof PLAYER_CLASSES === 'undefined' || !classId) return null;
      return PLAYER_CLASSES[classId] || null;
    }

    function _pvpTrainerSprite(classId) {
      const cls = _pvpTrainerClassDef(classId);
      // Preferimos el sprite de cuerpo completo. 
      // Si no existe la clase, usamos el sprite de Red como default de cuerpo completo en lugar de un avatar.
      if (cls?.sprite) return cls.sprite;
      return 'https://play.pokemonshowdown.com/sprites/trainers/red-lgpe.png';
    }

    function _pvpBuildTrainerSideHtml(meta, isEnemy) {
      const safeName = _pvpEscHtml(meta?.username || (isEnemy ? 'Rival' : 'Tu perfil'));
      const lvl = Math.max(1, Number(meta?.trainerLevel || 1));
      const elo = Math.max(0, Number(meta?.elo || 1000));
      const sprite = _pvpEscHtml(_pvpTrainerSprite(meta?.playerClass));
      const tier = (typeof getEloTier === 'function') ? getEloTier(elo) : null;
      const tierName = _pvpEscHtml(tier?.name || 'Bronce');
      const tierColor = _pvpEscHtml(tier?.color || '#d6a36a');

      return `
        <div class="pvp-trainer-card ${isEnemy ? 'enemy' : 'ally'}">
          <div class="pvp-trainer-head">
            <i class="fas ${isEnemy ? 'fa-crosshairs' : 'fa-user-shield'}"></i> 
            ${isEnemy ? 'RIVAL' : 'JUGADOR'}
          </div>
          <div class="pvp-trainer-sprite-wrap">
            <img class="pvp-trainer-sprite" src="${sprite}" alt="Trainer ${safeName}" loading="lazy">
          </div>
          <div class="pvp-trainer-info-group">
            <div class="pvp-trainer-name">${safeName}</div>
            <div class="pvp-trainer-stats">
              <div class="pvp-trainer-row">
                <span>Nivel</span>
                <strong>${lvl}</strong>
              </div>
              <div class="pvp-trainer-row">
                <span>Puntos ELO</span>
                <strong style="color:${tierColor};">${elo}</strong>
              </div>
            </div>
            <div class="pvp-trainer-tier" style="border-color:${tierColor}; color:${tierColor}; background: ${tierColor}15;">
              <i class="fas fa-medal" style="margin-right:6px;"></i>${tierName}
            </div>
          </div>
        </div>`;
    }

    function _pvpEnsureRankedSidebarStyles() {
      if (document.getElementById('pvp-ranked-sidebar-style')) return;
      const st = document.createElement('style');
      st.id = 'pvp-ranked-sidebar-style';
      st.textContent = `
        #pvp-overlay .pvp-ranked-shell {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: stretch;
        }

        #pvp-overlay .pvp-ranked-shell .pvp-trainer-side {
          display: none;
        }

        #pvp-overlay .pvp-trainer-card {
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(8, 12, 21, 0.98));
          border: none;
          border-radius: 24px;
          padding: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 480px;
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
        }

        #pvp-overlay .pvp-trainer-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }

        #pvp-overlay .pvp-trainer-head {
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: #94a3b8;
          opacity: 0.8;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        #pvp-overlay .pvp-trainer-sprite-wrap {
          height: 320px;
          border-radius: 24px;
          background: radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15), transparent 75%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          position: relative;
        }

        #pvp-overlay .pvp-trainer-sprite {
          max-height: 310px;
          max-width: 150%;
          object-fit: contain;
          image-rendering: pixelated;
          filter: drop-shadow(0 15px 45px rgba(0, 0, 0, 0.9));
          transition: transform 0.3s ease;
          transform: scale(2.2);
          transform-origin: center;
        }
        
        #pvp-overlay .pvp-trainer-card:hover .pvp-trainer-sprite {
          transform: scale(2.3) translateY(-5px);
        }

        #pvp-overlay .pvp-trainer-info-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }

        #pvp-overlay .pvp-trainer-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 13px;
          line-height: 1.4;
          color: #f8fafc;
          word-break: break-word;
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }

        #pvp-overlay .pvp-trainer-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(0,0,0,0.25);
          padding: 12px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.03);
        }

        #pvp-overlay .pvp-trainer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #94a3b8;
        }

        #pvp-overlay .pvp-trainer-row strong {
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          color: #f1f5f9;
        }

        #pvp-overlay .pvp-trainer-tier {
          margin-top: auto;
          align-self: flex-start;
          border: 1px solid;
          border-radius: 12px;
          padding: 8px 14px;
          font-size: 10px;
          font-weight: 800;
          font-family: 'Press Start 2P', monospace;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        #pvp-overlay .pvp-trainer-side-right .pvp-trainer-card {
          text-align: right;
        }

        #pvp-overlay .pvp-trainer-side-right .pvp-trainer-head {
          justify-content: flex-end;
          flex-direction: row-reverse;
        }

        #pvp-overlay .pvp-trainer-side-right .pvp-trainer-tier {
          align-self: flex-end;
        }

        @media (min-width: 1400px) {
          #pvp-overlay .pvp-ranked-shell.ranked {
            width: min(1800px, 98vw);
            margin: 0 auto;
            display: grid;
            grid-template-columns: 280px minmax(800px, 1150px) 280px;
            gap: 24px;
            align-items: center;
          }

          #pvp-overlay .pvp-ranked-shell.ranked .pvp-trainer-side {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          #pvp-overlay .pvp-ranked-shell.ranked .battle-container {
            width: 100%;
            max-width: 1150px;
            margin: 0;
          }
        }
      `;
      document.head.appendChild(st);
    }

    function _pvpRenderRankedSidebars() {
      const left = document.getElementById('pvp-side-left');
      const right = document.getElementById('pvp-side-right');
      if (!left || !right) return;

      if (!_pvpState || !_pvpState.isRanked) {
        left.innerHTML = '';
        right.innerHTML = '';
        return;
      }

      const fallbackMe = {
        username: state?.trainer || 'Jugador',
        trainerLevel: Number(state?.trainerLevel || 1),
        elo: Number(state?.eloRating || 1000),
        playerClass: state?.playerClass || null
      };
      const fallbackEnemy = {
        username: _pvpState.enemyUsername || 'Rival',
        trainerLevel: 1,
        elo: Number(_pvpState.enemyElo || 1000),
        playerClass: null
      };

      const meMeta = _pvpState._sideMeta?.me || fallbackMe;
      const enemyMeta = _pvpState._sideMeta?.enemy || fallbackEnemy;

      left.innerHTML = _pvpBuildTrainerSideHtml(meMeta, false);
      right.innerHTML = _pvpBuildTrainerSideHtml(enemyMeta, true);
    }

    async function _pvpLoadRankedSidebarMeta() {
      if (!_pvpState || !_pvpState.isRanked || !currentUser?.id || !_pvpState.opponentId) return;

      const meBase = {
        username: state?.trainer || currentUser?.user_metadata?.username || 'Jugador',
        trainerLevel: Number(state?.trainerLevel || 1),
        elo: Number(state?.eloRating || _pvpState.enemyElo || 1000),
        playerClass: state?.playerClass || null
      };

      const enemyBase = {
        username: _pvpState.enemyUsername || 'Rival',
        trainerLevel: 1,
        elo: Number(_pvpState.enemyElo || 1000),
        playerClass: null
      };

      _pvpState._sideMeta = { me: meBase, enemy: enemyBase };
      _pvpRenderRankedSidebars();

      try {
        const ids = [currentUser.id, _pvpState.opponentId];
        const [pRes, sRes] = await Promise.all([
          sb.from('profiles').select('id,username,elo_rating').in('id', ids),
          sb.from('game_saves').select('user_id,save_data').in('user_id', ids)
        ]);

        const profiles = Array.isArray(pRes?.data) ? pRes.data : [];
        const saves = Array.isArray(sRes?.data) ? sRes.data : [];

        const pMap = new Map(profiles.map(r => [r.id, r]));
        const sMap = new Map(saves.map(r => [r.user_id, r.save_data || {}]));

        const meProfile = pMap.get(currentUser.id) || {};
        const enemyProfile = pMap.get(_pvpState.opponentId) || {};
        const meSave = sMap.get(currentUser.id) || {};
        const enemySave = sMap.get(_pvpState.opponentId) || {};

        if (enemyProfile?.username) _pvpState.enemyUsername = enemyProfile.username;
        if (Number.isFinite(Number(enemyProfile?.elo_rating))) _pvpState.enemyElo = Number(enemyProfile.elo_rating);

        _pvpState._sideMeta = {
          me: {
            username: meProfile?.username || meBase.username,
            trainerLevel: Number(state?.trainerLevel || meSave?.trainerLevel || meBase.trainerLevel || 1),
            elo: Number(state?.eloRating || meProfile?.elo_rating || meBase.elo || 1000),
            playerClass: state?.playerClass || meSave?.playerClass || meBase.playerClass || null
          },
          enemy: {
            username: _pvpState.enemyUsername || enemyProfile?.username || enemyBase.username,
            trainerLevel: Number(enemySave?.trainerLevel || enemyBase.trainerLevel || 1),
            elo: Number(_pvpState.enemyElo || enemyProfile?.elo_rating || enemyBase.elo || 1000),
            playerClass: enemySave?.playerClass || enemyBase.playerClass || null
          }
        };
      } catch (e) {
        console.warn('[PvP] sidebar metadata load failed:', e);
      }

      _pvpRenderRankedSidebars();
    }


    function _pvpSetInputDeadline() {
      if (!_pvpState || _pvpState.over) return;
      _pvpState._inputDeadlineAt = Date.now() + PVP_TURN_PICK_TIMEOUT_MS;
      _pvpState._afkWarned = false;
      _pvpState._selfTimedOut = false;
      _pvpState._selfTimeoutAt = null;
      _pvpState._opponentTimedOutAt = null;
      if (_pvpState._afkGraceTimer) {
        clearTimeout(_pvpState._afkGraceTimer);
        _pvpState._afkGraceTimer = null;
      }
    }

    function _pvpClearInputDeadline() {
      if (!_pvpState) return;
      _pvpState._inputDeadlineAt = null;
      _pvpState._afkWarned = false;
    }

    function _pvpStartAfkForfeitFlow() {
      if (!_pvpState || _pvpState.over) return;
      if (_pvpState._selfTimedOut) return;

      _pvpState._selfTimedOut = true;
      _pvpState._selfTimeoutAt = Date.now();
      _pvpState.phase = 'afk_timeout';
      _pvpClearInputDeadline();
      _pvpRenderMoves();

      const statusEl = document.getElementById('pvp-status-msg');
      if (statusEl) {
        statusEl.textContent = 'Tiempo agotado. Verificando AFK rival...';
        statusEl.style.color = 'var(--red)';
      }

      addPvpLog('Tiempo agotado: no elegiste movimiento.', 'log-info');
      try {
        _pvpState.channel?.send({
          type: 'broadcast',
          event: 'pvp_afk_timeout',
          payload: { at: _pvpState._selfTimeoutAt }
        });
      } catch (e) {}

      if (_pvpState._opponentTimedOutAt) {
        pvpEnd(false, { reason: 'mutual_afk' });
        return;
      }

      _pvpState._afkGraceTimer = setTimeout(() => {
        if (!_pvpState || _pvpState.over) return;
        if (_pvpState._opponentTimedOutAt) {
          pvpEnd(false, { reason: 'mutual_afk' });
          return;
        }
        addPvpLog('Derrota por inactividad.', 'log-info');
        try { _pvpState.channel?.send({ type: 'broadcast', event: 'pvp_forfeit', payload: {} }); } catch (e) {}
        pvpEnd(false, { reason: 'timeout_forfeit' });
      }, PVP_AFK_FORFEIT_GRACE_MS);
    }

    function _pvpNeedsPlayerInput() {
      if (!_pvpState || _pvpState.over) return false;
      if (_pvpState.phase === 'choosing') return _pvpState.myPick === null;
      if (_pvpState.phase === 'faint_switch') {
        const enemyHp = _pvpState.enemyHp?.[_pvpState.enemyActive] ?? 1;
        return enemyHp > 0;
      }
      return false;
    }

    function _pvpHandleInputTimeout() {
      if (!_pvpState || _pvpState.over) return;
      const needsInput = _pvpNeedsPlayerInput();

      if (!needsInput) {
        _pvpClearInputDeadline();
        return;
      }

      if (!_pvpState._inputDeadlineAt) {
        _pvpSetInputDeadline();
        return;
      }

      const msLeft = _pvpState._inputDeadlineAt - Date.now();
      const warnMs = PVP_TURN_WARN_SECONDS * 1000;
      if (msLeft > 0) {
        if (msLeft <= warnMs) {
          const secLeft = Math.max(1, Math.ceil(msLeft / 1000));
          const statusEl = document.getElementById('pvp-status-msg');
          if (statusEl) {
            statusEl.textContent = `Tiempo para elegir: ${secLeft}s`;
            statusEl.style.color = 'var(--red)';
          }
          if (!_pvpState._afkWarned) {
            addPvpLog(`Tiempo bajo: te quedan ${PVP_TURN_WARN_SECONDS}s para elegir.`, 'log-info');
            _pvpState._afkWarned = true;
          }
        }
        return;
      }

      _pvpStartAfkForfeitFlow();
    }


    // ── Subscribe (polling) for incoming invites ──────────────
    function subscribeBattleInvites() {
  if (!currentUser || _pvpBattleInvitesCh) return;
  const _seenInvites = new Set();
  _pvpBattleInvitesCh = setInterval(async () => {
    if (!currentUser) return;
    const { data } = await sb.from('battle_invites')
      .select('*').eq('opponent_id', currentUser.id).in('status', ['pending', 'ranked_match'])
      .order('created_at', { ascending: false }).limit(1);
    if (!data?.length) return;
    const inv = data[0];
    if (_seenInvites.has(inv.id)) return;
    if (Date.now() - new Date(inv.created_at).getTime() > 60000) return;
    _seenInvites.add(inv.id);

    if (inv.status === 'ranked_match') {
      // Ghost Queue Protection: si NO estamos buscando, rechazamos
      if (!window.isRankedSearching) {
        await sb.from('battle_invites').update({ status: 'declined' }).eq('id', inv.id);
        try { await sb.from('ranked_queue').delete().eq('user_id', currentUser.id); } catch (e) {}
        return;
      }

      const rankedTeam = (typeof getRankedPlayableTeam === 'function') ? getRankedPlayableTeam() : [];
      if (typeof ensureRankedTeamEligibility === 'function') {
        const gate = await ensureRankedTeamEligibility(rankedTeam, 'equipo ranked', true);
        if (!gate.ok) {
          await sb.from('battle_invites').update({ status: 'declined' }).eq('id', inv.id);
          try { await sb.from('ranked_queue').delete().eq('user_id', currentUser.id); } catch (e) {}
          return;
        }
      }

      // Auto-accept and start directly
      document.getElementById('pvp-invite-popup')?.remove();
      await sb.from('battle_invites').update({ status: 'ranked_accepted' }).eq('id', inv.id);

      // Ocultar matchmaking y detener b?squeda local
      if (typeof cancelRankedMatchmaking === 'function') {
        await cancelRankedMatchmaking(true);
      } else {
        if (window._matchmakingInterval) { clearInterval(window._matchmakingInterval); window._matchmakingInterval = null; }
        window.isRankedSearching = false;
      }
      startPvpBattle(inv, false, true);
    } else {
      showPvpInvitePopup(inv);
    }
  }, 4000);
}

async function showPvpInvitePopup(invite) {
      document.getElementById('pvp-invite-popup')?.remove();
      const { data: prof } = await sb.from('profiles').select('username').eq('id', invite.challenger_id).single();
      const challengerName = prof?.username || 'Un entrenador';
      const ov = document.createElement('div');
      ov.id = 'pvp-invite-popup';
      ov.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:800;' +
        'background:var(--card);border-radius:16px;padding:20px 24px;max-width:340px;width:90%;' +
        'border:1px solid rgba(199,125,255,0.4);box-shadow:0 4px 24px rgba(0,0,0,0.6);text-align:center;';
      ov.innerHTML = `
    <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--purple);margin-bottom:10px;">⚔️ ¡DESAFÍO PvP!</div>
    <div style="font-size:13px;margin-bottom:16px;"><strong>${challengerName}</strong><br>te desafía a una batalla</div>
    <div style="display:flex;gap:10px;justify-content:center;">
      <button onclick="acceptPvpInvite('${invite.id}')"
        style="font-family:'Press Start 2P',monospace;font-size:8px;padding:10px 16px;border:none;border-radius:10px;cursor:pointer;
               background:rgba(107,203,119,0.2);color:var(--green);border:1px solid rgba(107,203,119,0.3);">✓ Aceptar</button>
      <button onclick="declinePvpInvite('${invite.id}')"
        style="font-family:'Press Start 2P',monospace;font-size:8px;padding:10px 16px;border:none;border-radius:10px;cursor:pointer;
               background:rgba(255,59,59,0.15);color:var(--red);border:1px solid rgba(255,59,59,0.2);">✕ Rechazar</button>
    </div>`;
      document.body.appendChild(ov);
      setTimeout(() => ov.remove(), 60000);
    }

    async function sendBattleInvite(opponentId, opponentUsername) {
      if (!currentUser) return;
      if (state.team.filter(p => p.hp > 0 && !p.onMission).length === 0) {
        notify('¡Necesitás al menos 1 Pokémon con HP!', '⚠️'); return;
      }
      const { error } = await sb.from('battle_invites').insert({
        challenger_id: currentUser.id,
        opponent_id: opponentId,
        status: 'pending',
      });
      if (error) { notify('Error al enviar desafío: ' + error.message, '❌'); return; }
      notify(`¡Desafío enviado a ${opponentUsername}! Esperando respuesta...`, '⚔️');
      const { data: rows } = await sb.from('battle_invites')
        .select('id').eq('challenger_id', currentUser.id).eq('status', 'pending')
        .order('created_at', { ascending: false }).limit(1);
      const inviteId = rows?.[0]?.id;
      if (!inviteId) return;
      _waitForAcceptance(inviteId);
    }

    function _waitForAcceptance(inviteId) {
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (attempts > 20) {
          clearInterval(poll);
          notify('El desafío expiró sin respuesta.', '⏱️');
          await sb.from('battle_invites').update({ status: 'expired' }).eq('id', inviteId);
          return;
        }
        const { data } = await sb.from('battle_invites').select('*').eq('id', inviteId).single();
        if (!data) { clearInterval(poll); return; }
        if (data.status === 'accepted') {
          clearInterval(poll);
          startPvpBattle(data, true);
        } else if (data.status === 'declined' || data.status === 'expired') {
          clearInterval(poll);
          notify('El desafío fue rechazado.', '❌');
        }
      }, 3000);
    }

    async function acceptPvpInvite(inviteId) {
      document.getElementById('pvp-invite-popup')?.remove();
      const { data: invite } = await sb.from('battle_invites').select('*').eq('id', inviteId).single();
      if (!invite || invite.status !== 'pending') return;
      await sb.from('battle_invites').update({ status: 'accepted' }).eq('id', inviteId);
      startPvpBattle(invite, false);
    }

    async function declinePvpInvite(inviteId) {
      document.getElementById('pvp-invite-popup')?.remove();
      await sb.from('battle_invites').update({ status: 'declined' }).eq('id', inviteId);
    }

    // ── Core PvP ─────────────────────────────────────────────────
    // TURN SYSTEM: Both players choose simultaneously.
    // The HOST (challenger) is the "resolver": once both picks arrive,
    // host calculates the full turn and broadcasts pvp_turn_result.
    // The CLIENT applies the result received. Speed decides who attacks first.
    // ─────────────────────────────────────────────────────────────

    async function startPvpBattle(invite, isHost, isRanked = false) {
  // Al entrar en combate, forzamos detener cualquier busqueda de matchmaking
  if (typeof cancelRankedMatchmaking === 'function') {
    cancelRankedMatchmaking(true);
  } else {
    window.isRankedSearching = false;
    if (window._matchmakingInterval) { clearInterval(window._matchmakingInterval); window._matchmakingInterval = null; }
  }

  const rankedBaseTeam = (isRanked && typeof getRankedPlayableTeam === 'function')
    ? getRankedPlayableTeam()
    : state.team.filter(p => p.hp > 0 && !p.onMission);

  if (isRanked && typeof ensureRankedTeamEligibility === 'function') {
    const gate = await ensureRankedTeamEligibility(rankedBaseTeam, 'equipo ranked', true);
    if (!gate.ok) {
      try {
        if (invite?.id) await sb.from('battle_invites').update({ status: 'declined' }).eq('id', invite.id);
      } catch (e) {}
      return;
    }
  }

  const myTeam = rankedBaseTeam.map(p => JSON.parse(JSON.stringify(p)));
  if (!myTeam.length) { notify('No tenes Pokemon disponibles.', '\u26A0\uFE0F'); return; }

  const opponentId = isHost ? invite.opponent_id : invite.challenger_id;
  const { data: _oppProf } = await sb.from('profiles').select('username,elo_rating').eq('id', opponentId).single();
      const enemyUsername = _oppProf?.username || 'Rival';

      _pvpState = {
        invite, isHost, isRanked, opponentId,
        myActive: 0, enemyActive: 0,
        myTeam, enemyTeam: null,
        myHp: myTeam.map(p => p.hp), enemyHp: [],
        over: false, channel: null, enemyUsername, enemyElo: Number(_oppProf?.elo_rating || 1000), _sideMeta: null,
        phase: 'sync',
        myPick: null, enemyPick: null,
        myStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 },
        enemyStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 },
        _teamAcknowledged: false,
        _announceCount: 0,
        _lastActivityTime: Date.now(),
        _disconnectTimer: null,
        _opponentDisconnected: false,
        _inputDeadlineAt: null,
        _afkWarned: false,
        _selfTimedOut: false,
        _selfTimeoutAt: null,
        _opponentTimedOutAt: null,
        _afkGraceTimer: null,
        _battleAnnounced: false, // Flag to prevent log spam
      };
      _pvpLock = false;
      _pvpLoadRankedSidebarMeta();

      const chName = 'pvp-' + invite.id;
      _pvpState.channel = sb.channel(chName, { config: { broadcast: { self: false } } });
      _pvpRegisterListeners(_pvpState.channel);

      _pvpState.channel.subscribe(status => {
        if (status !== 'SUBSCRIBED') return;
        showPvpScreen();
        state.activeBattle = { isPvP: true, inviteId: invite.id, isHost, isRanked, opponentId, enemyUsername, enemyElo: _pvpState.enemyElo, timestamp: Date.now() };
        saveGame(false);
        _pvpStartHeartbeatLoop();

        const _ann = setInterval(() => {
          if (_pvpState._teamAcknowledged || _pvpState.over || _pvpState._announceCount++ > 40) {
            clearInterval(_ann); return;
          }
          _pvpState.channel.send({ type: 'broadcast', event: 'pvp_team', payload: { team: myTeam } });
        }, 1000);
      });
    }

    async function attemptPvpReconnection(ab) {
      _pvpState = {
        invite: { id: ab.inviteId },
        isHost: ab.isHost,
        isRanked: ab.isRanked === true, // Restaurar flag de Ranked
        opponentId: ab.opponentId,
        enemyUsername: ab.enemyUsername,
        enemyElo: Number(ab.enemyElo || 1000),
        _sideMeta: null,
        myActive: 0, enemyActive: 0,
        myTeam: state.team.map(p => JSON.parse(JSON.stringify(p))),
        enemyTeam: null,
        myHp: state.team.map(p => p.hp), enemyHp: [],
        over: false,
        phase: 'sync',
        myPick: null, enemyPick: null,
        myStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 },
        enemyStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 },
        _teamAcknowledged: true,
        _lastActivityTime: Date.now(),
        _opponentDisconnected: false,
        _inputDeadlineAt: null,
        _afkWarned: false,
        _selfTimedOut: false,
        _selfTimeoutAt: null,
        _opponentTimedOutAt: null,
        _afkGraceTimer: null
      };

      _pvpLoadRankedSidebarMeta();

      const chName = 'pvp-' + ab.inviteId;
      _pvpState.channel = sb.channel(chName, { config: { broadcast: { self: false } } });
      _pvpRegisterListeners(_pvpState.channel);

      _pvpState.channel.subscribe(status => {
        if (status !== 'SUBSCRIBED') return;
        showPvpScreen();
        addPvpLog('🔄 Sincronizando batalla...', 'log-info');
        _pvpState.channel.send({ type: 'broadcast', event: 'pvp_sync_request', payload: {} });
        const syncRetry = setInterval(() => {
          if (!_pvpState || _pvpState.over || _pvpState.phase !== 'sync') {
            clearInterval(syncRetry);
            return;
          }
          _pvpState.channel.send({ type: 'broadcast', event: 'pvp_sync_request', payload: { retry: true } });
        }, 2000);
        _pvpStartHeartbeatLoop();
      });
    }

    function _pvpRegisterListeners(ch) {
      ch
        .on('broadcast', { event: 'pvp_team' }, ({ payload }) => {
          ch.send({ type: 'broadcast', event: 'pvp_team_ack', payload: {} });
          _pvpState.enemyTeam = payload.team;
          _pvpState.enemyHp = payload.team.map(p => p.hp);
          _pvpState.phase = 'choosing';
          _pvpSetInputDeadline();
          renderPvpBattle();
          _pvpEnsureRankedSidebarStyles();
          _pvpRenderRankedSidebars();
          _pvpLoadSprites();
          
          if (!_pvpState._battleAnnounced) {
            addPvpLog('¡Batalla iniciada!', 'log-info');
            _pvpState._battleAnnounced = true;
          }
          
          // Entry abilities at start
          if (typeof handleEntryAbilities === 'function') {
            handleEntryAbilities(
              _pvpState.myTeam[_pvpState.myActive], 
              _pvpState.enemyTeam[_pvpState.enemyActive],
              _pvpState.myStages,
              _pvpState.enemyStages,
              (m, c) => addPvpLog(m, c)
            );
          }
        })
        .on('broadcast', { event: 'pvp_team_ack' }, () => { _pvpState._teamAcknowledged = true; })
        .on('broadcast', { event: 'pvp_sync_request' }, () => {
          if (_pvpState.over) return;
          ch.send({
            type: 'broadcast', event: 'pvp_sync_data',
            payload: {
              enemyTeam: _pvpState.myTeam, enemyHp: _pvpState.myHp, enemyActive: _pvpState.myActive, enemyStages: _pvpState.myStages,
              myHp: Array.isArray(_pvpState.enemyHp) ? _pvpState.enemyHp : [],
              myActive: Number.isInteger(_pvpState.enemyActive) ? _pvpState.enemyActive : 0,
              myStages: _pvpState.enemyStages || { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 },
              phase: _pvpState.phase,
              opponentPick: _pvpState.myPick
            }
          });
        })
        .on('broadcast', { event: 'pvp_sync_data' }, ({ payload }) => {
          if (_pvpState.phase !== 'sync' || _pvpState.over) return;
          if (!payload || typeof payload !== 'object') return;

          const localTeamLen = _pvpState.myTeam.length;
          const incomingEnemyTeam = Array.isArray(payload.enemyTeam) ? payload.enemyTeam : null;
          if (incomingEnemyTeam && incomingEnemyTeam.length) {
            _pvpState.enemyTeam = incomingEnemyTeam;
          }

          const enemyTeamLen = Array.isArray(_pvpState.enemyTeam) ? _pvpState.enemyTeam.length : 0;
          const incomingEnemyHp = Array.isArray(payload.enemyHp) ? payload.enemyHp : null;
          if (incomingEnemyHp && incomingEnemyHp.length) {
            _pvpState.enemyHp = incomingEnemyHp;
          } else if ((!_pvpState.enemyHp || !_pvpState.enemyHp.length) && enemyTeamLen > 0) {
            _pvpState.enemyHp = _pvpState.enemyTeam.map(p => p.hp);
          }

          if (Number.isInteger(payload.enemyActive) && payload.enemyActive >= 0 && payload.enemyActive < Math.max(1, enemyTeamLen)) {
            _pvpState.enemyActive = payload.enemyActive;
          }
          if (payload.enemyStages && typeof payload.enemyStages === 'object') {
            _pvpState.enemyStages = { ..._pvpState.enemyStages, ...payload.enemyStages };
          }

          const incomingMyHp = Array.isArray(payload.myHp) ? payload.myHp : null;
          if (incomingMyHp && incomingMyHp.length === localTeamLen) {
            _pvpState.myHp = incomingMyHp;
          } else if (!Array.isArray(_pvpState.myHp) || _pvpState.myHp.length !== localTeamLen) {
            _pvpState.myHp = _pvpState.myTeam.map(p => p.hp);
          }

          if (Number.isInteger(payload.myActive) && payload.myActive >= 0 && payload.myActive < localTeamLen) {
            _pvpState.myActive = payload.myActive;
          }
          if (payload.myStages && typeof payload.myStages === 'object') {
            _pvpState.myStages = { ..._pvpState.myStages, ...payload.myStages };
          }

          if (_pvpState.isHost && payload.opponentPick && _pvpState.enemyPick === null) {
            _pvpState.enemyPick = payload.opponentPick;
          }

          const syncedPhase = payload.phase;
          let normalizedPhase = syncedPhase;
          if (normalizedPhase === 'waiting' || normalizedPhase === 'opponent_disconnected' || normalizedPhase === 'sync') {
            normalizedPhase = 'choosing';
          }
          _pvpState.phase = normalizedPhase || 'choosing';
          if (_pvpNeedsPlayerInput()) _pvpSetInputDeadline();
          else _pvpClearInputDeadline();
          _pvpState._opponentDisconnected = false;
          addPvpLog('✅ Sincronizado.', 'log-info');
          renderPvpBattle();
          _pvpLoadSprites();
        })
        .on('broadcast', { event: 'pvp_pick' }, ({ payload }) => {
          if (_pvpState.over || !_pvpState.isHost) return;
          _pvpState.enemyPick = payload;
          if (_pvpState.myPick !== null) _pvpResolve();
        })
        .on('broadcast', { event: 'pvp_turn_result' }, ({ payload }) => {
          if (_pvpState.over || _pvpState.isHost) return;
          _pvpApplyTurnResult(payload);
        })
        .on('broadcast', { event: 'pvp_forced_switch' }, ({ payload }) => {
          if (_pvpState.over) return;
          _pvpState.enemyActive = payload.index;
          _pvpUpdateEnemy();
          
          // Entry abilities on forced switch
          if (typeof handleEntryAbilities === 'function') {
             handleEntryAbilities(
              _pvpState.myTeam[_pvpState.myActive], 
              _pvpState.enemyTeam[_pvpState.enemyActive],
              _pvpState.myStages,
              _pvpState.enemyStages,
              (m, c) => addPvpLog(m, c)
            );
          }
          if (_pvpState.phase === 'faint_switch') {
            _pvpState.phase = 'choosing'; _pvpState.myPick = null;
            if (_pvpState.isHost) _pvpState.enemyPick = null;
            _pvpSetInputDeadline();
            _pvpRenderMoves();
          }
        })
        .on('broadcast', { event: 'pvp_afk_timeout' }, ({ payload }) => {
          if (_pvpState.over) return;
          _pvpState._opponentTimedOutAt = Number(payload?.at) || Date.now();
          if (_pvpState._selfTimedOut) {
            if (_pvpState._afkGraceTimer) {
              clearTimeout(_pvpState._afkGraceTimer);
              _pvpState._afkGraceTimer = null;
            }
            pvpEnd(false, { reason: 'mutual_afk' });
          }
        })
        .on('broadcast', { event: 'pvp_forfeit' }, () => {
          if (_pvpState.over) return;
          if (_pvpState._selfTimedOut) {
            pvpEnd(false, { reason: 'mutual_afk' });
            return;
          }
          pvpEnd(true);
        })
        .on('broadcast', { event: 'pvp_heartbeat' }, () => {
          if (_pvpState.over) return;
          _pvpState._lastActivityTime = Date.now();
          if (_pvpState._opponentDisconnected) {
            _pvpState._opponentDisconnected = false;
            _pvpState.phase = 'choosing';
            _pvpSetInputDeadline();
            addPvpLog('🔄 ¡Rival reconectado!', 'log-info');
            if (_pvpState._disconnectTimer) { clearTimeout(_pvpState._disconnectTimer); _pvpState._disconnectTimer = null; }
            renderPvpBattle();
          }
        });
    }

    function _pvpStartHeartbeatLoop() {
      const hb = setInterval(() => {
        if (!_pvpState || _pvpState.over) { clearInterval(hb); return; }
        _pvpState.channel.send({ type: 'broadcast', event: 'pvp_heartbeat', payload: {} });
      }, 5000);

      const cd = setInterval(() => {
        if (!_pvpState || _pvpState.over) { clearInterval(cd); return; }
        _pvpHandleInputTimeout();
        if (!_pvpState || _pvpState.over) { clearInterval(cd); return; }
        const diff = Date.now() - _pvpState._lastActivityTime;
        
        // Si hay desconexión (más de 10s de silencio)
        if (diff > 10000 && !_pvpState._opponentDisconnected) {
          _pvpState._opponentDisconnected = true;
          _pvpState.phase = 'opponent_disconnected';
          _pvpState._disconnectSecondsLeft = 60; // Iniciamos en 60s
          
          addPvpLog('⚠️ Rival desconectado...', 'log-enemy');
          renderPvpBattle();

          // Cronómetro de cuenta regresiva
          _pvpState._disconnectInterval = setInterval(() => {
            if (!_pvpState || _pvpState.over || !_pvpState._opponentDisconnected) {
              clearInterval(_pvpState._disconnectInterval);
              return;
            }
            
            _pvpState._disconnectSecondsLeft--;
            
            // Actualizar solo el texto del status sin re-renderizar todo para rendimiento
            const statusEl = document.getElementById('pvp-status-msg');
            if (statusEl) {
              statusEl.textContent = `⚠️ Rival desconectado (${_pvpState._disconnectSecondsLeft}s)`;
            }

            if (_pvpState._disconnectSecondsLeft <= 0) {
              clearInterval(_pvpState._disconnectInterval);
              addPvpLog('🏳️ Victoria por abandono.', 'log-info');
              pvpEnd(true);
            }
          }, 1000);
        }
      }, 1000);
    }

    // ── PvP Screen ───────────────────────────────────────────────
    function showPvpScreen() {
      let ov = document.getElementById('pvp-overlay');
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'pvp-overlay';
        ov.style.cssText = 'position:fixed;inset:0;z-index:600;background:#0d1117;display:flex;align-items:center;justify-content:center;overflow:hidden;';
        document.body.appendChild(ov);
      }
      const me = _pvpState.myTeam[_pvpState.myActive];
      const enemy = _pvpState.enemyTeam?.[_pvpState.enemyActive];

      // Usamos las clases oficiales .battle-container para asegurar responsividad móvil automática
      ov.innerHTML = `
      <div class="pvp-ranked-shell${_pvpState.isRanked ? ' ranked' : ''}">
        <aside id="pvp-side-left" class="pvp-trainer-side pvp-trainer-side-left"></aside>
        <div class="battle-container" style="position:relative; overflow:visible;">
        <div id="pvp-fight-header" style="position:absolute; top:-40px; right:0; z-index:30; pointer-events:none; display:flex; flex-direction:column; align-items:flex-end; gap:4px; opacity:0.9;">
          <div style="font-family:'Press Start 2P',monospace; font-size:6px; color:#fff; background:rgba(199,125,255,0.45); padding:4px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.25); backdrop-filter:blur(4px);">${_pvpState.isRanked ? 'RANKED' : 'AMISTOSO'}
          </div>
          <div id="pvp-status-msg" style="font-size:8px; color:var(--yellow); font-weight:700; background:rgba(0,0,0,0.48); padding:3px 6px; border-radius:4px; display:inline-block;">Conectando...</div>
        </div>
        <!-- Arena -->
        <div class="battle-arena" id="pvp-arena" style="position:relative; overflow:hidden;">
          <canvas id="pvp-battle-bg-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;border-radius:18px;"></canvas>

          <div class="battle-combatants">
            <div style="display:flex;align-items:flex-start;justify-content:flex-start;">
              <div class="battle-pokemon-info" id="pvp-enemy-info">
                <div class="battle-name">
                  <span id="pvp-enemy-name">???</span> 
                  <span id="pvp-enemy-gender" class="gender-badge"></span>
                </div>
                <div class="battle-level" id="pvp-enemy-level">Nv. 1</div>
                <div class="hp-bar-wrap">
                  <div class="hp-bar hp-high" id="pvp-enemy-hp-bar" style="width:100%"></div>
                </div>
                <div class="battle-hp-text" id="pvp-enemy-hp-text">HP: ?/?</div>
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;justify-content:flex-end;z-index:10;position:relative;">
              <div id="pvp-enemy-sprite-wrap" style="display:flex;align-items:flex-start;justify-content:flex-end;">
                <img id="pvp-enemy-img" src="" alt="" style="image-rendering:pixelated;filter:drop-shadow(0 8px 30px rgba(0,0,0,0.9));display:none;">
              </div>
            </div>
            <div style="display:flex;align-items:flex-end;justify-content:flex-start;z-index:10;position:relative;">
              <div id="pvp-player-sprite-wrap" style="display:flex;align-items:flex-end;justify-content:flex-start;">
                <img id="pvp-player-img" src="" alt="" style="image-rendering:pixelated;filter:drop-shadow(0 8px 30px rgba(0,0,0,0.9));display:none;">
              </div>
            </div>
            <div style="display:flex;align-items:flex-end;justify-content:flex-end;padding-bottom:40px;z-index:20;position:relative;">
              <div class="battle-pokemon-info" id="pvp-player-info">
                <div class="battle-name">
                  <span id="pvp-player-name">???</span> 
                  <span id="pvp-player-gender" class="gender-badge"></span>
                </div>
                <div class="battle-level" id="pvp-player-level">Nv. 1</div>
                <div class="hp-bar-wrap">
                  <div class="hp-bar hp-high" id="pvp-player-hp-bar" style="width:100%"></div>
                </div>
                <div class="battle-hp-text" id="pvp-player-hp-text">HP: ?/?</div>
              </div>
            </div>
          </div>
        </div>

        <div id="pvp-log" class="battle-log"></div>

        <div id="pvp-move-panel" class="move-panel-wrapper">
          <div id="pvp-move-buttons" class="battle-actions"></div>
          <div class="action-row no-catch" style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
            <button class="action-btn" id="btn-switch" onclick="pvpShowSwitch()" style="width:100%;background:rgba(199,125,255,0.15); border:1px solid rgba(199,125,255,0.3); color:var(--purple);">
              🔄 CAMBIAR
            </button>
            <button class="action-btn" id="btn-run" onclick="pvpForfeit()" style="width:100%;background:rgba(255,59,59,0.1); border:1px solid rgba(255,59,59,0.3); color:var(--red);">
              🏳️ RENDIRSE
            </button>
          </div>
        </div>
      </div>
      <aside id="pvp-side-right" class="pvp-trainer-side pvp-trainer-side-right"></aside>
      </div>`;

      _pvpEnsureRankedSidebarStyles();
      _pvpRenderRankedSidebars();
      _pvpLoadSprites();
      _pvpRenderMoves();

      // Damos un delay extra para asegurar que el contenedor Grid tenga su tamaño final en PC
      setTimeout(() => {
        const bgKey = _pvpState?.isRanked ? 'pvp_ranked' : 'pvp';
        drawBattleBackground(bgKey);
      }, 250);
    }

    function _pvpLoadSprites() {
      const me = _pvpState.myTeam[_pvpState.myActive];
      const enemy = _pvpState.enemyTeam?.[_pvpState.enemyActive];
      if (me) {
        const img = document.getElementById('pvp-player-img');
        if (img) loadSprite(img, null, getBackSpriteUrl(me.id));
      }
      if (enemy) {
        const img = document.getElementById('pvp-enemy-img');
        if (img) loadSprite(img, null, getSpriteUrl(enemy.id));
      }
    }

    function _pvpApplyMoveButtonsGridLayout() {
      const panel = document.getElementById('pvp-move-buttons');
      if (!panel) return;
      panel.style.display = 'grid';
      panel.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
      panel.style.gap = '8px';
      panel.style.flexDirection = '';
    }

    // ── Move panel renderer (phase-aware) ────────────────────────
    function _pvpRenderMoves() {
      const panel = document.getElementById('pvp-move-buttons');
      const status = document.getElementById('pvp-status-msg');
      if (!panel || !_pvpState) return;
      _pvpApplyMoveButtonsGridLayout();

      const me = _pvpState.myTeam[_pvpState.myActive];
      const phase = _pvpState.phase;

      // Status message
      if (status) {
        const msgs = {
          sync: '\u23f3 Conectando...',
          choosing: '\u2694\ufe0f \u00a1Elegí tu movimiento!',
          waiting: '\u23f3 Esperando al rival...',
          resolving: '\u26a1 Resolviendo turno...',
          faint_switch: '\ud83d\udcab Esperando cambio del rival...',
          opponent_disconnected: '\u26a0\ufe0f Rival desconectado (60s)',
        };
        status.textContent = msgs[phase] || '';
        status.style.color = phase === 'choosing' ? 'var(--green)' : phase === 'opponent_disconnected' ? 'var(--red)' : 'var(--yellow)';
        if (_pvpNeedsPlayerInput() && _pvpState._inputDeadlineAt) {
          const msLeft = _pvpState._inputDeadlineAt - Date.now();
          if (msLeft > 0 && msLeft <= (PVP_TURN_WARN_SECONDS * 1000)) {
            const secLeft = Math.max(1, Math.ceil(msLeft / 1000));
            status.textContent = `Tiempo para elegir: ${secLeft}s`;
            status.style.color = 'var(--red)';
          }
        }
      }

      if (_pvpState.over || phase === 'sync' || phase === 'resolving') {
        panel.innerHTML = ''; return;
      }

      // If enemy fainted and we wait for their switch, no moves available
      if (phase === 'faint_switch' && _pvpState.enemyHp[_pvpState.enemyActive] <= 0) {
        panel.innerHTML = ''; return;
      }

      if (!me) { panel.innerHTML = ''; return; }

      const TYPE_COL = {
        normal: '#aaa', fire: '#FF6B35', water: '#3B8BFF', grass: '#6BCB77',
        electric: '#FFD93D', ice: '#7DF9FF', fighting: '#FF3B3B', poison: '#C77DFF',
        ground: '#c8a060', flying: '#89CFF0', psychic: '#FF6EFF', bug: '#8BC34A',
        rock: '#c8a060', ghost: '#7B2FBE', dragon: '#5C16C5', dark: '#555', steel: '#9E9E9E'
      };
      const CAT_ICO = { physical: '⚔️', special: '✨', status: '🔮' };
      const waiting = phase === 'waiting' || phase === 'opponent_disconnected';

      panel.innerHTML = (me.moves || []).map((mv, i) => {
        const moveName = mv.name || 'Desconocido';
        const md = MOVE_DATA[moveName] || { power: mv.power || 40, type: 'normal', cat: 'physical' };
        const col = TYPE_COL[md.type] || '#aaa';
        const ico = CAT_ICO[md.cat] || '⚔️';
        
        const disabled = mv.pp <= 0 || waiting;

        // Estructura idéntica a 07_battle.js para mantener fidelidad visual con .move-btn
        return `
        <button class="move-btn" ${disabled ? 'disabled' : ''}
          style="--move-color: ${col}; opacity: ${waiting ? '0.4' : '1'}; cursor: ${disabled ? 'default' : 'pointer'};"
          onclick="pvpUseMove(${i})">
          <span class="move-name">${moveName}</span>
          <div class="move-pp" style="margin-top: 2px;">
            <span class="type-badge type-${(md.type || 'normal').toLowerCase()}" style="font-size:8px; padding:2px 6px; border-radius:6px;">${md.type || '???'}</span>
            <span style="display:flex; align-items:center; gap:4px;">
              ${ico} PP:${mv.pp || 0}/${mv.maxPP || 0}
            </span>
          </div>
        </button>`;
      }).join('');
    }

    function addPvpLog(msg, cls) {
      const el = document.getElementById('pvp-log');
      if (!el) return;
      el.innerHTML += `<div class="log-entry ${cls || ''}">${msg}</div>`;
      el.scrollTop = el.scrollHeight;
    }

    function renderPvpBattle() {
      if (!_pvpState) return;
      _pvpRenderRankedSidebars();
      const me = _pvpState.myTeam[_pvpState.myActive];
      const enemy = _pvpState.enemyTeam?.[_pvpState.enemyActive];
      const myHp = _pvpState.myHp[_pvpState.myActive] ?? me?.hp ?? 0;
      const enemyHp = enemy ? (_pvpState.enemyHp[_pvpState.enemyActive] ?? enemy.hp) : 0;

      const pEn = document.getElementById('pvp-enemy-name');
      const pEnG = document.getElementById('pvp-enemy-gender');
      const pEnLv = document.getElementById('pvp-enemy-level');
      const pEnBar = document.getElementById('pvp-enemy-hp-bar');
      const pEnTxt = document.getElementById('pvp-enemy-hp-text');
      const pEnNat = document.getElementById('pvp-enemy-nature-row');

      const pPl = document.getElementById('pvp-player-name');
      const pPlG = document.getElementById('pvp-player-gender');
      const pPlLv = document.getElementById('pvp-player-level');
      const pPlBar = document.getElementById('pvp-player-hp-bar');
      const pPlTxt = document.getElementById('pvp-player-hp-text');

      if (enemy && pEn) {
        pEn.textContent = enemy.name;
        if (pEnG) {
          const gData = genderBadgeData(enemy.gender);
          pEnG.textContent = gData.text;
          pEnG.className = `gender-badge ${gData.cls}`;
          pEnG.style.opacity = gData.cls === 'gender-none' ? '0.6' : '1';
        }
        pEnLv.textContent = `Nv. ${enemy.level}`;
        const pct = Math.max(0, enemyHp / enemy.maxHp);
        pEnBar.style.width = (pct * 100) + '%';
        pEnBar.className = 'hp-bar ' + getHpClass(pct);
        pEnTxt.textContent = `HP: ${enemyHp}/${enemy.maxHp}`;
      }

      if (me && pPl) {
        pPl.textContent = me.name;
        if (pPlG) {
          const gData = genderBadgeData(me.gender);
          pPlG.textContent = gData.text;
          pPlG.className = `gender-badge ${gData.cls}`;
          pPlG.style.opacity = gData.cls === 'gender-none' ? '0.6' : '1';
        }
        pPlLv.textContent = `Nv. ${me.level}`;
        const pct = Math.max(0, myHp / me.maxHp);
        pPlBar.style.width = (pct * 100) + '%';
        pPlBar.className = 'hp-bar ' + getHpClass(pct);
        pPlTxt.textContent = `HP: ${myHp}/${me.maxHp}`;
      }
      _pvpRenderMoves();
    }

    function _pvpUpdateEnemy() {
      const enemy = _pvpState.enemyTeam?.[_pvpState.enemyActive];
      if (!enemy) return;
      const nm = document.getElementById('pvp-enemy-name'); if (nm) nm.textContent = enemy.name;
      const lv = document.getElementById('pvp-enemy-level'); if (lv) lv.textContent = 'Nv. ' + enemy.level;
      const hp = _pvpState.enemyHp[_pvpState.enemyActive] ?? enemy.hp;
      const pct = Math.max(0, hp / enemy.maxHp);
      const bar = document.getElementById('pvp-enemy-hp-bar');
      if (bar) { bar.style.width = (pct * 100) + '%'; bar.className = 'hp-bar ' + getHpClass(pct); }
      const ht = document.getElementById('pvp-enemy-hp-text'); if (ht) ht.textContent = hp + '/' + enemy.maxHp + ' HP';
      const img = document.getElementById('pvp-enemy-img');
      if (img) { img.style.display = 'none'; loadSprite(img, null, getSpriteUrl(enemy.id)); }
    }

    function _pvpUpdateMyPokemon() {
      const me = _pvpState.myTeam[_pvpState.myActive];
      if (!me) return;
      const nm = document.getElementById('pvp-player-name'); if (nm) nm.textContent = me.name;
      const lv = document.getElementById('pvp-player-level'); if (lv) lv.textContent = 'Nv. ' + me.level;
      const hp = _pvpState.myHp[_pvpState.myActive] ?? me.hp;
      const pct = Math.max(0, hp / me.maxHp);
      const bar = document.getElementById('pvp-player-hp-bar');
      if (bar) { bar.style.width = (pct * 100) + '%'; bar.className = 'hp-bar ' + getHpClass(pct); }
      const ht = document.getElementById('pvp-player-hp-text'); if (ht) ht.textContent = hp + '/' + me.maxHp + ' HP';
      const img = document.getElementById('pvp-player-img');
      if (img) { img.style.display = 'none'; loadSprite(img, null, getBackSpriteUrl(me.id)); }
      _pvpRenderMoves();
    }

    // ── Commit action (both sides) ───────────────────────────────
    function pvpUseMove(moveIndex) {
      if (!_pvpState || _pvpState.over || _pvpState.phase !== 'choosing') return;
      const me = _pvpState.myTeam[_pvpState.myActive];
      const move = me?.moves?.[moveIndex];
      if (!move) return;
      if (move.pp <= 0) { notify('Sin PP', '⚠️'); return; }

      _pvpCommitPick({ type: 'move', moveIndex });
    }

    function _pvpCommitPick(pick) {
      if (!_pvpState || _pvpState.phase !== 'choosing') return;
      _pvpState.myPick = pick;
      _pvpState.phase = 'waiting';
      _pvpClearInputDeadline();
      _pvpRenderMoves(); // Gray out buttons, show "waiting"

      if (_pvpState.isHost) {
        // Host stores pick; if enemy already picked → resolve immediately
        if (_pvpState.enemyPick !== null) _pvpResolve();
      } else {
        // Client sends pick to host and waits for pvp_turn_result
        _pvpState.channel.send({ type: 'broadcast', event: 'pvp_pick', payload: pick });
      }
    }

    // ── Host: resolve the turn ───────────────────────────────────
    function _pvpResolve() {
      if (!_pvpState?.isHost || _pvpState.over || _pvpState.phase === 'resolving') return;
      _pvpState.phase = 'resolving';
      _pvpClearInputDeadline();
      _pvpRenderMoves();

      const s = _pvpState;
      const hostPoke = s.myTeam[s.myActive];
      const clientPoke = s.enemyTeam[s.enemyActive];
      if (!s.myStages) s.myStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 };
      if (!s.enemyStages) s.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 };

      const hostPick = s.myPick;
      const clientPick = s.enemyPick;

      // ── Determine who attacks first ───────────────────────────
      let firstIsHost;
      if (hostPick.type === 'switch') { firstIsHost = true; }
      else if (clientPick.type === 'switch') { firstIsHost = false; }
      else {
        const hMove = hostPoke.moves[hostPick.moveIndex];
        const cMove = clientPoke.moves[clientPick.moveIndex];
        const hPrio = (MOVE_DATA[hMove?.name]?.priority) || 0;
        const cPrio = (MOVE_DATA[cMove?.name]?.priority) || 0;
        if (hPrio !== cPrio) {
          firstIsHost = hPrio > cPrio;
        } else {
          const hSpe = Math.max(1, Math.floor((hostPoke.spe || 40) * stageMult(s.myStages.spe || 0)) * (hostPoke.status === 'paralyze' ? 0.5 : 1));
          const cSpe = Math.max(1, Math.floor((clientPoke.spe || 40) * stageMult(s.enemyStages.spe || 0)) * (clientPoke.status === 'paralyze' ? 0.5 : 1));
          firstIsHost = hSpe > cSpe || (hSpe === cSpe && Math.random() < 0.5);
        }
      }

      // ── Calculate a single action (doesn't apply HP yet) ──────
      function calcAction(actorIsHost) {
        var effectLog = [];
        const attacker = actorIsHost ? hostPoke : clientPoke;
        const defender = actorIsHost ? clientPoke : hostPoke;
        const atkS = actorIsHost ? s.myStages : s.enemyStages;
        const defS = actorIsHost ? s.enemyStages : s.myStages;
        const pick = actorIsHost ? hostPick : clientPick;
        const actorName = attacker.name;
        const targName = defender.name;

        if (pick.type === 'switch') {
          const newPoke = actorIsHost ? s.myTeam[pick.switchIndex] : s.enemyTeam[pick.switchIndex];
          return { type: 'switch', switchIndex: pick.switchIndex, pokeName: newPoke?.name || '?', actorIsHost, effectLog };
        }

        const move = attacker.moves[pick.moveIndex];
        const moveName = move?.name || '???';
        const md = MOVE_DATA[moveName] || { power: move?.power || 40, type: 'normal', cat: 'physical', acc: 100 };


        // Status prevents moving
        if (attacker.status === 'sleep') {
          if ((attacker.sleepTurns || 0) > 0) { attacker.sleepTurns--; return { type: 'move', moveName, actorIsHost, actorName, targName, statusBlocked: 'sleep', damage: 0, eff: 1, effectLog }; }
          attacker.status = null;
        }
        // Flinch
        if (attacker.flinched) {
          attacker.flinched = false; // Reset
          return { type: 'move', moveName, actorIsHost, actorName, targName, statusBlocked: 'flinch', damage: 0, eff: 1, effectLog };
        }

        // Confusion
        if (attacker.confused > 0) {
          attacker.confused--;
          if (attacker.confused === 0) {
            effectLog.push(`¡${attacker.name} ya no está confundido!`);
          } else {
            effectLog.push(`¡${attacker.name} está confundido!`);
            if (Math.random() < 0.5) {
              const confDmg = Math.max(1, Math.floor(((2 * attacker.level / 5 + 2) * 40 * attacker.atk / attacker.def) / 50) + 2);
              const curHp = actorIsHost ? s.myHp[s.myActive] : s.enemyHp[s.enemyActive];
              const newHp = Math.max(0, curHp - confDmg);
              return { type: 'move', moveName, actorIsHost, actorName, targName, statusBlocked: 'confused_self', damage: confDmg, newAtkHp: newHp, effectLog };
            }
          }
        }

        // Frozen
        if (attacker.status === 'freeze') {
          if (Math.random() < 0.8) return { type: 'move', moveName, actorIsHost, actorName, targName, statusBlocked: 'freeze', damage: 0, eff: 1, effectLog };
          attacker.status = null;
          effectLog.push(`¡${attacker.name} se ha descongelado!`);
        }
        
        // Sleep
        if (attacker.status === 'sleep') {
          attacker.sleepTurns = (attacker.sleepTurns || 1) - 1;
          if (attacker.sleepTurns > 0) return { type: 'move', moveName, actorIsHost, actorName, targName, statusBlocked: 'sleep', damage: 0, eff: 1, effectLog };
          attacker.status = null;
          effectLog.push(`¡${attacker.name} se despertó!`);
        }

        // Paralysis
        if (attacker.status === 'paralyze' && Math.random() < 0.25) {
          return { type: 'move', moveName, actorIsHost, actorName, targName, statusBlocked: 'paralyze', damage: 0, eff: 1, effectLog };
        }

        // Mock context for immunity/damage
        const pvpCtx = {
          player: actorIsHost ? attacker : defender,
          enemy: actorIsHost ? defender : attacker,
          playerStages: actorIsHost ? atkS : defS,
          enemyStages: actorIsHost ? defS : atkS,
          weather: null
        };

        // Ability Immunity
        if (typeof checkAbilityImmunity === 'function') {
          if (checkAbilityImmunity(attacker, defender, { name: moveName }, m => effectLog.push(m), pvpCtx)) {
            return { type: 'move', moveName, actorIsHost, actorName, targName, damage: 0, eff: 1, effectLog };
          }
        }

        // Accuracy
        if (md.acc && Math.random() * 100 > (md.acc) * stageMult(atkS.acc || 0)) {
          return { type: 'move', moveName, actorIsHost, actorName, targName, missed: true, damage: 0, eff: 1, effectLog };
        }

        if (md.cat === 'status') {
          applyMoveEffect(md.effect, attacker, defender, atkS, defS, m => effectLog.push(m), pvpCtx);
          return { type: 'move', moveName, actorIsHost, actorName, targName, isStatus: true, damage: 0, eff: 1, effectLog };
        }

        const { dmg, eff, triggeredAbility, defensiveAbility } = calcDamage(attacker, defender, move, atkS.atk || 0, defS.def || 0, pvpCtx);
        
        let finalDmg = dmg;
        let hits = 1;
        
        // Multi-hit logic
        if (md.hits) {
          hits = Math.floor(Math.random() * (md.hits[1] - md.hits[0] + 1)) + md.hits[0];
          effectLog.push(`¡Golpeó ${hits} veces!`);
        } else if (md.effect === 'double_hit') {
          hits = 2;
          effectLog.push(`¡Golpeó 2 veces!`);
        }
        finalDmg *= hits;

        // Current HPs
        const defHpArr = actorIsHost ? s.enemyHp : s.myHp;
        const defActIdx = actorIsHost ? s.enemyActive : s.myActive;
        const atkHpArr = actorIsHost ? s.myHp : s.enemyHp;
        const atkActIdx = actorIsHost ? s.myActive : s.enemyActive;
        
        const curDefHp = defHpArr[defActIdx] ?? defender.hp;
        const curAtkHp = atkHpArr[atkActIdx] ?? attacker.hp;

        // Damage Overrides
        if (md.halfHP) finalDmg = Math.max(1, Math.floor(curDefHp / 2));
        if (md.fixedDmg) finalDmg = md.fixedDmg;
        if (md.levelDmg) finalDmg = attacker.level;
        if (md.ohko) {
          // Si el atacante tiene menos nivel, o si la prec. fija (ej. Guillotina 30) falla
          if (attacker.level < defender.level) {
             finalDmg = 0; effectLog.push(`¡Pero falló!`);
          } else {
             finalDmg = curDefHp; effectLog.push(`¡Un golpe fulminante!`);
          }
        }
        if (md.endeavor) {
          if (curAtkHp < curDefHp) finalDmg = curDefHp - curAtkHp;
          else { finalDmg = 0; effectLog.push(`¡Pero falló!`); }
        }

        // Secondary effects for damage moves
        if (md.effect && md.effect !== 'none' && finalDmg > 0) {
          applyMoveEffect(md.effect, attacker, defender, atkS, defS, m => effectLog.push(m), pvpCtx);
        }

        const newDefHp = Math.max(0, curDefHp - finalDmg);
        
        // Reactive Attacker Damage/Heal
        let newAtkHp = undefined;
        let faintedSelf = false;
        if (finalDmg > 0 && md.drain) {
           const healed = Math.floor(Math.min(curDefHp, finalDmg) / 2);
           newAtkHp = Math.min(attacker.maxHp, curAtkHp + healed);
           effectLog.push(`¡${defender.name} vio su energía drenada!`);
        }
        if (finalDmg > 0 && md.recoil) {
           const recoilDmg = Math.max(1, Math.floor(Math.min(curDefHp, finalDmg) / (md.recoil || 4)));
           newAtkHp = Math.max(0, curAtkHp - recoilDmg);
           effectLog.push(`¡${attacker.name} recibe daño de retroceso!`);
           if (newAtkHp <= 0) faintedSelf = true;
        }
        if (md.selfKO) {
           newAtkHp = 0;
           effectLog.push(`¡${attacker.name} se inmoló!`);
           faintedSelf = true;
        }

        let ret = { 
          type: 'move', moveName, actorIsHost, actorName, targName, 
          missed: false, damage: finalDmg, eff, newDefHp: newDefHp, 
          faintedTarget: newDefHp <= 0, faintedSelf, triggeredAbility, defensiveAbility, 
          effectLog 
        };
        if (newAtkHp !== undefined) ret.newAtkHp = newAtkHp;
        
        return ret;
      }

      // ── Run first action ─────────────────────────────────────
      const firstAction = calcAction(firstIsHost);

      // Apply first action's HP changes so second action sees correct state
      if (firstAction.type === 'switch') {
        if (firstIsHost) s.myActive = firstAction.switchIndex;
        else s.enemyActive = firstAction.switchIndex;
      } else {
        if (firstAction.newDefHp !== undefined) {
          const arr = firstIsHost ? s.enemyHp : s.myHp;
          const idx = firstIsHost ? s.enemyActive : s.myActive;
          arr[idx] = firstAction.newDefHp;
        }
        if (firstAction.newAtkHp !== undefined) {
          const arr = firstIsHost ? s.myHp : s.enemyHp;
          const idx = firstIsHost ? s.myActive : s.enemyActive;
          arr[idx] = firstAction.newAtkHp;
        }
      }

      // ── Run second action (unless someone died from first move) ───
      let secondAction = null;
      if (!firstAction.faintedTarget && !firstAction.faintedSelf) {
        secondAction = calcAction(!firstIsHost);
        if (secondAction.type === 'switch') {
          if (!firstIsHost) s.myActive = secondAction.switchIndex;
          else s.enemyActive = secondAction.switchIndex;
        } else {
          if (secondAction.newDefHp !== undefined) {
            const arr = !firstIsHost ? s.enemyHp : s.myHp;
            const idx = !firstIsHost ? s.enemyActive : s.myActive;
            arr[idx] = secondAction.newDefHp;
          }
          if (secondAction.newAtkHp !== undefined) {
            const arr = !firstIsHost ? s.myHp : s.enemyHp;
            const idx = !firstIsHost ? s.myActive : s.enemyActive;
            arr[idx] = secondAction.newAtkHp;
          }
        }
      }

      // Deduct PP for moves that were used (status blocks don't consume PP in real games either — but we do)
      function deductPp(actorIsHost, pick) {
        if (pick.type !== 'move') return;
        const poke = actorIsHost ? s.myTeam[s.myActive] : s.enemyTeam[s.enemyActive];
        // Use original active indices stored before possible switch
        const originalPoke = actorIsHost ? hostPoke : clientPoke;
        const mv = originalPoke.moves[pick.moveIndex];
        if (mv && mv.pp > 0) mv.pp--;
      }
      deductPp(firstIsHost, firstIsHost ? hostPick : clientPick);
      if (secondAction) deductPp(!firstIsHost, !firstIsHost ? hostPick : clientPick);

      const result = {
        firstIsHost,
        first: firstAction,
        second: secondAction,
        hostActiveIdx: s.myActive,
        clientActiveIdx: s.enemyActive,
        hostHp: s.myHp[s.myActive] ?? hostPoke.hp,
        clientHp: s.enemyHp[s.enemyActive] ?? clientPoke.hp,
        // Status sync for client
        hostPokeStatus: s.myTeam[s.myActive]?.status ?? null,
        hostPokeSleepTurns: s.myTeam[s.myActive]?.sleepTurns ?? 0,
        clientPokeStatus: s.enemyTeam[s.enemyActive]?.status ?? null,
        clientPokeSleepTurns: s.enemyTeam[s.enemyActive]?.sleepTurns ?? 0,
        // PP sync for host's move
        hostMovePpIdx: hostPick.type === 'move' ? hostPick.moveIndex : -1,
        hostMovePpNew: hostPick.type === 'move' ? (hostPoke.moves[hostPick.moveIndex]?.pp ?? 0) : 0,
        clientMovePpIdx: clientPick.type === 'move' ? clientPick.moveIndex : -1,
        clientMovePpNew: clientPick.type === 'move' ? (clientPoke.moves[clientPick.moveIndex]?.pp ?? 0) : 0,
      };

      // Broadcast BEFORE applying locally so client receives first
      s.channel.send({ type: 'broadcast', event: 'pvp_turn_result', payload: result });
      _pvpApplyTurnResult(result);
    }

    // ── Apply turn result (both sides) ───────────────────────────
    // On HOST: HP already updated; this animates and logs.
    // On CLIENT: sets HP from authoritative values, then animates.
    function _pvpApplyTurnResult(result) {
      if (!_pvpState) return;
      _pvpState.phase = 'resolving';
      _pvpClearInputDeadline();

      const isHost = _pvpState.isHost;

      // ── CLIENT: Apply authoritative HP + active indices ───────
      if (!isHost) {
        _pvpState.myActive = result.clientActiveIdx;
        _pvpState.enemyActive = result.hostActiveIdx;
        _pvpState.myHp[_pvpState.myActive] = result.clientHp;
        _pvpState.enemyHp[_pvpState.enemyActive] = result.hostHp;

        // Sync PP
        if (result.clientMovePpIdx >= 0) {
          const mv = _pvpState.myTeam[_pvpState.myActive]?.moves?.[result.clientMovePpIdx];
          if (mv) mv.pp = result.clientMovePpNew;
        }
        if (result.hostMovePpIdx >= 0) {
          const mv = _pvpState.enemyTeam[_pvpState.enemyActive]?.moves?.[result.hostMovePpIdx];
          if (mv) mv.pp = result.hostMovePpNew;
        }

        // Sync status
        const myPoke = _pvpState.myTeam[_pvpState.myActive];
        const enPoke = _pvpState.enemyTeam[_pvpState.enemyActive];
        if (myPoke) { myPoke.status = result.clientPokeStatus; myPoke.sleepTurns = result.clientPokeSleepTurns || 0; }
        if (enPoke) { enPoke.status = result.hostPokeStatus; enPoke.sleepTurns = result.hostPokeSleepTurns || 0; }
      }

      // ── Animate + log each action sequentially ────────────────
      const actions = [result.first, result.second].filter(Boolean);
      let delay = 0;

      for (const action of actions) {
        // From this player's view: is this MY action or the ENEMY's?
        const myAction = isHost ? action.actorIsHost : !action.actorIsHost;

        setTimeout(() => {
          if (_pvpState.over) return;

          if (action.type === 'switch') {
            addPvpLog(`¡${action.pokeName} salió a combatir!`, myAction ? 'log-player' : 'log-enemy');
            if (myAction) _pvpUpdateMyPokemon();
            else _pvpUpdateEnemy();

            // Entry abilities on manual switch
            if (typeof handleEntryAbilities === 'function') {
               handleEntryAbilities(
                _pvpState.myTeam[_pvpState.myActive], 
                _pvpState.enemyTeam[_pvpState.enemyActive],
                _pvpState.myStages,
                _pvpState.enemyStages,
                (m, c) => addPvpLog(m, c)
              );
            }

          } else if (action.statusBlocked) {
            const statusMsg = { 
              sleep: 'está dormido', 
              freeze: 'está congelado', 
              paralyze: 'está paralizado',
              flinch: 'ha retrocedido y no puede moverse',
              confused_self: 'está confundido y se ha herido a sí mismo'
            };
            
            (action.effectLog || []).forEach(m => addPvpLog(m, 'log-info'));
            addPvpLog(`¡${action.actorName} ${statusMsg[action.statusBlocked] || 'no pudo moverse'}!`,
              myAction ? 'log-player' : 'log-enemy');
            
            if (action.statusBlocked === 'confused_self') {
               addPvpLog(`(-${action.damage} HP)`, myAction ? 'log-player' : 'log-enemy');
               if (myAction) {
                 _pvpState.myHp[_pvpState.myActive] = action.newAtkHp;
                 _pvpState.myTeam[_pvpState.myActive].hp = action.newAtkHp;
               } else {
                 _pvpState.enemyHp[_pvpState.enemyActive] = action.newAtkHp;
                 _pvpState.enemyTeam[_pvpState.enemyActive].hp = action.newAtkHp;
               }
               renderPvpBattle();
            }

          } else if (action.missed) {
            addPvpLog(`¡${action.actorName} usó ${action.moveName}... ¡Falló!`,
              myAction ? 'log-player' : 'log-enemy');

          } else if (action.isStatus) {
            addPvpLog(`¡${action.actorName} usó ${action.moveName}!`,
              myAction ? 'log-player' : 'log-enemy');
            (action.effectLog || []).forEach(m => addPvpLog(m, 'log-info'));

          } else {
            if (action.triggeredAbility) {
              addPvpLog(`[Habilidad] ¡${action.actorName} usó ${action.triggeredAbility}!`, myAction ? 'log-player' : 'log-enemy');
            }
            addPvpLog(`¡${action.actorName} usó ${action.moveName}!`,
              myAction ? 'log-player' : 'log-enemy');
            if (action.defensiveAbility) {
              addPvpLog(`[Habilidad] ¡${action.defensiveAbility} de ${action.targName} redujo el daño!`, !myAction ? 'log-player' : 'log-enemy');
            }
            const effTxt = action.eff >= 2 ? ' ¡Muy eficaz!' : action.eff === 0 ? ' ¡No afecta!' : action.eff <= 0.5 ? ' No muy eficaz...' : '';
            addPvpLog(`(-${action.damage} HP)${effTxt}`, myAction ? 'log-player' : 'log-enemy');

            // Log secondary effects if any
            (action.effectLog || []).forEach(m => addPvpLog(m, 'log-info'));

            // Handle reactionary HP modifiers (recoil, drain, selfKOs)
            if (action.newAtkHp !== undefined) {
               if (myAction) _pvpState.myHp[_pvpState.myActive] = action.newAtkHp;
               else _pvpState.enemyHp[_pvpState.enemyActive] = action.newAtkHp;
               renderPvpBattle();
            }

            // Animate sprites
            const pImg = document.getElementById('pvp-player-img');
            const pEmo = document.getElementById('pvp-player-emoji');
            const eImg = document.getElementById('pvp-enemy-img');
            const eEmo = document.getElementById('pvp-enemy-emoji');
            const pEl = pImg?.style.display !== 'none' ? pImg : pEmo;
            const eEl = eImg?.style.display !== 'none' ? eImg : eEmo;
            if (myAction) {
              pEl?.classList.add('anim-attack-right');
              setTimeout(() => { pEl?.classList.remove('anim-attack-right'); eEl?.classList.add('anim-damage'); setTimeout(() => eEl?.classList.remove('anim-damage'), 500); }, 400);
            } else {
              eEl?.classList.add('anim-attack-left');
              setTimeout(() => { eEl?.classList.remove('anim-attack-left'); pEl?.classList.add('anim-damage'); setTimeout(() => pEl?.classList.remove('anim-damage'), 500); }, 400);
            }
          }
        }, delay);
        delay += 1300;
      }

      // ── After all actions: check faints + next turn ───────────
      setTimeout(() => {
        if (!_pvpState || _pvpState.over) return;
        renderPvpBattle();

        // End of turn status damage (burn/poison)
        const myPoke = _pvpState.myTeam[_pvpState.myActive];
        const enPoke = _pvpState.enemyTeam[_pvpState.enemyActive];
        let pvpDirty = false;
        if (myPoke) {
          myPoke.hp = _pvpState.myHp[_pvpState.myActive] ?? myPoke.hp;
          if (tickStatus(myPoke, addPvpLog, 'player')) {
            _pvpState.myHp[_pvpState.myActive] = myPoke.hp;
            pvpDirty = true;
          }
        }
        if (enPoke) {
          enPoke.hp = _pvpState.enemyHp[_pvpState.enemyActive] ?? enPoke.hp;
          if (tickStatus(enPoke, addPvpLog, 'enemy')) {
            _pvpState.enemyHp[_pvpState.enemyActive] = enPoke.hp;
            pvpDirty = true;
          }
        }
        if (pvpDirty) renderPvpBattle();

        const myHpNow = _pvpState.myHp[_pvpState.myActive] ?? 0;
        const enemyHpNow = _pvpState.enemyHp[_pvpState.enemyActive] ?? 0;

        if (myHpNow <= 0) {
          const aliveIdx = _pvpState.myTeam.findIndex((p, i) => (_pvpState.myHp[i] ?? p.hp) > 0);
          if (aliveIdx === -1) { setTimeout(() => pvpEnd(false), 400); return; }
          addPvpLog(`¡${_pvpState.myTeam[_pvpState.myActive].name} se desmayó! Cambiá de Pokémon.`, 'log-enemy');
          pvpShowForcedSwitch();
          return;
        }

        if (enemyHpNow <= 0) {
          const aliveCount = _pvpState.enemyHp.filter(h => h > 0).length;
          if (aliveCount === 0) { setTimeout(() => pvpEnd(true), 400); return; }
          addPvpLog(`¡${_pvpState.enemyTeam[_pvpState.enemyActive].name} se desmayó! Esperando al rival...`, 'log-player');
          _pvpState.phase = 'faint_switch';
          _pvpClearInputDeadline();
          _pvpRenderMoves();
          return;
        }

        // Next turn
        _pvpState.phase = 'choosing';
        _pvpState.myPick = null;
        if (_pvpState.isHost) _pvpState.enemyPick = null;
        _pvpSetInputDeadline();
        _pvpRenderMoves();
        addPvpLog('─── Nuevo turno ───', 'log-info');
      }, delay + 300);
    }

    // ── Switch actions ───────────────────────────────────────────
    // Voluntary switch (counts as your action for the turn)
    function pvpShowSwitch() {
      if (!_pvpState || _pvpState.over || _pvpState.phase !== 'choosing') return;
      const alive = _pvpState.myTeam
        .map((p, i) => ({ p, i }))
        .filter(({ i }) => i !== _pvpState.myActive && (_pvpState.myHp[i] ?? _pvpState.myTeam[i].hp) > 0);
      if (!alive.length) { notify('No hay más Pokémon disponibles', '⚠️'); return; }

      _pvpBuildSwitchOverlay(alive, i => {
        _pvpCommitPick({ type: 'switch', switchIndex: i });
        addPvpLog(`¡Vas a cambiar a ${_pvpState.myTeam[i].name}!`, 'log-player');
      }, true);
    }

    // Forced switch after faint (no cancel button)
    function pvpShowForcedSwitch() {
      _pvpState.phase = 'faint_switch';
      _pvpSetInputDeadline();
      const alive = _pvpState.myTeam
        .map((p, i) => ({ p, i }))
        .filter(({ i }) => (_pvpState.myHp[i] ?? _pvpState.myTeam[i].hp) > 0 && i !== _pvpState.myActive);
      if (!alive.length) { pvpEnd(false); return; }

      _pvpBuildSwitchOverlay(alive, i => {
        _pvpState.myActive = i;
        const p = _pvpState.myTeam[i];
        addPvpLog(`¡${p.name} salió a combatir!`, 'log-player');
        _pvpState.channel.send({ type: 'broadcast', event: 'pvp_forced_switch', payload: { index: i } });
        _pvpUpdateMyPokemon();
        // Resume next turn (only if not waiting for enemy's forced switch too)
        _pvpState.phase = 'choosing';
        _pvpState.myPick = null;
        if (_pvpState.isHost) _pvpState.enemyPick = null;
        _pvpSetInputDeadline();
        _pvpRenderMoves();
        addPvpLog('─── Nuevo turno ───', 'log-info');
      }, false);
    }

    function _pvpBuildSwitchOverlay(alive, onPick, canCancel) {
      document.getElementById('pvp-switch-overlay')?.remove();
      const ov = document.createElement('div');
      ov.id = 'pvp-switch-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:700;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:16px;';
      ov.innerHTML = `<div style="background:var(--card);border-radius:20px;padding:20px;width:100%;max-width:340px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);margin-bottom:14px;">🔄 ELEGÍ UN POKÉMON</div>
        ${alive.map(({ p, i }) => {
        const hp = _pvpState.myHp[i] ?? p.hp;
        return `<div onclick="(function(){document.getElementById('pvp-switch-overlay').remove();(${onPick.toString()})(${i});})()"
            style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.05);border-radius:10px;padding:10px;margin-bottom:8px;cursor:pointer;border:1px solid rgba(255,255,255,0.08);"
            onmouseover="this.style.borderColor='rgba(199,125,255,0.4)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'">
            <div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">
              <img src="${getSpriteUrl(p.id)}" style="max-width:100%;max-height:100%;image-rendering:pixelated;" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">
              <span style="display:none;"></span>
            </div>
            <div style="flex:1;">
              <div style="font-size:12px;font-weight:700;">${p.name}</div>
              <div style="font-size:10px;color:var(--gray);">${hp}/${p.maxHp} HP · Nv.${p.level}</div>
            </div>
          </div>`;
      }).join('')}
        ${canCancel ? `<button onclick="document.getElementById('pvp-switch-overlay').remove()"
          style="width:100%;padding:10px;border:none;border-radius:10px;cursor:pointer;background:rgba(255,255,255,0.06);color:var(--gray);font-size:12px;">Cancelar</button>` : ''}
      </div>`;
      if (canCancel) ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
      document.body.appendChild(ov);
    }

    // Legacy: pvpDoSwitch kept for compatibility but now unused internally
    function pvpDoSwitch(index) { pvpShowForcedSwitch(); }

    // ── Forfeit / End ────────────────────────────────────────────
    function pvpForfeit() {
      if (!_pvpState || _pvpState.over) return;
      if (_pvpState._afkGraceTimer) {
        clearTimeout(_pvpState._afkGraceTimer);
        _pvpState._afkGraceTimer = null;
      }
      _pvpState.channel.send({ type: 'broadcast', event: 'pvp_forfeit', payload: {} });
      pvpEnd(false, false);
    }

    function pvpEnd(won, endOptions = null) {
      if (!_pvpState || _pvpState.over) return;
      const opts = (endOptions && typeof endOptions === 'object') ? endOptions : {};
      const isMutualAfk = opts.reason === 'mutual_afk';
      _pvpState.over = true;
      _pvpState.phase = 'over';
      _pvpClearInputDeadline();
      if (_pvpState._afkGraceTimer) {
        clearTimeout(_pvpState._afkGraceTimer);
        _pvpState._afkGraceTimer = null;
      }
      
      // Limpiar batalla activa del estado global para evitar reconexiones "zombie"
      state.activeBattle = null;
      if (typeof saveGame === 'function') saveGame(false);

      _pvpState.channel.unsubscribe();

      const isRanked = _pvpState.isRanked === true;
      const reward = 0;
      state.money += reward;
      if (!state.stats) state.stats = {};
      
      if (!isRanked) {
        state.stats.pvpBattles = (state.stats.pvpBattles || 0) + 1;
        if (won) state.stats.pvpWins = (state.stats.pvpWins || 0) + 1;
      } else {
        // Enviar el resultado al RPC para batallas activas (usar el mismo RPC o un endpoint central)
        if (typeof reportPassiveBattleResult === 'function') {
           const resultStr = isMutualAfk ? 'loss' : (won ? 'win' : 'loss');
           reportPassiveBattleResult(_pvpState.opponentId, resultStr);
        }
      }

      // Limpiar batalla PvP activa guardada
      state.activeBattle = null;
      scheduleSave();

      // Show result overlay inside pvp screen
      const ov = document.getElementById('pvp-overlay');
      if (ov) {
        const result = document.createElement('div');
        result.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;';
        
        if (isRanked) {
          result.innerHTML = `
            <div style="font-size:64px;margin-bottom:16px;">${won ? '🏅' : '💔'}</div>
            <div style="font-family:'Press Start 2P',monospace;font-size:14px;color:${won ? 'var(--yellow)' : 'var(--red)'};margin-bottom:12px;">
              ${won ? '¡VICTORIA RANKED!' : '¡DERROTA RANKED!'}
            </div>
            <div style="font-size:11px;color:#aaa;margin-bottom:24px;text-align:center;padding:0 20px;">
              ${isMutualAfk ? 'Ninguno eligio movimiento a tiempo.<br>Se desconto ELO a ambos jugadores.' : 'Tus puntuaciones de ELO han sido actualizadas.<br>Comprueba tu perfil.'}
            </div>
            <button onclick="closePvpOverlay()" style="font-family:'Press Start 2P',monospace;font-size:9px;padding:14px 24px;
              border:none;border-radius:14px;cursor:pointer;background:var(--purple);color:#fff;">
              CONTINUAR
            </button>`;
        } else {
          result.innerHTML = `
            <div style="font-size:64px;margin-bottom:16px;">${won ? '🏆' : '🤝'}</div>
            <div style="font-family:'Press Start 2P',monospace;font-size:14px;color:${won ? 'var(--yellow)' : 'var(--blue)'};margin-bottom:12px;">
              ${won ? '¡VICTORIA AMISTOSA!' : '¡BUEN COMBATE!'}
            </div>
            <div style="font-size:11px;color:#aaa;margin-bottom:24px;text-align:center;padding:0 20px;">
              Las batallas entre amigos son para divertirse.<br>No se gana ni se pierde dinero/ELO.
            </div>
            <button onclick="closePvpOverlay()" style="font-family:'Press Start 2P',monospace;font-size:9px;padding:14px 24px;
              border:none;border-radius:14px;cursor:pointer;background:var(--purple);color:#fff;">
              CONTINUAR
            </button>`;
        }
        
        ov.style.position = 'fixed';
        ov.appendChild(result);
        updateHud();
      }
    }

    function closePvpOverlay() {
      document.getElementById('pvp-overlay')?.remove();
      _pvpState = null;
      _pvpLock = false;
    }

