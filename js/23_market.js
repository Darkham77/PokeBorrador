// ====== MERCADO ONLINE (GTS) ======
let _omTab = 'explore';
let _omPublishType = 'pokemon';
let _omSelectedData = null;
let _omMaxListings = 10;
let _omFeePercent = 0.05;
let _omListingsCache = {}; // cache de offers para modal de detalle

// ── NAVEGACIÓN ────────────────────────────────────────────────────────────────
function switchOnlineMarketTab(tab) {
  _omTab = tab;
  document.getElementById('om-btn-explore').classList.toggle('active', tab === 'explore');
  document.getElementById('om-btn-mine').classList.toggle('active', tab === 'mine');
  document.getElementById('om-btn-publish').classList.toggle('active', tab === 'publish');
  document.getElementById('om-view-explore').style.display = tab === 'explore' ? 'block' : 'none';
  document.getElementById('om-view-mine').style.display = tab === 'mine' ? 'block' : 'none';
  document.getElementById('om-view-publish').style.display = tab === 'publish' ? 'block' : 'none';
  if (tab === 'explore') renderOnlineMarket();
  if (tab === 'mine') renderMyPublications();
  if (tab === 'publish') renderPublishTab();
}

function switchPublishType(type) {
  _omPublishType = type;
  _omSelectedData = null;
  document.getElementById('om-pub-sw-pokemon').classList.toggle('active', type === 'pokemon');
  document.getElementById('om-pub-sw-item').classList.toggle('active', type === 'item');
  renderPublishTab();
}

