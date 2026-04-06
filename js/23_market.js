// ====== MERCADO ONLINE (GTS) ======
let _omTab = 'explore';
let _omPublishType = 'pokemon';
let _omSelectedData = null;
let _omMaxListings = 10;
let _omFeePercent = 0.05;
let _omListingsCache = {};

// FILTERS STATE
let _omFilters = { mode:'pokemon', tier:'all', type:'all', itemCat:'all', levelMin:1, levelMax:100, ivTotalMin:0, ivTotalMax:186, ivAny31:false, priceMin:0, priceMax:1000000, search:'' };
let _omPubFilters = { mode:'pokemon', tier:'all', type:'all', itemCat:'all', levelMin:1, levelMax:100, ivTotalMin:0, ivTotalMax:186, ivAny31:false, priceMin:0, priceMax:1000000, search:'' };
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
  
  // Sincronizar el modo de filtro con el tipo de publicación
  _omPubFilters.mode = type === 'pokemon' ? 'pokemon' : 'item';
  
  const btnPk = document.getElementById('om-pub-sw-pokemon');
  const btnIt = document.getElementById('om-pub-sw-item');
  if (btnPk) btnPk.classList.toggle('active', type === 'pokemon');
  if (btnIt) btnIt.classList.toggle('active', type === 'item');
  
  renderPublishTab();
}

