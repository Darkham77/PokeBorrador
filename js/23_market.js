// ====== MERCADO ONLINE (GTS) ======
let _omTab = 'explore';
let _omPublishType = 'pokemon';
let _omSelectedData = null;
let _omMaxListings = 10;
let _omFeePercent = 0.05;
let _omListingsCache = {}; // cache de offers para modal de detall

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
  
  const btnPk = document.getElementById('om-pub-sw-pokemon');
  const btnIt = document.getElementById('om-pub-sw-item');
  
  if (btnPk) btnPk.classList.toggle('active', type === 'pokemon');
  if (btnIt) btnIt.classList.toggle('active', type === 'item');
  
  renderPublishTab();
}

// ── EXPLORAR ─────────────────────────────────────────────────────────────────
async function renderOnlineMarket() {
  const container = document.getElementById('om-explore-grid');
  document.getElementById('online-market-money').textContent = state.money;
  if (!container) return;

  if (!window.currentUser) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);background:rgba(0,0,0,0.2);border-radius:20px;">Inicia sesión modo online para conectar al GTS.</div>';
    return;
  }

  container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--yellow);">Cargando ofertas de la red Kanto... 🛰️</div>';

  const filterType = document.getElementById('om-filter-type')?.value || 'all';
  const searchText = document.getElementById('om-search-input')?.value.toLowerCase().trim() || '';

  try {
    let query = window.sb.from('market_listings').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(50);
    if (filterType !== 'all') query = query.eq('listing_type', filterType);
    const { data: listings, error } = await query;
    if (error) throw error;

    if (!listings || listings.length === 0) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);background:rgba(0,0,0,0.1);border-radius:20px;">No hay ofertas activas. Sé el primero en vender algo.</div>';
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
      card.style.cssText = 'background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.05);position:relative;display:flex;flex-direction:column;padding:12px;border-radius:16px;';

      let innerContent = '';
      if (offer.listing_type === 'pokemon') {
        const p = offer.data;
        const tierInfo = typeof getPokemonTier === 'function' ? getPokemonTier(p) : { color: '#fff', bg: '#000', tier: '?' };
        const ivs = p.ivs || {};
        const totalIv = (ivs.hp||0)+(ivs.atk||0)+(ivs.def||0)+(ivs.spa||0)+(ivs.spd||0)+(ivs.spe||0);
        innerContent = `
          <div style="font-size:9px;color:var(--gray);margin-bottom:6px;font-family:'Press Start 2P';opacity:0.8;">👤 ${(offer.seller_name||'Anon').substring(0,10)}</div>
          <div style="text-align:center;margin-bottom:8px;position:relative;background:rgba(255,255,255,0.03);border-radius:12px;padding:8px;">
            <div style="position:absolute;top:4px;right:4px;background:${tierInfo.bg};color:${tierInfo.color};font-family:'Press Start 2P',monospace;font-size:6px;padding:2px 5px;border-radius:6px;border:1px solid ${tierInfo.color}44;z-index:2;">${tierInfo.tier}</div>
            <img src="${p.isShiny ? getSpriteUrl(p.id,true) : getSpriteUrl(p.id,false)}" style="width:64px;height:64px;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(2px 2px 4px rgba(0,0,0,0.5));">
          </div>
          <div style="font-size:12px;font-weight:bold;color:${tierInfo.color};margin-bottom:4px;text-transform:capitalize;text-align:center;">${p.name}${p.isShiny?' ✨':''}</div>
          <div style="display:flex;justify-content:center;gap:10px;font-size:10px;margin-bottom:12px;opacity:0.9;">
            <span style="color:var(--gray);">Nv ${p.level||1}</span>
            <span style="color:${tierInfo.color};">IV ${totalIv}</span>
          </div>`;
      } else {
        const i = offer.data;
        let icon = '🎒';
        let itemColor = '#fff';
        if (window.SHOP_ITEMS) {
          const si = window.SHOP_ITEMS.find(x => x.name === i.name);
          if (si?.sprite) icon = `<img src="${si.sprite}" width="40" style="image-rendering:pixelated;">`;
          else if (si?.icon) icon = `<span style="font-size:32px;">${si.icon}</span>`;
          if (si?.tier === 'epic') itemColor = 'var(--purple)';
          if (si?.tier === 'rare') itemColor = 'var(--blue)';
          if (si?.tier === 'legend') itemColor = 'var(--yellow)';
        }
        innerContent = `
          <div style="font-size:9px;color:var(--gray);margin-bottom:6px;font-family:'Press Start 2P';opacity:0.8;">👤 ${(offer.seller_name||'Anon').substring(0,10)}</div>
          <div style="text-align:center;height:80px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;background:rgba(255,255,255,0.03);border-radius:12px;">${icon}</div>
          <div style="font-size:13px;font-weight:bold;color:${itemColor};margin-bottom:4px;text-align:center;">${i.name}</div>
          <div style="font-size:10px;color:var(--yellow);margin-bottom:12px;text-align:center;">Cantidad: x${i.qty}</div>`;
      }

      const canBuy = state.money >= offer.price;
      card.innerHTML = `
        ${innerContent}
        <div style="display:flex;gap:6px;margin-top:auto;">
          <button onclick="openMarketListingDetail('${offer.id}')" title="Ver Detalles"
            style="flex:0 0 auto;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:16px;border-radius:10px;border:1px solid rgba(199,125,255,0.3);cursor:pointer;background:rgba(199,125,255,0.2);color:#fff;">
            👁️
          </button>
          <button onclick="buyFromMarket('${offer.id}',${offer.price},'${offer.listing_type}')"
            style="flex:1;height:38px;padding:0 8px;font-size:9px;border-radius:10px;border:none;cursor:${canBuy?'pointer':'not-allowed'};background:${canBuy?'linear-gradient(135deg,var(--blue),#0056b3)':'rgba(255,255,255,0.05)'};color:${canBuy?'#fff':'var(--gray)'};font-family:'Press Start 2P',monospace;box-shadow:${canBuy?'0 4px 10px rgba(10,132,255,0.3)':'none'};">
            ₽${offer.price}
          </button>
        </div>`;
      container.appendChild(card);
    });

  } catch(e) {
    console.error(e);
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--red);background:rgba(255,0,0,0.05);border-radius:20px;">Error conectando al servidor GTS.</div>';
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
    const iv31 = s => s===31 ? 'color:var(--yellow);font-weight:bold;text-shadow:0 0 4px rgba(255,214,10,0.4);' : 'color:#fff;';
    
    content = `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="position:relative;display:inline-block;background:rgba(255,255,255,0.03);padding:15px;border-radius:20px;border:1px solid rgba(255,255,255,0.08);">
          <img src="${p.isShiny?getSpriteUrl(p.id,true):getSpriteUrl(p.id,false)}" style="width:100px;height:100px;image-rendering:pixelated;filter:drop-shadow(4px 4px 10px rgba(0,0,0,0.5));">
          ${p.isShiny?'<div style="position:absolute;top:5px;right:5px;font-size:20px;">✨</div>':''}
        </div>
        <div style="font-family:'Press Start 2P',monospace;font-size:12px;color:${tierInfo.color};margin-top:12px;text-transform:capitalize;">${p.name}</div>
        <div style="font-size:11px;color:var(--gray);margin-top:6px;">Nv.${p.level||1} · ${p.type||'?'}</div>
        <span style="display:inline-block;background:${tierInfo.bg};color:${tierInfo.color};font-family:'Press Start 2P';font-size:7px;padding:4px 10px;border-radius:8px;margin-top:10px;border:1px solid ${tierInfo.color}44;">${tierInfo.tier}</span>
      </div>
      <div style="background:rgba(0,0,0,0.3);border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.06);">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple-light);margin-bottom:12px;text-align:center;">🧬 POTENCIAL (IVs) — ${totalIv}/186</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;">
          <div style="display:flex;justify-content:space-between;padding:4px 8px;background:rgba(255,255,255,0.02);border-radius:6px;"><span style="color:var(--gray);">HP</span><span style="${iv31(ivs.hp)}">${ivs.hp||0}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 8px;background:rgba(255,255,255,0.02);border-radius:6px;"><span style="color:var(--gray);">ATK</span><span style="${iv31(ivs.atk)}">${ivs.atk||0}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 8px;background:rgba(255,255,255,0.02);border-radius:6px;"><span style="color:var(--gray);">DEF</span><span style="${iv31(ivs.def)}">${ivs.def||0}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 8px;background:rgba(255,255,255,0.02);border-radius:6px;"><span style="color:var(--gray);">SpA</span><span style="${iv31(ivs.spa)}">${ivs.spa||0}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 8px;background:rgba(255,255,255,0.02);border-radius:6px;"><span style="color:var(--gray);">SpD</span><span style="${iv31(ivs.spd)}">${ivs.spd||0}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 8px;background:rgba(255,255,255,0.02);border-radius:6px;"><span style="color:var(--gray);">SPE</span><span style="${iv31(ivs.spe)}">${ivs.spe||0}</span></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
        <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:10px;text-align:center;">
          <div style="font-size:9px;color:var(--gray);margin-bottom:4px;text-transform:uppercase;">Habilidad</div>
          <div style="font-size:11px;color:#fff;font-weight:bold;">${p.ability||'—'}</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:10px;text-align:center;">
          <div style="font-size:9px;color:var(--gray);margin-bottom:4px;text-transform:uppercase;">Naturaleza</div>
          <div style="font-size:11px;color:var(--yellow);font-weight:bold;">${p.nature||'—'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--gray);text-align:center;margin-top:10px;">Vendedor: <span style="color:#fff;font-weight:bold;">${offer.seller_name||'Anon'}</span></div>`;
  } else {
    const i = offer.data;
    const itemInfo = window.SHOP_ITEMS?.find(x => x.name === i.name);
    const iconHtml = itemInfo?.sprite
      ? `<img src="${itemInfo.sprite}" width="80" height="80" style="image-rendering:pixelated;filter:drop-shadow(2px 2px 5px rgba(0,0,0,0.5));">`
      : `<span style="font-size:62px;">${itemInfo?.icon||'🎒'}</span>`;
    const desc = itemInfo?.desc || 'Objeto de entrenador.';
    content = `
      <div style="text-align:center;margin-bottom:15px;background:rgba(255,255,255,0.03);padding:20px;border-radius:24px;">${iconHtml}</div>
      <div style="font-size:18px;font-weight:bold;text-align:center;margin-bottom:10px;">${i.name}</div>
      <div style="font-size:12px;color:var(--text);line-height:1.6;margin-bottom:15px;background:rgba(0,0,0,0.2);padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">${desc}</div>
      <div style="font-size:14px;color:var(--yellow);margin-bottom:15px;text-align:center;font-weight:bold;">Cantidad en venta: x${i.qty}</div>
      <div style="font-size:11px;color:var(--gray);text-align:center;">Vendedor: <span style="color:#fff;font-weight:bold;">${offer.seller_name||'Anon'}</span></div>`;
  }

  const canBuy = state.money >= offer.price;
  const ov = document.createElement('div');
  ov.id = 'om-detail-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:2100;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(5px);';
  ov.innerHTML = `
    <div style="background:var(--card);border-radius:24px;padding:30px;width:100%;max-width:380px;max-height:90vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.12);box-shadow:0 10px 40px rgba(0,0,0,0.8);animation:modalSlideUp 0.3s ease;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--yellow);">🌐 MERCADO INTERNACIONAL</div>
        <button onclick="document.getElementById('om-detail-overlay').remove()" style="background:rgba(255,255,255,0.05);border:none;color:var(--gray);font-size:20px;cursor:pointer;width:32px;height:32px;border-radius:50%;">✕</button>
      </div>
      ${content}
      <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:20px;margin-top:20px;">
        <div style="font-size:18px;font-weight:bold;color:var(--yellow);margin-bottom:15px;text-align:center;text-shadow:0 0 10px rgba(255,214,10,0.3);">₽${offer.price.toLocaleString()}</div>
        <button onclick="document.getElementById('om-detail-overlay').remove();buyFromMarket('${offer.id}',${offer.price},'${offer.listing_type}')"
          style="width:100%;padding:14px;font-size:10px;border-radius:12px;border:none;cursor:${canBuy?'pointer':'not-allowed'};background:${canBuy?'linear-gradient(135deg,var(--blue),#0056b3)':'rgba(255,255,255,0.05)'};color:${canBuy?'#fff':'var(--gray)'};font-family:'Press Start 2P',monospace;${!canBuy?'opacity:0.6;':''}box-shadow:${canBuy?'0 5px 15px rgba(10,132,255,0.4)':'none'};">
          ${canBuy?'💰 CONFIRMAR COMPRA':'⚠️ FONDOS INSUFICIENTES'}
        </button>
        <button onclick="document.getElementById('om-detail-overlay').remove()"
          style="width:100%;margin-top:10px;padding:12px;border:none;border-radius:12px;cursor:pointer;background:rgba(255,255,255,0.06);color:var(--gray);font-size:12px;font-weight:bold;">
          CANCELAR
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
    notify('Procesando transacción paralela...', '⏳');
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
      notify(`¡Compraste a ${offer.data.name}! Fue enviado al PC.`, '🎉');
    } else {
      const itemName = offer.data.name;
      const qty = Math.max(1, parseInt(offer.data.qty) || 1);
      if (!state.inventory) state.inventory = {};
      state.inventory[itemName] = (state.inventory[itemName] || 0) + qty;
      notify(` ¡Compraste x${qty} ${itemName}!`, '🎉');
    }
    saveGame(false);
    updateHud();
    document.getElementById('online-market-money').textContent = state.money;
    renderOnlineMarket();
  } catch(e) {
    console.error(e);
    notify('Error de servidor GTS.', '❌');
  }
}

// ── MIS PUBLICACIONES ─────────────────────────────────────────────────────────
async function renderMyPublications() {
  const container = document.getElementById('om-mine-grid');
  if (!container || !window.currentUser) return;
  container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--yellow);">Consultando red Satelital... 🛰️</div>';

  try {
    const { data: myData, error } = await window.sb
      .from('market_listings').select('*')
      .eq('seller_id', window.currentUser.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!myData || myData.length === 0) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);background:rgba(255,255,255,0.05);border-radius:20px;">No tienes publicaciones.</div>';
      return;
    }
    container.innerHTML = '';
    myData.forEach(offer => {
      if (offer.status === 'cancelled') return;
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.style.cssText = 'background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.05);padding:15px;border-radius:18px;';
      const title = offer.listing_type === 'pokemon'
        ? `${offer.data.name}${offer.data.isShiny?' ✨':''}` : `x${offer.data.qty} ${offer.data.name}`;
      const spriteHtml = offer.listing_type === 'pokemon'
        ? `<img src="${offer.data.isShiny?getSpriteUrl(offer.data.id,true):getSpriteUrl(offer.data.id,false)}" style="height:60px;image-rendering:pixelated;filter:drop-shadow(2px 2px 4px rgba(0,0,0,0.5));">`
        : `<div style="font-size:40px;margin:10px 0;">🎒</div>`;
      let statusBadge = '', actionBtn = '';
      if (offer.status === 'active') {
        statusBadge = `<span style="background:rgba(255,255,255,0.1);padding:4px 10px;border-radius:6px;font-size:9px;font-weight:bold;color:var(--gray);">ACTIVO</span>`;
        actionBtn = `<button onclick="cancelMarketActive('${offer.id}')" style="width:100%;margin-top:10px;padding:10px;font-size:9px;border-radius:10px;border:none;background:rgba(255,50,50,0.15);color:#ff6b6b;cursor:pointer;border:1px solid rgba(255,50,50,0.2);">RETIRAR</button>`;
      } else if (offer.status === 'sold') {
        const won = Math.floor(offer.price * (1 - _omFeePercent));
        statusBadge = `<span style="background:var(--green);color:#000;font-weight:bold;padding:4px 10px;border-radius:6px;font-size:9px;">VENDIDO</span>`;
        actionBtn = `<button onclick="claimMarketSold('${offer.id}',${won})" style="width:100%;margin-top:10px;padding:12px;font-size:9px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--yellow),#d4af37);color:#000;font-family:'Press Start 2P',monospace;cursor:pointer;box-shadow:0 4px 12px rgba(255,214,10,0.3);">RECLAMAR ₽${won}</button>`;
      } else if (offer.status === 'claimed') {
        statusBadge = `<span style="color:var(--gray);font-size:10px;opacity:0.6;">Completado</span>`;
        actionBtn = `<div style="font-size:9px;text-align:center;padding:12px;color:var(--gray);background:rgba(255,255,255,0.03);border-radius:10px;margin-top:10px;">Transacción cerrada</div>`;
      }
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">${statusBadge}<span style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--yellow);">₽${offer.price}</span></div>
        <div style="text-align:center;margin-bottom:10px;">${spriteHtml}</div>
        <div style="font-size:13px;font-weight:bold;margin-bottom:15px;text-align:center;text-transform:capitalize;">${title}</div>
        ${actionBtn}`;
      container.appendChild(card);
    });
  } catch(e) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--red);">Fallo en la conexión local.</div>';
  }
}

