// ====== MERCADO ONLINE (GTS) ======
let _omTab = 'explore';
let _omPublishType = 'pokemon';
let _omSelectedData = null;
let _omMaxListings = 10;
let _omFeePercent = 0.05;
let _omListingsCache = {};

// FILTERS STATE
let _omFilters = { tier:'all', type:'all', levelMin:1, levelMax:100, ivTotalMin:0, ivTotalMax:186, ivAny31:false, search:'' };
let _omPubFilters = { tier:'all', type:'all', levelMin:1, levelMax:100, ivTotalMin:0, ivTotalMax:186, ivAny31:false, search:'' };
let _omFilterExpanded = { explore: false, publish: false };

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

// ── FILTROS UI ───────────────────────────────────────────────────────────────
function getPokemonFilterHTML(context) {
  const f = context === 'explore' ? _omFilters : _omPubFilters;
  const isExp = _omFilterExpanded[context];
  
  return `
    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:12px; margin-bottom:14px;">
      <div onclick="toggleOMFilters('${context}')" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
        <span style="font-family:'Press Start 2P',monospace; font-size:8px; color:var(--purple-light);">🔍 FILTROS AVANZADOS</span>
        <span style="color:var(--gray); font-size:12px;">${isExp ? '▲' : '▼'}</span>
      </div>
      
      <div style="margin-top:10px;">
        <input type="text" placeholder="Buscar por nombre..." value="${f.search}" 
          oninput="setOMFilter('${context}', 'search', this.value)"
          style="width:100%; padding:8px 12px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; font-size:12px; outline:none;">
      </div>

      <div id="om-filter-body-${context}" style="display:${isExp ? 'block' : 'none'}; margin-top:12px; border-top:1px solid rgba(255,255,255,0.05); padding-top:12px;">
        
        <!-- Tiers -->
        <div style="margin-bottom:12px;">
          <div style="font-size:9px; color:var(--gray); margin-bottom:6px;">Tier</div>
          <div style="display:flex; flex-wrap:wrap; gap:5px;">
            ${['all','S+','S','A','B','C','D','F'].map(t => `
              <button onclick="setOMFilter('${context}','tier','${t}')" 
                style="font-size:8px; padding:5px 8px; border-radius:6px; border:1px solid ${f.tier===t?'var(--purple)':'rgba(255,255,255,0.1)'}; background:${f.tier===t?'rgba(191,90,242,0.2)':'transparent'}; color:${f.tier===t?'#fff':'var(--gray)'}; cursor:pointer;">
                ${t==='all'?'Todos':t}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Tipos -->
        <div style="margin-bottom:12px;">
          <div style="font-size:9px; color:var(--gray); margin-bottom:6px;">Tipo</div>
          <div style="display:flex; flex-wrap:wrap; gap:4px;">
            ${['all','fire','water','grass','electric','psychic','normal','rock','ground','poison','bug','flying','ghost','ice','dragon','fighting','dark','steel'].map(type => `
              <button onclick="setOMFilter('${context}','type','${type}')" 
                style="font-size:14px; width:28px; height:28px; border-radius:6px; border:1px solid ${f.type===type?'var(--blue)':'rgba(255,255,255,0.05)'}; background:${f.type===type?'rgba(0,122,255,0.2)':'rgba(0,0,0,0.2)'}; cursor:pointer;" 
                title="${type}">
                ${type==='all'?'📂':getTypeEmoji(type)}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Ranges -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:10px;">
          <div>
            <div style="font-size:9px; color:var(--gray); margin-bottom:5px;">IV Total: ${f.ivTotalMin} - ${f.ivTotalMax}</div>
            <input type="range" min="0" max="186" value="${f.ivTotalMin}" oninput="setOMFilter('${context}','ivTotalMin',+this.value)" style="width:100%; accent-color:var(--yellow);">
            <input type="range" min="0" max="186" value="${f.ivTotalMax}" oninput="setOMFilter('${context}','ivTotalMax',+this.value)" style="width:100%; accent-color:var(--yellow); margin-top:4px;">
          </div>
          <div>
            <div style="font-size:9px; color:var(--gray); margin-bottom:5px;">Nivel: ${f.levelMin} - ${f.levelMax}</div>
            <input type="range" min="1" max="100" value="${f.levelMin}" oninput="setOMFilter('${context}','levelMin',+this.value)" style="width:100%; accent-color:var(--purple);">
            <input type="range" min="1" max="100" value="${f.levelMax}" oninput="setOMFilter('${context}','levelMax',+this.value)" style="width:100%; accent-color:var(--purple); margin-top:4px;">
          </div>
        </div>

        <button onclick="setOMFilter('${context}','ivAny31',!${f.ivAny31})" 
          style="width:100%; padding:8px; border-radius:8px; border:1px solid ${f.ivAny31?'var(--yellow)':'rgba(255,255,255,0.1)'}; background:${f.ivAny31?'rgba(255,214,10,0.1)':'transparent'}; color:${f.ivAny31?'var(--yellow)':'var(--gray)'}; font-size:9px; cursor:pointer; font-family:'Press Start 2P';">
          ${f.ivAny31 ? '★ FILTRANDO IV 31' : 'BUSCAR IV 31'}
        </button>

        <button onclick="resetOMFilters('${context}')" style="width:100%; margin-top:10px; padding:6px; border:none; color:var(--gray); background:transparent; font-size:10px; cursor:pointer; text-decoration:underline;">
          Limpiar Filtros
        </button>
      </div>
    </div>
  `;
}

function getTypeEmoji(t) {
  const map = { fire:'🔥', water:'💧', grass:'🌿', electric:'⚡', psychic:'🔮', normal:'⬜', rock:'🪨', ground:'🏜️', poison:'☠️', bug:'🐛', flying:'🪶', ghost:'👻', ice:'❄️', dragon:'🐉', fighting:'🥊', dark:'🌑', steel:'⚙️' };
  return map[t] || '❓';
}

function toggleOMFilters(context) {
  _omFilterExpanded[context] = !_omFilterExpanded[context];
  if (context === 'explore') renderOnlineMarket();
  else renderPublishTab();
}

function setOMFilter(context, key, val) {
  if (context === 'explore') _omFilters[key] = val;
  else _omPubFilters[key] = val;
  if (context === 'explore') renderOnlineMarket();
  else renderPublishTab();
}

function resetOMFilters(context) {
  const res = { tier:'all', type:'all', levelMin:1, levelMax:100, ivTotalMin:0, ivTotalMax:186, ivAny31:false, search:'' };
  if (context === 'explore') _omFilters = res;
  else _omPubFilters = res;
  if (context === 'explore') renderOnlineMarket();
  else renderPublishTab();
}

function applyOMFilters(list, context) {
  const f = context === 'explore' ? _omFilters : _omPubFilters;
  return list.filter(item => {
    // Si es un listing, la data está en item.data. Si es un pokémon directo, es item.
    const p = item.data || item;
    if (!p.id) return true; // Items de la mochila en Vender se saltan estos filtros específicos de Pkmn
    
    // Search
    if (f.search && !p.name.toLowerCase().includes(f.search.toLowerCase())) return false;
    
    // Tier
    if (f.tier !== 'all') {
      const { tier } = typeof getPokemonTier === 'function' ? getPokemonTier(p) : { tier: '?' };
      if (tier !== f.tier) return false;
    }
    
    // Type
    if (f.type !== 'all' && p.type !== f.type) return false;
    
    // Level
    if ((p.level||1) < f.levelMin || (p.level||1) > f.levelMax) return false;
    
    // IVs
    const ivs = p.ivs || {};
    const total = (ivs.hp||0)+(ivs.atk||0)+(ivs.def||0)+(ivs.spa||0)+(ivs.spd||0)+(ivs.spe||0);
    if (total < f.ivTotalMin || total > f.ivTotalMax) return false;
    
    if (f.ivAny31) {
      if (!Object.values(ivs).some(v => v === 31)) return false;
    }
    
    return true;
  });
}

// ── EXPLORAR ─────────────────────────────────────────────────────────────────
async function renderOnlineMarket() {
  const container = document.getElementById('om-explore-grid');
  const filterSlot = document.getElementById('om-explore-filters'); // Necesitaremos este div en index.html
  
  if (filterSlot) filterSlot.innerHTML = getPokemonFilterHTML('explore');
  document.getElementById('online-market-money').textContent = state.money;
  if (!container) return;

  if (!window.currentUser) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);background:rgba(0,0,0,0.2);border-radius:20px;">Inicia sesión modo online para conectar al GTS.</div>';
    return;
  }

  container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--yellow);">Cargando ofertas de la red Kanto... 🛰️</div>';

  try {
    let query = window.sb.from('market_listings').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(60);
    const { data: listings, error } = await query;
    if (error) throw error;

    if (!listings || listings.length === 0) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);background:rgba(0,0,0,0.1);border-radius:20px;">No hay ofertas activas. Sé el primero en vender algo.</div>';
      return;
    }

    // APLICAR FILTROS EN MEMORIA
    const filtered = applyOMFilters(listings, 'explore');

    if (filtered.length === 0) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);">Ninguna oferta coincide con tus filtros.</div>';
      return;
    }

    _omListingsCache = {};
    container.innerHTML = '';

    filtered.forEach(offer => {
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
            <img src="${p.isShiny ? getSpriteUrl(p.id,true) : getSpriteUrl(p.id,false)}" style="width:64px;height:64px;object-fit:contain;image-rendering:pixelated;">
          </div>
          <div style="font-size:12px;font-weight:bold;color:${tierInfo.color};margin-bottom:4px;text-transform:capitalize;text-align:center;">${p.name}${p.isShiny?' ✨':''}</div>
          <div style="display:flex;justify-content:center;gap:10px;font-size:10px;margin-bottom:12px;opacity:0.9;">
            <span style="color:var(--gray);">Nv ${p.level||1}</span>
            <span style="color:${tierInfo.color};">IV ${totalIv}</span>
          </div>`;
      } else {
        const i = offer.data;
        let icon = '🎒';
        if (window.SHOP_ITEMS) {
          const si = window.SHOP_ITEMS.find(x => x.name === i.name);
          if (si?.sprite) icon = `<img src="${si.sprite}" width="40" style="image-rendering:pixelated;">`;
          else if (si?.icon) icon = `<span style="font-size:32px;">${si.icon}</span>`;
        }
        innerContent = `
          <div style="font-size:9px;color:var(--gray);margin-bottom:6px;font-family:'Press Start 2P';opacity:0.8;">👤 ${(offer.seller_name||'Anon').substring(0,10)}</div>
          <div style="text-align:center;height:80px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;background:rgba(255,255,255,0.03);border-radius:12px;">${icon}</div>
          <div style="font-size:13px;font-weight:bold;color:#fff;margin-bottom:4px;text-align:center;">${i.name}</div>
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
            style="flex:1;height:38px;padding:0 8px;font-size:9px;border-radius:10px;border:none;cursor:${canBuy?'pointer':'not-allowed'};background:${canBuy?'linear-gradient(135deg,var(--blue),#0056b3)':'rgba(255,255,255,0.05)'};color:${canBuy?'#fff':'var(--gray)'};font-family:'Press Start 2P',monospace;">
            ₽${offer.price}
          </button>
        </div>`;
      container.appendChild(card);
    });

  } catch(e) {
    console.error(e);
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--red);">Error conectando al servidor GTS.</div>';
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
      <div style="text-align:center;margin-bottom:20px;">
        <div style="background:rgba(255,255,255,0.03);padding:15px;border-radius:20px;display:inline-block;">
          <img src="${p.isShiny?getSpriteUrl(p.id,true):getSpriteUrl(p.id,false)}" style="width:100px;height:100px;image-rendering:pixelated;">
        </div>
        <div style="font-family:'Press Start 2P',monospace;font-size:12px;color:${tierInfo.color};margin-top:12px;text-transform:capitalize;">${p.name}${p.isShiny?' ✨':''}</div>
        <div style="font-size:11px;color:var(--gray);margin-top:6px;">Nv.${p.level||1} · ${p.type||'?'}</div>
        <span style="display:inline-block;background:${tierInfo.bg};color:${tierInfo.color};font-family:'Press Start 2P';font-size:7px;padding:4px 10px;border-radius:8px;margin-top:10px;">${tierInfo.tier}</span>
      </div>
      <div style="background:rgba(0,0,0,0.3);border-radius:16px;padding:16px;margin-bottom:16px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple-light);margin-bottom:10px;text-align:center;">POTENCIAL (IVs)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;">
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray);">HP</span><span style="${iv31(ivs.hp)}">${ivs.hp||0}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray);">ATK</span><span style="${iv31(ivs.atk)}">${ivs.atk||0}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray);">DEF</span><span style="${iv31(ivs.def)}">${ivs.def||0}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray);">SpA</span><span style="${iv31(ivs.spa)}">${ivs.spa||0}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray);">SpD</span><span style="${iv31(ivs.spd)}">${ivs.spd||0}</span></div>
          <div style="display:flex;justify-content:space-between;"><span style="color:var(--gray);">SPE</span><span style="${iv31(ivs.spe)}">${ivs.spe||0}</span></div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--gray);text-align:center;">Vendedor: <span style="color:#fff;">${offer.seller_name||'Anon'}</span></div>`;
  } else {
    // ... item detail logic ...
    const i = offer.data;
    content = `<div style="text-align:center;padding:20px;">${i.name} x${i.qty}</div>`;
  }

  const canBuy = state.money >= offer.price;
  const ov = document.createElement('div');
  ov.id = 'om-detail-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:2100;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = `
    <div style="background:var(--card);border-radius:24px;padding:30px;width:100%;max-width:380px;border:1px solid rgba(255,255,255,0.12);">
      <button onclick="document.getElementById('om-detail-overlay').remove()" style="float:right;background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;">✕</button>
      ${content}
      <div style="margin-top:20px;text-align:center;">
        <div style="font-size:18px;font-weight:bold;color:var(--yellow);margin-bottom:15px;">₽${offer.price.toLocaleString()}</div>
        <button onclick="document.getElementById('om-detail-overlay').remove();buyFromMarket('${offer.id}',${offer.price},'${offer.listing_type}')"
          style="width:100%;padding:14px;border-radius:12px;border:none;cursor:${canBuy?'pointer':'not-allowed'};background:${canBuy?'var(--blue)':'rgba(255,255,255,0.05)'};color:#fff;font-family:'Press Start 2P';font-size:9px;">
          ${canBuy?'COMPRAR':'SALDO INSUFICIENTE'}
        </button>
      </div>
    </div>`;
  document.body.appendChild(ov);
}

// ── COMPRAR ───────────────────────────────────────────────────────────────────
async function buyFromMarket(offerId, price, type) {
  if (!window.currentUser) return;
  if (state.money < price) return;
  if (!confirm(`¿Confirmas la compra por ₽${price}?`)) return;

  try {
    const { data, error } = await window.sb
      .from('market_listings')
      .update({ status: 'sold', buyer_id: window.currentUser.id })
      .eq('id', offerId).eq('status', 'active').select();
    if (error) throw error;
    if (!data?.length) { notify('Oferta no disponible.', '⚠️'); renderOnlineMarket(); return; }
    
    state.money -= price;
    if (type === 'pokemon') state.box.push(data[0].data);
    else {
      const i = data[0].data;
      state.inventory[i.name] = (state.inventory[i.name] || 0) + i.qty;
    }
    saveGame(false);
    updateHud();
    renderOnlineMarket();
    notify('Compra realizada.', '✅');
  } catch(e) { console.error(e); }
}

// ── MIS PUBLICACIONES ─────────────────────────────────────────────────────────
async function renderMyPublications() {
  const container = document.getElementById('om-mine-grid');
  if (!container || !window.currentUser) return;
  container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--yellow);">Consultando red Kanto... 🛰️</div>';

  try {
    const { data: myData, error } = await window.sb
      .from('market_listings').select('*')
      .eq('seller_id', window.currentUser.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!myData || myData.length === 0) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);">No tienes publicaciones.</div>';
      return;
    }
    container.innerHTML = '';
    myData.forEach(offer => {
      if (offer.status === 'cancelled') return;
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.style.cssText = 'background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.05);padding:15px;border-radius:18px;';
      const title = offer.listing_type === 'pokemon' ? offer.data.name : `x${offer.data.qty} ${offer.data.name}`;
      card.innerHTML = `<div style="text-align:center;margin-bottom:10px;">${title}</div><button onclick="cancelMarketActive('${offer.id}')" style="width:100%;padding:8px;border-radius:8px;border:none;background:rgba(255,0,0,0.2);color:#ff6b6b;cursor:pointer;">RETIRAR</button>`;
      container.appendChild(card);
    });
  } catch(e) { console.error(e); }
}

async function cancelMarketActive(offerId) {
  if (!confirm('¿Retirar oferta?')) return;
  try {
    const { data, error } = await window.sb.from('market_listings').update({ status: 'cancelled' }).eq('id', offerId).eq('status', 'active').select();
    if (error) throw error;
    const offer = data[0];
    if (offer.listing_type === 'pokemon') state.box.push(offer.data);
    else state.inventory[offer.data.name] += offer.data.qty;
    saveGame(false);
    renderMyPublications();
  } catch(e) { console.error(e); }
}

// ── PUBLICAR ──────────────────────────────────────────────────────────────────
function renderPublishTab() {
  const container = document.getElementById('om-publish-selectors');
  const filterSlot = document.getElementById('om-publish-filters');
  if (!container) return;
  
  if (_omPublishType === 'pokemon') {
    if (filterSlot) filterSlot.innerHTML = getPokemonFilterHTML('publish');
  } else {
    if (filterSlot) filterSlot.innerHTML = '';
  }
  
  container.innerHTML = '';

  if (_omPublishType === 'pokemon') {
    if (!state.box?.length) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray);">PC vacía.</div>';
      return;
    }

    // APLICAR FILTROS
    const filteredBox = applyOMFilters(state.box, 'publish');

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(50px,1fr));gap:10px;max-height:250px;overflow-y:auto;padding:5px;';

    filteredBox.forEach(p => {
      const isSelected = _omSelectedData?.uid === p.uid;
      const btn = document.createElement('button');
      btn.style.cssText = `width:100%;height:50px;background:${isSelected?'rgba(191,90,242,0.25)':'rgba(255,255,255,0.06)'};border:${isSelected?'2px solid var(--purple)':'1px solid rgba(255,255,255,0.1)'};border-radius:10px;cursor:pointer;`;
      btn.innerHTML = `<img src="${getSpriteUrl(p.id, p.isShiny)}" style="width:38px;height:38px;image-rendering:pixelated;">`;
      btn.onclick = () => { _omSelectedData = isSelected ? null : p; renderPublishTab(); };
      grid.appendChild(btn);
    });
    container.appendChild(grid);

    if (_omSelectedData) {
      const selBox = document.createElement('div');
      selBox.style.cssText = 'margin-top:15px;padding:15px;background:rgba(191,90,242,0.08);border:1px solid rgba(191,90,242,0.2);border-radius:14px;';
      selBox.innerHTML = `<div style="display:flex;align-items:center;gap:12px;"><div style="flex:1;"><div style="font-size:10px;color:var(--yellow);">✔ ${_omSelectedData.name}</div></div><button onclick="previewPokemonInPublish()" style="padding:6px 12px;font-size:10px;border-radius:8px;border:none;background:rgba(199,125,255,0.2);color:#fff;cursor:pointer;">👁️ DETALLES</button></div>`;
      container.appendChild(selBox);
    }

  } else {
    // ... item grid ...
    container.innerHTML = '<div style="padding:20px;color:var(--gray);">Selecciona un ítem de tu mochila para vender.</div>';
  }
}

function previewPokemonInPublish() {
  if (!_omSelectedData) return;
  showPokemonDetails(_omSelectedData, -1, 'box');
  const ov = document.getElementById('pokemon-detail-overlay');
  if (ov) ov.style.zIndex = '2150';
}

async function publishToMarket() {
  if (!_omSelectedData) return;
  const pInput = document.getElementById('om-publish-price');
  const price = parseInt(pInput.value);
  if (!price || price < 1) return;

  const { error } = await window.sb.from('market_listings').insert([{
    seller_id: window.currentUser.id,
    seller_name: state.trainer,
    listing_type: _omPublishType,
    data: _omSelectedData,
    price: price,
    status: 'active'
  }]);
  
  if (!error) {
    if (_omPublishType === 'pokemon') {
      const idx = state.box.findIndex(x => x.uid === _omSelectedData.uid);
      state.box.splice(idx, 1);
    } else {
      state.inventory[_omSelectedData.name] -= _omSelectedData.qty;
    }
    saveGame(false);
    _omSelectedData = null;
    pInput.value = '';
    switchOnlineMarketTab('mine');
    notify('Publicado.', '✅');
  }
}