// ── FILTROS UI ───────────────────────────────────────────────────────────────
function getOMFilterHTML(context) {
  const f = context === 'explore' ? _omFilters : _omPubFilters;
  const isExp = _omFilterExpanded[context];
  const isPk = f.mode === 'pokemon';
  
  return `
    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:14px; margin-bottom:16px;">
      
      <!-- Toggle Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div onclick="toggleOMFilters('${context}')" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <span style="font-family:'Press Start 2P',monospace; font-size:8px; color:var(--purple-light);">🔍 FILTROS GTS</span>
          <span style="color:var(--gray); font-size:12px;">${isExp ? '▲' : '▼'}</span>
        </div>
        ${context === 'explore' ? `
          <div style="display:flex; background:rgba(0,0,0,0.3); border-radius:10px; padding:3px; gap:4px;">
            <button onclick="setOMFilter('explore','mode','pokemon')" style="padding:4px 10px; font-size:9px; border-radius:7px; border:none; cursor:pointer; background:${isPk?'var(--purple)':'transparent'}; color:${isPk?'#fff':'var(--gray)'};">🐾 Pokes</button>
            <button onclick="setOMFilter('explore','mode','item')" style="padding:4px 10px; font-size:9px; border-radius:7px; border:none; cursor:pointer; background:${!isPk?'var(--purple)':'transparent'}; color:${!isPk?'#fff':'var(--gray)'};">🎒 Objetos</button>
          </div>
        ` : `<span style="font-size:9px; color:var(--gray); opacity:0.6;">Filtrando tu inventario</span>`}
      </div>
      
      <!-- Search -->
      <div style="margin-bottom:12px;">
        <input type="text" placeholder="Buscar ${isPk?'Pokémon por nombre...':'objetos por nombre...'}" value="${f.search}" 
          oninput="setOMFilter('${context}', 'search', this.value)"
          style="width:100%; padding:10px 14px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:12px; color:#fff; font-size:13px; outline:none;">
      </div>

      <!-- Collapsible Body -->
      <div id="om-filter-body-${context}" style="display:${isExp ? 'block' : 'none'}; border-top:1px solid rgba(255,255,255,0.06); padding-top:14px; animation: fadeIn 0.2s ease;">
        
        <!-- Fila Precio -->
        <div style="margin-bottom:15px;">
           <div style="font-size:10px; color:var(--yellow); margin-bottom:8px; display:flex; justify-content:space-between;">
             <span>Rango de Precio 💰</span>
             <span style="font-weight:bold;">₽${f.priceMin.toLocaleString()} - ₽${f.priceMax === 1000000 ? 'Máx' : f.priceMax.toLocaleString()}</span>
           </div>
           <input type="range" min="0" max="50000" step="500" value="${f.priceMin}" oninput="setOMFilter('${context}','priceMin',+this.value)" style="width:100%; accent-color:var(--yellow); margin-bottom:6px;">
           <input type="range" min="0" max="1000000" step="1000" value="${f.priceMax}" oninput="setOMFilter('${context}','priceMax',+this.value)" style="width:100%; accent-color:var(--yellow);">
        </div>

        ${isPk ? `
          <!-- FILTROS POKEMON -->
          <div style="margin-bottom:12px;">
            <div style="font-size:10px; color:var(--gray); margin-bottom:8px;">Filtrar por Tier</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${['all','S+','S','A','B','C','D','F'].map(t => `<button onclick="setOMFilter('${context}','tier','${t}')" class="box-filter-btn" style="padding:6px 10px; border-radius:12px; border:1px solid ${f.tier===t?'var(--purple)':'rgba(255,255,255,0.1)'}; background:${f.tier===t?'rgba(191,90,242,0.2)':'rgba(255,255,255,0.04)'}; color:${f.tier===t?'#fff':'var(--gray)'}; font-size:8px; cursor:pointer;">${t==='all'?'Limpiar':t}</button>`).join('')}
            </div>
          </div>
          <div style="margin-bottom:12px;">
            <div style="font-size:10px; color:var(--gray); margin-bottom:8px;">Filtrar por Tipo</div>
            <div style="display:flex; flex-wrap:wrap; gap:5px;">
              ${['all','fire','water','grass','electric','psychic','normal','rock','ground','poison','bug','flying','ghost','ice','dragon','fighting','dark','steel'].map(t => `<button onclick="setOMFilter('${context}','type','${t}')" style="width:32px; height:32px; border-radius:10px; border:1px solid ${f.type===t?'var(--blue)':'rgba(255,255,255,0.06)'}; background:${f.type===t?'rgba(0,122,255,0.2)':'rgba(0,0,0,0.2)'}; cursor:pointer;" title="${t}">${t==='all'?'📂':getTypeEmoji(t)}</button>`).join('')}
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:15px;">
            <div>
              <div style="font-size:9px; color:var(--gray); margin-bottom:6px;">IV Total: ${f.ivTotalMin}-${f.ivTotalMax}</div>
              <input type="range" min="0" max="186" value="${f.ivTotalMin}" oninput="setOMFilter('${context}','ivTotalMin',+this.value)" style="width:100%; accent-color:var(--purple-light);">
              <input type="range" min="0" max="186" value="${f.ivTotalMax}" oninput="setOMFilter('${context}','ivTotalMax',+this.value)" style="width:100%; accent-color:var(--purple-light); margin-top:6px;">
            </div>
            <div>
              <div style="font-size:9px; color:var(--gray); margin-bottom:6px;">Nivel: ${f.levelMin}-${f.levelMax}</div>
              <input type="range" min="1" max="100" value="${f.levelMin}" oninput="setOMFilter('${context}','levelMin',+this.value)" style="width:100%; accent-color:var(--blue);">
              <input type="range" min="1" max="100" value="${f.levelMax}" oninput="setOMFilter('${context}','levelMax',+this.value)" style="width:100%; accent-color:var(--blue); margin-top:6px;">
            </div>
          </div>
          <button onclick="setOMFilter('${context}','ivAny31',!${f.ivAny31})" style="width:100%; padding:10px; border-radius:12px; border:1px solid ${f.ivAny31?'var(--yellow)':'rgba(255,255,255,0.1)'}; background:${f.ivAny31?'rgba(255,214,10,0.1)':'rgba(255,255,255,0.03)'}; color:${f.ivAny31?'var(--yellow)':'var(--gray)'}; font-size:8px; font-family:'Press Start 2P', monospace; cursor:pointer;">${f.ivAny31?'[★] IV 31 DETECTADO':'BUSCAR IV 31'}</button>
        ` : `
          <!-- FILTROS OBJETOS -->
          <div style="margin-bottom:12px;">
            <div style="font-size:10px; color:var(--gray); margin-bottom:8px;">Categoría</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${['all','pokeballs','pociones','stones','held','booster','especial'].map(c => `<button onclick="setOMFilter('${context}','itemCat','${c}')" style="padding:6px 12px; border-radius:12px; border:1px solid ${f.itemCat===c?'var(--purple)':'rgba(255,255,255,0.1)'}; background:${f.itemCat===c?'rgba(191,90,242,0.2)':'rgba(255,255,255,0.04)'}; color:${f.itemCat===c?'#fff':'var(--gray)'}; font-size:9px; cursor:pointer; text-transform:capitalize;">${c==='all'?'Todo':c}</button>`).join('')}
            </div>
          </div>
        `}

        <button onclick="resetOMFilters('${context}')" style="width:100%; margin-top:15px; padding:10px; border:none; color:var(--gray); background:rgba(255,255,255,0.03); border-radius:12px; font-size:11px; cursor:pointer;">Limpiar todos los filtros</button>
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
  const f = (context === 'explore') ? _omFilters : _omPubFilters;
  f[key] = val;
  if (context === 'explore') renderOnlineMarket();
  else renderPublishTab();
}

function resetOMFilters(context) {
  const res = { mode:'pokemon', tier:'all', type:'all', itemCat:'all', levelMin:1, levelMax:100, ivTotalMin:0, ivTotalMax:186, ivAny31:false, priceMin:0, priceMax:1000000, search:'' };
  if (context === 'explore') _omFilters = res;
  else _omPubFilters = res;
  if (context === 'explore') renderOnlineMarket();
  else renderPublishTab();
}

function applyOMFilters(list, context) {
  const f = context === 'explore' ? _omFilters : _omPubFilters;
  return list.filter(item => {
    const offer = item.data || item;
    const listingType = item.listing_type || (_omPublishType || 'pokemon');
    const price = item.price || 0;

    // Filtro base: Modo (Pokemon vs Objetos) en Explorar
    if (context === 'explore' && listingType !== f.mode) return false;

    // Filtro Precio (Aplica a todo)
    if (context === 'explore') {
      if (price < f.priceMin || price > f.priceMax) return false;
    }

    // Filtro Nombre (Aplica a todo)
    if (f.search && !offer.name.toLowerCase().includes(f.search.toLowerCase())) return false;

    if (listingType === 'pokemon') {
      // Tier
      if (f.tier !== 'all') {
        const { tier } = typeof getPokemonTier === 'function' ? getPokemonTier(offer) : { tier: '?' };
        if (tier !== f.tier) return false;
      }
      // Tipo
      if (f.type !== 'all' && offer.type !== f.type) return false;
      // Level
      if ((offer.level||1) < f.levelMin || (offer.level||1) > f.levelMax) return false;
      // IVs
      const ivs = offer.ivs || {};
      const total = (ivs.hp||0)+(ivs.atk||0)+(ivs.def||0)+(ivs.spa||0)+(ivs.spd||0)+(ivs.spe||0);
      if (total < f.ivTotalMin || total > f.ivTotalMax) return false;
      if (f.ivAny31 && !Object.values(ivs).some(v => v === 31)) return false;
    } else {
      // Filtrar Categoría de Item
      if (f.itemCat !== 'all') {
        const shopItem = window.SHOP_ITEMS?.find(x => x.name === offer.name);
        if (shopItem?.cat !== f.itemCat) return false;
      }
    }

    return true;
  });
}

// ── EXPLORAR ─────────────────────────────────────────────────────────────────
async function renderOnlineMarket() {
  const container = document.getElementById('om-explore-grid');
  const filterSlot = document.getElementById('om-explore-filters');
  
  if (filterSlot) filterSlot.innerHTML = getOMFilterHTML('explore');
  document.getElementById('online-market-money').textContent = state.money;
  if (!container) return;

  if (!window.currentUser) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);background:rgba(0,0,0,0.2);border-radius:20px;">Inicia sesión modo online para conectar al GTS.</div>';
    return;
  }

  container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--yellow);">Cargando red Kanto... 🛰️</div>';

  try {
    // Aumentamos limit a 100 para tener más margen de filtrado en memoria
    let query = window.sb.from('market_listings').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(100);
    const { data: listings, error } = await query;
    if (error) throw error;

    if (!listings || listings.length === 0) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);">No hay ofertas activas.</div>';
      return;
    }

    const filtered = applyOMFilters(listings, 'explore');

    if (filtered.length === 0) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);">Ninguna oferta coincide con los filtros.</div>';
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
        innerContent = `
          <div style="font-size:9px;color:var(--gray);margin-bottom:6px;font-family:'Press Start 2P';opacity:0.8;">👤 ${(offer.seller_name||'Anon').substring(0,10)}</div>
          <div style="text-align:center;margin-bottom:8px;position:relative;background:rgba(255,255,255,0.03);border-radius:12px;padding:8px;">
            <div style="position:absolute;top:4px;right:4px;background:${tierInfo.bg};color:${tierInfo.color};font-family:'Press Start 2P',monospace;font-size:6px;padding:2px 5px;border-radius:6px;border:1px solid ${tierInfo.color}44;">${tierInfo.tier}</div>
            <img src="${getSpriteUrl(p.id, p.isShiny)}" style="width:64px;height:64px;object-fit:contain;image-rendering:pixelated;">
          </div>
          <div style="font-size:12px;font-weight:bold;color:${tierInfo.color};margin-bottom:4px;text-transform:capitalize;text-align:center;">${p.name}</div>
          <div style="font-size:10px;color:var(--gray);text-align:center;margin-bottom:12px;">Nv ${p.level||1}</div>`;
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
          <button onclick="openMarketListingDetail('${offer.id}')" title="Ver" class="action-btn"
            style="flex:0 0 auto;width:38px;height:38px;padding:0;font-size:16px;border-radius:10px;background:rgba(199,125,255,0.12);color:#fff;">
            👁️
          </button>
          <button onclick="buyFromMarket('${offer.id}',${offer.price},'${offer.listing_type}')"
            style="flex:1;height:38px;padding:0;font-size:9px;border-radius:10px;border:none;cursor:${canBuy?'pointer':'not-allowed'};background:${canBuy?'linear-gradient(135deg,var(--blue),#0056b3)':'rgba(255,255,255,0.05)'};color:${canBuy?'#fff':'var(--gray)'};font-family:'Press Start 2P',monospace;">
            ₽${offer.price}
          </button>
        </div>`;
      container.appendChild(card);
    });
  } catch(e) { console.error(e); }
}

