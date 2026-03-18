    // ===== BREEDING ENGINE =====
            const EGG_GROUPS = {
      abra:['humanshape'],
      aerodactyl:['flying'],
      alakazam:['humanshape'],
      arbok:['dragon','ground'],
      arcanine:['ground'],
      articuno:['no-eggs'],
      beedrill:['bug'],
      bellsprout:['plant'],
      blastoise:['monster','water1'],
      bulbasaur:['monster','plant'],
      butterfree:['bug'],
      caterpie:['bug'],
      chansey:['fairy'],
      charizard:['dragon','monster'],
      charmander:['dragon','monster'],
      charmeleon:['dragon','monster'],
      clefable:['fairy'],
      clefairy:['fairy'],
      cleffa:['no-eggs'],
      cloyster:['water3'],
      cubone:['monster'],
      dewgong:['ground','water1'],
      diglett:['ground'],
      ditto:['ditto'],
      dodrio:['flying'],
      doduo:['flying'],
      dragonair:['dragon','water1'],
      dragonite:['dragon','water1'],
      dratini:['dragon','water1'],
      drowzee:['humanshape'],
      dugtrio:['ground'],
      eevee:['ground'],
      ekans:['dragon','ground'],
      electabuzz:['humanshape'],
      electrode:['mineral'],
      elekid:['no-eggs'],
      exeggcute:['plant'],
      exeggutor:['plant'],
      farfetchd:['flying','ground'],
      fearow:['flying'],
      flareon:['ground'],
      gastly:['indeterminate'],
      gengar:['indeterminate'],
      geodude:['mineral'],
      gloom:['plant'],
      golbat:['flying'],
      goldeen:['water2'],
      golduck:['ground','water1'],
      golem:['mineral'],
      graveler:['mineral'],
      grimer:['indeterminate'],
      growlithe:['ground'],
      gyarados:['dragon','water2'],
      haunter:['indeterminate'],
      hitmonchan:['humanshape'],
      hitmonlee:['humanshape'],
      horsea:['dragon','water1'],
      hypno:['humanshape'],
      igglybuff:['no-eggs'],
      ivysaur:['monster','plant'],
      jigglypuff:['fairy'],
      jolteon:['ground'],
      jynx:['humanshape'],
      kabuto:['water1','water3'],
      kabutops:['water1','water3'],
      kadabra:['humanshape'],
      kakuna:['bug'],
      kangaskhan:['monster'],
      kingler:['water3'],
      koffing:['indeterminate'],
      krabby:['water3'],
      lapras:['monster','water1'],
      lickitung:['monster'],
      machamp:['humanshape'],
      machoke:['humanshape'],
      machop:['humanshape'],
      magby:['no-eggs'],
      magikarp:['dragon','water2'],
      magmar:['humanshape'],
      magnemite:['mineral'],
      magneton:['mineral'],
      mankey:['ground'],
      marowak:['monster'],
      meowth:['ground'],
      metapod:['bug'],
      mew:['no-eggs'],
      mewtwo:['no-eggs'],
      moltres:['no-eggs'],
      mr_mime:['humanshape'],
      muk:['indeterminate'],
      nidoking:['ground','monster'],
      nidoqueen:['no-eggs'],
      nidoran_f:['ground','monster'],
      nidoran_m:['ground','monster'],
      nidorina:['no-eggs'],
      nidorino:['ground','monster'],
      ninetales:['ground'],
      oddish:['plant'],
      omanyte:['water1','water3'],
      omastar:['water1','water3'],
      onix:['mineral'],
      paras:['bug','plant'],
      parasect:['bug','plant'],
      persian:['ground'],
      pichu:['no-eggs'],
      pidgeot:['flying'],
      pidgeotto:['flying'],
      pidgey:['flying'],
      pikachu:['fairy','ground'],
      pinsir:['bug'],
      poliwag:['water1'],
      poliwhirl:['water1'],
      poliwrath:['water1'],
      ponyta:['ground'],
      porygon:['mineral'],
      primeape:['ground'],
      psyduck:['ground','water1'],
      raichu:['fairy','ground'],
      rapidash:['ground'],
      raticate:['ground'],
      rattata:['ground'],
      rhydon:['ground','monster'],
      rhyhorn:['ground','monster'],
      sandshrew:['ground'],
      sandslash:['ground'],
      scyther:['bug'],
      seadra:['dragon','water1'],
      seaking:['water2'],
      seel:['ground','water1'],
      shellder:['water3'],
      slowbro:['monster','water1'],
      slowpoke:['monster','water1'],
      snorlax:['monster'],
      spearow:['flying'],
      squirtle:['monster','water1'],
      starmie:['water3'],
      staryu:['water3'],
      tangela:['plant'],
      tauros:['ground'],
      tentacool:['water3'],
      tentacruel:['water3'],
      togepi:['no-eggs'],
      vaporeon:['ground'],
      venomoth:['bug'],
      venonat:['bug'],
      venusaur:['monster','plant'],
      victreebel:['plant'],
      vileplume:['plant'],
      voltorb:['mineral'],
      vulpix:['ground'],
      wartortle:['monster','water1'],
      weedle:['bug'],
      weepinbell:['plant'],
      weezing:['indeterminate'],
      wigglytuff:['fairy'],
      zapdos:['no-eggs'],
      zubat:['flying'],
    };
	    const COMPAT_TEXT = {
	      0: { label: '❌ Incompatibles', color: '#ff5252' }, 1: { label: '😐 Poco interés', color: '#ffb142' },
	      2: { label: '🙂 Compatibles', color: '#33d9b2' }, 3: { label: '❤️ Muy compatibles', color: '#ff793f' },
	    };
	    const EGG_GROUP_TRANSLATIONS = {
	      'monster': 'Monstruo', 'water1': 'Agua 1', 'water2': 'Agua 2', 'water3': 'Agua 3',
	      'bug': 'Bicho', 'flying': 'Volador', 'ground': 'Campo', 'fairy': 'Hada',
	      'plant': 'Planta', 'humanshape': 'Humanoide', 'mineral': 'Mineral',
	      'indeterminate': 'Amorfo', 'dragon': 'Dragón', 'ditto': 'Ditto', 'no-eggs': 'Desconocido'
	    };
    const EGG_MOVES_DB = {
      bulbasaur:['leaf_storm','power_whip','ingrain'], charmander:['dragon_rage','flare_blitz','dragon_dance'],
      squirtle:['aqua_jet','mirror_coat','water_spout'], pikachu:['volt_tackle','fake_out','encore'],
      eevee:['wish','synchronoise','detect'], meowth:['payday','hypnosis'], machop:['dynamic_punch','bullet_punch'],
      gastly:['perish_song','disable'], snorlax:['pursuit','curse'], lapras:['freeze_dry','ancient_power']
    };
    function _breedingBaseId(id) {
      if (!id) return id;
      return id.endsWith('_m') || id.endsWith('_f') ? id.slice(0, -2) : id;
    }
    function _breedingEggGroups(id) {
      const base = _breedingBaseId(id);
      return EGG_GROUPS[base] || [];
    }
    function getBaseEvolution(id) {
      const b = { ivysaur:'bulbasaur', venusaur:'bulbasaur', charmeleon:'charmander', charizard:'charmander', wartortle:'squirtle', blastoise:'squirtle', raichu:'pikachu', vaporeon:'eevee', jolteon:'eevee', flareon:'eevee', haunter:'gastly', gengar:'gastly', machoke:'machop', machamp:'machop', graveler:'geodude', golem:'geodude', gyarados:'magikarp' };
      return b[id] || id;
    }
    function checkCompatibility(pA, pB) {
      const idA = _breedingBaseId(pA.id);
      const idB = _breedingBaseId(pB.id);
      const gA = _breedingEggGroups(idA);
      const gB = _breedingEggGroups(idB);
      const shared = gA.filter(g => gB.includes(g) && g !== 'ditto');
      const LEGENDARIES = ['mewtwo','mew','articuno','zapdos','moltres'];
      const genderA = pA.gender || null;
      const genderB = pB.gender || null;

      const hasNoEggs = gA.includes('no-eggs') || gB.includes('no-eggs');
      if (hasNoEggs) return { level: 0, eggSpecies: null, reason: 'No se puede criar', sharedGroups: shared };

      const aDitto = idA === 'ditto', bDitto = idB === 'ditto';
      if (aDitto !== bDitto) {
        const other = aDitto ? pB : pA;
        const eggSpecies = getBaseEvolution(_breedingBaseId(other.id));
        return { level: 2, eggSpecies, motherId: _breedingBaseId(other.id), reason: 'OK', sharedGroups: shared };
      }


      if (!genderA || !genderB) return { level: 0, eggSpecies: null, reason: 'Sin genero', sharedGroups: shared };
      if (LEGENDARIES.includes(idA) || LEGENDARIES.includes(idB)) return { level: 0, eggSpecies: null, reason: 'Legendario', sharedGroups: shared };

      const aFemale = genderA === 'F', bFemale = genderB === 'F';
      const aMale = genderA === 'M', bMale = genderB === 'M';
      if (!((aFemale && bMale) || (bFemale && aMale))) return { level: 0, eggSpecies: null, reason: 'Requiere macho y hembra', sharedGroups: shared };

      if (shared.length === 0) return { level: 0, eggSpecies: null, reason: 'Sin grupo huevo comun', sharedGroups: shared };

      const mother = aFemale ? pA : pB;
      const eggSpecies = getBaseEvolution(_breedingBaseId(mother.id));
      const level = (idA === idB) ? 3 : 2;
      return { level, eggSpecies, motherId: mother.id, reason: 'OK', sharedGroups: shared };
    }
    function calculateInheritance(pA, pB, iA, iB) {
      const STATS = ['hp','atk','def','spa','spd','spe'];
      const pItems = { 'Pesa Recia':'hp', 'Brazal Potencia':'atk', 'Fajín Potencia':'def', 'Lente Potencia':'spa', 'Banda Potencia':'spd', 'Tobillera Potencia':'spe' };
      const ivs = {}; STATS.forEach(s => ivs[s] = Math.floor(Math.random()*32));
      const dk = iA === 'Lazo Destino' || iB === 'Lazo Destino';
      const count = dk ? 5 : 3;
      const gA = pItems[iA], gB = pItems[iB];
      const used = new Set();
      if(gA) { ivs[gA] = pA.ivs[gA]; used.add(gA); } else if(gB) { ivs[gB] = pB.ivs[gB]; used.add(gB); }
      const rem = STATS.filter(s => !used.has(s)).sort(()=>Math.random()-0.5).slice(0, count - used.size);
      rem.forEach(s => ivs[s] = Math.random() < 0.5 ? pA.ivs[s] : pB.ivs[s]);
      return ivs;
    }
    
    function _daycareStatLabel(stat) {
      const map = { hp:'PS', atk:'ATK', def:'DEF', spa:'AT.E', spd:'DF.E', spe:'VEL' };
      return map[stat] || stat;
    }
    function _daycareEggIntervalText(level) {
      const ms = EGG_SPAWN_INTERVAL_MS[level];
      if (!ms) return '—';
      const hrs = Math.round(ms / 3600000);
      return `${hrs}h`;
    }
    function _daycareInheritanceInfo(pA, pB) {
      const powerItems = { 'Pesa Recia':'hp', 'Brazal Potencia':'atk', 'Fajín Potencia':'def', 'Lente Potencia':'spa', 'Banda Potencia':'spd', 'Tobillera Potencia':'spe' };
      const hasDK = pA.heldItem === 'Lazo Destino' || pB.heldItem === 'Lazo Destino';
      const count = hasDK ? 5 : 3;

      let forced = null;
      if (powerItems[pA.heldItem]) forced = { stat: powerItems[pA.heldItem], item: pA.heldItem, side: 'A' };
      else if (powerItems[pB.heldItem]) forced = { stat: powerItems[pB.heldItem], item: pB.heldItem, side: 'B' };

      const remainingStats = forced ? 5 : 6;
      const remainingToPick = count - (forced ? 1 : 0);
      const pickChance = remainingToPick / remainingStats;
      const aChance = Math.round((pickChance / 2) * 100);
      const bChance = aChance;
      const rChance = Math.round((1 - pickChance) * 100);

      const forcedLine = forced
        ? `Stat forzado: <span style="color:var(--text);font-weight:800;">${_daycareStatLabel(forced.stat)}</span> por <span style="color:var(--text);font-weight:800;">${forced.item}</span> (${forced.side}).`
        : '';

      return { count, hasDK, aChance, bChance, rChance, forcedLine };
    }
    function renderDaycareBreedingSummary(pA, pB, compat) {
      const inh = _daycareInheritanceInfo(pA, pB);
      const natureCount = (typeof NATURES !== 'undefined' && NATURES && NATURES.length) ? NATURES.length : 20;
      const intervalTxt = (compat && compat.level > 0) ? _daycareEggIntervalText(compat.level) : '—';
      const shared = (compat && compat.sharedGroups && compat.sharedGroups.length) ? compat.sharedGroups.join(', ') : '—';
      const motherId = compat && compat.eggSpecies ? compat.eggSpecies : null;
      const motherName = motherId ? (POKEMON_DB[motherId]?.name || motherId) : '—';
      const gA = genderSymbol(pA.gender);
      const gB = genderSymbol(pB.gender);
      const compatClass = compat.level >= 3 ? 'compat-high' : (compat.level === 2 ? 'compat-mid' : (compat.level === 1 ? 'compat-low' : 'compat-none'));
      return `
        <div class="daycare-mid-title">CRIANZA</div>
        <div class="daycare-mid-grid">
          <div class="daycare-mid-panel">
            <div class="daycare-mid-label">Compatibilidad</div>
            <div class="daycare-mid-value ${compatClass}">${COMPAT_TEXT[compat.level]?.label || '—'}</div>
            <div class="daycare-mid-pill">🥚 Huevo cada ${intervalTxt}</div>
          </div>
          <div class="daycare-mid-panel">
            <div class="daycare-mid-label">Reglas</div>
            <div class="daycare-mid-note">Solo macho + hembra.<br>La madre define la especie.</div>
          </div>
        </div>
        <div class="daycare-mid-panel" style="margin-bottom:10px;">
          <div class="daycare-mid-label">Padres</div>
          <div class="daycare-mid-kv"><span class="k">Pareja</span><span class="v">${pA.name} (${gA}) + ${pB.name} (${gB})</span></div>
          <div class="daycare-mid-kv"><span class="k">Grupo compartido</span><span class="v">${shared}</span></div>
          <div class="daycare-mid-kv"><span class="k">Cría</span><span class="v">${motherName}</span></div>
        </div>
        <div class="daycare-mid-panel">
          <div class="daycare-mid-label">Herencia</div>
          <div class="daycare-mid-note">
            IVs heredados: <span class="daycare-mid-accent">${inh.count}</span>${inh.hasDK ? ' (Lazo Destino)' : ''}.<br>
            Cada stat no forzado: <span class="daycare-mid-accent">${inh.aChance}%</span> A, <span class="daycare-mid-accent">${inh.bChance}%</span> B, <span class="daycare-mid-accent">${inh.rChance}%</span> aleatorio.<br>
            ${inh.forcedLine ? (inh.forcedLine + '<br>') : ''}
            Naturaleza: <span class="daycare-mid-accent">Aleatoria (1/${natureCount} cada una)</span>.<br>
            Shiny: <span class="daycare-mid-accent">1/512</span>.<br>
            Incubación: <span class="daycare-mid-accent">30 min</span>.
          </div>
        </div>
      `;
    }let _daycareTimer = null;
    let _activeDaycareSlots = [];
    async function loadDaycareSlots() {
      if(!currentUser) return [];
      const { data } = await sb.from('daycare_slots').select('*').eq('player_id', currentUser.id).order('slot_index');
      _activeDaycareSlots = data || [];
      // Hydrate with full pokemon objects from state
      return _activeDaycareSlots.map(s => {
        const p = state.team.find(x => x.uid === s.pokemon_id) || (state.box && state.box.find(x => x.uid === s.pokemon_id));
        return { ...s, pokemon: p };
      });
    }
    async function renderDaycareUI() {
      const slots = await loadDaycareSlots();
      renderDaycareSlot('a', slots.find(s=>s.slot_index===1));
      renderDaycareSlot('b', slots.find(s=>s.slot_index===2));
      const compat = (slots.length===2 && slots[0].pokemon && slots[1].pokemon) ? checkCompatibility(slots[0].pokemon, slots[1].pokemon) : { level: 0 };
      const ind = document.getElementById('daycare-compat-bar');
      const info = COMPAT_TEXT[compat.level];
      ind.textContent = slots.length===2 ? info.label : '🔎 Deposita 2 Pokémon para compatibilidad';
      ind.style.background = slots.length===2 ? info.color+'22' : 'rgba(255,255,255,0.05)';
      ind.style.color = slots.length===2 ? info.color : '#fff';
      const midCard = document.getElementById('daycare-mid-card');
      const slotsGrid = document.getElementById('daycare-slots-grid');
      if (midCard && slotsGrid) {
        const hasPair = slots.length===2 && slots[0].pokemon && slots[1].pokemon;
        if (hasPair) {
          slotsGrid.classList.add('has-mid');
          midCard.style.display = 'block';
          midCard.innerHTML = renderDaycareBreedingSummary(slots[0].pokemon, slots[1].pokemon, compat);
        } else {
          slotsGrid.classList.remove('has-mid');
          midCard.style.display = 'none';
          midCard.innerHTML = '';
        }
      }
      
      const timerUI = document.getElementById('daycare-egg-timer');
      if (compat.level > 0) { 
        timerUI.style.display = 'block'; 
        // Process offline breeding FIRST to catch up and set proper base for timer
        await processOfflineBreeding(currentUser.id, slots);
        
        // Re-read slots if they were updated by processOfflineBreeding
        const updatedSlots = await loadDaycareSlots();
        manageDaycareTimer(compat.level, updatedSlots); 
      }
      else { timerUI.style.display = 'none'; clearInterval(_daycareTimer); }
      
      await renderEggGrid();
    }
    function renderDaycareSlot(id, slot) {
      const has = slot && slot.pokemon;
      document.getElementById(`slot-${id}-deposit-btn`).style.display = has ? 'none' : 'block';
      document.getElementById(`slot-${id}-withdraw-btn`).style.display = has ? 'block' : 'none';
      if(has) {
        const p = slot.pokemon;
        const sUrl = getSpriteUrl(p.id, p.isShiny);
        document.getElementById(`slot-${id}-sprite`).innerHTML = sUrl ? `<img src="${sUrl}">` : p.emoji;
        document.getElementById(`slot-${id}-name`).innerHTML = `${p.name} <span class="daycare-slot-level">Nv.${p.level}</span>`;
        document.getElementById(`slot-${id}-info`).innerHTML = `<span class="daycare-slot-info-label">IVs</span> <span class="daycare-slot-info-values">${p.ivs.hp}/${p.ivs.atk}/${p.ivs.def}/${p.ivs.spa}/${p.ivs.spd}/${p.ivs.spe}</span><span class="daycare-slot-info-sep">•</span><span class="daycare-slot-info-label">Gen</span> <span class="daycare-slot-info-values">${genderSymbol(p.gender)}</span>`;
      } else {
        document.getElementById(`slot-${id}-sprite`).innerHTML = '❓';
        document.getElementById(`slot-${id}-name`).innerHTML = '— Vacía —';
        document.getElementById(`slot-${id}-info`).textContent = '';
      }
    }
    
    // Deposit / Withdraw logic
    let _depositingSlot = 1;
    function openDepositModal(slotIdx) { _depositingSlot = slotIdx + 1; document.getElementById('bag-overlay').style.display = 'flex'; _renderDaycarePicker(); }
    function _getOtherDaycarePokemonForPicker() {
      const otherIdx = _depositingSlot === 1 ? 2 : 1;
      const other = _activeDaycareSlots.find(s => s.slot_index === otherIdx);
      return other && other.pokemon ? other.pokemon : null;
    }
    function _renderDaycarePicker() {
      const bModal = document.getElementById('bag-modal');
      const compareTo = _getOtherDaycarePokemonForPicker();
      const slotLabel = _depositingSlot === 1 ? 'Ranura A' : 'Ranura B';
      const compareHint = compareTo ? `<div style="font-size:10px;color:var(--gray);text-align:center;margin:-6px 0 12px;">Compatibilidad vs <b style="color:var(--text);">${compareTo.name}</b></div>` : '';
      bModal.innerHTML = `
        <div style="font-family:'Press Start 2P';font-size:12px;margin-bottom:16px;color:var(--yellow);text-align:center;">Elegi un Pokemon (${slotLabel})</div>
        ${compareHint}
        <div style="max-height:60vh;overflow-y:auto;display:grid;grid-template-columns:1fr;gap:10px;">
          ${state.team.map(p => _pickerHtml(p, compareTo)).join('')}
          ${(state.box || []).map(p => _pickerHtml(p, compareTo)).join('')}
        </div>
        <button onclick="document.getElementById('bag-overlay').style.display='none'" style="margin-top:16px;width:100%;padding:14px;border-radius:12px;background:rgba(255,255,255,0.1);color:#fff;font-family:'Press Start 2P';font-size:10px;border:none;">CANCELAR</button>
      `;
    }
    function _pickerHtml(p, compareTo) {
      if(_activeDaycareSlots.some(s => s.pokemon_id === p.uid)) return ''; // already in daycare
      const sUrl = getSpriteUrl(p.id, p.isShiny);
      const tier = getPokemonTier(p);
      const tierHtml = `<span style="display:inline-flex;align-items:center;justify-content:center;padding:2px 6px;border-radius:999px;background:${tier.bg};color:${tier.color};font-size:9px;font-weight:800;line-height:1;">${tier.tier}</span>`;
	      const genderIcon = p.gender === 'M' ? '<span style="color:#3498db; font-size:16px; font-weight:900; filter: drop-shadow(0 0 2px #3498db66);">♂</span>' : (p.gender === 'F' ? '<span style="color:#e84393; font-size:16px; font-weight:900; filter: drop-shadow(0 0 2px #e8439366);">♀</span>' : '<span style="color:#95a5a6; font-size:16px;">⚲</span>');
	      
	      // Tags display
	      const tags = p.tags || [];
	      const tagsHtml = tags.length ? `<div style="display:flex;gap:4px;margin-top:4px;justify-content:center;">
	        ${tags.includes('fav') ? '<span style="font-size:10px; filter: drop-shadow(0 0 2px #ffd32a);">⭐</span>' : ''}
	        ${tags.includes('breed') ? '<span style="font-size:10px; filter: drop-shadow(0 0 2px #ff4d4d);">❤️</span>' : ''}
	        ${tags.includes('iv31') ? '<span style="font-size:10px;color:#ffd32a;font-weight:900;text-shadow: 0 0 5px #ffd32a66;">31</span>' : ''}
	      </div>` : '';

      let compatHtml = '';
      let borderStyle = 'border:1px solid rgba(255,255,255,0.06);';
      
	      if (compareTo) {
	        const cp = checkCompatibility(compareTo, p);
	        const info = COMPAT_TEXT[cp.level] || COMPAT_TEXT[0];
	        const intMs = cp.level > 0 ? EGG_SPAWN_INTERVAL_MS[cp.level] : null;
	        const every = intMs ? `${Math.round(intMs/3600000)}h` : '—';
	        const motherName = cp.eggSpecies ? (POKEMON_DB[cp.eggSpecies]?.name || cp.eggSpecies) : '—';
	        const translatedGroups = (cp.sharedGroups || []).map(g => EGG_GROUP_TRANSLATIONS[g] || g.charAt(0).toUpperCase() + g.slice(1));
	        const shared = translatedGroups.length ? translatedGroups.join(', ') : '—';
	        const extra = cp.level > 0 ? `Cría: <b style="color:#ffffff; font-size:11px;">${motherName}</b>` : `<span style="color:rgba(255,255,255,0.5); font-size:11px;">${cp.reason || 'Incompatible'}</span>`;
	        
	        if (cp.level > 0) {
	          borderStyle = `border:1px solid ${info.color}aa; background: linear-gradient(135deg, rgba(0,0,0,0.6) 0%, ${info.color}25 100%); box-shadow: 0 4px 15px rgba(0,0,0,0.4);`;
	        } else {
	          borderStyle = `border:1px solid rgba(255,255,255,0.1); opacity: 0.7; filter: grayscale(0.3);`;
	        }
	
	        compatHtml = `
	          <div style="margin-top:10px; padding:10px; border-radius:10px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08);">
	            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
	              <span style="font-size:11px; color:${info.color}; font-weight:900; text-transform:uppercase; letter-spacing:0.8px; text-shadow: 0 0 10px ${info.color}44;">${info.label}</span>
	              ${cp.level > 0 ? `<span style="font-size:10px; background:${info.color}; color:#000; padding:2px 8px; border-radius:6px; font-weight:900; box-shadow: 0 0 10px ${info.color}66;">⏱️ ${every}</span>` : ''}
	            </div>
	            <div style="font-size:11px; color:#ffffff; line-height:1.5; font-weight:500;">
	              ${extra}<br>
	              <span style="font-size:10px; color:rgba(255,255,255,0.6); font-weight:400;">🧬 Grupos: <span style="color:#ffffff; font-weight:600;">${shared}</span></span>
	            </div>
	          </div>`;
	      }

      return `<div onclick="confirmDeposit('${p.uid}')" style="${borderStyle}border-radius:12px;padding:12px;display:flex;align-items:flex-start;gap:12px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.transform='translateX(4px)';this.style.borderColor='rgba(255,255,255,0.2)';" onmouseout="this.style.transform='none';this.style.borderColor='${compareTo && checkCompatibility(compareTo, p).level > 0 ? COMPAT_TEXT[checkCompatibility(compareTo, p).level].color + '44' : 'rgba(255,255,255,0.06)'}';">
        <div style="text-align:center;">
          <div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);border-radius:8px;">
            ${sUrl ? `<img src="${sUrl}" style="width:48px;height:48px;image-rendering:pixelated;">` : `<span style="font-size:28px;">${p.emoji||'❓'}</span>`}
          </div>
          ${tagsHtml}
        </div>
        <div style="min-width:0;flex:1;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:2px;">
            <div style="font-size:12px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
            ${tierHtml}
          </div>
	          <div style="font-size:11px;color:#ffffff;display:flex;align-items:center;gap:8px;font-weight:600;">
	            <span style="background:rgba(255,255,255,0.1); padding:1px 6px; border-radius:4px;">Nv.${p.level}</span>
	            ${genderIcon}
	            <span style="color:rgba(255,255,255,0.4); font-weight:200;">|</span>
	            <span style="color:rgba(255,255,255,0.8);">IVs <b style="color:#fff;">${tier.total}</b>/186</span>
	          </div>
          ${compatHtml}
        </div>
      </div>`;
    }

    async function confirmDeposit(uid) {
      document.getElementById('bag-overlay').style.display='none';
      // Clean up any phantom/corrupted rows before depositing to prevent unique constraint errors
      await sb.from('daycare_slots').delete().eq('player_id', currentUser.id).eq('slot_index', _depositingSlot);
      
      const { error } = await sb.from('daycare_slots').insert({ player_id: currentUser.id, pokemon_id: uid, slot_index: _depositingSlot });
      if (error) {
        console.error("Daycare Deposit Error:", error);
        notify('Error en Guardería: ' + error.message, '❌');
      } else {
        notify('Pokémon depositado.', '🏡');
        saveGame(true); // Ensure uid assignment and positions match DB
      }
      renderDaycareUI();
    }
    async function withdrawFromDaycare(slotIdx) {
      const { error } = await sb.from('daycare_slots').delete().eq('player_id', currentUser.id).eq('slot_index', slotIdx + 1);
      if (error) {
        console.error("Daycare Withdraw Error:", error);
        notify('Error al retirar: ' + error.message, '❌');
      } else {
        notify('Pokémon retirado.', '🏡');
        saveGame(true);
      }
      renderDaycareUI();
    }

    // Incubation & Generation
    const EGG_SPAWN_INTERVAL_MS = { 1: 12*60*60*1000, 2: 9*60*60*1000, 3: 6*60*60*1000 };
    let _nextEggTime = 0;
    function manageDaycareTimer(compatLvl, slots) {
      clearInterval(_daycareTimer);
      const intMs = EGG_SPAWN_INTERVAL_MS[compatLvl];
      
      // Calculate next egg time based on actual elapsed time since deposit
      const depA = new Date(slots[0].deposited_at).getTime();
      const depB = new Date(slots[1].deposited_at).getTime();
      const earliest = Math.max(depA, depB);
      const elapsed = Date.now() - earliest;
      
      _nextEggTime = earliest + (Math.floor(elapsed / intMs) + 1) * intMs;
      
      _daycareTimer = setInterval(async () => {
        if(Date.now() >= _nextEggTime) {
          const cap = await getEggCapacity();
          const {count} = await sb.from('eggs').select('egg_id', {count:'exact', head:true}).eq('player_id',currentUser.id);
          if(count < cap) {
            const pA=slots[0].pokemon, pB=slots[1].pokemon;
            await generateEggAt(currentUser.id, pA, pB, pA.heldItem, pB.heldItem, new Date(_nextEggTime - intMs));
            
            // Consume time by updating parent deposited_at
            const consumeTo = new Date(_nextEggTime - intMs);
            await sb.from('daycare_slots').update({ deposited_at: consumeTo.toISOString() }).eq('player_id', currentUser.id);
            
            notify('¡Tus Pokémon han puesto un huevo!', '🥚');
            renderEggGrid();
          }
          _nextEggTime += intMs;
        }
        updateTimerDisplay();
      }, 1000);
    }
    function updateTimerDisplay() {
      const left = Math.max(0, Math.floor((_nextEggTime - Date.now())/1000));
      const m = String(Math.floor(left/60)).padStart(2,'0');
      const s = String(left%60).padStart(2,'0');
      document.getElementById('daycare-timer-countdown').textContent = `${m}:${s}`;
    }
    
    async function getEggCapacity() {
      const {data} = await sb.from('daycare_upgrades').select('egg_capacity').eq('player_id', currentUser.id).single();
      return data?.egg_capacity || 2;
    }

    async function generateEggAt(pid, pA, pB, iA, iB, dateObj) {
      const compat = checkCompatibility(pA,pB);
      if(compat.level===0) return;
      const ivs = calculateInheritance(pA,pB,iA,iB);
      let moves = (EGG_MOVES_DB[compat.eggSpecies] || []).filter(m => (pA.moves||[]).concat(pB.moves||[]).map(x=>x.id||x).includes(m)).slice(0,2);
      const ready = new Date(dateObj.getTime() + 30*60*1000); // 30 mins
      await sb.from('eggs').insert({ player_id:pid, species:compat.eggSpecies, parent_a:pA.uid, parent_b:pB.uid, inherited_ivs:ivs, egg_moves:moves, shiny_roll:(Math.random() < 1/512), created_at:dateObj.toISOString(), hatch_ready_time:ready.toISOString(), incubation_speed_bonus:0 });
    }

    async function reduceHatchTimer(pid, activity) {
      const RED = { battle: 2*60000, capture: 3*60000, gym: 10*60000 };
      const ms = RED[activity]; if(!ms) return;
      const {data} = await sb.from('eggs').select('egg_id, hatch_ready_time').eq('player_id', pid);
      if(data && data.length) {
        for(let e of data) {
          const nt = new Date(new Date(e.hatch_ready_time).getTime() - ms);
          await sb.from('eggs').update({ hatch_ready_time: nt.toISOString() }).eq('egg_id', e.egg_id);
        }
        // If viewing daycare tab, silently refresh
        if(document.getElementById('tab-daycare').style.display==='block') renderEggGrid();
        
        // Notify if newly ready
        const now = Date.now();
        const newlyReady = data.filter(e => new Date(e.hatch_ready_time).getTime() > now && (new Date(e.hatch_ready_time).getTime()-ms) <= now);
        if(newlyReady.length) { notify('¡Un huevo está listo para eclosionar!', '🐣'); document.getElementById('daycare-nav-badge').style.display='block'; }
      }
    }

    async function processOfflineBreeding(pid, inSlots) {
      const s = inSlots || await loadDaycareSlots();
      if(!s || s.length<2 || !s[0].pokemon || !s[1].pokemon) return;
      
      const pA = s[0].pokemon, pB = s[1].pokemon;
      const cp=checkCompatibility(pA,pB); if(cp.level===0) return;
      const intMs = EGG_SPAWN_INTERVAL_MS[cp.level];
      
      const depA = new Date(s[0].deposited_at).getTime(), depB = new Date(s[1].deposited_at).getTime();
      const earliest = Math.max(depA, depB);
      const elapsed = Date.now() - earliest;
      const pot = Math.floor(elapsed / intMs);
      if(pot <= 0) return;
      
      const cap = await getEggCapacity();
      const {count} = await sb.from('eggs').select('egg_id',{count:'exact',head:true}).eq('player_id',pid);
      
      let canGen = Math.min(pot, cap - count);
      if(canGen > 0) {
        for(let i=0; i<canGen; i++) {
          const spawnTime = new Date(earliest + intMs*(i+1));
          await generateEggAt(pid, pA, pB, pA.heldItem, pB.heldItem, spawnTime);
        }
        notify(`¡${canGen} huevo(s) generado(s) mientras no estabas!`, '🥚');
      }
      
      // ALWAYS consume the pot time even if canGen was limited by capacity,
      // to avoid infinite eggs behavior when backlog is cleared.
      // We set deposited_at to the latest accounted timestamp.
      const consumeTo = new Date(earliest + pot * intMs);
      await sb.from('daycare_slots').update({ deposited_at: consumeTo.toISOString() }).eq('player_id', pid);
      document.getElementById('daycare-nav-badge').style.display='block';
    }

    async function renderEggGrid() {
      const cap = await getEggCapacity();
      document.getElementById('daycare-egg-capacity').textContent = cap;
      const {data: eggs} = await sb.from('eggs').select('*').eq('player_id', currentUser.id).order('created_at');
      const grid = document.getElementById('daycare-egg-grid');
      document.getElementById('daycare-egg-count').textContent = eggs?.length || 0;
      if(!eggs || !eggs.length) { grid.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:16px 0;">Sin huevos en almacén.</div>'; return; }
      
      let badgeReady = false;
      grid.innerHTML = eggs.map(e => {
        const hAt = new Date(e.hatch_ready_time).getTime();
        const leftMs = Math.max(0, hAt - Date.now());
        const leftMin = Math.ceil(leftMs/60000);
        const pct = Math.min(100, Math.round(100 - (leftMs/(30*60*1000))*100));
        const pd = POKEMON_DB[e.species];
        const isReady = leftMs === 0;
        if(isReady) badgeReady = true;
        
        return `<div class="egg-card">
          <div class="egg-icon" style="${isReady ? 'animation:eggShake 0.6s infinite;' : ''}">🥚</div>
          <div class="egg-species">${pd ? pd.emoji + ' ' + pd.name : e.species}</div>
          <div class="egg-timer" style="${isReady ? 'color:#22c55e;font-weight:700;' : ''}">${isReady ? '¡Listo para recoger!' : `Eclosiona en ${leftMin} min`}</div>
          <div class="egg-progress-bar"><div class="egg-progress-fill" style="width:${pct}%"></div></div>
          ${isReady ? `<button onclick="collectEgg('${e.egg_id}', '${e.species}', ${e.shiny_roll}, '${escape(JSON.stringify(e.inherited_ivs))}')" style="margin-top:8px;background:var(--purple);color:#fff;border:none;border-radius:8px;padding:8px;font-family:'Press Start 2P';font-size:8px;cursor:pointer;">📥 Recoger</button>` : ''}
        </div>`;
      }).join('');
      
      document.getElementById('daycare-nav-badge').style.display = badgeReady ? 'block' : 'none';
    }

    async function collectEgg(eggId, sp, shiny, ivsJson) {
      const extra = {
        origin: 'breeding',
        isShiny: shiny,
        inherited_ivs: null
      };
      try { extra.inherited_ivs = JSON.parse(unescape(ivsJson)); } catch(e){}
      
      const added = addEgg(sp, 'breeding', extra);
      if (added) {
        await sb.from('eggs').delete().eq('egg_id', eggId);
        notify('¡Recogiste el huevo de la guardería! Ahora camina para eclosionarlo.', '🏠');
        renderDaycareUI();
        updateProfilePanel();
        scheduleSave();
      }
    }

    // ===== INIT =====
    updateHud();
