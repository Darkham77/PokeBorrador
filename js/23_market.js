// ====== MERCADO ONLINE (GTS) ======
// Permite a los jugadores comprar y vender Pokémon e Ítems usando Pokéyenes a través de una base de datos unificada en Supabase.

let _omTab = 'explore'; 
let _omPublishType = 'pokemon';
let _omSelectedData = null; // Guardará el objeto de Pokémon o el nombre del ítem seleccionado
let _omMaxListings = 10;
let _omFeePercent = 0.05; // 5%

// ── NAVEGACIÓN Y TABS ─────────────────────────────────────────────────────────

function switchOnlineMarketTab(tab) {
  _omTab = tab;
  
  // Actualizar botones de pestaña
  document.getElementById('om-btn-explore').classList.toggle('active', tab === 'explore');
  document.getElementById('om-btn-mine').classList.toggle('active', tab === 'mine');
  document.getElementById('om-btn-publish').classList.toggle('active', tab === 'publish');

  // Mostrar vistas correspondientes
  document.getElementById('om-view-explore').style.display = tab === 'explore' ? 'block' : 'none';
  document.getElementById('om-view-mine').style.display = tab === 'mine' ? 'block' : 'none';
  document.getElementById('om-view-publish').style.display = tab === 'publish' ? 'block' : 'none';

  if (tab === 'explore') renderOnlineMarket();
  if (tab === 'mine') renderMyPublications();
  if (tab === 'publish') renderPublishTab();
}

function switchPublishType(type) {
  _omPublishType = type;
  _omSelectedData = null; // reset
  
  document.getElementById('om-pub-sw-pokemon').classList.toggle('active', type === 'pokemon');
  document.getElementById('om-pub-sw-item').classList.toggle('active', type === 'item');
  
  renderPublishTab();
}

// ── EXPLORAR (COMPRAR) ────────────────────────────────────────────────────────

async function renderOnlineMarket() {
  const container = document.getElementById('om-explore-grid');
  document.getElementById('online-market-money').textContent = state.money;
  
  if (!container) return;
  
  if (!window.currentUser) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--gray);">Inicia sesión modo online para conectar al GTS.</div>';
    return;
  }

  container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--yellow);">Cargando ofertas de la red Kanto... 🛰️</div>';

  const filterType = document.getElementById('om-filter-type') ? document.getElementById('om-filter-type').value : 'all';
  const searchText = document.getElementById('om-search-input') ? document.getElementById('om-search-input').value.toLowerCase().trim() : '';

  try {
    let query = window.sb.from('market_listings').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(50);
    
    if (filterType !== 'all') {
      query = query.eq('listing_type', filterType);
    }
    
    const { data: listings, error } = await query;
    if (error) throw error;

    if (!listings || listings.length === 0) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--gray);">No hay ofertas activas en el mercado. Sé el primero en vender algo.</div>';
      return;
    }

    container.innerHTML = '';
    
    listings.forEach(offer => {
      // Filtrar por texto
      if (searchText) {
        if (offer.listing_type === 'pokemon') {
          if (!offer.data.name.toLowerCase().includes(searchText) && !offer.seller_name.toLowerCase().includes(searchText)) return;
        } else {
          if (!offer.data.name.toLowerCase().includes(searchText) && !offer.seller_name.toLowerCase().includes(searchText)) return;
        }
      }

      // No mostrar tus propias publicaciones en el explorador
      if (offer.seller_id === window.currentUser.id) return;

      const card = document.createElement('div');
      card.className = 'shop-card';
      card.style.background = 'rgba(0,0,0,0.4)';
      card.style.border = '1px solid rgba(255,255,255,0.05)';
      card.style.position = 'relative';

      let innerContent = '';
      if (offer.listing_type === 'pokemon') {
        const p = offer.data;
        const tierInfo = typeof getPokemonTier === 'function' ? getPokemonTier(p) : { color: '#fff', bg: '#000', tier: '?' };
        const color = tierInfo.color;
        const ivs = p.ivs || {};
        const totalIv = (ivs.hp||0) + (ivs.atk||0) + (ivs.def||0) + (ivs.spa||0) + (p.ivs?.spd||0) + (p.ivs?.spe||0);
        const level = p.level || 1;
        
        innerContent = `
          <div style="font-size:10px; color:var(--gray); margin-bottom:4px; font-family:'Press Start 2P';">Vende: ${offer.seller_name ? offer.seller_name.substring(0, 10) : 'Anon'}</div>
          <div style="text-align:center; margin-bottom:8px; position: relative;">
            <div style="position:absolute;top:-5px;right:0px;background:${tierInfo.bg};color:${tierInfo.color};
              font-family:'Press Start 2P',monospace;font-size:6px;padding:2px 5px;border-radius:6px;
              border:1px solid ${tierInfo.color}44;">${tierInfo.tier}</div>
            <img src="${p.isShiny ? getSpriteUrl(p.id, true) : getSpriteUrl(p.id, false)}" style="width:60px; height:60px; object-fit:contain;">
          </div>
          <div style="font-size:13px; font-weight:bold; color:${color}; margin-bottom:4px; text-transform:capitalize;">${p.name} ${p.isShiny ? '✨' : ''}</div>
          <div style="display:flex; justify-content:center; gap:10px; font-size:11px; margin-bottom:10px;">
             <span style="color:var(--gray);">Nv ${level}</span>
             <span style="color:${color};">IV ${totalIv}</span>
          </div>
        `;
      } else {
         const i = offer.data;
         // Buscar info del ítem en la tienda (o Pokedex) para el icono
         let icon = '🎒';
         if (window.SHOP_ITEMS) {
            const si = window.SHOP_ITEMS.find(x => x.name === i.name);
            if (si && si.sprite) icon = `<img src="${si.sprite}" width="30">`;
            else if (si && si.icon) icon = `<span style="font-size:24px;">${si.icon}</span>`;
         }
         
         innerContent = `
          <div style="font-size:10px; color:var(--gray); margin-bottom:4px; font-family:'Press Start 2P';">Vende: ${offer.seller_name.substring(0, 10)}</div>
          <div style="text-align:center; height:60px; display:flex; align-items:center; justify-content:center; margin-bottom:8px;">
            ${icon}
          </div>
          <div style="font-size:14px; font-weight:bold; color:#fff; margin-bottom:4px;">${i.name}</div>
          <div style="font-size:11px; color:var(--yellow); margin-bottom:10px;">Cantidad: x${i.qty}</div>
         `;
      }

      const canBuy = state.money >= offer.price;
      card.innerHTML = `
        ${innerContent}
        <button onclick="buyFromMarket('${offer.id}', ${offer.price}, '${offer.listing_type}')" style="width:100%; padding:10px; font-size:10px; border-radius:8px; border:none; cursor:${canBuy ? 'pointer' : 'not-allowed'}; background:${canBuy ? 'var(--blue)' : 'rgba(255,255,255,0.05)'}; color:${canBuy ? '#fff' : 'var(--gray)'}; font-family:'Press Start 2P', monospace;">
          COMPRAR ₽${offer.price}
        </button>
      `;

      container.appendChild(card);
    });

  } catch (e) {
    console.error(e);
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:red;">Error conectando al servidor GTS.</div>`;
  }
}

