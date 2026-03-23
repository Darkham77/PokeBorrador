// ===== POKÉDEX (18_pokedex.js) =====

// The canonical Pokédex order for the first 151 pokémon
const POKEDEX_ORDER = [
  'bulbasaur','ivysaur','venusaur',
  'charmander','charmeleon','charizard',
  'squirtle','wartortle','blastoise',
  'caterpie','metapod','butterfree',
  'weedle','kakuna','beedrill',
  'pidgey','pidgeotto','pidgeot',
  'rattata','raticate',
  'spearow','fearow',
  'ekans','arbok',
  'pikachu','raichu',
  'sandshrew','sandslash',
  'nidoran_f','nidorina','nidoqueen',
  'nidoran_m','nidorino','nidoking',
  'clefairy','clefable',
  'vulpix','ninetales',
  'jigglypuff','wigglytuff',
  'zubat','golbat',
  'oddish','gloom','vileplume',
  'paras','parasect',
  'venonat','venomoth',
  'diglett','dugtrio',
  'meowth','persian',
  'psyduck','golduck',
  'mankey','primeape',
  'growlithe','arcanine',
  'poliwag','poliwhirl','poliwrath',
  'abra','kadabra','alakazam',
  'machop','machoke','machamp',
  'bellsprout','weepinbell','victreebel',
  'tentacool','tentacruel',
  'geodude','graveler','golem',
  'ponyta','rapidash',
  'slowpoke','slowbro',
  'magnemite','magneton',
  'farfetchd','doduo','dodrio',
  'seel','dewgong',
  'grimer','muk',
  'shellder','cloyster',
  'gastly','haunter','gengar',
  'onix','drowzee','hypno',
  'krabby','kingler',
  'voltorb','electrode',
  'exeggcute','exeggutor',
  'cubone','marowak',
  'hitmonlee','hitmonchan','lickitung',
  'koffing','weezing',
  'rhyhorn','rhydon',
  'chansey','tangela','kangaskhan',
  'horsea','seadra',
  'goldeen','seaking',
  'staryu','starmie',
  'mr_mime','scyther','jynx','electabuzz','magmar','pinsir','tauros',
  'magikarp','gyarados','lapras','ditto',
  'eevee','vaporeon','jolteon','flareon',
  'porygon','omanyte','omastar','kabuto','kabutops','aerodactyl',
  'snorlax','articuno','zapdos','moltres',
  'dratini','dragonair','dragonite',
  'mewtwo','mew'
];

// Type colors mapping for badges
const PDEX_TYPE_COLORS = {
  normal:'#aaa', fire:'#FF6B35', water:'#3B8BFF', grass:'#6BCB77',
  electric:'#FFD93D', ice:'#7DF9FF', fighting:'#FF3B3B', poison:'#C77DFF',
  ground:'#c8a060', flying:'#89CFF0', psychic:'#FF6EFF', bug:'#8BC34A',
  rock:'#c8a060', ghost:'#7B2FBE', dragon:'#5C16C5', dark:'#555', steel:'#9E9E9E'
};

