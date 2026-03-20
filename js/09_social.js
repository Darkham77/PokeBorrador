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

      const badge = document.getElementById('friends-nav-badge');
      const lbl = document.getElementById('friends-nav-label');
      // Si el usuario ya está mirando la tab de amigos, no mostrar el badge
      const friendsTabOpen = document.getElementById('tab-friends')?.style.display !== 'none';
      if (badge) {
        if (total > 0 && !friendsTabOpen) {
          badge.textContent = total > 99 ? '99+' : total;
          badge.style.display = 'block';
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
      const { data: saves } = await sb.from('game_saves').select('user_id,save_data').in('user_id', friendIds);

      el.innerHTML = (profiles || []).map(p => {
        const save = saves?.find(s => s.user_id === p.id)?.save_data;
        const level = save?.trainerLevel || 1;
        const badges = save?.badges || 0;
        const friendship = all.find(f => f.requester_id === p.id || f.addressee_id === p.id);
        // Online = updated_at within last 5 min
        const lastSeen = save ? new Date(saves?.find(s => s.user_id === p.id)?.save_data?.lastSeen || 0) : null;
        const isOnline = lastSeen && (Date.now() - lastSeen.getTime()) < 5 * 60 * 1000;
        return `<div class="friend-card">
      <div class="friend-avatar">
        🧢
        <div class="online-dot ${isOnline ? '' : 'offline-dot'}"></div>
      </div>
      <div class="friend-info">
        <div class="friend-name">${p.username}</div>
        <div class="friend-meta">Nv. ${level} &nbsp;·&nbsp; ${badges} medallas</div>
      </div>
      <div class="friend-actions">
        <button class="friend-btn" style="background:rgba(107,203,119,0.15);color:var(--green);border:1px solid rgba(107,203,119,0.3);"
          onclick="openChat('${p.id}','${p.username}')">💬 Chat</button>
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

      // Get requester profiles separately
      const requesterIds = data.map(f => f.requester_id);
      const { data: profiles } = await sb.from('profiles').select('*').in('id', requesterIds);

      section.style.display = 'block';
      list.innerHTML = data.map(f => {
        const profile = profiles?.find(p => p.id === f.requester_id);
        return `
    <div class="friend-card">
      <div class="friend-avatar">🧢</div>
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

        // Check existing friendships
        const ids = data.map(p => p.id);
        const { data: existing } = await sb.from('friendships')
          .select('*')
          .or(`requester_id.in.(${[currentUser.id, ...ids].join(',')}),addressee_id.in.(${[currentUser.id, ...ids].join(',')})`);

        el.innerHTML = data.map(p => {
          const rel = (existing || []).find(f =>
            (f.requester_id === currentUser.id && f.addressee_id === p.id) ||
            (f.requester_id === p.id && f.addressee_id === currentUser.id)
          );
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
        <div class="friend-avatar" style="width:40px;height:40px;font-size:18px;">🧢</div>
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
    function startPresence() {
      async function ping() {
        if (!currentUser) return;
        const s = serializeState();
        s.lastSeen = new Date().toISOString();
        await sb.from('game_saves').upsert({ user_id: currentUser.id, save_data: s, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      }
      ping();
      setInterval(ping, 120000);
    }

