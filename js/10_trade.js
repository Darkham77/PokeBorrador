    // ===== TRADE SYSTEM =====

    let _tradeTarget = null;
    let _tradeFriendSave = null;
    let _tradeOfferPoke = null;
    let _tradeRequestPoke = null;
    let _tradeOfferItems = {};
    let _tradeRequestItems = {};

    // ── Subscribe ─────────────────────────────────────
    function subscribeTradeNotifs() {
      if (!currentUser) return;
      sb.channel('trade-notifs-' + currentUser.id)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'trade_offers',
          filter: `receiver_id=eq.${currentUser.id}`
        }, () => {
          refreshFriendsBadge();
          notify('¡Recibiste una oferta de intercambio!', '🔄');
          renderPendingTrades();
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'trade_offers',
          filter: `sender_id=eq.${currentUser.id}`
        }, ({ new: row }) => {
          if (row?.status === 'accepted') {
            refreshFriendsBadge();
            notify('¡Tu oferta de trade fue aceptada! Entrá a Amigos para reclamar.', '🎉');
          }
        })
        .subscribe();
    }

    // ── Tab switching inside modal ────────────────────
    function switchTradeTab(tab) {
      document.getElementById('trade-panel-offer').style.display = tab === 'offer' ? 'block' : 'none';
      document.getElementById('trade-panel-request').style.display = tab === 'request' ? 'block' : 'none';
      document.getElementById('trade-tab-offer').style.background = tab === 'offer' ? 'var(--purple)' : 'rgba(255,255,255,0.05)';
      document.getElementById('trade-tab-offer').style.color = tab === 'offer' ? '#fff' : 'var(--gray)';
      document.getElementById('trade-tab-request').style.background = tab === 'request' ? 'var(--purple)' : 'rgba(255,255,255,0.05)';
      document.getElementById('trade-tab-request').style.color = tab === 'request' ? '#fff' : 'var(--gray)';
      updateTradeSummary();
    }

    // ── Open modal ────────────────────────────────────
    async function openTradeModal(friendId, friendUsername) {
      _tradeTarget = { id: friendId, username: friendUsername };
      _tradeOfferPoke = null; _tradeRequestPoke = null;
      _tradeOfferItems = {}; _tradeRequestItems = {};

      document.getElementById('trade-recipient').textContent = 'Con: ' + friendUsername;
      document.getElementById('trade-my-money').textContent = state.money.toLocaleString();
      document.getElementById('trade-offer-money').value = '';
      document.getElementById('trade-request-money').value = '';
      document.getElementById('trade-message').value = '';
      document.getElementById('trade-is-gift').checked = false;
      document.getElementById('trade-request-inner').style.display = 'block';
      switchTradeTab('offer');

      // Load friend's save
      const { data, error } = await sb.from('game_saves').select('save_data').eq('user_id', friendId).single();
      if (error || !data) {
        _tradeFriendSave = { team: [], inventory: {}, money: 0 };
        notify('No se pudo cargar el inventario del amigo.', '⚠️');
      } else {
        _tradeFriendSave = data.save_data;
      }

      document.getElementById('trade-friend-money').textContent = (_tradeFriendSave?.money || 0).toLocaleString();
      renderTradeOfferPokemon();
      renderTradeRequestPokemon();
      renderTradeOfferItems();
      renderTradeRequestItems();
      updateTradeSummary();

      document.getElementById('trade-modal').classList.add('open');
    }

    function closeTradeModal() {
      document.getElementById('trade-modal').classList.remove('open');
    }

    function toggleGiftMode() {
      const isGift = document.getElementById('trade-is-gift').checked;
      document.getElementById('trade-request-inner').style.display = isGift ? 'none' : 'block';
      if (isGift) { _tradeRequestPoke = null; _tradeRequestItems = {}; }
      updateTradeSummary();
    }

    function clampMoney(input, side) {
      const max = side === 'offer' ? state.money : (_tradeFriendSave?.money || 0);
      let v = parseInt(input.value) || 0;
      if (v > max) v = max;
      if (v < 0) v = 0;
      input.value = v;
      updateTradeSummary();
    }

    // ── Summary bar ───────────────────────────────────
    function updateTradeSummary() {
      const el = document.getElementById('trade-summary');
      if (!el) return;
      const parts = [];
      if (_tradeOfferPoke !== null) parts.push(`🔴 ${state.team[_tradeOfferPoke]?.name}`);
      Object.entries(_tradeOfferItems).forEach(([k, v]) => parts.push(`${k} x${v}`));
      const om = parseInt(document.getElementById('trade-offer-money')?.value) || 0;
      if (om > 0) parts.push(`₽${om.toLocaleString()}`);

      const isGift = document.getElementById('trade-is-gift')?.checked;
      const reqParts = [];
      if (!isGift) {
        if (_tradeRequestPoke !== null) reqParts.push(`🔴 ${(_tradeFriendSave?.team || [])[_tradeRequestPoke]?.name}`);
        Object.entries(_tradeRequestItems).forEach(([k, v]) => reqParts.push(`${k} x${v}`));
        const rm = parseInt(document.getElementById('trade-request-money')?.value) || 0;
        if (rm > 0) reqParts.push(`₽${rm.toLocaleString()}`);
      }

      if (parts.length === 0 && reqParts.length === 0) {
        el.textContent = 'Seleccioná qué querés ofrecer y qué pedís.';
      } else {
        el.innerHTML =
          `<span style="color:var(--green);">Ofrecés: ${parts.length ? parts.join(', ') : '—'}</span>` +
          (isGift ? ' <span style="color:var(--purple);">· 🎁 Regalo</span>' :
            ` &nbsp;→&nbsp; <span style="color:var(--yellow);">Pedís: ${reqParts.length ? reqParts.join(', ') : '—'}</span>`);
      }
    }

    // ── Pokémon detail popup ──────────────────────────
    function showTradePokeDetail(pokemon, side, index) {
      const typeColors = {
        grass: '#6BCB77', fire: '#FF3B3B', water: '#3B8BFF', normal: '#aaa',
        electric: '#FFD93D', psychic: '#C77DFF', rock: '#c8a060', ground: '#c8a060', poison: '#C77DFF', bug: '#90c050'
      };
      const tc = typeColors[pokemon.type] || '#aaa';
      const _detailNum = POKEMON_SPRITE_IDS[pokemon.id];
      const _detailSpriteHtml = _detailNum
        ? `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${_detailNum}.png"
             width="80" height="80" style="image-rendering:pixelated;margin-bottom:4px;"
             onerror="this.outerHTML='<div style=\\'font-size:64px;line-height:1;margin-bottom:8px;\\'>${pokemon.emoji}</div>'">`
        : `<div style="font-size:64px;line-height:1;margin-bottom:8px;">${pokemon.emoji}</div>`;
      const ivEntries = Object.entries(pokemon.ivs || {}).map(([s, v]) => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
      <span style="font-size:10px;width:40px;color:var(--gray);text-transform:uppercase;">${s}</span>
      <div style="flex:1;background:rgba(255,255,255,0.1);border-radius:4px;height:6px;overflow:hidden;">
        <div style="width:${Math.round(v / 31 * 100)}%;height:100%;background:${v > 25 ? 'var(--green)' : v > 15 ? 'var(--yellow)' : 'var(--red)'};border-radius:4px;"></div>
      </div>
      <span style="font-size:10px;width:20px;text-align:right;color:${v > 25 ? 'var(--green)' : v > 15 ? 'var(--yellow)' : 'var(--red)'};">${v}</span>
    </div>`).join('');

      const selectedClass = (side === 'offer' && _tradeOfferPoke === index) ||
        (side === 'request' && _tradeRequestPoke === index);

      document.getElementById('trade-poke-detail-content').innerHTML = `
    <div style="text-align:center;margin-bottom:16px;">
      ${_detailSpriteHtml}
      <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:var(--yellow);">${pokemon.name}</div>
      <div style="font-size:12px;color:${tc};margin-top:4px;">Nv. ${pokemon.level} · ${pokemon.type}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
      <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:10px;text-align:center;">
        <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--purple);">${pokemon.nature}</div>
        <div style="font-size:9px;color:var(--gray);margin-top:3px;">Naturaleza</div>
      </div>
      <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:10px;text-align:center;">
        <div style="font-size:11px;font-weight:700;color:var(--green);">${pokemon.ability}</div>
        <div style="font-size:9px;color:var(--gray);margin-top:3px;">Habilidad</div>
      </div>
    </div>
    <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--gray);margin-bottom:8px;">IVs</div>
    ${ivEntries}
    <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--gray);margin:12px 0 8px;">MOVIMIENTOS</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px;">
      ${(pokemon.moves || []).map(m => `<div style="background:rgba(59,139,255,0.1);border:1px solid rgba(59,139,255,0.2);
        border-radius:8px;padding:7px 10px;font-size:11px;">${m.name}<div style="font-size:9px;color:var(--gray);margin-top:2px;">PP: ${m.pp}/${m.maxPP}</div></div>`).join('')}
    </div>
    <button onclick="toggleTradePoke('${side}',${index});document.getElementById('trade-poke-detail').style.display='none'"
      style="width:100%;padding:12px;border:none;border-radius:12px;cursor:pointer;font-weight:700;font-size:13px;
             background:${selectedClass ? 'rgba(255,59,59,0.2)' : 'linear-gradient(135deg,var(--purple),#9b4dca)'};
             color:${selectedClass ? 'var(--red)' : '#fff'};">
      ${selectedClass ? '✕ Quitar selección' : '✓ Seleccionar este Pokémon'}
    </button>`;
      document.getElementById('trade-poke-detail').style.display = 'flex';
    }

    function toggleTradePoke(side, i) {
      if (side === 'offer') {
        _tradeOfferPoke = _tradeOfferPoke === i ? null : i;
        renderTradeOfferPokemon();
      } else {
        _tradeRequestPoke = _tradeRequestPoke === i ? null : i;
        renderTradeRequestPokemon();
      }
      updateTradeSummary();
    }

    // ── Pokémon grids ─────────────────────────────────
    function _tradePokeCard(p, i, side, sel, disabled) {
      const num = POKEMON_SPRITE_IDS[p.id];
      const spriteUrl = num
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${side === 'offer' ? 'back/' : ''}${num}.png`
        : null;
      const imgHtml = spriteUrl
        ? `<img src="${spriteUrl}" width="52" height="52" style="image-rendering:pixelated;display:block;"
             onerror="this.outerHTML='<span style=\\'font-size:30px;line-height:1;display:block;\\'>${p.emoji}</span>'">`
        : `<span style="font-size:30px;line-height:1;display:block;">${p.emoji}</span>`;
      const detailCall = `showTradePokeDetail(${JSON.stringify(p).replace(/"/g, '&quot;')},'${side}',${i})`;
      const disabledCall = `notify('No podés ofrecer tu único Pokémon.','⚠️')`;
      return `<div class="trade-poke-card ${sel ? 'selected' : ''} ${disabled ? 'cant-trade' : ''}"
        onclick="${disabled ? disabledCall : detailCall}"
        style="text-align:center;cursor:pointer;">
        ${imgHtml}
        <div style="font-size:9px;font-weight:700;margin-top:4px;">${p.name}</div>
        <div style="font-size:9px;color:var(--gray);">Nv.${p.level}</div>
        ${sel ? `<div style="font-size:8px;color:var(--yellow);margin-top:2px;">✓ ${side === 'offer' ? 'Seleccionado' : 'Pedido'}</div>` : ''}
        ${disabled ? '<div style="font-size:8px;color:var(--red);">Único</div>' : ''}
      </div>`;
    }

    function renderTradeOfferPokemon() {
      const el = document.getElementById('trade-offer-pokemon');
      if (!state.team || state.team.length === 0) {
        el.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:8px;">Sin Pokémon en el equipo.</div>'; return;
      }
      const cantTrade = state.team.length === 1;
      el.innerHTML = state.team.map((p, i) =>
        _tradePokeCard(p, i, 'offer', _tradeOfferPoke === i, cantTrade && _tradeOfferPoke !== i)
      ).join('');
    }

    function renderTradeRequestPokemon() {
      const el = document.getElementById('trade-request-pokemon');
      const team = _tradeFriendSave?.team || [];
      if (team.length === 0) {
        el.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:8px;">Tu amigo no tiene Pokémon.</div>'; return;
      }
      el.innerHTML = team.map((p, i) =>
        _tradePokeCard(p, i, 'request', _tradeRequestPoke === i, false)
      ).join('');
    }

    function getSpriteId(id) {
      return POKEMON_SPRITE_IDS[id] || 0;
    }

    // ── Item rows ─────────────────────────────────────
    function renderTradeOfferItems() {
      const el = document.getElementById('trade-offer-items');
      const inv = Object.entries(state.inventory || {}).filter(([, v]) => v > 0);
      if (!inv.length) { el.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:8px;">Sin ítems.</div>'; return; }
      el.innerHTML = inv.map(([name, maxQty]) => {
        const qty = _tradeOfferItems[name] || 0;
        return `<div class="trade-item-row">
      <span class="trade-item-name">${name}</span>
      <span style="font-size:10px;color:var(--gray);">x${maxQty}</span>
      <button class="trade-qty-btn" onclick="adjustItem('offer','${name}',-1,${maxQty})">−</button>
      <span class="trade-item-qty">${qty}</span>
      <button class="trade-qty-btn" onclick="adjustItem('offer','${name}',1,${maxQty})">+</button>
    </div>`;
      }).join('');
    }

    function renderTradeRequestItems() {
      const el = document.getElementById('trade-request-items');
      const inv = Object.entries(_tradeFriendSave?.inventory || {}).filter(([, v]) => v > 0);
      if (!inv.length) { el.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:8px;">Tu amigo no tiene ítems.</div>'; return; }
      el.innerHTML = inv.map(([name, maxQty]) => {
        const qty = _tradeRequestItems[name] || 0;
        return `<div class="trade-item-row">
      <span class="trade-item-name">${name}</span>
      <span style="font-size:10px;color:var(--gray);">x${maxQty}</span>
      <button class="trade-qty-btn" onclick="adjustItem('request','${name}',-1,${maxQty})">−</button>
      <span class="trade-item-qty">${qty}</span>
      <button class="trade-qty-btn" onclick="adjustItem('request','${name}',1,${maxQty})">+</button>
    </div>`;
      }).join('');
    }

    function adjustItem(side, name, delta, max) {
      const obj = side === 'offer' ? _tradeOfferItems : _tradeRequestItems;
      obj[name] = Math.max(0, Math.min(max, (obj[name] || 0) + delta));
      if (!obj[name]) delete obj[name];
      side === 'offer' ? renderTradeOfferItems() : renderTradeRequestItems();
      updateTradeSummary();
    }

    // ── Send offer ────────────────────────────────────
    async function sendTradeOffer() {
      const isGift = document.getElementById('trade-is-gift').checked;
      const offerMoney = parseInt(document.getElementById('trade-offer-money').value) || 0;
      const reqMoney = parseInt(document.getElementById('trade-request-money').value) || 0;
      const message = document.getElementById('trade-message').value.trim();

      const hasOffer = _tradeOfferPoke !== null || Object.keys(_tradeOfferItems).length > 0 || offerMoney > 0;
      if (!hasOffer) { notify('Tenés que ofrecer algo.', '⚠️'); return; }
      if (offerMoney > state.money) { notify('No tenés suficiente dinero.', '💸'); return; }

      const offerPokemon = _tradeOfferPoke !== null ? state.team[_tradeOfferPoke] : null;
      const requestPokemon = (!isGift && _tradeRequestPoke !== null) ? (_tradeFriendSave?.team || [])[_tradeRequestPoke] : null;

      const { error } = await sb.from('trade_offers').insert({
        sender_id: currentUser.id,
        receiver_id: _tradeTarget.id,
        offer_pokemon: offerPokemon,
        offer_items: _tradeOfferItems,
        offer_money: offerMoney,
        request_pokemon: isGift ? null : requestPokemon,
        request_items: isGift ? {} : _tradeRequestItems,
        request_money: isGift ? 0 : reqMoney,
        message,
      });
      if (error) { notify('Error al enviar: ' + error.message, '❌'); return; }
      closeTradeModal();
      notify(`¡Oferta enviada a ${_tradeTarget.username}!`, '🔄');
    }

    // ── Pending trades (received, awaiting my decision) ──────────
    async function renderPendingTrades() {
      // ── Trades I received and haven't responded yet ────────────
      const { data: incoming } = await sb.from('trade_offers')
        .select('*').eq('receiver_id', currentUser.id).eq('status', 'pending');

      // ── Trades I sent that were accepted (to claim reward notification) ──
      const { data: accepted } = await sb.from('trade_offers')
        .select('*').eq('sender_id', currentUser.id).eq('status', 'accepted');

      const section = document.getElementById('trades-pending-section');
      const list = document.getElementById('trades-pending-list');
      const hasAny = (incoming?.length || 0) + (accepted?.length || 0) > 0;
      if (!hasAny) { section.style.display = 'none'; refreshFriendsBadge(); return; }

      // Fetch all sender profiles for incoming trades
      const senderIds = [...new Set((incoming || []).map(t => t.sender_id))];
      const { data: profiles } = senderIds.length
        ? await sb.from('profiles').select('*').in('id', senderIds)
        : { data: [] };

      section.style.display = 'block';

      // ── Accepted trades (I'm the sender — claim my reward) ─────
      const acceptedHtml = (accepted || []).map(t => {
        const offerLines = [];
        if (t.offer_pokemon) offerLines.push(`${t.offer_pokemon.emoji || '❓'} ${t.offer_pokemon.name} Nv.${t.offer_pokemon.level}`);
        Object.entries(t.offer_items || {}).forEach(([k, v]) => offerLines.push(`${k} x${v}`));
        if (t.offer_money > 0) offerLines.push(`₽${t.offer_money.toLocaleString()}`);

        const receivedLines = [];
        if (t.request_pokemon) receivedLines.push(`${t.request_pokemon.emoji || '❓'} ${t.request_pokemon.name} Nv.${t.request_pokemon.level}`);
        Object.entries(t.request_items || {}).forEach(([k, v]) => receivedLines.push(`${k} x${v}`));
        if (t.request_money > 0) receivedLines.push(`₽${t.request_money.toLocaleString()}`);

        return `<div style="background:rgba(107,203,119,0.08);border:1px solid rgba(107,203,119,0.35);
          border-radius:14px;padding:14px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--green);">✅ ¡Tu oferta fue aceptada!</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
            <div>
              <div style="font-size:9px;color:var(--red);margin-bottom:4px;">Enviaste:</div>
              ${offerLines.map(l => `<div style="font-size:11px;margin-bottom:2px;">${l}</div>`).join('') || '<div style="font-size:11px;color:var(--gray);">—</div>'}
            </div>
            <div>
              <div style="font-size:9px;color:var(--green);margin-bottom:4px;">Recibís:</div>
              ${receivedLines.map(l => `<div style="font-size:11px;margin-bottom:2px;">${l}</div>`).join('') || '<div style="font-size:11px;color:var(--gray);">Solo fue un regalo 🎁</div>'}
            </div>
          </div>
          <button class="friend-btn friend-btn-accept" style="width:100%;" onclick="claimAcceptedTrade('${t.id}')">
            🎁 Reclamar recompensa
          </button>
        </div>`;
      }).join('');

      // ── Pending incoming offers ─────────────────────────────────
      const incomingHtml = (incoming || []).map(t => {
        const sender = profiles?.find(p => p.id === t.sender_id);
        const isGift = !t.request_pokemon && !Object.keys(t.request_items || {}).length && !t.request_money;
        const offerLines = [];
        if (t.offer_pokemon) offerLines.push(`${t.offer_pokemon.emoji || '❓'} ${t.offer_pokemon.name} Nv.${t.offer_pokemon.level}`);
        Object.entries(t.offer_items || {}).forEach(([k, v]) => offerLines.push(`${k} x${v}`));
        if (t.offer_money > 0) offerLines.push(`₽${t.offer_money.toLocaleString()}`);
        const reqLines = [];
        if (t.request_pokemon) reqLines.push(`${t.request_pokemon.emoji || '❓'} ${t.request_pokemon.name} Nv.${t.request_pokemon.level}`);
        Object.entries(t.request_items || {}).forEach(([k, v]) => reqLines.push(`${k} x${v}`));
        if (t.request_money > 0) reqLines.push(`₽${t.request_money.toLocaleString()}`);

        const offerPokeBtn = t.offer_pokemon
          ? `<button onclick='showTradePokeDetail(${JSON.stringify(t.offer_pokemon).replace(/'/g, "\\'")},"incoming",null)'
             style="font-size:10px;background:rgba(255,255,255,0.08);border:none;border-radius:6px;padding:3px 8px;cursor:pointer;color:var(--purple);">🔍 Ver stats</button>` : '';

        return `<div class="trade-card-incoming">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="font-family:'Press Start 2P',monospace;font-size:8px;">${sender?.username || '?'}</div>
            <span class="${isGift ? 'trade-tag-gift' : 'trade-tag-offer'}">${isGift ? '🎁 Regalo' : '🔄 Intercambio'}</span>
          </div>
          ${t.message ? `<div style="font-size:11px;color:var(--gray);margin-bottom:8px;font-style:italic;">"${t.message}"</div>` : ''}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
            <div>
              <div style="font-size:9px;color:var(--green);margin-bottom:4px;">Te ofrece:</div>
              ${offerLines.map(l => `<div style="font-size:11px;margin-bottom:2px;">${l}</div>`).join('')}
              ${offerPokeBtn}
            </div>
            ${!isGift ? `<div>
              <div style="font-size:9px;color:var(--yellow);margin-bottom:4px;">Pide:</div>
              ${reqLines.map(l => `<div style="font-size:11px;margin-bottom:2px;">${l}</div>`).join('')}
            </div>` : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button class="friend-btn friend-btn-accept" style="flex:1;" onclick="acceptTrade('${t.id}')">✓ Aceptar</button>
            <button class="friend-btn friend-btn-reject" onclick="rejectTrade('${t.id}')">✕ Rechazar</button>
          </div>
        </div>`;
      }).join('');

      list.innerHTML = acceptedHtml + incomingHtml;
      refreshFriendsBadge();
    }

    // ── Claim reward of an accepted trade (sender's side) ────────
    async function claimAcceptedTrade(tradeId) {
      try {
        // PASO 1: Validar que el trade existe y está en estado 'accepted'
        const { data: trade } = await sb.from('trade_offers').select('*').eq('id', tradeId).single();
        if (!trade || trade.status !== 'accepted') { notify('Este trade ya fue reclamado.', '⚠️'); return; }

        // PASO 2: Clonar el Pokémon solicitado para evitar referencias compartidas
        let requestedPokemonClone = null;
        if (trade.request_pokemon) {
          requestedPokemonClone = JSON.parse(JSON.stringify(trade.request_pokemon));
          if (!requestedPokemonClone.uid) requestedPokemonClone.uid = getUidStr();
        }

        // PASO 3: Aplicar cambios al estado local (sender side)
        const receivedLines = [];
        if (requestedPokemonClone) {
          receivedLines.push(`${requestedPokemonClone.emoji || '❓'} ${requestedPokemonClone.name}`);
          // Verificar que no lo tenemos ya (por duplicación)
          const uid = requestedPokemonClone.uid;
          const alreadyHave = uid 
            ? (state.team.some(p => p?.uid === uid) || (state.box || []).some(p => p?.uid === uid))
            : false;
          if (!alreadyHave) {
            state.team.push(requestedPokemonClone);
            checkTradeEvolution(requestedPokemonClone);
            renderTeam();
          }
        }
        
        Object.entries(trade.request_items || {}).forEach(([k, v]) => {
          receivedLines.push(`${k} x${v}`);
          state.inventory[k] = (state.inventory[k] || 0) + v;
        });
        
        if (trade.request_money > 0) {
          receivedLines.push(`₽${trade.request_money.toLocaleString()}`);
          state.money += trade.request_money;
        }

        // Remover completamente lo que el SENDER había ofrecido para evitar duplicados
        if (trade.offer_pokemon) {
          const offerUid = trade.offer_pokemon.uid;
          if (offerUid) {
            state.team = state.team.filter(p => p?.uid !== offerUid);
            state.box = (state.box || []).filter(p => p?.uid !== offerUid);
          } else {
            state.team = state.team.filter(p => !(p?.name === trade.offer_pokemon.name && p?.level === trade.offer_pokemon.level));
            state.box = (state.box || []).filter(p => !(p?.name === trade.offer_pokemon.name && p?.level === trade.offer_pokemon.level));
          }
        }
        Object.entries(trade.offer_items || {}).forEach(([k, v]) => {
          state.inventory[k] = Math.max(0, (state.inventory[k] || 0) - v);
          if (!state.inventory[k]) delete state.inventory[k];
        });
        state.money = Math.max(0, state.money - (trade.offer_money || 0));

        // PASO 4: Guardar el estado actualizado
        await sb.from('game_saves').upsert({ 
          user_id: currentUser.id, 
          save_data: serializeState(), 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'user_id' });

        // PASO 5: Marcar el trade como reclamado (DESPUÉS de guardar)
        const { error: updateErr } = await sb.from('trade_offers').update({ status: 'claimed' }).eq('id', tradeId);
        if (updateErr) throw new Error('Error al marcar trade como reclamado: ' + updateErr.message);

        updateHud();
        const msg = receivedLines.length
          ? `¡Reclamaste: ${receivedLines.join(', ')}!`
          : '¡Tu regalo fue entregado!';
        notify(msg, '🎉');
        renderFriends();
      } catch (err) {
        console.error('[CLAIM TRADE ERROR]', err);
        notify('Error al reclamar el trade: ' + err.message, '❌');
        renderFriends();
      }
    }

    // ── Accept ────────────────────────────────────────
    async function acceptTrade(tradeId) {
      try {
        setAuthLoading(true);
        
        // El servidor (Supabase RPC) ahora se encarga de TODO:
        // 1. Validar que ambos jugadores tengan los Pokémon/items/dinero.
        // 2. Realizar el intercambio en los dos saves de forma atómica.
        // 3. Cambiar el estado del trade a 'accepted'.
        const { error: rpcErr } = await sb.rpc('execute_trade', {
          p_trade_id: tradeId
        });
      
        if (rpcErr) {
          throw new Error(rpcErr.message);
        }

        // Una vez que el servidor procesó el trade exitosamente, 
        // recargamos el save para que el cliente local esté sincronizado.
        const { data: save } = await sb.from('game_saves').select('save_data').eq('user_id', currentUser.id).single();
        if (save?.save_data) {
          Object.assign(state, save.save_data);
          updateHud();
          renderTeam();
          notify('¡Intercambio realizado con éxito!', '🎉');
        }
        
        setAuthLoading(false);
        renderFriends();
      } catch (err) {
        setAuthLoading(false);
        console.error('[TRADE ERROR]', err);
        notify('Error en el intercambio: ' + err.message, '❌');
        renderFriends();
      }
    }
      
    async function rejectTrade(tradeId) {
      await sb.from('trade_offers').update({ status: 'rejected' }).eq('id', tradeId);
      notify('Oferta rechazada.', '👋');
      renderFriends();
    }