// TMs that exist in the game for future completion
const GAME_TMS = [
  { id: 'TM01', name: 'Golpe Cabeza', type: 'normal' },
  { id: 'TM05', name: 'Rugido', type: 'normal' },
  { id: 'TM06', name: 'Tóxico', type: 'poison' },
  { id: 'TM08', name: 'Cuerpo Pesado', type: 'normal' },
  { id: 'TM09', name: 'Bomba Veneno', type: 'poison' },
  { id: 'TM10', name: 'Rayo Confuso', type: 'psychic' },
  { id: 'TM11', name: 'Rayo Solar', type: 'grass' },
  { id: 'TM13', name: 'Rayo Hielo', type: 'ice' },
  { id: 'TM14', name: 'Ventisca', type: 'ice' },
  { id: 'TM15', name: 'Hiperrayo', type: 'normal' },
  { id: 'TM17', name: 'Sumisión', type: 'fighting' },
  { id: 'TM18', name: 'Onda Trueno', type: 'electric' },
  { id: 'TM19', name: 'Megaagotar', type: 'grass' },
  { id: 'TM20', name: 'Ira', type: 'normal' },
  { id: 'TM24', name: 'Rayo', type: 'electric' },
  { id: 'TM25', name: 'Trueno', type: 'electric' },
  { id: 'TM26', name: 'Terremoto', type: 'ground' },
  { id: 'TM28', name: 'Excavar', type: 'ground' },
  { id: 'TM29', name: 'Psíquico', type: 'psychic' },
  { id: 'TM30', name: 'Teletransporte', type: 'psychic' },
  { id: 'TM31', name: 'Tierra Viva', type: 'ground' },
  { id: 'TM35', name: 'Lanzallamas', type: 'fire' },
  { id: 'TM36', name: 'Bomba Lodo', type: 'poison' },
  { id: 'TM38', name: 'Llamarada', type: 'fire' },
  { id: 'TM39', name: 'Cometa Draco', type: 'dragon' },
  { id: 'TM40', name: 'Tajo Aéreo', type: 'flying' },
  { id: 'TM44', name: 'Descanso', type: 'psychic' },
  { id: 'TM45', name: 'Atraer', type: 'normal' },
  { id: 'TM47', name: 'Acero Ala', type: 'steel' },
  { id: 'TM50', name: 'Sofocante', type: 'fire' },
];

// TM compatibility (pokémon that can learn each TM). Placeholder data ready to fill.
const TM_COMPAT = {
  // format: 'pokemonId': ['TM01', 'TM29', ...]
  bulbasaur: ['TM06','TM09','TM10','TM11','TM20','TM29','TM44'],
  ivysaur:   ['TM06','TM09','TM10','TM11','TM20','TM29','TM44'],
  venusaur:  ['TM06','TM09','TM10','TM11','TM20','TM29','TM44'],
  charmander:['TM06','TM08','TM10','TM15','TM17','TM20','TM35','TM38','TM44','TM50'],
  charmeleon:['TM06','TM08','TM10','TM15','TM17','TM20','TM35','TM38','TM44','TM50'],
  charizard: ['TM06','TM08','TM10','TM15','TM17','TM20','TM35','TM38','TM40','TM44','TM50'],
  squirtle:  ['TM06','TM08','TM10','TM13','TM17','TM20','TM28','TM44'],
  wartortle: ['TM06','TM08','TM10','TM13','TM17','TM20','TM28','TM44'],
  blastoise: ['TM06','TM08','TM10','TM13','TM14','TM15','TM17','TM20','TM28','TM44'],
  pikachu:   ['TM06','TM10','TM17','TM18','TM24','TM25','TM28','TM44'],
  raichu:    ['TM06','TM10','TM17','TM18','TM24','TM25','TM28','TM44'],
  mewtwo:    ['TM01','TM06','TM09','TM10','TM15','TM17','TM24','TM25','TM26','TM28','TM29','TM30','TM31','TM35','TM38','TM44'],
  mew:       ['TM01','TM05','TM06','TM08','TM09','TM10','TM11','TM13','TM14','TM15','TM17','TM18','TM19','TM20','TM24','TM25','TM26','TM28','TM29','TM30','TM31','TM35','TM36','TM38','TM39','TM40','TM44','TM45','TM47','TM50'],
};