// ── MODAL DE DETALLE ──────────────────────────────────────────────────────────
function openMarketListingDetail(offerId) {
  const offer = _omListingsCache[offerId];
  if (!offer) return;
  
  if (offer.listing_type === 'pokemon') {
    if (typeof showPokemonDetails === 'function') {
      showPokemonDetails(offer.data, -1, 'market', { offerId: offer.id, price: offer.price, type: offer.listing_type });
      const ov = document.getElementById('pokemon-detail-overlay');
      if (ov) ov.style.zIndex = '2150';
    }
    return;
  }

  let content = '';
  const i = offer.data;
  content = `<div style="text-align:center;padding:20px;font-size:16px;">${i.name} (x${i.qty})</div>`;
  const canBuy = state.money >= offer.price;
  const ov = document.createElement('div');
  ov.id = 'om-detail-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:2100;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = `
    <div style="background:var(--card);border-radius:24px;padding:30px;width:100%;max-width:380px;border:1px solid rgba(255,255,255,0.15);">
      <button onclick="this.parentElement.parentElement.remove()" style="float:right;background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;">✕</button>
      ${content}
      <div style="text-align:center;margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);">
        <div style="font-size:20px;font-weight:bold;color:var(--yellow);margin-bottom:15px;">₽${offer.price}</div>
        <button onclick="document.getElementById('om-detail-overlay').remove();buyFromMarket('${offer.id}',${offer.price},'${offer.listing_type}')"
          style="width:100%;padding:14px;border-radius:12px;border:none;background:${canBuy?'var(--blue)':'rgba(255,255,255,0.05)'};color:#fff;font-family:'Press Start 2P';font-size:9px;">
          ${canBuy?'COMPRAR':'SALDO INSUFICIENTE'}
        </button>
      </div>
    </div>`;
  document.body.appendChild(ov);
}

// ── COMPRAR ───────────────────────────────────────────────────────────────────
async function buyFromMarket(offerId, price, type) {
  if (!window.currentUser || state.money < price) return;
  if (!confirm(`¿Confirmas la compra por ₽${price}?`)) return;
  try {
    const { data, error } = await window.sb.from('market_listings').update({ status: 'sold', buyer_id: window.currentUser.id }).eq('id', offerId).eq('status', 'active').select();
    if (error || !data?.length) { notify('No disponible.', '⚠️'); renderOnlineMarket(); return; }
    state.money -= price;
    if (type === 'pokemon') state.box.push(data[0].data);
    else { const i=data[0].data; state.inventory[i.name]=(state.inventory[i.name]||0)+i.qty; }
    saveGame(false); updateHud(); renderOnlineMarket(); notify('Compra realizada.', '✅');
  } catch(e) { console.error(e); }
}

// ── MIS PUBLICACIONES ─────────────────────────────────────────────────────────
async function renderMyPublications() {
  const container = document.getElementById('om-mine-grid');
  if (!container || !window.currentUser) return;
  container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--yellow);">Consultando red Satelital... 🛰️</div>';
  try {
    const { data: myData, error } = await window.sb.from('market_listings').select('*').eq('seller_id', window.currentUser.id).order('created_at', { ascending: false });
    if (error || !myData?.length) { container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);">Sin publicaciones activas.</div>'; return; }
    container.innerHTML = '';
    myData.forEach(offer => {
      if (offer.status === 'cancelled') return;
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.style.cssText = 'background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.05);padding:15px;border-radius:18px;';
      const title = offer.listing_type === 'pokemon' ? offer.data.name : `x${offer.data.qty} ${offer.data.name}`;
      card.innerHTML = `<div style="text-align:center;margin-bottom:12px;">${title}</div><span style="display:block;text-align:center;font-size:10px;color:var(--yellow);margin-bottom:8px;">₽${offer.price}</span>`;
      if (offer.status === 'active') card.innerHTML += `<button onclick="cancelMarketActive('${offer.id}')" style="width:100%;padding:8px;border-radius:8px;border:none;background:rgba(255,0,0,0.2);color:#ff6b6b;cursor:pointer;">RETIRAR</button>`;
      else if (offer.status === 'sold') card.innerHTML += `<div style="color:var(--green);font-size:11px;text-align:center;">Vendido</div>`;
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
    saveGame(false); renderMyPublications();
  } catch(e) { console.error(e); }
}

// ── PUBLICAR ──────────────────────────────────────────────────────────────────
function renderPublishTab() {
  const container = document.getElementById('om-publish-selectors');
  const filterSlot = document.getElementById('om-publish-filters');
  if (!container) return;
  
  if (filterSlot) filterSlot.innerHTML = getOMFilterHTML('publish');
  container.innerHTML = '';

  if (_omPublishType === 'pokemon') {
    const filteredBox = applyOMFilters(state.box || [], 'publish');
    if (!filteredBox.length) { container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray);">PC vacía o filtros sin coincidencias.</div>'; return; }
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
      const s = document.createElement('div');
      s.style.cssText = 'margin-top:15px;padding:15px;background:rgba(191,90,242,0.08);border-radius:14px;display:flex;align-items:center;gap:12px;';
      s.innerHTML = `<div style="flex:1;"><div style="font-size:10px;color:var(--yellow);">${_omSelectedData.name}</div></div><button onclick="previewPokemonInPublish()" style="padding:6px 12px;font-size:10px;border-radius:8px;border:none;background:rgba(199,125,255,0.3);color:#fff;cursor:pointer;">👁 DETALLES</button>`;
      container.appendChild(s);
    }
  } else {
    // Inventory view
    const inv = Object.keys(state.inventory || {}).filter(k => state.inventory[k] > 0);
    const filteredInv = applyOMFilters(inv.map(k => ({ name: k })), 'publish');
    if (!filteredInv.length) { container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray);">Mochila vacía o sin coincidencias.</div>'; return; }
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(50px,1fr));gap:10px;max-height:250px;overflow-y:auto;padding:5px;';
    filteredInv.forEach(item => {
      const isSelected = _omSelectedData?.name === item.name;
      const si = window.SHOP_ITEMS?.find(x => x.name === item.name);
      const icon = si?.sprite ? `<img src="${si.sprite}" style="width:32px;height:32px;">` : `<span style="font-size:24px;">🎒</span>`;
      const btn = document.createElement('button');
      btn.style.cssText = `width:100%;height:50px;background:${isSelected?'rgba(59,139,255,0.25)':'rgba(255,255,255,0.06)'};border:${isSelected?'2px solid var(--blue)':'1px solid rgba(255,255,255,0.1)'};border-radius:10px;cursor:pointer;`;
      btn.innerHTML = icon;
      btn.onclick = () => { _omSelectedData = isSelected ? null : { name: item.name, max: state.inventory[item.name], qty: 1 }; renderPublishTab(); };
      grid.appendChild(btn);
    });
    container.appendChild(grid);
    if (_omSelectedData) {
      const s = document.createElement('div');
      s.style.cssText = 'margin-top:15px;padding:15px;background:rgba(59,139,255,0.08);border-radius:14px;';
      s.innerHTML = `<div style="font-size:12px;color:var(--blue);">${_omSelectedData.name} x${_omSelectedData.max}</div>`;
      container.appendChild(s);
    }
  }
}

function previewPokemonInPublish() {
  if (!_omSelectedData) return;
  showPokemonDetails(_omSelectedData, -1, 'box');
  const ov = document.getElementById('pokemon-detail-overlay');
  if (ov) ov.style.zIndex = '2150';
}

async function publishToMarket() {
  const price = parseInt(document.getElementById('om-publish-price').value);
  if (!_omSelectedData || isNaN(price) || price < 1) { notify('Faltan datos.', '⚠️'); return; }
  const { error } = await window.sb.from('market_listings').insert([{ seller_id: window.currentUser.id, seller_name: state.trainer, listing_type: _omPublishType, data: _omSelectedData, price: price, status: 'active' }]);
  if (!error) {
    if (_omPublishType === 'pokemon') { const idx = state.box.findIndex(x => x.uid === _omSelectedData.uid); state.box.splice(idx,1); }
    else state.inventory[_omSelectedData.name] -= _omSelectedData.qty;
    saveGame(false); _omSelectedData = null; switchOnlineMarketTab('mine'); notify('Publicado.', '✅');
  }
}
