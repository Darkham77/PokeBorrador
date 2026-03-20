    // ===== PVP BATTLE SYSTEM =====

    let _pvpState = null;
    let _pvpBattleInvitesCh = null;
    let _pvpLock = false;   // prevents double-clicking during animations

    // ── Subscribe (polling) for incoming invites ──────────────
    function subscribeBattleInvites() {
      if (!currentUser || _pvpBattleInvitesCh) return;
      const _seenInvites = new Set();
      _pvpBattleInvitesCh = setInterval(async () => {
        if (!currentUser) return;
        const { data } = await sb.from('battle_invites')
          .select('*').eq('opponent_id', currentUser.id).eq('status', 'pending')
          .order('created_at', { ascending: false }).limit(1);
        if (!data?.length) return;
        const inv = data[0];
        if (_seenInvites.has(inv.id)) return;
        if (Date.now() - new Date(inv.created_at).getTime() > 60000) return;
        _seenInvites.add(inv.id);
        showPvpInvitePopup(inv);
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
      if (state.team.filter(p => p.hp > 0).length === 0) {
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

    async function startPvpBattle(invite, isHost) {
      const myTeam = state.team.filter(p => p.hp > 0).map(p => JSON.parse(JSON.stringify(p)));
      if (!myTeam.length) { notify('¡No tenés Pokémon disponibles!', '⚠️'); return; }

      const opponentId = isHost ? invite.opponent_id : invite.challenger_id;
      const { data: _oppProf } = await sb.from('profiles').select('username').eq('id', opponentId).single();
      const enemyUsername = _oppProf?.username || 'Rival';

      _pvpState = {
        invite, isHost,
        myActive: 0, enemyActive: 0,
        myTeam, enemyTeam: null,
        myHp: myTeam.map(p => p.hp), enemyHp: [],
        over: false, channel: null, enemyUsername,
        // ── Turn state ──────────────────────────────────────
        // phase: 'sync' | 'choosing' | 'waiting' | 'resolving' | 'faint_switch' | 'opponent_disconnected'
        phase: 'sync',
        myPick: null,       // { type:'move', moveIndex } | { type:'switch', switchIndex }
        enemyPick: null,    // host only: client's committed pick
        myStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 },
        enemyStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 },
        _teamAcknowledged: false,
        _announceCount: 0,
        _lastActivityTime: Date.now(),
        _disconnectTimer: null,
        _opponentDisconnected: false,
      };
      _pvpLock = false;

      const channelName = 'pvp-' + invite.id;
      _pvpState.channel = sb.channel(channelName, { config: { broadcast: { self: false } } })

        // ── Team sync ─────────────────────────────────────────
        .on('broadcast', { event: 'pvp_team' }, ({ payload }) => {
          // Always ACK so sender stops re-broadcasting
          _pvpState.channel.send({ type: 'broadcast', event: 'pvp_team_ack', payload: {} });
          if (_pvpState.enemyTeam) return;
          _pvpState.enemyTeam = payload.team;
          _pvpState.enemyHp = payload.team.map(p => p.hp);
          _pvpState.phase = 'choosing';
          renderPvpBattle();
          _pvpLoadSprites();
          addPvpLog('¡La batalla comenzó! Elegí tu movimiento.', 'log-info');
        })
        .on('broadcast', { event: 'pvp_team_ack' }, () => {
          _pvpState._teamAcknowledged = true;
        })

        // ── Turn events ───────────────────────────────────────
        .on('broadcast', { event: 'pvp_pick' }, ({ payload }) => {
          // Only the HOST processes picks and resolves the turn
          if (_pvpState.over || !_pvpState.isHost) return;
          _pvpState.enemyPick = payload;
          if (_pvpState.myPick !== null) _pvpResolve();
        })
        .on('broadcast', { event: 'pvp_turn_result' }, ({ payload }) => {
          // Only the CLIENT applies the result (host already applied it in _pvpResolve)
          if (_pvpState.over || _pvpState.isHost) return;
          _pvpApplyTurnResult(payload);
        })

        // ── Forced switch after faint ─────────────────────────
        .on('broadcast', { event: 'pvp_forced_switch' }, ({ payload }) => {
          if (_pvpState.over) return;
          _pvpState.enemyActive = payload.index;
          const ep = _pvpState.enemyTeam[payload.index];
          addPvpLog(`¡${ep?.name} salió a combatir!`, 'log-enemy');
          _pvpUpdateEnemy();
          // If we were waiting for the rival's forced switch, start the next turn
          if (_pvpState.phase === 'faint_switch') {
            _pvpState.phase = 'choosing';
            _pvpState.myPick = null;
            if (_pvpState.isHost) _pvpState.enemyPick = null;
            _pvpRenderMoves();
            addPvpLog('─── Nuevo turno ───', 'log-info');
          }
        })

        .on('broadcast', { event: 'pvp_forfeit' }, () => {
          if (!_pvpState.over) pvpEnd(true);
        })

        // ── Heartbeat y reconexion ──────────────────────────────────────
        .on('broadcast', { event: 'pvp_heartbeat' }, () => {
          if (_pvpState.over) return;
          _pvpState._lastActivityTime = Date.now();
          // Si el rival se reconecta, limpiar el timer de desconexion
          if (_pvpState._opponentDisconnected) {
            _pvpState._opponentDisconnected = false;
            _pvpState.phase = 'choosing';
            addPvpLog('🔄 ¡El rival se reconectó!', 'log-info');
            if (_pvpState._disconnectTimer) {
              clearTimeout(_pvpState._disconnectTimer);
              _pvpState._disconnectTimer = null;
            }
            renderPvpBattle();
          }
        })

        .subscribe(status => {
          if (status !== 'SUBSCRIBED') return;
          showPvpScreen();
          // Guardar el estado PvP activo para que un F5 lo restaure
          state.activeBattle = {
            isPvP: true,
            inviteId: invite.id,
            isHost,
            opponentId,
            enemyUsername,
          };
          saveGame(false);
          // Keep re-announcing own team until the rival sends pvp_team_ack.
          const _ann = setInterval(() => {
            if (_pvpState._teamAcknowledged || _pvpState.over || _pvpState._announceCount++ > 40) {
              clearInterval(_ann); return;
            }
            _pvpState.channel.send({ type: 'broadcast', event: 'pvp_team', payload: { team: myTeam } });
          }, 1500);
          // Heartbeat cada 5s para detectar desconexiones
          const _heartbeat = setInterval(() => {
            if (_pvpState.over) { clearInterval(_heartbeat); return; }
            _pvpState.channel.send({ type: 'broadcast', event: 'pvp_heartbeat', payload: {} });
          }, 5000);
          // Timer de desconexion: si no hay actividad en 10s, marcar como desconectado
          const _checkDisconnect = setInterval(() => {
            if (_pvpState.over || _pvpState._opponentDisconnected) { clearInterval(_checkDisconnect); return; }
            const timeSinceActivity = Date.now() - _pvpState._lastActivityTime;
            if (timeSinceActivity > 10000) {
              _pvpState._opponentDisconnected = true;
              _pvpState.phase = 'opponent_disconnected';
              addPvpLog('\u26a0\ufe0f El rival se desconect\u00f3. Esperando reconexion... (60s)', 'log-enemy');
              renderPvpBattle();
              if (_pvpState._disconnectTimer) clearTimeout(_pvpState._disconnectTimer);
              _pvpState._disconnectTimer = setTimeout(() => {
                if (_pvpState.over || !_pvpState._opponentDisconnected) return;
                addPvpLog('\ud83d\udcaf El rival no se reconect\u00f3. \u00a1Ganaste por abandono!', 'log-info');
                pvpEnd(true);
              }, 60000);
            }
          }, 2000);
        });
    }

    // ── PvP Screen ───────────────────────────────────────────────
    function showPvpScreen() {
      let ov = document.getElementById('pvp-overlay');
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'pvp-overlay';
        ov.style.cssText = 'position:fixed;inset:0;z-index:600;background:#0d1117;display:flex;flex-direction:column;overflow:hidden;';
        document.body.appendChild(ov);
      }
      const me = _pvpState.myTeam[_pvpState.myActive];
      const enemy = _pvpState.enemyTeam?.[_pvpState.enemyActive];

      ov.innerHTML = `
  <div style="max-width:680px;margin:0 auto;padding:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <img src="https://play.pokemonshowdown.com/sprites/trainers/red.png" alt="Trainer"
          style="height:40px;image-rendering:pixelated;filter:drop-shadow(0 2px 8px rgba(199,125,255,0.5));"
          onerror="this.style.display='none'">
        <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--purple);">⚔️ BATALLA PvP</div>
      </div>
      <div id="pvp-status-msg" style="font-size:11px;color:var(--yellow);">⏳ Conectando...</div>
      <button onclick="pvpForfeit()" style="font-family:'Press Start 2P',monospace;font-size:7px;padding:6px 10px;
        border:none;border-radius:8px;cursor:pointer;background:rgba(255,59,59,0.1);color:var(--red);border:1px solid rgba(255,59,59,0.2);">
        🏳️ Rendirse
      </button>
    </div>

    <div class="battle-arena" id="pvp-arena" style="position:relative;overflow:hidden;margin-bottom:12px;">
      <canvas id="pvp-battle-bg-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;border-radius:18px;"></canvas>
      <div class="battle-combatants">
        <!-- TOP-LEFT: Enemy HP info -->
        <div style="display:flex;align-items:flex-start;justify-content:flex-start;">
          <div class="battle-pokemon-info">
            <div style="font-size:9px;color:var(--yellow);font-weight:700;margin-bottom:2px;" id="pvp-enemy-trainer">${_pvpState.enemyUsername ? '🎮 ' + _pvpState.enemyUsername : ''}</div>
            <div class="battle-name" id="pvp-enemy-name">${enemy?.name || '???'}</div>
            <div class="battle-level" id="pvp-enemy-level">Nv. ${enemy?.level || '?'}</div>
            <div class="hp-bar-wrap"><div class="hp-bar hp-high" id="pvp-enemy-hp-bar" style="width:100%"></div></div>
            <div class="battle-hp-text" id="pvp-enemy-hp-text">${enemy ? enemy.hp + '/' + enemy.maxHp + ' HP' : '???'}</div>
          </div>
        </div>
        <!-- TOP-RIGHT: Enemy sprite -->
        <div style="display:flex;align-items:flex-start;justify-content:flex-end;">
          <div id="pvp-enemy-sprite-wrap" style="height:100%;width:100%;display:flex;align-items:flex-start;justify-content:flex-end;">
            <img id="pvp-enemy-img" src="" alt="" style="height:100%;width:auto;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 8px 30px rgba(0,0,0,0.9));display:none;">
            <span id="pvp-enemy-emoji" class="battle-sprite enemy-sprite" style="font-size:min(35vh, 260px);line-height:1;display:none;">${enemy?.emoji || '❓'}</span>
          </div>
        </div>
        <!-- BOTTOM-LEFT: My sprite -->
        <div style="display:flex;align-items:flex-end;justify-content:flex-start;">
          <div id="pvp-player-sprite-wrap" style="height:100%;width:100%;display:flex;align-items:flex-end;justify-content:flex-start;">
            <img id="pvp-player-img" src="" alt="" style="height:100%;width:auto;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 8px 30px rgba(0,0,0,0.9));display:none;">
            <span id="pvp-player-emoji" class="battle-sprite player-sprite" style="font-size:min(35vh, 260px);line-height:1;display:none;">${me?.emoji || '❓'}</span>
          </div>
        </div>
        <!-- BOTTOM-RIGHT: My HP info -->
        <div style="display:flex;align-items:flex-end;justify-content:flex-end;padding-bottom:10px;">
          <div class="battle-pokemon-info" style="text-align:right;">
            <div class="battle-name" id="pvp-player-name">${me?.name || '???'}</div>
            <div class="battle-level" id="pvp-player-level">Nv. ${me?.level || '?'}</div>
            <div class="hp-bar-wrap"><div class="hp-bar hp-high" id="pvp-player-hp-bar" style="width:100%"></div></div>
            <div class="battle-hp-text" id="pvp-player-hp-text">${me?.hp || 0}/${me?.maxHp || 0} HP</div>
          </div>
        </div>
      </div>
    </div>

    <div id="pvp-log" style="background:rgba(0,0,0,0.4);border-radius:12px;padding:12px;font-size:12px;
      color:#ccc;min-height:56px;max-height:110px;overflow-y:auto;margin-bottom:12px;
      border:1px solid rgba(255,255,255,0.06);"></div>

    <div id="pvp-move-panel">
      <div id="pvp-move-buttons" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button onclick="pvpShowSwitch()"
          style="font-family:'Press Start 2P',monospace;font-size:8px;padding:12px;border:none;border-radius:12px;cursor:pointer;
                 background:rgba(199,125,255,0.15);color:var(--purple);border:1px solid rgba(199,125,255,0.3);">
          🔄 CAMBIAR
        </button>
        <button onclick="pvpForfeit()"
          style="font-family:'Press Start 2P',monospace;font-size:8px;padding:12px;border:none;border-radius:12px;cursor:pointer;
                 background:rgba(255,59,59,0.1);color:var(--red);border:1px solid rgba(255,59,59,0.2);">
          🏳️ RENDIRSE
        </button>
      </div>
    </div>
  </div>`;

      _pvpLoadSprites();
      _pvpRenderMoves();
      setTimeout(() => drawBattleBackground('pvp'), 50);
    }

    function _pvpLoadSprites() {
      const me = _pvpState.myTeam[_pvpState.myActive];
      const enemy = _pvpState.enemyTeam?.[_pvpState.enemyActive];
      if (me) {
        const img = document.getElementById('pvp-player-img');
        const emo = document.getElementById('pvp-player-emoji');
        if (img) loadSprite(img, emo, getBackSpriteUrl(me.id), me.emoji);
      }
      if (enemy) {
        const img = document.getElementById('pvp-enemy-img');
        const emo = document.getElementById('pvp-enemy-emoji');
        if (img) loadSprite(img, emo, getSpriteUrl(enemy.id), enemy.emoji);
      }
    }

    // ── Move panel renderer (phase-aware) ────────────────────────
    function _pvpRenderMoves() {
      const panel = document.getElementById('pvp-move-buttons');
      const status = document.getElementById('pvp-status-msg');
      if (!panel || !_pvpState) return;

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
        const md = MOVE_DATA[mv.name] || { power: mv.power || 40, type: 'normal', cat: 'physical' };
        const col = TYPE_COL[md.type] || '#aaa';
        const disabled = mv.pp <= 0 || waiting;
        const opacity = waiting ? '0.45' : '1';
        return `<button onclick="pvpUseMove(${i})" ${disabled ? 'disabled' : ''}
          style="font-family:'Press Start 2P',monospace;font-size:7px;padding:10px 8px;border:none;border-radius:12px;cursor:${waiting ? 'default' : 'pointer'};
                 opacity:${opacity};background:rgba(59,139,255,0.12);color:var(--blue);border-left:3px solid ${col};
                 border-right:none;border-top:1px solid rgba(59,139,255,0.2);border-bottom:1px solid rgba(59,139,255,0.2);
                 display:flex;flex-direction:column;gap:3px;align-items:flex-start;width:100%;">
          <span style="color:#fff;">${mv.name}</span>
          <span style="display:flex;gap:6px;align-items:center;">
            <span style="color:${col};">${md.type?.toUpperCase()} ${CAT_ICO[md.cat] || ''}</span>
            <span style="color:var(--gray);">POD:${md.power || '—'} PP:${mv.pp}/${mv.maxPP}</span>
          </span>
        </button>`;
      }).join('');
    }

    function addPvpLog(msg, cls) {
      const el = document.getElementById('pvp-log');
      if (!el) return;
      el.innerHTML += `<div class="${cls || ''}" style="margin-bottom:3px;">${msg}</div>`;
      el.scrollTop = el.scrollHeight;
    }

    function renderPvpBattle() {
      if (!_pvpState) return;
      const me = _pvpState.myTeam[_pvpState.myActive];
      const enemy = _pvpState.enemyTeam?.[_pvpState.enemyActive];
      const myHp = _pvpState.myHp[_pvpState.myActive] ?? me?.hp ?? 0;
      const enemyHp = enemy ? (_pvpState.enemyHp[_pvpState.enemyActive] ?? enemy.hp) : 0;

      if (me) {
        const pct = Math.max(0, myHp / me.maxHp);
        const bar = document.getElementById('pvp-player-hp-bar');
        if (bar) { bar.style.width = (pct * 100) + '%'; bar.className = 'hp-bar ' + getHpClass(pct); }
        const ht = document.getElementById('pvp-player-hp-text'); if (ht) ht.textContent = myHp + '/' + me.maxHp + ' HP';
        const nm = document.getElementById('pvp-player-name'); if (nm) nm.textContent = me.name;
        const lv = document.getElementById('pvp-player-level'); if (lv) lv.textContent = 'Nv. ' + me.level;
      }
      if (enemy) {
        const pct = Math.max(0, enemyHp / enemy.maxHp);
        const bar = document.getElementById('pvp-enemy-hp-bar');
        if (bar) { bar.style.width = (pct * 100) + '%'; bar.className = 'hp-bar ' + getHpClass(pct); }
        const ht = document.getElementById('pvp-enemy-hp-text'); if (ht) ht.textContent = enemyHp + '/' + enemy.maxHp + ' HP';
        const nm = document.getElementById('pvp-enemy-name'); if (nm) nm.textContent = enemy.name;
        const lv = document.getElementById('pvp-enemy-level'); if (lv) lv.textContent = 'Nv. ' + enemy.level;
        const tr = document.getElementById('pvp-enemy-trainer'); if (tr && _pvpState.enemyUsername) tr.textContent = '🎮 ' + _pvpState.enemyUsername;
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
      const emo = document.getElementById('pvp-enemy-emoji');
      if (img && emo) { img.style.display = 'none'; emo.style.display = 'block'; emo.textContent = enemy.emoji; loadSprite(img, emo, getSpriteUrl(enemy.id), enemy.emoji); }
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
      const emo = document.getElementById('pvp-player-emoji');
      if (img && emo) { img.style.display = 'none'; emo.style.display = 'block'; emo.textContent = me.emoji; loadSprite(img, emo, getBackSpriteUrl(me.id), me.emoji); }
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
        const attacker = actorIsHost ? hostPoke : clientPoke;
        const defender = actorIsHost ? clientPoke : hostPoke;
        const atkS = actorIsHost ? s.myStages : s.enemyStages;
        const defS = actorIsHost ? s.enemyStages : s.myStages;
        const pick = actorIsHost ? hostPick : clientPick;
        const actorName = attacker.name;
        const targName = defender.name;

        if (pick.type === 'switch') {
          const newPoke = actorIsHost ? s.myTeam[pick.switchIndex] : s.enemyTeam[pick.switchIndex];
          return { type: 'switch', switchIndex: pick.switchIndex, pokeName: newPoke?.name || '?', actorIsHost, faintedTarget: false };
        }

        const move = attacker.moves[pick.moveIndex];
        const moveName = move?.name || '???';
        const md = MOVE_DATA[moveName] || { power: move?.power || 40, type: 'normal', cat: 'physical', acc: 100 };

        // Status prevents moving
        if (attacker.status === 'sleep') {
          if ((attacker.sleepTurns || 0) > 0) { attacker.sleepTurns--; return { type: 'move', moveName, actorIsHost, actorName, targName, statusBlocked: 'sleep', damage: 0, eff: 1, faintedTarget: false }; }
          attacker.status = null;
        }
        if (attacker.status === 'freeze') {
          if (Math.random() < 0.8) return { type: 'move', moveName, actorIsHost, actorName, targName, statusBlocked: 'freeze', damage: 0, eff: 1, faintedTarget: false };
          attacker.status = null;
        }
        if (attacker.status === 'paralyze' && Math.random() < 0.25) {
          return { type: 'move', moveName, actorIsHost, actorName, targName, statusBlocked: 'paralyze', damage: 0, eff: 1, faintedTarget: false };
        }

        // Accuracy
        if (md.acc && Math.random() * 100 > (md.acc) * stageMult(atkS.acc || 0)) {
          return { type: 'move', moveName, actorIsHost, actorName, targName, missed: true, damage: 0, eff: 1, faintedTarget: false };
        }

        if (md.cat === 'status') {
          const effectLog = [];
          applyMoveEffect(md.effect, attacker, defender, atkS, defS, m => effectLog.push(m));
          return { type: 'move', moveName, actorIsHost, actorName, targName, isStatus: true, damage: 0, eff: 1, faintedTarget: false, effectLog };
        }

        const { dmg, eff } = calcDamage(attacker, defender, move, atkS.atk || 0, defS.def || 0);
        // Tentative new HP (don't apply yet)
        const defHpArr = actorIsHost ? s.enemyHp : s.myHp;
        const defActIdx = actorIsHost ? s.enemyActive : s.myActive;
        const curHp = defHpArr[defActIdx] ?? defender.hp;
        const newHp = Math.max(0, curHp - dmg);
        return { type: 'move', moveName, actorIsHost, actorName, targName, missed: false, damage: dmg, eff, newDefHp: newHp, faintedTarget: newHp <= 0 };
      }

      // ── Run first action ─────────────────────────────────────
      const firstAction = calcAction(firstIsHost);

      // Apply first action's HP changes so second action sees correct state
      if (firstAction.type === 'switch') {
        if (firstIsHost) s.myActive = firstAction.switchIndex;
        else s.enemyActive = firstAction.switchIndex;
      } else if (firstAction.newDefHp !== undefined) {
        const arr = firstIsHost ? s.enemyHp : s.myHp;
        const idx = firstIsHost ? s.enemyActive : s.myActive;
        arr[idx] = firstAction.newDefHp;
      }

      // ── Run second action (unless first fainted the target) ───
      let secondAction = null;
      if (!firstAction.faintedTarget) {
        secondAction = calcAction(!firstIsHost);
        if (secondAction.type === 'switch') {
          if (!firstIsHost) s.myActive = secondAction.switchIndex;
          else s.enemyActive = secondAction.switchIndex;
        } else if (secondAction.newDefHp !== undefined) {
          const arr = !firstIsHost ? s.enemyHp : s.myHp;
          const idx = !firstIsHost ? s.enemyActive : s.myActive;
          arr[idx] = secondAction.newDefHp;
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

          } else if (action.statusBlocked) {
            const statusMsg = { sleep: 'está dormido', freeze: 'está congelado', paralyze: 'está paralizado' };
            addPvpLog(`¡${action.actorName} ${statusMsg[action.statusBlocked] || 'no pudo moverse'}!`,
              myAction ? 'log-player' : 'log-enemy');

          } else if (action.missed) {
            addPvpLog(`¡${action.actorName} usó ${action.moveName}... ¡Falló!`,
              myAction ? 'log-player' : 'log-enemy');

          } else if (action.isStatus) {
            addPvpLog(`¡${action.actorName} usó ${action.moveName}!`,
              myAction ? 'log-player' : 'log-enemy');
            (action.effectLog || []).forEach(m => addPvpLog(m, 'log-info'));

          } else {
            addPvpLog(`¡${action.actorName} usó ${action.moveName}!`,
              myAction ? 'log-player' : 'log-enemy');
            const effTxt = action.eff >= 2 ? ' ¡Muy eficaz!' : action.eff === 0 ? ' ¡No afecta!' : action.eff <= 0.5 ? ' No muy eficaz...' : '';
            addPvpLog(`(-${action.damage} HP)${effTxt}`, myAction ? 'log-player' : 'log-enemy');

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
          _pvpRenderMoves();
          return;
        }

        // Next turn
        _pvpState.phase = 'choosing';
        _pvpState.myPick = null;
        if (_pvpState.isHost) _pvpState.enemyPick = null;
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
              <span style="display:none;">${p.emoji}</span>
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
      _pvpState.channel.send({ type: 'broadcast', event: 'pvp_forfeit', payload: {} });
      pvpEnd(false, false);
    }

    function pvpEnd(won, _unused) {
      if (!_pvpState || _pvpState.over) return;
      _pvpState.over = true;
      _pvpLock = true;

      _pvpState.channel.unsubscribe();

      const reward = 0;
      state.money += reward;
      if (!state.stats) state.stats = {};
      state.stats.pvpBattles = (state.stats.pvpBattles || 0) + 1;
      if (won) state.stats.pvpWins = (state.stats.pvpWins || 0) + 1;
      // Limpiar batalla PvP activa guardada
      state.activeBattle = null;
      scheduleSave();

      // Show result overlay inside pvp screen
      const ov = document.getElementById('pvp-overlay');
      if (ov) {
        const result = document.createElement('div');
        result.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;';
        result.innerHTML = `
      <div style="font-size:64px;margin-bottom:16px;">${won ? '🏆' : '🤝'}</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:14px;color:${won ? 'var(--yellow)' : 'var(--blue)'};margin-bottom:12px;">
        ${won ? '¡VICTORIA AMISTOSA!' : '¡BUEN COMBATE!'}
      </div>
      <div style="font-size:11px;color:#aaa;margin-bottom:24px;text-align:center;padding:0 20px;">
        Las batallas entre amigos son para divertirse.<br>No se gana ni se pierde dinero.
      </div>
      <button onclick="closePvpOverlay()" style="font-family:'Press Start 2P',monospace;font-size:9px;padding:14px 24px;
        border:none;border-radius:14px;cursor:pointer;background:var(--purple);color:#fff;">
        CONTINUAR
      </button>`;
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