async function claimMarketSold(offerId, rewardAmount) {
  try {
    const { data, error } = await window.sb.from('market_listings').update({ status: 'claimed' }).eq('id', offerId).eq('status', 'sold').select();
    if (error) throw error;
    if (!data || data.length === 0) { notify('Error al reclamar.', '⚠️'); renderMyPublications(); return; }
    state.money += rewardAmount;
    saveGame(false);
    updateHud();
    notify(`Cobraste ₽${rewardAmount} (GTS Fee: 5%).`, '💰');
    document.getElementById('online-market-money').textContent = state.money;
    renderMyPublications();
  } catch(e) { console.error(e); notify('Fallo de red.', '❌'); }
}

async function cancelMarketActive(offerId) {
  if (!confirm('¿Retirás la oferta del mercado?')) return;
  try {
    const { data, error } = await window.sb.from('market_listings').update({ status: 'cancelled' }).eq('id', offerId).eq('status', 'active').select();
    if (error) throw error;
    if (!data || data.length === 0) { notify('No se pudo retirar.', '⚠️'); renderMyPublications(); return; }
    const offer = data[0];
    if (offer.listing_type === 'pokemon') {
      state.box.push(offer.data);
      notify(`${offer.data.name} volvió a tu PC.`, '↩️');
    } else {
      const itemName = offer.data.name;
      const qty = parseInt(offer.data.qty) || 1;
      if (!state.inventory) state.inventory = {};
      state.inventory[itemName] = (state.inventory[itemName] || 0) + qty;
      notify(`Recuperaste x${qty} ${itemName}.`, '↩️');
    }
    saveGame(false);
    renderMyPublications();
  } catch(e) { console.error(e); notify('Error al retirar.', '❌'); }
}