// ── EXPLORAR ─────────────────────────────────────────────────────────────────
async function renderOnlineMarket() {
  const container = document.getElementById('om-explore-grid');
  document.getElementById('online-market-money').textContent = state.money;
  if (!container) return;

  if (!window.currentUser) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--gray);">Inicia sesión modo online para conectar al GTS.</div>';
    return;
  }

  container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--yellow);">Cargando ofertas de la red Kanto... 🛰️</div>';

  const filterType = document.getElementById('om-filter-type')?.value || 'all';
  const searchText = document.getElementById('om-search-input')?.value.toLowerCase().trim() || '';

  try {
    let query = window.sb.from('market_listings').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(50);
    if (filterType !== 'all') query = query.eq('listing_type', filterType);
    const { data: listings, error } = await query;
    if (error) throw error;

    if (!listings || listings.length === 0) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--gray);">No hay ofertas activas. Sé el primero en vender algo.</div>';
      return;
    }

    _omListingsCache = {};
    container.innerHTML = '';

    listings.forEach(offer => {
      if (searchText) {
        const n = offer.data?.name?.toLowerCase() || '';
        const s = offer.seller_name?.toLowerCase() || '';
        if (!n.includes(searchText) && !s.includes(searchText)) return;
      }
      if (offer.seller_id === window.currentUser.id) return;

      _omListingsCache[offer.id] = offer;

      const card = document.createElement('div');
      card.className = 'shop-card';
      card.style.cssText = 'background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.05);position:relative;display:flex;flex-direction:column;';

      let innerContent = '';
      if (offer.listing_type === 'pokemon') {
        const p = offer.data;
        const tierInfo = typeof getPokemonTier === 'function' ? getPokemonTier(p) : { color: '#fff', bg: '#000', tier: '?' };
        const ivs = p.ivs || {};
        const totalIv = (ivs.hp||0)+(ivs.atk||0)+(ivs.def||0)+(ivs.spa||0)+(ivs.spd||0)+(ivs.spe||0);
        innerContent = `
          <div style="font-size:10px;color:var(--gray);margin-bottom:4px;font-family:'Press Start 2P';">Vende: ${(offer.seller_name||'Anon').substring(0,10)}</div>
          <div style="text-align:center;margin-bottom:8px;position:relative;">
            <div style="position:absolute;top:-5px;right:0;background:${tierInfo.bg};color:${tierInfo.color};font-family:'Press Start 2P',monospace;font-size:6px;padding:2px 5px;border-radius:6px;border:1px solid ${tierInfo.color}44;">${tierInfo.tier}</div>
            <img src="${p.isShiny ? getSpriteUrl(p.id,true) : getSpriteUrl(p.id,false)}" style="width:60px;height:60px;object-fit:contain;image-rendering:pixelated;">
          </div>
          <div style="font-size:13px;font-weight:bold;color:${tierInfo.color};margin-bottom:4px;text-transform:capitalize;">${p.name}${p.isShiny?' ✨':''}</div>
          <div style="display:flex;justify-content:center;gap:10px;font-size:11px;margin-bottom:10px;">
            <span style="color:var(--gray);">Nv ${p.level||1}</span>
            <span style="color:${tierInfo.color};">IV ${totalIv}</span>
          </div>`;
      } else {
        const i = offer.data;
        let icon = '🎒';
        if (window.SHOP_ITEMS) {
          const si = window.SHOP_ITEMS.find(x => x.name === i.name);
          if (si?.sprite) icon = `<img src="${si.sprite}" width="30">`;
          else if (si?.icon) icon = `<span style="font-size:24px;">${si.icon}</span>`;
        }
        innerContent = `
          <div style="font-size:10px;color:var(--gray);margin-bottom:4px;font-family:'Press Start 2P';">Vende: ${(offer.seller_name||'Anon').substring(0,10)}</div>
          <div style="text-align:center;height:60px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;">${icon}</div>
          <div style="font-size:14px;font-weight:bold;color:#fff;margin-bottom:4px;">${i.name}</div>
          <div style="font-size:11px;color:var(--yellow);margin-bottom:10px;">Cantidad: x${i.qty}</div>`;
      }

      const canBuy = state.money >= offer.price;
      card.innerHTML = `
        ${innerContent}
        <div style="display:flex;gap:6px;margin-top:auto;">
          <button onclick="openMarketListingDetail('${offer.id}')"
            style="flex:0 0 auto;padding:8px 10px;font-size:11px;border-radius:8px;border:1px solid rgba(199,125,255,0.3);cursor:pointer;background:rgba(199,125,255,0.12);color:var(--purple);">
            👁️
          </button>
          <button onclick="buyFromMarket('${offer.id}',${offer.price},'${offer.listing_type}')"
            style="flex:1;padding:10px;font-size:9px;border-radius:8px;border:none;cursor:${canBuy?'pointer':'not-allowed'};background:${canBuy?'var(--blue)':'rgba(255,255,255,0.05)'};color:${canBuy?'#fff':'var(--gray)'};font-family:'Press Start 2P',monospace;">
            COMPRAR ₽${offer.price}
          </button>
        </div>`;
      container.appendChild(card);
    });

  } catch(e) {
    console.error(e);
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:red;">Error conectando al servidor GTS.</div>';
  }
}