function renderPokedex() {
  const grid = document.getElementById('pokedex-grid');
  if (!grid) return;

  const caught = state.pokedex || [];
  const seen = state.seenPokedex || [];

  // Update counters
  const seenCount = POKEDEX_ORDER.filter(id => seen.includes(id) && !caught.includes(id)).length;
  const caughtCount = POKEDEX_ORDER.filter(id => caught.includes(id)).length;
  const seenEl = document.getElementById('pokedex-seen-count');
  const caughtEl = document.getElementById('pokedex-caught-count');
  if (seenEl) seenEl.textContent = seenCount + caughtCount; // seen includes caught
  if (caughtEl) caughtEl.textContent = caughtCount;

  grid.innerHTML = POKEDEX_ORDER.map((id, idx) => {
    const num = String(idx + 1).padStart(3, '0');
    const isCaught = caught.includes(id);
    const isSeen = seen.includes(id);
    const spriteId = POKEMON_SPRITE_IDS[id];
    const pData = POKEMON_DB[id];
    const name = pData ? pData.name : id;

    if (!isCaught && !isSeen) {
      // Unseen: question mark
      return `<div class="pdex-cell pdex-unseen" title="#${num}">
        <div class="pdex-num">#${num}</div>
        <div class="pdex-sprite-wrap">
          <div class="pdex-question">?</div>
        </div>
        <div class="pdex-name pdex-name-hidden">???</div>
      </div>`;
    }

    const spriteUrl = spriteId
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`
      : '';

    const filterStyle = isCaught ? '' : 'filter:brightness(0);';
    const clickHandler = isCaught ? `onclick="showPokedexDetail('${id}')"` : '';
    const cursorStyle = isCaught ? 'cursor:pointer;' : 'cursor:default;';

    return `<div class="pdex-cell ${isCaught ? 'pdex-caught' : 'pdex-seen'}" 
                title="${isCaught ? name + ' #' + num : '#' + num + ' (Visto)'}" 
                style="${cursorStyle}" ${clickHandler}>
        <div class="pdex-num">#${num}</div>
        <div class="pdex-sprite-wrap">
          ${spriteUrl
            ? `<img src="${spriteUrl}" alt="${name}" style="width:56px;height:56px;image-rendering:pixelated;${filterStyle}" onerror="this.style.display='none'">`
            : `<div style="font-size:32px;line-height:56px;">${pData?.emoji || '?'}</div>`
          }
        </div>
        <div class="pdex-name ${isCaught ? '' : 'pdex-name-hidden'}">${isCaught ? name : '???'}</div>
      </div>`;
  }).join('');
}

function showPokedexDetail(pokemonId) {
  const pData = POKEMON_DB[pokemonId];
  if (!pData) return;

  const caught = state.pokedex || [];
  if (!caught.includes(pokemonId)) return; // only show info if caught

  const idx = POKEDEX_ORDER.indexOf(pokemonId);
  const num = idx >= 0 ? String(idx + 1).padStart(3, '0') : '???';
  const spriteId = POKEMON_SPRITE_IDS[pokemonId];
  const spriteUrl = spriteId
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`
    : '';

  const typeColors = PDEX_TYPE_COLORS;
  const type2Key = pokemonId in (typeof POKE_TYPE2 !== 'undefined' ? POKE_TYPE2 : {})
    ? POKE_TYPE2[pokemonId]
    : null;

  const typeBadge = (t) => t
    ? `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;
        background:${typeColors[t] || '#777'}22;border:1px solid ${typeColors[t] || '#777'};color:${typeColors[t] || '#eee'};
        text-transform:capitalize;">${t}</span>`
    : '';

  // Stats
  const STAT_LABELS = [
    { key: 'hp', label: 'HP', color: '#6BCB77' },
    { key: 'atk', label: 'Ataque', color: '#FF6B35' },
    { key: 'def', label: 'Defensa', color: '#3B8BFF' },
    { key: 'spa', label: 'At. Esp', color: '#C77DFF' },
    { key: 'spd', label: 'Def. Esp', color: '#89CFF0' },
    { key: 'spe', label: 'Velocidad', color: '#FFD93D' },
  ];
  const maxStat = 255;
  const statsHtml = STAT_LABELS.map(s => {
    const val = pData[s.key] || 0;
    const pct = Math.round((val / maxStat) * 100);
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <div style="width:70px;font-size:10px;color:#aaa;text-align:right;">${s.label}</div>
      <div style="font-size:11px;font-weight:700;color:${s.color};width:30px;text-align:right;">${val}</div>
      <div style="flex:1;background:rgba(255,255,255,0.08);border-radius:10px;height:8px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${s.color};border-radius:10px;transition:width 0.6s;"></div>
      </div>
    </div>`;
  }).join('');

  // Abilities
  const abilityList = ABILITIES[pokemonId] || [];
  const abilitiesHtml = abilityList.map(ab => {
    const desc = (typeof ABILITY_DATA !== 'undefined' && ABILITY_DATA[ab]) || '';
    return `<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:8px 12px;margin-bottom:6px;">
      <div style="font-weight:700;font-size:12px;color:#fff;">${ab}</div>
      ${desc ? `<div style="font-size:10px;color:#aaa;margin-top:2px;">${desc}</div>` : ''}
    </div>`;
  }).join('') || '<div style="color:#777;font-size:11px;">—</div>';


  // Learnset table
  const learnset = pData.learnset || [];
  const learnsetHtml = learnset.length > 0
    ? `<table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="color:#aaa;border-bottom:1px solid rgba(255,255,255,0.1);">
            <th style="text-align:left;padding:4px 6px;font-weight:600;">Nv.</th>
            <th style="text-align:left;padding:4px 6px;font-weight:600;">Movimiento</th>
            <th style="text-align:right;padding:4px 6px;font-weight:600;">PP</th>
          </tr>
        </thead>
        <tbody>
          ${learnset.map(m => {
            const md = (typeof MOVE_DATA !== 'undefined' && MOVE_DATA[m.name]) || {};
            const mColor = typeColors[md.type] || '#aaa';
            return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
              <td style="padding:5px 6px;color:var(--yellow);font-weight:700;">${m.lv}</td>
              <td style="padding:5px 6px;">
                <span style="font-weight:600;color:#fff;">${m.name}</span>
                ${md.type ? `<span style="margin-left:6px;font-size:9px;padding:1px 6px;border-radius:10px;background:${mColor}33;color:${mColor};text-transform:capitalize;">${md.type}</span>` : ''}
              </td>
              <td style="padding:5px 6px;text-align:right;color:#aaa;">${m.pp}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`
    : '<div style="color:#777;font-size:11px;">Sin movimientos registrados</div>';

  // TM section
  const pokeTMs = TM_COMPAT[pokemonId] || [];
  const tmsHtml = GAME_TMS.length > 0
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${GAME_TMS.map(tm => {
          const learnsTM = pokeTMs.includes(tm.id);
          const tmColor = typeColors[tm.type] || '#aaa';
          return `<div title="${tm.name}" style="display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:8px;
            background:${learnsTM ? tmColor + '22' : 'rgba(255,255,255,0.04)'};
            border:1px solid ${learnsTM ? tmColor : 'rgba(255,255,255,0.1)'};
            opacity:${learnsTM ? '1' : '0.4'};">
            <span style="font-size:9px;font-weight:700;color:${learnsTM ? tmColor : '#666'};">${tm.id}</span>
            <span style="font-size:9px;color:${learnsTM ? '#eee' : '#555'};">${tm.name}</span>
          </div>`;
        }).join('')}
      </div>`
    : '<div style="color:#777;font-size:11px;">Próximamente</div>';

  // Evolutions section
  const evoTable = typeof EVOLUTION_TABLE !== 'undefined' ? EVOLUTION_TABLE : {};
  const stoneEvoTable = typeof STONE_EVOLUTIONS !== 'undefined' ? STONE_EVOLUTIONS : {};
  const tradeEvoTable = typeof TRADE_EVOLUTIONS !== 'undefined' ? TRADE_EVOLUTIONS : {};
  
  const possibleEvos = [];
  
  // Level up
  if (evoTable[pokemonId]) {
    possibleEvos.push({ 
      method: `Nivel ${evoTable[pokemonId].level}`, 
      toId: evoTable[pokemonId].to 
    });
  }
  
  // Stone
  if (pokemonId === 'eevee') {
    possibleEvos.push({ method: '💧 Piedra Agua', toId: 'vaporeon' });
    possibleEvos.push({ method: '⚡ Piedra Trueno', toId: 'jolteon' });
    possibleEvos.push({ method: '🔥 Piedra Fuego', toId: 'flareon' });
  } else if (stoneEvoTable[pokemonId]) {
    possibleEvos.push({ 
      method: stoneEvoTable[pokemonId].stone, 
      toId: stoneEvoTable[pokemonId].to 
    });
  }
  
  // Trade
  if (tradeEvoTable[pokemonId]) {
    possibleEvos.push({ 
      method: 'Intercambio', 
      toId: tradeEvoTable[pokemonId] 
    });
  }

  const evosHtml = possibleEvos.length > 0
    ? `<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;">
        ${possibleEvos.map(evo => {
          const toData = POKEMON_DB[evo.toId] || {};
          const toName = toData.name || evo.toId;
          const isCaught = caught.includes(evo.toId);
          const evoSpriteId = POKEMON_SPRITE_IDS[evo.toId];
          const evoSpriteUrl = evoSpriteId 
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evoSpriteId}.png` 
            : '';
          
          return `<div style="display:flex;flex-direction:column;align-items:center;background:rgba(255,255,255,0.05);border-radius:12px;padding:12px;width:100px;">
            ${evoSpriteUrl 
              ? `<img src="${evoSpriteUrl}" alt="${toName}" style="width:64px;height:64px;image-rendering:pixelated;${isCaught ? '' : 'filter:brightness(0);opacity:0.6;'}">`
              : `<div style="font-size:32px;line-height:64px;">?</div>`
            }
            <div style="font-size:10px;font-weight:bold;color:${isCaught ? '#fff' : '#666'};margin-top:6px;text-align:center;">${isCaught ? toName : '???'}</div>
            <div style="font-size:8px;color:#aaa;margin-top:4px;text-align:center;background:rgba(0,0,0,0.2);padding:4px;border-radius:4px;width:100%;">${evo.method}</div>
          </div>`;
        }).join('')}
      </div>`
    : '<div style="color:#777;font-size:11px;">Este Pokémon no tiene evoluciones conocidas.</div>';

  const modalEl = document.getElementById('pokedex-modal');
  if (!modalEl) return;

  modalEl.innerHTML = `
    <div style="background:#16213e;border-radius:24px;padding:0;width:100%;max-width:540px;
        max-height:88vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.1);
        box-shadow:0 20px 60px rgba(0,0,0,0.8);position:relative;">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:16px;padding:20px 20px 0;background:linear-gradient(180deg,rgba(255,255,255,0.05) 0%,transparent 100%);border-radius:24px 24px 0 0;">
        <div style="position:relative;">
          ${spriteUrl
            ? `<img src="${spriteUrl}" alt="${pData.name}" style="width:80px;height:80px;image-rendering:pixelated;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.6));">`
            : `<div style="font-size:56px;width:80px;text-align:center;">${pData.emoji || '?'}</div>`
          }
          ${pData.isShiny ? `<span style="position:absolute;top:-4px;right:-4px;font-size:14px;">✨</span>` : ''}
        </div>
        <div style="flex:1;">
          <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--gray);margin-bottom:4px;">#${num}</div>
          <div style="font-family:'Press Start 2P',monospace;font-size:13px;color:var(--yellow);margin-bottom:8px;">${pData.name}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${typeBadge(pData.type)}
            ${typeBadge(type2Key)}
          </div>
        </div>
        <button onclick="closePokedexModal()" 
          style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.1);border:none;color:#aaa;
          font-size:18px;cursor:pointer;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>

      <!-- Tabs -->
      <div id="pdex-tabs" style="display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,0.08);margin-top:16px;">
        ${['stats','moves','tms','evos'].map((tab, i) => `
          <button onclick="switchPdexTab('${tab}')" id="pdex-tab-${tab}"
            style="flex:1;padding:10px;border:none;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;
            background:${i===0?'rgba(255,255,255,0.06)':'transparent'};
            color:${i===0?'var(--yellow)':'#777'};
            border-bottom:${i===0?'2px solid var(--yellow)':'2px solid transparent'};
            transition:all 0.2s;">
            ${{stats:'📊 Stats',moves:'📖 Mov.',tms:'💿 MTs',evos:'✨ Evol.'}[tab]}
          </button>`).join('')}
      </div>

      <!-- Panels -->
      <div id="pdex-panel-stats" style="padding:20px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);margin-bottom:14px;">ESTADÍSTICAS BASE</div>
        ${statsHtml}
        <div style="margin-top:16px;">
          <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);margin-bottom:10px;">HABILIDADES</div>
          ${abilitiesHtml}
        </div>
      </div>

      <div id="pdex-panel-moves" style="padding:20px;display:none;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);margin-bottom:14px;">MOVIMIENTOS POR NIVEL</div>
        ${learnsetHtml}
      </div>

      <div id="pdex-panel-tms" style="padding:20px;display:none;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);margin-bottom:14px;">MTs COMPATIBLES</div>
        <div style="font-size:10px;color:#666;margin-bottom:12px;">Las MTs resaltadas pueden ser aprendidas por este Pokémon.</div>
        ${tmsHtml}
      </div>

      <div id="pdex-panel-evos" style="padding:20px;display:none;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);margin-bottom:14px;">EVOLUCIONES</div>
        ${evosHtml}
      </div>
    </div>
  `;

  modalEl.style.display = 'flex';
  modalEl.style.alignItems = 'center';
  modalEl.style.justifyContent = 'center';
  // Close on backdrop click
  modalEl.onclick = function(e) {
    if (e.target === modalEl) closePokedexModal();
  };
}

function closePokedexModal() {
  const modalEl = document.getElementById('pokedex-modal');
  if (modalEl) modalEl.style.display = 'none';
}

function switchPdexTab(tab) {
  ['stats','moves','tms','evos'].forEach(t => {
    const panel = document.getElementById(`pdex-panel-${t}`);
    const btn = document.getElementById(`pdex-tab-${t}`);
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
    if (btn) {
      btn.style.background = t === tab ? 'rgba(255,255,255,0.06)' : 'transparent';
      btn.style.color = t === tab ? 'var(--yellow)' : '#777';
      btn.style.borderBottom = t === tab ? '2px solid var(--yellow)' : '2px solid transparent';
    }
  });
}

// Hook into the showTab function to render pokédex when tab is opened
(function() {
  const _origShowTab = typeof showTab === 'function' ? showTab : null;
  // Use a MutationObserver or override after page load
  window.addEventListener('DOMContentLoaded', () => {
    // Nothing extra needed — renderPokedex is called in 05_render.js when tab=pokedex
  });
})();

function syncRetroactivePokedex() {
  if (!state.pokedex) state.pokedex = [];
  if (!state.seenPokedex) state.seenPokedex = [];

  let updated = false;
  const registerOwned = (p) => {
    if (!p || !p.id) return;
    const baseId = p.id;
    if (!state.seenPokedex.includes(baseId)) {
      state.seenPokedex.push(baseId);
      updated = true;
    }
    if (!state.pokedex.includes(baseId)) {
      state.pokedex.push(baseId);
      updated = true;
    }
  };

  if (state.team) state.team.forEach(registerOwned);
  if (state.box) state.box.forEach(registerOwned);

  if (updated) {
    console.log("[POKEDEX] Retroactive sync applied. Updated Pokédex entries.");
  }
}