// ── PUBLICAR ──────────────────────────────────────────────────────────────────
function renderPublishTab() {
  const container = document.getElementById('om-publish-selectors');
  if (!container) return;
  container.innerHTML = '';

  const btnBaseStyle = `
    width:100%;height:48px;background:rgba(255,255,255,0.06);
    border:1px solid rgba(255,255,255,0.1);border-radius:10px;
    cursor:pointer;color:#fff;outline:none;padding:2px;
    display:flex;align-items:center;justify-content:center;transition:all 0.2s;
  `;
  const btnSelectedStyle = `
    width:100%;height:48px;background:rgba(191,90,242,0.25);
    border:2px solid var(--purple);border-radius:10px;
    cursor:pointer;color:#fff;outline:none;padding:2px;
    display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(191,90,242,0.3);
  `;

  if (_omPublishType === 'pokemon') {
    if (!state.box || state.box.length === 0) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray);background:rgba(0,0,0,0.1);border-radius:15px;font-size:12px;">Tu PC está vacía. Captura Pokémon para venderlos aquí.</div>';
      return;
    }

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(50px,1fr));gap:10px;max-height:250px;overflow-y:auto;padding:5px;';

    state.box.forEach((p, idx) => {
      const isSelected = _omSelectedData?.uid === p.uid;
      const btn = document.createElement('button');
      btn.style.cssText = isSelected ? btnSelectedStyle : btnBaseStyle;
      if (p.isShiny) btn.style.border = '1px solid var(--yellow)';
      
      const sid = getSpriteId(p.id);
      btn.innerHTML = `<img src="${getSpriteUrl(p.id, p.isShiny)}" style="width:38px;height:38px;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(1px 1px 2px rgba(0,0,0,0.3));">`;
      btn.title = `${p.name} (Nv.${p.level})`;
      
      btn.onclick = () => {
        _omSelectedData = isSelected ? null : p;
        renderPublishTab();
      };
      grid.appendChild(btn);
    });
    container.appendChild(grid);

    if (_omSelectedData) {
      const ivs = _omSelectedData.ivs || {};
      const sumIV = (ivs.hp||0)+(ivs.atk||0)+(ivs.def||0)+(ivs.spa||0)+(ivs.spd||0)+(ivs.spe||0);
      const selBox = document.createElement('div');
      selBox.style.cssText = 'margin-top:15px;padding:15px;background:rgba(191,90,242,0.08);border:1px solid rgba(191,90,242,0.2);border-radius:14px;animation:fadeIn 0.3s ease;';
      selBox.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="background:rgba(0,0,0,0.2);padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
             <img src="${getSpriteUrl(_omSelectedData.id, _omSelectedData.isShiny)}" style="width:40px;height:40px;image-rendering:pixelated;">
          </div>
          <div style="flex:1;">
            <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--yellow);margin-bottom:4px;">✔ ${_omSelectedData.name}${_omSelectedData.isShiny?' ✨':''}</div>
            <div style="font-size:11px;color:var(--gray);">Nv.${_omSelectedData.level} · 🧬 IV Total: ${sumIV}/186</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;">
            <button onclick="previewPokemonInPublish()" style="padding:6px 12px;font-size:10px;border-radius:8px;border:none;background:rgba(199,125,255,0.2);color:#fff;cursor:pointer;font-weight:bold;">👁️ DETALLES</button>
            <button onclick="_omSelectedData=null;renderPublishTab()" style="padding:6px 12px;font-size:10px;border-radius:8px;border:none;background:rgba(255,255,255,0.05);color:var(--gray);cursor:pointer;">✕ CANCELAR</button>
          </div>
        </div>`;
      container.appendChild(selBox);
    }

  } else {
    const bloqueados = ['Gema Dominante', 'Pieza de Mapa', 'Escáner de IVs'];
    let vendibles = Object.keys(state.inventory || {}).filter(k => state.inventory[k] > 0 && !bloqueados.includes(k));

    if (vendibles.length === 0) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray);background:rgba(0,0,0,0.1);border-radius:15px;font-size:12px;">Mochila vacía. Consigue objetos raros para vender.</div>';
      return;
    }

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(50px,1fr));gap:10px;max-height:250px;overflow-y:auto;padding:5px;';

    vendibles.forEach(item => {
      const isSelected = _omSelectedData?.name === item;
      const si = window.SHOP_ITEMS?.find(x => x.name === item);
      const icon = si?.sprite ? `<img src="${si.sprite}" style="width:32px;height:32px;image-rendering:pixelated;">` : `<span style="font-size:24px;">${si?.icon||'🎒'}</span>`;
      
      const btn = document.createElement('button');
      btn.style.cssText = isSelected ? btnSelectedStyle : btnBaseStyle;
      btn.innerHTML = icon;
      btn.title = `${item} (Disponibles: ${state.inventory[item]})`;
      
      btn.onclick = () => {
        _omSelectedData = isSelected ? null : { name: item, max: state.inventory[item], qty: 1 };
        renderPublishTab();
      };
      grid.appendChild(btn);
    });
    container.appendChild(grid);

    if (_omSelectedData) {
      const selBox = document.createElement('div');
      selBox.style.cssText = 'margin-top:15px;padding:15px;background:rgba(255,214,10,0.06);border:1px solid rgba(255,214,10,0.2);border-radius:14px;';
      selBox.innerHTML = `
        <div style="font-size:12px;color:var(--yellow);font-weight:bold;margin-bottom:12px;">✔ ${_omSelectedData.name} (Tenes: ${_omSelectedData.max})</div>
        <div style="display:flex;align-items:center;gap:15px;flex-wrap:wrap;">
          <span style="font-size:11px;color:var(--gray);">Cantidad a vender:</span>
          <div style="display:flex;align-items:center;gap:8px;">
             <button onclick="adjustOmQty(-1)" style="width:28px;height:28px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;cursor:pointer;">-</button>
             <input type="number" id="om-pub-item-qty" value="${_omSelectedData.qty}" min="1" max="${_omSelectedData.max}"
               style="padding:6px;border-radius:8px;width:60px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#fff;text-align:center;font-size:12px;">
             <button onclick="adjustOmQty(1)" style="width:28px;height:28px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;cursor:pointer;">+</button>
          </div>
          <button onclick="_omSelectedData=null;renderPublishTab()" style="padding:6px 12px;font-size:10px;border-radius:8px;border:none;background:rgba(255,255,255,0.05);color:var(--gray);cursor:pointer;margin-left:auto;">✕</button>
        </div>`;
      container.appendChild(selBox);
      
      const input = selBox.querySelector('input');
      input.addEventListener('change', (e) => {
        let v = parseInt(e.target.value) || 1;
        if (v < 1) v = 1; if (v > _omSelectedData.max) v = _omSelectedData.max;
        _omSelectedData.qty = v; e.target.value = v;
      });
    }
  }
}

function adjustOmQty(delta) {
  if (!_omSelectedData) return;
  let n = (_omSelectedData.qty || 1) + delta;
  if (n < 1) n = 1; if (n > _omSelectedData.max) n = _omSelectedData.max;
  _omSelectedData.qty = n;
  const input = document.getElementById('om-pub-item-qty');
  if (input) input.value = n;
}

function previewPokemonInPublish() {
  if (!_omSelectedData || _omPublishType !== 'pokemon') return;
  // Usar el sistema global de detalles pero con una copia para el z-index
  showPokemonDetails(_omSelectedData, -1, 'box');
  // Subir z-index del modal de detalles para que tape el mercado
  const ov = document.getElementById('pokemon-detail-overlay');
  if (ov) ov.style.zIndex = '2150';
}

// ── PUBLICAR AL MERCADO ───────────────────────────────────────────────────────
async function publishToMarket() {
  if (!window.currentUser) { notify('Error de sesión.', '❌'); return; }
  const priceInput = document.getElementById('om-publish-price');
  const price = parseInt(priceInput.value);
  if (!price || price < 1) { notify('Falta el precio.', '⚠️'); return; }
  if (!_omSelectedData) { notify('Elegí algo para vender.', '⚠️'); return; }

  try {
    const { count, error } = await window.sb
      .from('market_listings').select('*', { count: 'exact', head: true })
      .eq('seller_id', window.currentUser.id).in('status', ['active']);
    if (error) throw error;
    if (count >= _omMaxListings) { notify(`Límite: ${_omMaxListings} publicaciones.`, '⚠️'); return; }

    if (_omPublishType === 'pokemon') {
      const idx = state.box.findIndex(p => p.uid === _omSelectedData.uid);
      if (idx === -1) { notify('Fallo de sincronización.', '❌'); return; }
      state.box.splice(idx, 1);
    } else {
      const item = _omSelectedData.name;
      const qty = _omSelectedData.qty;
      if ((state.inventory[item] || 0) < qty) { notify('No tenés esa cantidad.', '❌'); return; }
      state.inventory[item] -= qty;
    }

    notify('Publicando en GTS...', '🚀');
    const { error: insErr } = await window.sb.from('market_listings').insert([{
      seller_id: window.currentUser.id,
      seller_name: state.trainer,
      listing_type: _omPublishType,
      data: _omPublishType === 'pokemon' ? _omSelectedData : { name: _omSelectedData.name, qty: _omSelectedData.qty },
      price: price,
      status: 'active'
    }]);

    if (insErr) {
       // Revert local state
       if (_omPublishType === 'pokemon') state.box.push(_omSelectedData);
       else state.inventory[_omSelectedData.name] += _omSelectedData.qty;
       throw insErr;
    }

    saveGame(false);
    notify('¡Publicado con éxito!', '✅');
    _omSelectedData = null;
    priceInput.value = '';
    switchOnlineMarketTab('mine');
  } catch(e) {
    console.error(e);
    notify('Error de red al publicar.', '❌');
  }
}