// ── MODAL DE DETALLE ──────────────────────────────────────────────────────────
function openMarketListingDetail(offerId) {
  const offer = _omListingsCache[offerId];
  if (!offer) return;

  let content = '';
  if (offer.listing_type === 'pokemon') {
    const p = offer.data;
    const tierInfo = typeof getPokemonTier === 'function' ? getPokemonTier(p) : { color:'#fff', bg:'#000', tier:'?' };
    const ivs = p.ivs || {};
    const totalIv = (ivs.hp||0)+(ivs.atk||0)+(ivs.def||0)+(ivs.spa||0)+(ivs.spd||0)+(ivs.spe||0);
    const iv31 = s => s===31 ? 'color:var(--yellow);font-weight:bold;' : 'color:#fff;';
    content = `
      <div style="text-align:center;margin-bottom:16px;">
        <img src="${p.isShiny?getSpriteUrl(p.id,true):getSpriteUrl(p.id,false)}" style="width:80px;height:80px;image-rendering:pixelated;">
        <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:${tierInfo.color};margin-top:8px;text-transform:capitalize;">${p.name}${p.isShiny?' ✨':''}</div>
        <div style="font-size:11px;color:var(--gray);margin-top:4px;">Nv.${p.level||1} · ${p.type||'?'}</div>
        <span style="display:inline-block;background:${tierInfo.bg};color:${tierInfo.color};font-family:'Press Start 2P';font-size:7px;padding:3px 8px;border-radius:6px;margin-top:6px;">${tierInfo.tier}</span>
      </div>
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;margin-bottom:12px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:7px;color:var(--purple);margin-bottom:8px;">IVs — Total: ${totalIv}/186</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray);">HP</span><span style="${iv31(ivs.hp)}">${ivs.hp||0}/31</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray);">ATK</span><span style="${iv31(ivs.atk)}">${ivs.atk||0}/31</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray);">DEF</span><span style="${iv31(ivs.def)}">${ivs.def||0}/31</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray);">SpA</span><span style="${iv31(ivs.spa)}">${ivs.spa||0}/31</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray);">SpD</span><span style="${iv31(ivs.spd)}">${ivs.spd||0}/31</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray);">SPE</span><span style="${iv31(ivs.spe)}">${ivs.spe||0}/31</span></div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--gray);margin-bottom:6px;">Habilidad: <span style="color:#fff;">${p.ability||'?'}</span></div>
      <div style="font-size:11px;color:var(--gray);margin-bottom:14px;">Naturaleza: <span style="color:var(--yellow);">${p.nature||'?'}</span></div>
      <div style="font-size:11px;color:var(--gray);margin-bottom:0;">Vendedor: <span style="color:#fff;">${offer.seller_name||'Anon'}</span></div>`;
  } else {
    const i = offer.data;
    const itemInfo = window.SHOP_ITEMS?.find(x => x.name === i.name);
    const iconHtml = itemInfo?.sprite
      ? `<img src="${itemInfo.sprite}" width="64" height="64" style="image-rendering:pixelated;">`
      : `<span style="font-size:52px;">${itemInfo?.icon||'🎒'}</span>`;
    const desc = itemInfo?.desc || 'Objeto de entrenador.';
    content = `
      <div style="text-align:center;margin-bottom:12px;">${iconHtml}</div>
      <div style="font-size:16px;font-weight:bold;text-align:center;margin-bottom:8px;">${i.name}</div>
      <div style="font-size:12px;color:var(--gray);line-height:1.6;margin-bottom:12px;background:rgba(255,255,255,0.03);padding:10px;border-radius:10px;">${desc}</div>
      <div style="font-size:13px;color:var(--yellow);margin-bottom:12px;">Cantidad: x${i.qty}</div>
      <div style="font-size:11px;color:var(--gray);">Vendedor: <span style="color:#fff;">${offer.seller_name||'Anon'}</span></div>`;
  }

  const canBuy = state.money >= offer.price;
  const ov = document.createElement('div');
  ov.id = 'om-detail-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = `
    <div style="background:var(--card);border-radius:20px;padding:24px;width:100%;max-width:360px;max-height:85vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.1);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--yellow);">🌐 DETALLE</div>
        <button onclick="document.getElementById('om-detail-overlay').remove()" style="background:transparent;border:none;color:var(--gray);font-size:20px;cursor:pointer;">✕</button>
      </div>
      ${content}
      <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;margin-top:16px;">
        <div style="font-size:14px;font-weight:bold;color:var(--yellow);margin-bottom:12px;text-align:center;">₽${offer.price.toLocaleString()}</div>
        <button onclick="document.getElementById('om-detail-overlay').remove();buyFromMarket('${offer.id}',${offer.price},'${offer.listing_type}')"
          style="width:100%;padding:12px;font-size:10px;border-radius:10px;border:none;cursor:${canBuy?'pointer':'not-allowed'};background:${canBuy?'var(--blue)':'rgba(255,255,255,0.05)'};color:${canBuy?'#fff':'var(--gray)'};font-family:'Press Start 2P',monospace;${!canBuy?'opacity:0.6;':''}">
          ${canBuy?'💰 COMPRAR':'⚠️ FONDOS INSUFICIENTES'}
        </button>
        <button onclick="document.getElementById('om-detail-overlay').remove()"
          style="width:100%;margin-top:8px;padding:10px;border:none;border-radius:10px;cursor:pointer;background:rgba(255,255,255,0.06);color:var(--gray);font-size:12px;">
          Cancelar
        </button>
      </div>
    </div>`;
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

// ── COMPRAR ───────────────────────────────────────────────────────────────────
async function buyFromMarket(offerId, price, type) {
  if (!window.currentUser) return;
  if (state.money < price) { notify('No tienes suficientes Pokéyenes.', '⚠️'); return; }
  if (!confirm(`¿Confirmas la compra por ₽${price}?`)) return;

  try {
    notify('Procesando transacción...', '⏳');
    const { data, error } = await window.sb
      .from('market_listings')
      .update({ status: 'sold', buyer_id: window.currentUser.id })
      .eq('id', offerId).eq('status', 'active').select();
    if (error) throw error;
    if (!data || data.length === 0) {
      notify('Esta oferta ya fue comprada o retirada.', '⚠️');
      renderOnlineMarket(); return;
    }
    const offer = data[0];
    state.money -= price;
    if (offer.listing_type === 'pokemon') {
      state.box.push(offer.data);
      notify(`¡Compraste a ${offer.data.name}! Fue enviado a tu PC.`, '🎉');
    } else {
      const itemName = offer.data.name;
      const qty = Math.max(1, parseInt(offer.data.qty) || 1);
      if (!state.inventory) state.inventory = {};
      state.inventory[itemName] = (state.inventory[itemName] || 0) + qty;
      notify(`¡Compraste x${qty} ${itemName}! Enviado a la mochila.`, '🎉');
    }
    saveGame(false);
    document.getElementById('online-market-money').textContent = state.money;
    document.getElementById('hud-money').textContent = state.money;
    renderOnlineMarket();
  } catch(e) {
    console.error(e);
    notify('Error de red al intentar comprar.', '❌');
  }
}

// ── MIS PUBLICACIONES ─────────────────────────────────────────────────────────
async function renderMyPublications() {
  const container = document.getElementById('om-mine-grid');
  if (!container || !window.currentUser) return;
  container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--yellow);">Consultando tus registros... 📂</div>';

  try {
    const { data: myData, error } = await window.sb
      .from('market_listings').select('*')
      .eq('seller_id', window.currentUser.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!myData || myData.length === 0) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--gray);">No tienes ninguna oferta activa o pasada.</div>';
      return;
    }
    container.innerHTML = '';
    myData.forEach(offer => {
      if (offer.status === 'cancelled') return;
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.style.cssText = 'background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.05);';
      const title = offer.listing_type === 'pokemon'
        ? `${offer.data.name}${offer.data.isShiny?' ✨':''}` : `x${offer.data.qty} ${offer.data.name}`;
      const spriteHtml = offer.listing_type === 'pokemon'
        ? `<img src="${offer.data.isShiny?getSpriteUrl(offer.data.id,true):getSpriteUrl(offer.data.id,false)}" style="height:50px;image-rendering:pixelated;">`
        : `<div style="font-size:30px;margin:10px 0;">🎒</div>`;
      let statusBadge = '', actionBtn = '';
      if (offer.status === 'active') {
        statusBadge = `<span style="background:rgba(255,255,255,0.1);padding:4px 8px;border-radius:4px;font-size:9px;">ACTIVO</span>`;
        actionBtn = `<button onclick="cancelMarketActive('${offer.id}')" style="width:100%;padding:8px;font-size:9px;border-radius:8px;border:none;background:rgba(255,50,50,0.2);color:#ff6b6b;cursor:pointer;">RETIRAR</button>`;
      } else if (offer.status === 'sold') {
        const won = Math.floor(offer.price * (1 - _omFeePercent));
        statusBadge = `<span style="background:var(--green);color:#111;font-weight:bold;padding:4px 8px;border-radius:4px;font-size:9px;">¡VENDIDO!</span>`;
        actionBtn = `<button onclick="claimMarketSold('${offer.id}',${won})" style="width:100%;padding:10px;font-size:9px;border-radius:8px;border:none;background:var(--yellow);color:var(--darker);font-family:'Press Start 2P',monospace;cursor:pointer;">RECLAMAR ₽${won}</button>`;
      } else if (offer.status === 'claimed') {
        statusBadge = `<span style="color:var(--gray);font-size:10px;">Reclamado</span>`;
        actionBtn = `<div style="font-size:9px;text-align:center;padding:10px;color:var(--gray);">Transacción Finalizada</div>`;
      }
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">${statusBadge}<span style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--yellow);">₽${offer.price}</span></div>
        <div style="text-align:center;">${spriteHtml}</div>
        <div style="font-size:12px;font-weight:bold;margin-bottom:12px;text-align:center;text-transform:capitalize;">${title}</div>
        ${actionBtn}`;
      container.appendChild(card);
    });
  } catch(e) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:red;">Error buscando tus publicaciones.</div>';
  }
}