async function buyFromMarket(offerId, price, type) {
  if (!window.currentUser) return;
  if (state.money < price) {
    notify('No tienes suficientes Pokéyenes.', '⚠️');
    return;
  }
  if (!confirm(`¿Confirmas la compra por ₽${price}?`)) return;

  try {
    notify('Procesando transacción atómica...', '⏳');
    
    // El "UPDATE... eq('status', 'active')" previene que alguien más lo compre un milisegundo antes
    const { data, error } = await window.sb
      .from('market_listings')
      .update({ status: 'sold', buyer_id: window.currentUser.id })
      .eq('id', offerId)
      .eq('status', 'active')
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      notify('Esta oferta ya fue comprada por alguien más o ha sido retirada.', '⚠️');
      renderOnlineMarket();
      return;
    }

    const offer = data[0];
    
    // Transacción exitosa, actualizar estado local
    state.money -= price;

    if (offer.listing_type === 'pokemon') {
      state.box.push(offer.data);
      notify(`Has comprado a ${offer.data.name}. Fue enviado a tu PC.`, '🎉');
    } else {
       const itemName = offer.data.name;
       const qty = Math.max(1, parseInt(offer.data.qty) || 1);
       if (!state.inventory) state.inventory = {};
       state.inventory[itemName] = (state.inventory[itemName] || 0) + qty;
       notify(`Has comprado x${qty} ${itemName}. Enviado a la mochila.`, '🎉');
    }

    saveGame(false);
    document.getElementById('online-market-money').textContent = state.money;
    document.getElementById('hud-money').textContent = state.money;
    
    // Animación y refresco
    renderOnlineMarket();

  } catch(e) {
    console.error(e);
    notify('Error de red al intentar comprar.', '❌');
  }
}

// ── MIS PUBLICACIONES ────────────────────────────────────────────────────────

