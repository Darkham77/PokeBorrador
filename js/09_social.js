    // ===== FRIENDS SYSTEM =====

    let _friendSearchTimeout = null;
    let _friendsRealtimeCh = null;

    // Subscribe to realtime friend requests when logged in
    function subscribeFriendNotifs() {
      if (!currentUser || _friendsRealtimeCh) return;
      _friendsRealtimeCh = sb
        .channel('friend-notifs-' + currentUser.id)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'friendships',
          filter: `addressee_id=eq.${currentUser.id}`
        }, () => {
          refreshFriendsBadge();
          notify('¡Nueva solicitud de amistad!', '👥');
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'friendships',
          filter: `requester_id=eq.${currentUser.id}`
        }, () => {
          refreshFriendsBadge();
        })
        .subscribe();
    }

    async function refreshFriendsBadge() {
      if (!currentUser) return;
      // Count all unreviewed notifications in parallel
      const [
        { data: pendingFriends },
        { data: pendingTrades },
        { data: acceptedTrades },
        { data: pendingBattles },
      ] = await Promise.all([
        sb.from('friendships').select('id', { count: 'exact', head: false })
          .eq('addressee_id', currentUser.id).eq('status', 'pending'),
        sb.from('trade_offers').select('id', { count: 'exact', head: false })
          .eq('receiver_id', currentUser.id).eq('status', 'pending'),
        sb.from('trade_offers').select('id', { count: 'exact', head: false })
          .eq('sender_id', currentUser.id).eq('status', 'accepted'),
        sb.from('battle_invites').select('id', { count: 'exact', head: false })
          .eq('opponent_id', currentUser.id).eq('status', 'pending')
          .gte('created_at', new Date(Date.now() - 60000).toISOString()),
      ]);

      const total = (pendingFriends?.length || 0)
        + (pendingTrades?.length || 0)
        + (acceptedTrades?.length || 0)
        + (pendingBattles?.length || 0)
        + (typeof getChatNotificationCount === 'function' ? getChatNotificationCount() : 0);

      state.totalNotifications = total;

      const badge = document.getElementById('friends-nav-badge');
      const lbl = document.getElementById('friends-nav-label');
      // Si el usuario ya está mirando la tab de amigos, no mostrar el badge
      const friendsTabOpen = document.getElementById('tab-friends')?.style.display !== 'none';
      const chatUnread = (typeof getChatNotificationCount === 'function' ? getChatNotificationCount() : 0);
      
      if (badge) {
        if (total > 0) {
          // Si estamos en la tab de amigos pero hay chats sin leer, mostramos un punto rojo
          if (friendsTabOpen) {
            if (chatUnread > 0) {
              badge.textContent = ''; // Punto rojo sin número
              badge.style.minWidth = '10px';
              badge.style.height = '10px';
              badge.style.borderRadius = '50%';
              badge.style.display = 'block';
            } else {
              badge.style.display = 'none';
            }
          } else {
            // Comportamiento normal fuera de la tab
            badge.textContent = total > 99 ? '99+' : total;
            badge.style.minWidth = '16px';
            badge.style.height = '16px';
            badge.style.borderRadius = '8px';
            badge.style.display = 'block';
          }
        } else {
          badge.style.display = 'none';
        }
      }
      if (lbl) lbl.textContent = 'Amigos';
    }

    async function renderFriends() {
      if (!currentUser) return;
      await refreshFriendsBadge();
      await renderFriendsList();
      await renderPendingRequests();
      await renderPendingTrades();
      subscribeFriendNotifs();
    }

    async function renderFriendsList() {
      const el = document.getElementById('friends-list');
      el.innerHTML = '<div style="color:var(--gray);font-size:12px;padding:10px;">Cargando...</div>';

      // Get accepted friendships (both directions)
      const { data: sent } = await sb.from('friendships').select('*').eq('requester_id', currentUser.id).eq('status', 'accepted');
      const { data: received } = await sb.from('friendships').select('*').eq('addressee_id', currentUser.id).eq('status', 'accepted');
      const all = [...(sent || []), ...(received || [])];

      if (all.length === 0) {
        el.innerHTML = '<div class="empty-state"><span class="empty-icon">👥</span>Todavía no tenés amigos agregados.<br>Buscá a tu entrenador favorito arriba.</div>';
        return;
      }

      // Get profile for each friend
      const friendIds = all.map(f => f.requester_id === currentUser.id ? f.addressee_id : f.requester_id);
      const { data: profiles } = await sb.from('profiles').select('*').in('id', friendIds);
      const { data: saves } = await sb.from('game_saves').select('user_id,save_data,updated_at').in('user_id', friendIds);

      el.innerHTML = (profiles || []).map(p => {
        const saveRow = saves?.find(s => s.user_id === p.id);
        const save = saveRow?.save_data;
        const level = save?.trainerLevel || 1;
        const badges = save?.badges || 0;
        const friendship = all.find(f => f.requester_id === p.id || f.addressee_id === p.id);
        // Online = updated_at within last 5 min
        const lastSeen = saveRow?.updated_at ? new Date(saveRow.updated_at) : null;
        const isOnline = lastSeen && (Date.now() - lastSeen.getTime()) < 5 * 60 * 1000;
        
        const unreadCount = typeof getUnreadCount === 'function' ? getUnreadCount(p.id) : 0;
        const chatUnreadBadge = unreadCount > 0 ? `<div style="position:absolute;top:-6px;right:-6px;background:#ff4757;color:white;border-radius:50%;width:18px;height:18px;font-size:10px;display:flex;align-items:center;justify-content:center;font-weight:bold;box-shadow:0 2px 5px rgba(0,0,0,0.4);z-index:10;">${unreadCount}</div>` : '';

        const clsId = save?.playerClass;
        let avatarHtml = `<div style="font-size:24px;">🧢</div>`;
        if (clsId && typeof PLAYER_CLASSES !== 'undefined' && PLAYER_CLASSES[clsId]) {
          const cls = PLAYER_CLASSES[clsId];
          let borderColor = '#cd7f32';
          if (level >= 20) borderColor = '#ffd700';
          else if (level >= 10) borderColor = '#c0c0c0';
          avatarHtml = `
            <div style="width:40px;height:40px;border-radius:50%;border:2px solid ${borderColor};background:radial-gradient(circle, ${cls.color}44 0%, #1e293b 80%);display:flex;align-items:flex-start;justify-content:center;overflow:hidden;box-shadow:0 0 8px ${borderColor}66;">
              <img src="${cls.sprite}" style="width:250%;height:auto;margin-top:-2px;image-rendering:pixelated;">
            </div>`;
        }

        return `<div class="friend-card">
      <div class="friend-avatar" style="border:none;background:transparent;">
        ${avatarHtml}
        <div class="online-dot ${isOnline ? '' : 'offline-dot'}"></div>
      </div>
      <div class="friend-info">
        <div class="friend-name">${p.username}</div>
        <div class="friend-meta">Nv. ${level} &nbsp;·&nbsp; ${badges} medallas</div>
      </div>
      <div class="friend-actions">
        <button class="friend-btn" style="position:relative;background:rgba(107,203,119,0.15);color:var(--green);border:1px solid rgba(107,203,119,0.3);"
          onclick="openChat('${p.id}','${p.username}')">💬 Chat${chatUnreadBadge}</button>
        <button class="friend-btn" style="background:rgba(255,217,61,0.15);color:var(--yellow);border:1px solid rgba(255,217,61,0.3);"
          onclick="openTradeModal('${p.id}','${p.username}')">🔄 Intercambiar</button>
        <button class="friend-btn" onclick="sendBattleInvite('${p.id}','${p.username}')"
          style="background:rgba(199,125,255,0.15);color:var(--purple);border:1px solid rgba(199,125,255,0.3);">⚔️ Batallar</button>
        <button class="friend-btn friend-btn-remove" onclick="removeFriend('${friendship?.id}','${p.username}')">✕</button>
      </div>
    </div>`;
      }).join('');
    }

    async function renderPendingRequests() {
      const { data } = await sb.from('friendships')
        .select('*')
        .eq('addressee_id', currentUser.id)
        .eq('status', 'pending');

      const section = document.getElementById('friends-pending-section');
      const list = document.getElementById('friends-pending-list');

      if (!data || data.length === 0) { section.style.display = 'none'; return; }

      // Get requester profiles and saves
      const requesterIds = data.map(f => f.requester_id);
      const { data: profiles } = await sb.from('profiles').select('*').in('id', requesterIds);
      const { data: saves } = await sb.from('game_saves').select('user_id,save_data').in('user_id', requesterIds);

      section.style.display = 'block';
      list.innerHTML = data.map(f => {
        const profile = profiles?.find(p => p.id === f.requester_id);
        const saveRow = saves?.find(s => s.user_id === f.requester_id);
        const save = saveRow?.save_data || {};
        const level = save.trainerLevel || 1;
        const clsId = save.playerClass;
        
        let avatarHtml = `<div style="font-size:24px;">🧢</div>`;
        if (clsId && typeof PLAYER_CLASSES !== 'undefined' && PLAYER_CLASSES[clsId]) {
          const cls = PLAYER_CLASSES[clsId];
          let borderColor = '#cd7f32';
          if (level >= 20) borderColor = '#ffd700';
          else if (level >= 10) borderColor = '#c0c0c0';
          avatarHtml = `
            <div style="width:40px;height:40px;border-radius:50%;border:2px solid ${borderColor};background:radial-gradient(circle, ${cls.color}44 0%, #1e293b 80%);display:flex;align-items:flex-start;justify-content:center;overflow:hidden;box-shadow:0 0 8px ${borderColor}66;">
              <img src="${cls.sprite}" style="width:250%;height:auto;margin-top:-2px;image-rendering:pixelated;">
            </div>`;
        }

        return `
    <div class="friend-card">
      <div class="friend-avatar" style="border:none;background:transparent;">${avatarHtml}</div>
      <div class="friend-info">
        <div class="friend-name">${profile?.username || '?'}</div>
        <div class="friend-meta">Quiere ser tu amigo</div>
      </div>
      <div class="friend-actions">
        <button class="friend-btn friend-btn-accept" onclick="respondFriend('${f.id}','accepted')">✓ Aceptar</button>
        <button class="friend-btn friend-btn-reject" onclick="respondFriend('${f.id}','rejected')">✕</button>
      </div>
    </div>`;
      }).join('');
    }

    function searchFriends() {
      clearTimeout(_friendSearchTimeout);
      _friendSearchTimeout = setTimeout(async () => {
        const q = document.getElementById('friend-search-input').value.trim();
        const el = document.getElementById('friend-search-results');
        if (q.length < 2) { el.innerHTML = ''; return; }

        const { data } = await sb.from('profiles')
          .select('*')
          .ilike('username', `%${q}%`)
          .neq('id', currentUser.id)
          .limit(8);

        if (!data || data.length === 0) {
          el.innerHTML = '<div style="color:var(--gray);font-size:12px;padding:8px;">No se encontraron entrenadores.</div>';
          return;
        }

        // Get saves for classes
        const ids = data.map(p => p.id);
        const { data: existing } = await sb.from('friendships')
          .select('*')
          .or(`requester_id.in.(${[currentUser.id, ...ids].join(',')}),addressee_id.in.(${[currentUser.id, ...ids].join(',')})`);
        const { data: saves } = await sb.from('game_saves').select('user_id,save_data').in('user_id', ids);

        el.innerHTML = data.map(p => {
          const rel = (existing || []).find(f =>
            (f.requester_id === currentUser.id && f.addressee_id === p.id) ||
            (f.requester_id === p.id && f.addressee_id === currentUser.id)
          );
          
          const saveRow = saves?.find(s => s.user_id === p.id);
          const save = saveRow?.save_data || {};
          const level = save.trainerLevel || 1;
          const clsId = save.playerClass;
          
          let avatarHtml = `<div style="font-size:24px;">🧢</div>`;
          if (clsId && typeof PLAYER_CLASSES !== 'undefined' && PLAYER_CLASSES[clsId]) {
            const cls = PLAYER_CLASSES[clsId];
            let borderColor = '#cd7f32';
            if (level >= 20) borderColor = '#ffd700';
            else if (level >= 10) borderColor = '#c0c0c0';
            avatarHtml = `
              <div style="width:40px;height:40px;border-radius:50%;border:2px solid ${borderColor};background:radial-gradient(circle, ${cls.color}44 0%, #1e293b 80%);display:flex;align-items:flex-start;justify-content:center;overflow:hidden;box-shadow:0 0 8px ${borderColor}66;">
                <img src="${cls.sprite}" style="width:250%;height:auto;margin-top:-2px;image-rendering:pixelated;">
              </div>`;
          }

          let actionBtn = `<button class="friend-btn" style="background:rgba(199,125,255,0.2);color:var(--purple);border:1px solid rgba(199,125,255,0.3);"
          onclick="sendFriendRequest('${p.id}','${p.username}',this)">➕ Agregar</button>`;
          if (rel) {
            if (rel.status === 'accepted')
              actionBtn = '<span class="pending-badge">✓ Amigos</span>';
            else if (rel.status === 'pending' && rel.requester_id === currentUser.id)
              actionBtn = '<span class="pending-badge">⏳ Pendiente</span>';
            else if (rel.status === 'pending' && rel.addressee_id === currentUser.id)
              actionBtn = `<button class="friend-btn friend-btn-accept" onclick="respondFriend('${rel.id}','accepted');renderFriends();">✓ Aceptar</button>`;
          }
          return `<div class="search-result-card">
        <div class="friend-avatar" style="width:auto;height:auto;border:none;background:transparent;">${avatarHtml}</div>
        <div class="friend-info">
          <div class="friend-name">${p.username}</div>
        </div>
        ${actionBtn}
      </div>`;
        }).join('');
      }, 350);
    }

    async function sendFriendRequest(addresseeId, username, btn) {
      if (!currentUser) return;
      btn.disabled = true; btn.textContent = '⏳';
      const { error } = await sb.from('friendships').insert({
        requester_id: currentUser.id,
        addressee_id: addresseeId,
        status: 'pending',
      });
      if (error) {
        btn.disabled = false; btn.textContent = '➕ Agregar';
        notify('Error al enviar solicitud.', '❌'); return;
      }
      btn.outerHTML = '<span class="pending-badge">⏳ Pendiente</span>';
      notify(`¡Solicitud enviada a ${username}!`, '👥');
    }

    async function respondFriend(friendshipId, status) {
      await sb.from('friendships').update({ status }).eq('id', friendshipId);
      if (status === 'accepted') notify('¡Amistad aceptada!', '🎉');
      renderFriends();
    }

    async function removeFriend(friendshipId, username) {
      if (!confirm(`¿Eliminar a ${username} de tus amigos?`)) return;
      await sb.from('friendships').delete().eq('id', friendshipId);
      notify(`${username} eliminado de tus amigos.`, '👋');
      renderFriends();
    }

    // Update lastSeen timestamp every 2 min so friends can see if estás online
    // IMPORTANTE: Solo actualizar lastSeen sin sobrescribir el save completo
    function startPresence() {
      async function ping() {
        if (!currentUser) return;
        try {
          // Solo actualizar el timestamp lastSeen sin tocar el resto del save
          // Esto evita que el ping sobrescriba cambios de trades que ocurrieron entre pings
          const now = new Date().toISOString();
          await sb.from('game_saves').update({ 
            updated_at: now 
          }).eq('user_id', currentUser.id);
        } catch (err) {
          console.warn('[PRESENCE] Error updating lastSeen:', err);
        }
      }
      ping();
      setInterval(ping, 120000);
    }