async function claimMarketSold(offerId, rewardAmount) {
  try {
    const { data, error } = await window.sb.from('market_listings').update({ status: 'claimed' }).eq('id', offerId).eq('status', 'sold').select();
    if (error) throw error;
    if (!data || data.length === 0) { notify('Esta oferta ya fue reclamada.', '⚠️'); renderMyPublications(); return; }
    state.money += rewardAmount;
    saveGame(false);
    notify(`Recibiste ₽${rewardAmount} (5% de comisión descontado).`, '💰');
    document.getElementById('online-market-money').textContent = state.money;
    document.getElementById('hud-money').textContent = state.money;
    renderMyPublications();
  } catch(e) { console.error(e); notify('Fallo de red.', '❌'); }
}

async function cancelMarketActive(offerId) {
  if (!confirm('¿Retirás este ítem de la venta?')) return;
  try {
    const { data, error } = await window.sb.from('market_listings').update({ status: 'cancelled' }).eq('id', offerId).eq('status', 'active').select();
    if (error) throw error;
    if (!data || data.length === 0) { notify('No se pudo retirar. Tal vez alguien lo compró.', '⚠️'); renderMyPublications(); return; }
    const offer = data[0];
    if (offer.listing_type === 'pokemon') {
      state.box.push(offer.data);
      notify(`Tu ${offer.data.name} regresó al PC.`, '↩️');
    } else {
      const itemName = offer.data.name;
      const qty = parseInt(offer.data.qty) || 1;
      if (!state.inventory) state.inventory = {};
      state.inventory[itemName] = (state.inventory[itemName] || 0) + qty;
      notify(`Retiraste x${qty} ${itemName}. Vuelta a tu mochila.`, '↩️');
    }
    saveGame(false);
    renderMyPublications();
  } catch(e) { console.error(e); notify('Fallo de red.', '❌'); }
}