async function renderMyPublications() {
  const container = document.getElementById('om-mine-grid');
  if (!container || !window.currentUser) return;
  
  container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--yellow);">Consultando tus registros... 📂</div>';

  try {
    const { data: myData, error } = await window.sb
      .from('market_listings')
      .select('*')
      .eq('seller_id', window.currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!myData || myData.length === 0) {
       container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--gray);">No tienes ninguna oferta activa o pasada en el mercado.</div>';
       return;
    }

    container.innerHTML = '';
    
    myData.forEach(offer => {
      // Ignorar cancelados a menos que quieras darles un historial visual (por ahora los descartamos)
      if (offer.status === 'cancelled') return;

      const card = document.createElement('div');
      card.className = 'shop-card';
      card.style.background = 'rgba(0,0,0,0.4)';
      card.style.border = '1px solid rgba(255,255,255,0.05)';
      
      let title = offer.listing_type === 'pokemon' ? `${offer.data.name} ${offer.data.isShiny ? '✨' : ''}` : `x${offer.data.qty} ${offer.data.name}`;
      let spriteHtml = '';

      if (offer.listing_type === 'pokemon') {
          spriteHtml = `<img src="${offer.data.isShiny ? getSpriteUrl(offer.data.id, true) : getSpriteUrl(offer.data.id, false)}" style="height:50px;">`;
      } else {
          spriteHtml = `<div style="font-size:30px; margin: 10px 0;">🎒</div>`;
      }

      let statusBadge = '';
      let actionBtn = '';

      if (offer.status === 'active') {
         statusBadge = `<span style="background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:4px; font-size:9px;">ACTIVO</span>`;
         actionBtn = `<button onclick="cancelMarketActive('${offer.id}')" style="width:100%; padding:8px; font-size:9px; border-radius:8px; border:none; background:rgba(255,50,50,0.2); color:#ff6b6b; cursor:pointer;">RETIRAR</button>`;
      } else if (offer.status === 'sold') {
         const wonAmount = Math.floor(offer.price * (1 - _omFeePercent));
         statusBadge = `<span style="background:var(--green); color:#111; font-weight:bold; padding:4px 8px; border-radius:4px; font-size:9px;">¡VENDIDO!</span>`;
         actionBtn = `<button onclick="claimMarketSold('${offer.id}', ${wonAmount})" style="width:100%; padding:10px; font-size:9px; border-radius:8px; border:none; background:var(--yellow); color:var(--darker); font-family:'Press Start 2P', monospace; cursor:pointer;">RECLAMAR ₽${wonAmount}</button>`;
      } else if (offer.status === 'claimed') {
         statusBadge = `<span style="color:var(--gray); font-size:10px;">Reclamado</span>`;
         actionBtn = `<div style="font-size:9px; text-align:center; padding:10px; color:var(--gray);">Transacción Finalizada</div>`;
      }

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
           ${statusBadge}
           <span style="font-family:'Press Start 2P', monospace; font-size:8px; color:var(--yellow);">₽${offer.price}</span>
        </div>
        <div style="text-align:center;">${spriteHtml}</div>
        <div style="font-size:12px; font-weight:bold; margin-bottom:12px; text-align:center; text-transform:capitalize;">${title}</div>
        ${actionBtn}
      `;
      container.appendChild(card);
    });

  } catch(e) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:red;">Error buscando tus publicaciones.</div>`;
  }
}

async function claimMarketSold(offerId, rewardAmount) {
   try {
      const { data, error } = await window.sb
         .from('market_listings')
         .update({ status: 'claimed' })
         .eq('id', offerId)
         .eq('status', 'sold')
         .select();

      if (error) throw error;
      if (!data || data.length === 0) {
         notify('Esta oferta ya fue reclamada o su estado cambió.', '⚠️');
         renderMyPublications();
         return;
      }

      // Adjudicar dinero seguro a la state local
      state.money += rewardAmount;
      saveGame(false);

      notify(`Transacción finalizada. Recibiste ₽${rewardAmount} tras pagar impuestos del GTS.`, '💰');
      document.getElementById('online-market-money').textContent = state.money;
      document.getElementById('hud-money').textContent = state.money;
      renderMyPublications();
   } catch(e) {
       console.error(e);
       notify('Fallo de red.', '❌');
   }
}

async function cancelMarketActive(offerId) {
   if (!confirm("¿Seguro que quieres retirar este ítem de la venta y regresarlo a tu cuenta?")) return;

   try {
      const { data, error } = await window.sb
         .from('market_listings')
         .update({ status: 'cancelled' })
         .eq('id', offerId)
         .eq('status', 'active')
         .select();
      
      if (error) throw error;
      if (!data || data.length === 0) {
         notify('El ítem no pudo ser retirado. Tal vez alguien lo compró hace un segundo.', '⚠️');
         renderMyPublications();
         return;
      }

      const offer = data[0];
      
      // Restauración limpia en caso de retiro exitoso
      if (offer.listing_type === 'pokemon') {
         state.box.push(offer.data);
         notify(`Tu ${offer.data.name} ha regresado al PC.`, '↩️');
      } else {
         const itemName = offer.data.name;
         const qty = parseInt(offer.data.qty) || 1;
         if (!state.inventory) state.inventory = {};
         state.inventory[itemName] = (state.inventory[itemName] || 0) + qty;
         notify(`Retiraste x${qty} ${itemName}. Vuelta a tu mochila.`, '↩️');
      }

      saveGame(false);
      renderMyPublications();
   } catch(e) {
      console.error(e);
      notify('Fallo de red al intentar retirar la oferta.', '❌');
   }
}

// ── VENDER (PUBLICAR) ─────────────────────────────────────────────────────────

function renderPublishTab() {
  const container = document.getElementById('om-publish-selectors');
  container.innerHTML = '';
  
  if (_omPublishType === 'pokemon') {
     // Mostrar la caja PC simplificada
     if (!state.box || state.box.length === 0) {
        container.innerHTML = '<p style="font-size:12px; color:var(--gray);">No tienes ningún Pokémon en el PC que no pertenezca a tu Equipo activo.</p>';
        return;
     }

     const grid = document.createElement('div');
     grid.style.display = 'grid';
     grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(40px, 1fr))';
     grid.style.gap = '8px';
     grid.style.maxHeight = '200px';
     grid.style.overflowY = 'auto';

     state.box.forEach(p => {
        const btn = document.createElement('button');
        btn.style.width = '100%';
        btn.style.height = '40px';
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.border = '1px solid rgba(255,255,255,0.1)';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        
        btn.innerHTML = `<img src="${p.isShiny ? getSpriteUrl(p.id, true) : getSpriteUrl(p.id, false)}" style="width:30px;height:30px;object-fit:contain;">`;
        if (p.isShiny) btn.style.borderColor = 'var(--yellow)';

        if (_omSelectedData && _omSelectedData.uid === p.uid) {
           btn.style.background = 'var(--blue)';
           btn.style.borderColor = '#fff';
        }

        btn.onclick = () => {
           _omSelectedData = p;
           renderPublishTab(); // re-render para activar el estilo
        };
        grid.appendChild(btn);
     });
     
     container.appendChild(grid);

     if (_omSelectedData) {
        let stats = _omSelectedData.ivs;
        let sumIV = stats ? (stats.hp||0) + (stats.attack||0) + (stats.defense||0) + (stats.speed||0) : 'N/A';
        container.innerHTML += `
           <div style="margin-top:10px; font-size:12px; text-transform:capitalize;">
              Seleccionado: <b style="color:var(--yellow);">${_omSelectedData.name}</b> (Nv ${_omSelectedData.level || 1}) - IV Total: ${sumIV}
           </div>
        `;
     }
  } else {
     // Mostrar Inventario de Items "Vendibles" 
     // Por seguridad, bloqueamos objetos clave que no se venden pero como todo se guarda en state.inventory, podemos listar
     let vendibles = Object.keys(state.inventory || {}).filter(k => state.inventory[k] > 0);
     const bloqueados = ['Gema Dominante', 'Pieza de Mapa', 'Escáner de IVs']; // Ejemplos
     vendibles = vendibles.filter(k => !bloqueados.includes(k));

     if (vendibles.length === 0) {
        container.innerHTML = '<p style="font-size:12px; color:var(--gray);">No tienes ítems comerciables en tu mochila.</p>';
        return;
     }

     const grid = document.createElement('div');
     grid.style.display = 'grid';
     grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(40px, 1fr))';
     grid.style.gap = '8px';
     grid.style.maxHeight = '200px';
     grid.style.overflowY = 'auto';

     vendibles.forEach(item => {
        const btn = document.createElement('button');
        btn.style.width = '100%';
        btn.style.height = '40px';
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.border = '1px solid rgba(255,255,255,0.1)';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        
        let itemInfo = window.SHOP_ITEMS ? window.SHOP_ITEMS.find(x => x.name === item) : null;
        let iconHtml = itemInfo ? (itemInfo.sprite ? `<img src="${itemInfo.sprite}" style="width:30px;height:30px;object-fit:contain;">` : `<span style="font-size:24px;">${itemInfo.icon}</span>`) : '🎒';
        
        btn.innerHTML = `${iconHtml}`;

        if (_omSelectedData && _omSelectedData.name === item) {
           btn.style.background = 'var(--blue)';
           btn.style.borderColor = '#fff';
        }

        btn.onclick = () => {
           _omSelectedData = { name: item, max: state.inventory[item], qty: 1 };
           renderPublishTab();
        };
        grid.appendChild(btn);
     });

     container.appendChild(grid);

     if (_omSelectedData && _omSelectedData.name) {
        const qtyPanel = document.createElement('div');
        qtyPanel.style.marginTop = '10px';
        qtyPanel.style.display = 'flex';
        qtyPanel.style.alignItems = 'center';
        qtyPanel.style.gap = '10px';
        qtyPanel.style.flexWrap = 'wrap';
        qtyPanel.innerHTML = `
           <div style="font-size:12px; text-transform:capitalize; flex: 100%;">
              Seleccionado: <b style="color:var(--yellow);">${_omSelectedData.name}</b>
           </div>
           <span style="font-size:12px; color:var(--gray);">Cantidad:</span>
           <input type="number" id="om-pub-item-qty" value="${_omSelectedData.qty}" min="1" max="${_omSelectedData.max}" style="padding:8px; border-radius:8px; width:70px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; font-family:'Press Start 2P', monospace; font-size:10px;">
           <span style="font-size:10px; color:var(--yellow);">(Max ${_omSelectedData.max})</span>
        `;
        qtyPanel.querySelector('input').addEventListener('input', (e) => {
           let val = parseInt(e.target.value) || 1;
           if (val > _omSelectedData.max) val = _omSelectedData.max;
           if (val < 1) val = 1;
           _omSelectedData.qty = val;
        });
        container.appendChild(qtyPanel);
     }
  }
}