// ── PUBLICAR ──────────────────────────────────────────────────────────────────
function renderPublishTab() {
  const container = document.getElementById('om-publish-selectors');
  container.innerHTML = '';

  // Estilo base compartido para los botones de selección
  const btnBaseStyle = `
    width:100%;height:48px;background:rgba(255,255,255,0.05);
    border:1px solid rgba(255,255,255,0.1);border-radius:8px;
    cursor:pointer;color:#fff;outline:none;padding:2px;
    display:flex;align-items:center;justify-content:center;
  `;
  const btnSelectedStyle = `
    width:100%;height:48px;background:rgba(59,139,255,0.3);
    border:2px solid var(--blue);border-radius:8px;
    cursor:pointer;color:#fff;outline:none;padding:2px;
    display:flex;align-items:center;justify-content:center;
  `;

  if (_omPublishType === 'pokemon') {
    if (!state.box || state.box.length === 0) {
      container.innerHTML = '<p style="font-size:12px;color:var(--gray);">No tenés ningún Pokémon en el PC.</p>';
      return;
    }

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(48px,1fr));gap:8px;max-height:220px;overflow-y:auto;';

    state.box.forEach(p => {
      const isSelected = _omSelectedData?.uid === p.uid;
      const btn = document.createElement('button');
      btn.style.cssText = isSelected ? btnSelectedStyle : btnBaseStyle;
      if (p.isShiny) btn.style.boxShadow = '0 0 8px rgba(255,217,61,0.4)';
      btn.title = `${p.name} | Nv.${p.level||1} | ${p.nature||'?'}`;
      btn.innerHTML = `<img src="${p.isShiny?getSpriteUrl(p.id,true):getSpriteUrl(p.id,false)}" style="width:36px;height:36px;object-fit:contain;image-rendering:pixelated;">`;
      btn.onclick = () => {
        // Toggle: click en el mismo Pokémon deselecciona
        _omSelectedData = (isSelected) ? null : p;
        renderPublishTab();
      };
      grid.appendChild(btn);
    });
    container.appendChild(grid);

    if (_omSelectedData) {
      const ivs = _omSelectedData.ivs || {};
      const sumIV = (ivs.hp||0)+(ivs.atk||0)+(ivs.def||0)+(ivs.spa||0)+(ivs.spd||0)+(ivs.spe||0);
      const info = document.createElement('div');
      info.style.cssText = 'margin-top:10px;font-size:12px;background:rgba(59,139,255,0.08);border:1px solid rgba(59,139,255,0.2);border-radius:10px;padding:10px;';
      info.innerHTML = `
        <div style="color:var(--yellow);font-weight:bold;text-transform:capitalize;margin-bottom:4px;">✔ ${_omSelectedData.name}${_omSelectedData.isShiny?' ✨':''}</div>
        <div style="color:var(--gray);font-size:11px;">Nv.${_omSelectedData.level||1} · IV Total: ${sumIV}/186 · ${_omSelectedData.nature||'?'}</div>
        <button onclick="_omSelectedData=null;renderPublishTab()" style="margin-top:8px;padding:4px 12px;font-size:10px;border:1px solid rgba(255,255,255,0.2);border-radius:6px;background:transparent;color:var(--gray);cursor:pointer;">✕ Cancelar selección</button>`;
      container.appendChild(info);
    }

  } else {
    const bloqueados = ['Gema Dominante', 'Pieza de Mapa', 'Escáner de IVs'];
    let vendibles = Object.keys(state.inventory || {}).filter(k => state.inventory[k] > 0 && !bloqueados.includes(k));

    if (vendibles.length === 0) {
      container.innerHTML = '<p style="font-size:12px;color:var(--gray);">No tenés ítems comerciables en tu mochila.</p>';
      return;
    }

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(48px,1fr));gap:8px;max-height:220px;overflow-y:auto;';

    vendibles.forEach(item => {
      const isSelected = _omSelectedData?.name === item;
      const itemInfo = window.SHOP_ITEMS?.find(x => x.name === item);
      const iconHtml = itemInfo?.sprite
        ? `<img src="${itemInfo.sprite}" style="width:32px;height:32px;object-fit:contain;image-rendering:pixelated;">`
        : `<span style="font-size:26px;">${itemInfo?.icon||'🎒'}</span>`;
      const btn = document.createElement('button');
      btn.style.cssText = isSelected ? btnSelectedStyle : btnBaseStyle;
      btn.title = `${item} (x${state.inventory[item]})${itemInfo?.desc ? '\n' + itemInfo.desc : ''}`;
      btn.innerHTML = iconHtml;
      btn.onclick = () => {
        // Toggle: click en el mismo ítem deselecciona
        _omSelectedData = isSelected ? null : { name: item, max: state.inventory[item], qty: 1 };
        renderPublishTab();
      };
      grid.appendChild(btn);
    });
    container.appendChild(grid);

    if (_omSelectedData?.name) {
      const qtyPanel = document.createElement('div');
      qtyPanel.style.cssText = 'margin-top:10px;background:rgba(255,217,61,0.06);border:1px solid rgba(255,217,61,0.2);border-radius:10px;padding:10px;';
      qtyPanel.innerHTML = `
        <div style="font-size:12px;color:var(--yellow);font-weight:bold;margin-bottom:8px;">✔ ${_omSelectedData.name} (x${_omSelectedData.max} disponibles)</div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-size:12px;color:var(--gray);">Cantidad a vender:</span>
          <input type="number" id="om-pub-item-qty" value="${_omSelectedData.qty}" min="1" max="${_omSelectedData.max}"
            style="padding:6px;border-radius:8px;width:70px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:12px;outline:none;">
          <span style="font-size:10px;color:var(--gray);">Máx: ${_omSelectedData.max}</span>
        </div>
        <button onclick="_omSelectedData=null;renderPublishTab()" style="margin-top:8px;padding:4px 12px;font-size:10px;border:1px solid rgba(255,255,255,0.2);border-radius:6px;background:transparent;color:var(--gray);cursor:pointer;">✕ Cancelar selección</button>`;
      qtyPanel.querySelector('input').addEventListener('input', e => {
        let val = parseInt(e.target.value) || 1;
        if (val > _omSelectedData.max) val = _omSelectedData.max;
        if (val < 1) val = 1;
        _omSelectedData.qty = val;
      });
      container.appendChild(qtyPanel);
    }
  }
}

// ── PUBLICAR AL MERCADO ───────────────────────────────────────────────────────
async function publishToMarket() {
  if (!window.currentUser) { notify('Debes iniciar sesión para publicar.', '❌'); return; }
  const priceInput = document.getElementById('om-publish-price');
  const price = parseInt(priceInput.value);
  if (!price || price < 1) { notify('Inserta un precio válido.', '⚠️'); return; }
  if (!_omSelectedData) { notify('Seleccioná un Pokémon o Ítem de la lista.', '⚠️'); return; }

  try {
    const { count, error } = await window.sb
      .from('market_listings').select('*', { count: 'exact', head: true })
      .eq('seller_id', window.currentUser.id).in('status', ['active']);
    if (error) throw error;
    if (count >= _omMaxListings) { notify(`Límite: máximo ${_omMaxListings} publicaciones activas.`, '⚠️'); return; }

    if (_omPublishType === 'pokemon') {
      const index = state.box.findIndex(p => p.uid === _omSelectedData.uid);
      if (index === -1) { notify('No se encontró el Pokémon en tu caja (Error Escrow).', '❌'); return; }
      state.box.splice(index, 1);
    } else {
      const item = _omSelectedData.name;
      const qtyToSell = _omSelectedData.qty;
      if ((state.inventory[item] || 0) < qtyToSell) { notify('No posees suficientes ítems.', '❌'); return; }
      state.inventory[item] -= qtyToSell;
    }

    notify('Subiendo publicación a la red Satelital...', '🛰️');
    const insertData = {
      seller_id: window.currentUser.id,
      seller_name: state.trainer,
      listing_type: _omPublishType,
      data: _omPublishType === 'pokemon' ? _omSelectedData : { name: _omSelectedData.name, qty: _omSelectedData.qty },
      price: price,
      status: 'active'
    };

    const { error: insertErr } = await window.sb.from('market_listings').insert([insertData]);
    if (insertErr) {
      if (_omPublishType === 'pokemon') state.box.push(_omSelectedData);
      else state.inventory[_omSelectedData.name] += _omSelectedData.qty;
      throw insertErr;
    }

    saveGame(false);
    notify('¡Publicación enviada exitosamente!', '✅');
    _omSelectedData = null;
    priceInput.value = '';
    switchOnlineMarketTab('mine');
  } catch(e) {
    console.error('Publish Error:', e);
    notify('No se pudo publicar la oferta.', '❌');
  }
}