async function publishToMarket() {
  if (!window.currentUser) { notify("Debes iniciar sesión para publicar.", "❌"); return; }
  
  const priceInput = document.getElementById('om-publish-price');
  const price = parseInt(priceInput.value);

  if (!price || price < 1) { notify("Inserta un precio válido.", "⚠️"); return; }
  if (!_omSelectedData) { notify("Selecciona un Pokémon o Ítem de la lista.", "⚠️"); return; }

  // 1. Consulta el límite
  try {
     const { count, error } = await window.sb
        .from('market_listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', window.currentUser.id)
        .in('status', ['active']);

     if (error) throw error;
     if (count >= _omMaxListings) {
        notify(`Límite superado: Máximo ${_omMaxListings} publicaciones activas simultáneas.`, '⚠️');
        return;
     }

     // 2. Extraer el costo de inventario local en Escrow
     if (_omPublishType === 'pokemon') {
        const index = state.box.findIndex(p => p.uid === _omSelectedData.uid);
        if (index === -1) { notify("No se encontró el Pokémon en tu caja (Error Escrow).", "❌"); return; }
        
        // Quitarlo temporalmente
        state.box.splice(index, 1);
     } else {
        const item = _omSelectedData.name;
        const qtyToSell = _omSelectedData.qty;
        if ((state.inventory[item] || 0) < qtyToSell) { notify("No posees los suficientes ítems.", "❌"); return; }
        state.inventory[item] -= qtyToSell;
     }

     notify("Subiendo publicación a la red Satelital...", "🛰️");

     // 3. Subir a DB
     const sellerName = state.trainer;
     const insertData = {
        seller_id: window.currentUser.id,
        seller_name: sellerName,
        listing_type: _omPublishType,
        data: _omPublishType === 'pokemon' ? _omSelectedData : { name: _omSelectedData.name, qty: _omSelectedData.qty },
        price: price,
        status: 'active'
     };

     const { error: insertErr } = await window.sb.from('market_listings').insert([insertData]);

     if (insertErr) {
        // En caso de catástrofe de red, devolver la unidad a la memoria JS (rollback local)
        if (_omPublishType === 'pokemon') state.box.push(_omSelectedData);
        else state.inventory[_omSelectedData.name] += _omSelectedData.qty;
        throw insertErr;
     }

     // 4. Exito. Guardar la sustracción forzadamente en la nube mediante un save seguro
     saveGame(false);
     
     notify("¡Publicación enviada exitosamente!", "✅");
     _omSelectedData = null;
     priceInput.value = '';
     
     // Saltar a la pestaña de "Mis publicaciones"
     switchOnlineMarketTab('mine');

  } catch(e) {
     console.error("Publish Error:", e);
     notify("No se pudo publicar la oferta. Conexión rechazada.", "❌");
  }
}
