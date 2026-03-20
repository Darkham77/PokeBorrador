// ===== BREEDING ENGINE =====
const EGG_GROUPS = {
  abra: ['humanshape'],
  aerodactyl: ['flying'],
  alakazam: ['humanshape'],
  arbok: ['dragon', 'ground'],
  arcanine: ['ground'],
  articuno: ['no-eggs'],
  beedrill: ['bug'],
  bellsprout: ['plant'],
  blastoise: ['monster', 'water1'],
  bulbasaur: ['monster', 'plant'],
  butterfree: ['bug'],
  caterpie: ['bug'],
  chansey: ['fairy'],
  charizard: ['dragon', 'monster'],
  charmander: ['dragon', 'monster'],
  charmeleon: ['dragon', 'monster'],
  clefable: ['fairy'],
  clefairy: ['fairy'],
  cleffa: ['no-eggs'],
  cloyster: ['water3'],
  cubone: ['monster'],
  dewgong: ['ground', 'water1'],
  diglett: ['ground'],
  ditto: ['ditto'],
  dodrio: ['flying'],
  doduo: ['flying'],
  dragonair: ['dragon', 'water1'],
  dragonite: ['dragon', 'water1'],
  dratini: ['dragon', 'water1'],
  drowzee: ['humanshape'],
  dugtrio: ['ground'],
  eevee: ['ground'],
  ekans: ['dragon', 'ground'],
  electabuzz: ['humanshape'],
  electrode: ['mineral'],
  elekid: ['no-eggs'],
  exeggcute: ['plant'],
  exeggutor: ['plant'],
  farfetchd: ['flying', 'ground'],
  fearow: ['flying'],
  flareon: ['ground'],
  gastly: ['indeterminate'],
  gengar: ['indeterminate'],
  geodude: ['mineral'],
  gloom: ['plant'],
  golbat: ['flying'],
  goldeen: ['water2'],
  golduck: ['ground', 'water1'],
  golem: ['mineral'],
  graveler: ['mineral'],
  grimer: ['indeterminate'],
  growlithe: ['ground'],
  gyarados: ['dragon', 'water2'],
  haunter: ['indeterminate'],
  hitmonchan: ['humanshape'],
  hitmonlee: ['humanshape'],
  horsea: ['dragon', 'water1'],
  hypno: ['humanshape'],
  igglybuff: ['no-eggs'],
  ivysaur: ['monster', 'plant'],
  jigglypuff: ['fairy'],
  jolteon: ['ground'],
  jynx: ['humanshape'],
  kabuto: ['water1', 'water3'],
  kabutops: ['water1', 'water3'],
  kadabra: ['humanshape'],
  kakuna: ['bug'],
  kangaskhan: ['monster'],
  kingler: ['water3'],
  koffing: ['indeterminate'],
  krabby: ['water3'],
  lapras: ['monster', 'water1'],
  lickitung: ['monster'],
  machamp: ['humanshape'],
  machoke: ['humanshape'],
  machop: ['humanshape'],
  magby: ['no-eggs'],
  magikarp: ['dragon', 'water2'],
  magmar: ['humanshape'],
  magnemite: ['mineral'],
  magneton: ['mineral'],
  mankey: ['ground'],
  marowak: ['monster'],
  meowth: ['ground'],
  metapod: ['bug'],
  mew: ['no-eggs'],
  mewtwo: ['no-eggs'],
  moltres: ['no-eggs'],
  mr_mime: ['humanshape'],
  muk: ['indeterminate'],
  nidoking: ['ground', 'monster'],
  nidoqueen: ['no-eggs'],
  nidoran_f: ['ground', 'monster'],
  nidoran_m: ['ground', 'monster'],
  nidorina: ['no-eggs'],
  nidorino: ['ground', 'monster'],
  ninetales: ['ground'],
  oddish: ['plant'],
  omanyte: ['water1', 'water3'],
  omastar: ['water1', 'water3'],
  onix: ['mineral'],
  paras: ['bug', 'plant'],
  parasect: ['bug', 'plant'],
  persian: ['ground'],
  pichu: ['no-eggs'],
  pidgeot: ['flying'],
  pidgeotto: ['flying'],
  pidgey: ['flying'],
  pikachu: ['fairy', 'ground'],
  pinsir: ['bug'],
  poliwag: ['water1'],
  poliwhirl: ['water1'],
  poliwrath: ['water1'],
  ponyta: ['ground'],
  porygon: ['mineral'],
  primeape: ['ground'],
  psyduck: ['ground', 'water1'],
  raichu: ['fairy', 'ground'],
  rapidash: ['ground'],
  raticate: ['ground'],
  rattata: ['ground'],
  rhydon: ['ground', 'monster'],
  rhyhorn: ['ground', 'monster'],
  sandshrew: ['ground'],
  sandslash: ['ground'],
  scyther: ['bug'],
  seadra: ['dragon', 'water1'],
  seaking: ['water2'],
  seel: ['ground', 'water1'],
  shellder: ['water3'],
  slowbro: ['monster', 'water1'],
  slowpoke: ['monster', 'water1'],
  snorlax: ['monster'],
  spearow: ['flying'],
  squirtle: ['monster', 'water1'],
  starmie: ['water3'],
  staryu: ['water3'],
  tangela: ['plant'],
  tauros: ['ground'],
  tentacool: ['water3'],
  tentacruel: ['water3'],
  togepi: ['no-eggs'],
  vaporeon: ['ground'],
  venomoth: ['bug'],
  venonat: ['bug'],
  venusaur: ['monster', 'plant'],
  victreebel: ['plant'],
  vileplume: ['plant'],
  voltorb: ['mineral'],
  vulpix: ['ground'],
  wartortle: ['monster', 'water1'],
  weedle: ['bug'],
  weepinbell: ['plant'],
  weezing: ['indeterminate'],
  wigglytuff: ['fairy'],
  zapdos: ['no-eggs'],
  zubat: ['flying'],
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
  bulbasaur: ['leaf_storm', 'power_whip', 'ingrain'], charmander: ['dragon_rage', 'flare_blitz', 'dragon_dance'],
  squirtle: ['aqua_jet', 'mirror_coat', 'water_spout'], pikachu: ['volt_tackle', 'fake_out', 'encore'],
  eevee: ['wish', 'synchronoise', 'detect'], meowth: ['payday', 'hypnosis'], machop: ['dynamic_punch', 'bullet_punch'],
  gastly: ['perish_song', 'disable'], snorlax: ['pursuit', 'curse'], lapras: ['freeze_dry', 'ancient_power']
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
  const b = { ivysaur: 'bulbasaur', venusaur: 'bulbasaur', charmeleon: 'charmander', charizard: 'charmander', wartortle: 'squirtle', blastoise: 'squirtle', raichu: 'pikachu', vaporeon: 'eevee', jolteon: 'eevee', flareon: 'eevee', haunter: 'gastly', gengar: 'gastly', machoke: 'machop', machamp: 'machop', graveler: 'geodude', golem: 'geodude', gyarados: 'magikarp' };
  return b[id] || id;
}
function checkCompatibility(pA, pB) {
  const idA = _breedingBaseId(pA.id);
  const idB = _breedingBaseId(pB.id);
  const gA = _breedingEggGroups(idA);
  const gB = _breedingEggGroups(idB);
  const shared = gA.filter(g => gB.includes(g) && g !== 'ditto');
  const LEGENDARIES = ['mewtwo', 'mew', 'articuno', 'zapdos', 'moltres'];
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
  const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const ivs = {}; STATS.forEach(s => ivs[s] = Math.floor(Math.random() * 32));
  
  const powerMap = {
      'Pesa Recia': 'hp',
      'Brazal Recio': 'atk',
      'Cinto Recio': 'def',
      'Lente Recia': 'spa',
      'Banda Recia': 'spd',
      'Franja Recia': 'spe'
  };
  
  let forcedA = null, forcedB = null;
  if (iA && powerMap[iA]) forcedA = powerMap[iA];
  if (iB && powerMap[iB]) forcedB = powerMap[iB];
  
  if (forcedA) ivs[forcedA] = pA.ivs[forcedA];
  if (forcedB && forcedB !== forcedA) ivs[forcedB] = pB.ivs[forcedB];
  else if (forcedB && forcedB === forcedA) {
      ivs[forcedB] = Math.random() < 0.5 ? pA.ivs[forcedB] : pB.ivs[forcedB];
  }
  
  const forcedCount = (forcedA && forcedB && forcedA !== forcedB) ? 2 : ((forcedA || forcedB) ? 1 : 0);
  let count = Math.max(0, 3 - forcedCount);
  
  const rem = STATS.filter(s => s !== forcedA && s !== forcedB).sort(() => Math.random() - 0.5).slice(0, count);
  rem.forEach(s => ivs[s] = Math.random() < 0.5 ? pA.ivs[s] : pB.ivs[s]);
  
  return ivs;
}

function _daycareStatLabel(stat) {
  const map = { hp: 'PS', atk: 'ATK', def: 'DEF', spa: 'AT.E', spd: 'DF.E', spe: 'VEL' };
  return map[stat] || stat;
}
function _daycareEggIntervalText(level) {
  const ms = EGG_SPAWN_INTERVAL_MS[level];
  if (!ms) return '—';
  const hrs = Math.round(ms / 3600000);
  return `${hrs}h`;
}
function _daycareInheritanceInfo() {
  const count = 3;
  const pickChance = count / 6;
  const aChance = Math.round((pickChance / 2) * 100);
  const bChance = aChance;
  const rChance = Math.round((1 - pickChance) * 100);

  return { count, hasDK: false, aChance, bChance, rChance, forcedLine: '' };
}
function renderDaycareBreedingSummary(pA, pB, compat, itemA = '', itemB = '') {
  const cost = calculateBreedingCost(pA, pB);
  const intervalTxt = (compat && compat.level > 0) ? _daycareEggIntervalText(compat.level) : '—';
  const motherId = compat && compat.eggSpecies ? compat.eggSpecies : null;
  const motherName = motherId ? (POKEMON_DB[motherId]?.name || motherId) : '—';
  
  const powerMap = {
      'Pesa Recia': { stat: 'hp', label: 'PS' },
      'Brazal Recio': { stat: 'atk', label: 'Ataque' },
      'Cinto Recio': { stat: 'def', label: 'Defensa' },
      'Lente Recia': { stat: 'spa', label: 'At. Especial' },
      'Banda Recia': { stat: 'spd', label: 'Def. Especial' },
      'Franja Recia': { stat: 'spe', label: 'Velocidad' }
  };

  let guaranteedNature = 'Aleatoria (1/20)';
  if (itemA === 'Piedra Eterna' && itemB === 'Piedra Eterna') {
      guaranteedNature = `${pA.nature} o ${pB.nature} (50/50)`;
  } else if (itemA === 'Piedra Eterna') {
      guaranteedNature = `<span style="color:var(--yellow);">${pA.nature}</span>`;
  } else if (itemB === 'Piedra Eterna') {
      guaranteedNature = `<span style="color:var(--yellow);">${pB.nature}</span>`;
  }

  let forcedA = powerMap[itemA] ? powerMap[itemA] : null;
  let forcedB = powerMap[itemB] ? powerMap[itemB] : null;

  let guaranteedIVs = [];
  if (forcedA) guaranteedIVs.push(`✓ 100% de ${forcedA.label} (${pA.name})`);
  if (forcedB && (!forcedA || forcedB.stat !== forcedA.stat)) guaranteedIVs.push(`✓ 100% de ${forcedB.label} (${pB.name})`);
  else if (forcedB && forcedA && forcedB.stat === forcedA.stat) {
      guaranteedIVs = [`✓ 50% ${forcedA.label} (${pA.name}) / 50% (${pB.name})`];
  }
  const ivText = guaranteedIVs.length > 0 ? guaranteedIVs.join('<br>') : '<span style="color:var(--gray);">3 stats al azar (Madre/Padre)</span>';

  return `
    <div style="background:linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95)); border:1px solid rgba(139,92,246,0.5); border-radius:16px; padding:16px; box-shadow:0 8px 32px rgba(0,0,0,0.6); text-align:left; position:relative; overflow:hidden;">
      <div style="position:absolute; top:-20px; right:-20px; font-size:100px; opacity:0.03; z-index:0;">🧬</div>
      <div style="text-align:center; font-family:'Press Start 2P', monospace; font-size:10px; color:var(--purple); margin-bottom:16px; text-shadow:0 0 10px rgba(139,92,246,0.5); position:relative; z-index:1;">PRONÓSTICO DE CRÍA</div>
      
      <div style="display:flex; flex-direction:column; gap:12px; position:relative; z-index:1;">
        <!-- Especie -->
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.4); padding:10px 12px; border-radius:10px; border-left:4px solid var(--green);">
          <span style="font-size:10px; color:var(--gray); font-family:'Press Start 2P', monospace;">ESPECIE</span>
          <span style="font-size:12px; font-weight:800; color:#fff;">🥚 ${motherName}</span>
        </div>

        <!-- Naturaleza -->
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.4); padding:10px 12px; border-radius:10px; border-left:4px solid var(--yellow);">
          <span style="font-size:10px; color:var(--gray); font-family:'Press Start 2P', monospace;">NATURALEZA</span>
          <span style="font-size:11px; font-weight:700; color:#fff; text-align:right;">${guaranteedNature}</span>
        </div>

        <!-- IVs -->
        <div style="background:rgba(0,0,0,0.4); padding:12px; border-radius:10px; border-left:4px solid var(--blue);">
          <div style="font-size:10px; color:var(--gray); font-family:'Press Start 2P', monospace; margin-bottom:8px;">GENÉTICA (IVs)</div>
          <div style="font-size:11px; font-weight:700; color:var(--blue); line-height:1.6;">
            ${ivText}
          </div>
        </div>
      </div>
      
      <div style="margin-top:16px; padding-top:12px; border-top:1px dashed rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center; position:relative; z-index:1;">
        <div style="font-size:10px; color:var(--gray);">Costo: <span style="color:var(--yellow); font-weight:800;">$${cost.toLocaleString()}</span></div>
        <div style="font-size:10px; color:var(--gray);">Tiempo: <span style="color:var(--green); font-weight:800;">${intervalTxt}</span></div>
      </div>
    </div>
  `;
} let _daycareTimer = null;
let _activeDaycareSlots = [];
async function loadDaycareSlots() {
  if (!currentUser) return [];
  const { data } = await sb.from('daycare_slots').select('*').eq('player_id', currentUser.id).order('slot_index');
  const hydrated = (data || []).map(s => {
    const p = state.team.find(x => x.uid === s.pokemon_id) || (state.box && state.box.find(x => x.uid === s.pokemon_id));
    return { ...s, pokemon: p };
  });
  _activeDaycareSlots = hydrated;
  return hydrated;
}
async function updateDaycareSummary() {
    const slots = await loadDaycareSlots();
    if (slots.length === 2 && slots[0].pokemon && slots[1].pokemon) {
        const compat = checkCompatibility(slots[0].pokemon, slots[1].pokemon);
        const midCard = document.getElementById('daycare-mid-card');
        const selA = document.getElementById('slot-a-item')?.value || '';
        const selB = document.getElementById('slot-b-item')?.value || '';
        if (midCard) {
            midCard.innerHTML = renderDaycareBreedingSummary(slots[0].pokemon, slots[1].pokemon, compat, selA, selB);
        }
    }
}

async function renderDaycareUI() {
  const slots = await loadDaycareSlots();
  renderDaycareSlot('a', slots.find(s => s.slot_index === 1));
  renderDaycareSlot('b', slots.find(s => s.slot_index === 2));
  const compat = (slots.length === 2 && slots[0].pokemon && slots[1].pokemon) ? checkCompatibility(slots[0].pokemon, slots[1].pokemon) : { level: 0 };
  const ind = document.getElementById('daycare-compat-bar');
  const info = COMPAT_TEXT[compat.level];
  ind.textContent = slots.length === 2 ? info.label : '🔎 Deposita 2 Pokémon para compatibilidad';
  ind.style.background = slots.length === 2 ? info.color + '22' : 'rgba(255,255,255,0.05)';
  ind.style.color = slots.length === 2 ? info.color : '#fff';
  const midCard = document.getElementById('daycare-mid-card');
  const slotsGrid = document.getElementById('daycare-slots-grid');
  if (midCard && slotsGrid) {
    const hasPair = slots.length === 2 && slots[0].pokemon && slots[1].pokemon;
    if (hasPair) {
      slotsGrid.classList.add('has-mid');
      midCard.style.display = 'block';
      const selA = document.getElementById('slot-a-item')?.value || '';
      const selB = document.getElementById('slot-b-item')?.value || '';
      midCard.innerHTML = renderDaycareBreedingSummary(slots[0].pokemon, slots[1].pokemon, compat, selA, selB);
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
  renderDaycareMission();
}
function populateDaycareItemSelect(slotId) {
    const sel = document.getElementById(`slot-${slotId}-item`);
    if (!sel) return;
    const currentVal = sel.value;
    const inv = state.inventory || {};
    const validItems = [
        { id: 'Piedra Eterna', label: '🪨 Piedra Eterna' },
        { id: 'Pesa Recia', label: '🏋️ Pesa Recia (PS)' },
        { id: 'Brazal Recio', label: '🥊 Brazal Recio (ATK)' },
        { id: 'Cinto Recio', label: '🛡️ Cinto Recio (DEF)' },
        { id: 'Lente Recia', label: '🔍 Lente Recia (SPA)' },
        { id: 'Banda Recia', label: '🎗️ Banda Recia (SPD)' },
        { id: 'Franja Recia', label: '👢 Franja Recia (SPE)' }
    ];
    let html = '<option value="">-- Sin Ítem --</option>';
    validItems.forEach(item => {
        const qty = inv[item.id] || 0;
        if (qty > 0) {
            html += `<option value="${item.id}" ${currentVal === item.id ? 'selected' : ''}>${item.label} (x${qty})</option>`;
        }
    });
    sel.innerHTML = html;
}

function renderDaycareSlot(id, slot) {
  const has = slot && slot.pokemon;
  const itemContainer = document.getElementById(`slot-${id}-item-container`);
  document.getElementById(`slot-${id}-deposit-btn`).style.display = has ? 'none' : 'block';
  document.getElementById(`slot-${id}-withdraw-btn`).style.display = has ? 'block' : 'none';
  if (has) {
    const p = slot.pokemon;
    const sUrl = getSpriteUrl(p.id, p.isShiny);
    document.getElementById(`slot-${id}-sprite`).innerHTML = sUrl ? `<img src="${sUrl}">` : p.emoji;
    document.getElementById(`slot-${id}-name`).innerHTML = `${p.name} <span class="daycare-slot-level">Nv.${p.level}</span>`;
    document.getElementById(`slot-${id}-info`).innerHTML = `<span class="daycare-slot-info-label">IVs</span> <span class="daycare-slot-info-values">${p.ivs.hp}/${p.ivs.atk}/${p.ivs.def}/${p.ivs.spa}/${p.ivs.spd}/${p.ivs.spe}</span><span class="daycare-slot-info-sep">•</span><span class="daycare-slot-info-label">Gen</span> <span class="daycare-slot-info-values">${genderSymbol(p.gender)}</span><span class="daycare-slot-info-sep">•</span><span class="daycare-slot-info-label">Vig</span> <span class="daycare-slot-info-values">⚡${p.vigor || 0}</span>`;
    if (itemContainer) { itemContainer.style.display = 'block'; populateDaycareItemSelect(id); }
  } else {
    document.getElementById(`slot-${id}-sprite`).innerHTML = '❓';
    document.getElementById(`slot-${id}-name`).innerHTML = '— Vacía —';
    document.getElementById(`slot-${id}-info`).textContent = '';
    if (itemContainer) { itemContainer.style.display = 'none'; document.getElementById(`slot-${id}-item`).value = ''; }
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
  
  let allPoks = [...state.team, ...(state.box || [])].filter(p => !_activeDaycareSlots.some(s => s.pokemon_id === p.uid));
  
  if (compareTo) {
    allPoks.sort((a, b) => {
      const cpA = checkCompatibility(compareTo, a).level;
      const cpB = checkCompatibility(compareTo, b).level;
      return cpB - cpA;
    });
  }

  bModal.innerHTML = `
        <div style="font-family:'Press Start 2P';font-size:12px;margin-bottom:16px;color:var(--yellow);text-align:center;">Elegi un Pokemon (${slotLabel})</div>
        ${compareHint}
        <div style="max-height:60vh;overflow-y:auto;display:grid;grid-template-columns:1fr;gap:10px;">
          ${allPoks.map(p => _pickerHtml(p, compareTo)).join('')}
        </div>
        <button onclick="document.getElementById('bag-overlay').style.display='none'" style="margin-top:16px;width:100%;padding:14px;border-radius:12px;background:rgba(255,255,255,0.1);color:#fff;font-family:'Press Start 2P';font-size:10px;border:none;">CANCELAR</button>
      `;
}
function calculateBreedingCost(pA, pB) {
  const isPerfect = (v) => v === 30 || v === 31;
  let perfectCount = 0;
  if(pA && pA.ivs) Object.values(pA.ivs).forEach(v => { if(isPerfect(v)) perfectCount++; });
  if(pB && pB.ivs) Object.values(pB.ivs).forEach(v => { if(isPerfect(v)) perfectCount++; });
  if (perfectCount <= 2) return 2000;
  if (perfectCount <= 5) return 5000;
  if (perfectCount <= 8) return 12000;
  if (perfectCount <= 11) return 25000;
  return 50000;
}

function _pickerHtml(p, compareTo) {
  if (_activeDaycareSlots.some(s => s.pokemon_id === p.uid)) return ''; // already in daycare
  if (typeof ensureVigor === 'function') ensureVigor(p);
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
  let inlineCompat = '';
  let borderStyle = 'border:1px solid rgba(255,255,255,0.06);';

  if (compareTo) {
    const cp = checkCompatibility(compareTo, p);
    const info = COMPAT_TEXT[cp.level] || COMPAT_TEXT[0];
    
    // Inline label for the info bar
    if (cp.level > 0) {
      inlineCompat = `<span style="color:${info.color}; font-size:10px; font-weight:800; background:${info.color}15; padding: 1px 6px; border-radius: 4px; margin-left: 4px;">${info.label}</span>`;
    } else {
       inlineCompat = `<span style="color:var(--gray); font-size:10px; margin-left: 4px;">Incompatible</span>`;
    }
    const intMs = cp.level > 0 ? EGG_SPAWN_INTERVAL_MS[cp.level] : null;
    const every = intMs ? `${Math.round(intMs / 3600000)}h` : '—';
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

  const isExhausted = p.vigor <= 0;
  const clickAction = isExhausted ? `notify('Este Pokémon está agotado (Vigor 0). No puede criar más.', '💤')` : `confirmDeposit('${p.uid}')`;
  if (isExhausted) {
      borderStyle = `border:1px solid rgba(255,69,58,0.4); background:rgba(255,69,58,0.05); filter: grayscale(0.5); opacity: 0.8;`;
  }

  return `<div onclick="${clickAction}" style="${borderStyle}border-radius:12px;padding:12px;display:flex;align-items:flex-start;gap:12px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.transform='translateX(4px)';this.style.borderColor='rgba(255,255,255,0.2)';" onmouseout="this.style.transform='none';this.style.borderColor='${compareTo && checkCompatibility(compareTo, p).level > 0 ? COMPAT_TEXT[checkCompatibility(compareTo, p).level].color + '44' : 'rgba(255,255,255,0.06)'}';">
        <div style="text-align:center;">
          <div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);border-radius:8px;">
            ${sUrl ? `<img src="${sUrl}" style="width:48px;height:48px;image-rendering:pixelated;">` : `<span style="font-size:28px;">${p.emoji || '❓'}</span>`}
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
                ${inlineCompat}
                <span style="color:var(--yellow);margin-left:auto;">⚡${p.vigor || 0}</span>
	          </div>
          ${compatHtml}
        </div>
      </div>`;
}

async function confirmDeposit(uid) {
  const pToDeposit = state.team.find(p => p.uid === uid) || (state.box && state.box.find(p => p.uid === uid));
  const otherIdx = _depositingSlot === 1 ? 2 : 1;
  const otherSlot = _activeDaycareSlots.find(s => s.slot_index === otherIdx);
  
  if (otherSlot && otherSlot.pokemon && pToDeposit) {
      // Check compat
      const cpVal = checkCompatibility(pToDeposit, otherSlot.pokemon);
      if (cpVal.level > 0) {
          const cost = calculateBreedingCost(pToDeposit, otherSlot.pokemon);
          if (state.money < cost) {
              notify(`No tienes suficiente dinero. La crianza cuesta $${cost.toLocaleString()}.`, '💰');
              return;
          }
          if (!confirm(`Poner a criar esta pareja costará $${cost.toLocaleString()}.\n¿Estás de acuerdo?`)) {
              return;
          }
          state.money -= cost;
          if (typeof addLog === 'function') addLog(`Pagaste $${cost.toLocaleString()} en la guardería.`, 'log-info');
          if (typeof updateHud === 'function') updateHud();
      }
  }

  document.getElementById('bag-overlay').style.display = 'none';
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
const EGG_SPAWN_INTERVAL_MS = { 1: 12 * 60 * 60 * 1000, 2: 9 * 60 * 60 * 1000, 3: 6 * 60 * 60 * 1000 };
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
    if (Date.now() >= _nextEggTime) {
      const lockKey = `daycare_timer_lock_${currentUser.id}`;
      const nowMs = Date.now();
      if (nowMs - Number(localStorage.getItem(lockKey) || 0) < 5000) return;
      localStorage.setItem(lockKey, nowMs.toString());

      const cap = await getEggCapacity();
      const { count } = await sb.from('eggs').select('egg_id', { count: 'exact', head: true }).eq('player_id', currentUser.id);
      if (count < cap) {
        const pA = slots[0].pokemon, pB = slots[1].pokemon;
        if (typeof ensureVigor === 'function') { ensureVigor(pA); ensureVigor(pB); }
        if (pA.vigor > 0 && pB.vigor > 0) {
            let iA = document.getElementById('slot-a-item')?.value || '';
            let iB = document.getElementById('slot-b-item')?.value || '';
            
            // Validate inventory presence for equipped items since they are consumed
            if (iA && (!state.inventory[iA] || state.inventory[iA] <= 0)) iA = '';
            if (iB && (!state.inventory[iB] || state.inventory[iB] <= 0)) iB = '';
            if (iA === iB && iA && state.inventory[iA] < 2) iB = ''; // Can't use same item if only 1 in inventory
            
            const success = await generateEggAt(currentUser.id, pA, pB, iA, iB, new Date(_nextEggTime - intMs));
            if (success !== false) {
                // Consume the items
                if (iA) { state.inventory[iA]--; if (state.inventory[iA] <= 0) document.getElementById('slot-a-item').value = ''; }
                if (iB) { state.inventory[iB]--; if (state.inventory[iB] <= 0) document.getElementById('slot-b-item').value = ''; }
                
                // Consume time by updating parent deposited_at
                const consumeTo = new Date(_nextEggTime - intMs);
                await sb.from('daycare_slots').update({ deposited_at: consumeTo.toISOString() }).eq('player_id', currentUser.id);

                notify('¡Tus Pokémon han puesto un huevo!', '🥚');
                renderEggGrid();
                renderDaycareUI(); // Refresh UI to show updated vigor and item counts
            }
        } else {
            clearInterval(_daycareTimer);
            document.getElementById('daycare-compat-bar').textContent = '⚠️ Uno de los padres está agotado (Vigor 0)';
            document.getElementById('daycare-compat-bar').style.color = '#ff5252';
            document.getElementById('daycare-egg-timer').style.display = 'none';
        }
      }
      _nextEggTime += intMs;
    }
    updateTimerDisplay();
  }, 1000);
}
function updateTimerDisplay() {
  const left = Math.max(0, Math.floor((_nextEggTime - Date.now()) / 1000));
  const m = String(Math.floor(left / 60)).padStart(2, '0');
  const s = String(left % 60).padStart(2, '0');
  document.getElementById('daycare-timer-countdown').textContent = `${m}:${s}`;
  renderBerrySelector();
}

function renderBerrySelector() {
    const sel = document.getElementById('daycare-berry-select');
    if (!sel) return;
    const inv = state.inventory || {};
    let opts = '<option value="">-- Sin Baya --</option>';
    if (inv['Baya de Bronce']) opts += `<option value="berry_bronze">Baya Bronce (-10%) x${inv['Baya de Bronce']}</option>`;
    if (inv['Baya de Plata']) opts += `<option value="berry_silver">Baya Plata (-30%) x${inv['Baya de Plata']}</option>`;
    if (inv['Baya de Oro']) opts += `<option value="berry_gold">Baya Oro (-50%) x${inv['Baya de Oro']}</option>`;
    
    if (sel.innerHTML !== opts) sel.innerHTML = opts;
}

async function useBreedingBerry() {
    const sel = document.getElementById('daycare-berry-select');
    if (!sel) return;
    const b = sel.value;
    if (!b) return;

    if (state.daycare_berry_egg_time === _nextEggTime) {
        notify('Ya usaste una Baya para este huevo.', '❌');
        return;
    }

    const map = { berry_bronze: { name: 'Baya de Bronce', pct: 0.10 }, berry_silver: { name: 'Baya de Plata', pct: 0.30 }, berry_gold: { name: 'Baya de Oro', pct: 0.50 } };
    const berry = map[b];
    if ((state.inventory[berry.name] || 0) <= 0) {
        notify('No tienes esta Baya.', '❌');
        return;
    }

    if (_activeDaycareSlots.length < 2 || !_activeDaycareSlots[0].pokemon || !_activeDaycareSlots[1].pokemon) return;
    const pA = _activeDaycareSlots[0].pokemon; 
    const pB = _activeDaycareSlots[1].pokemon;
    const compat = checkCompatibility(pA, pB);
    if (compat.level === 0) return;
    
    const intMs = EGG_SPAWN_INTERVAL_MS[compat.level];
    const msToReduce = intMs * berry.pct;

    const currentDepA = new Date(_activeDaycareSlots[0].deposited_at).getTime();
    const currentDepB = new Date(_activeDaycareSlots[1].deposited_at).getTime();
    
    const depA = new Date(currentDepA - msToReduce).toISOString();
    const depB = new Date(currentDepB - msToReduce).toISOString();
    
    const earliest = Math.max(currentDepA - msToReduce, currentDepB - msToReduce);
    const elapsed = Date.now() - earliest;
    
    await sb.from('daycare_slots').update({ deposited_at: depA }).eq('slot_index', 1).eq('player_id', currentUser.id);
    await sb.from('daycare_slots').update({ deposited_at: depB }).eq('slot_index', 2).eq('player_id', currentUser.id);
    
    state.inventory[berry.name]--;
    
    if (elapsed >= intMs) {
       state.daycare_berry_egg_time = 0;
    } else {
       state.daycare_berry_egg_time = _nextEggTime - msToReduce;
    }
    
    if (typeof addLog === 'function') addLog(`Usaste ${berry.name} en la Guardería.`, 'log-info');
    notify(`¡El huevo llegará más rápido! (-${berry.pct * 100}%)`, '✨');
    
    // Reload full Daycare UI to properly reflect new time
    renderDaycareUI();
}

async function getEggCapacity() {
  const { data } = await sb.from('daycare_upgrades').select('egg_capacity').eq('player_id', currentUser.id).single();
  return data?.egg_capacity || 2;
}

async function generateEggAt(pid, pA, pB, iA, iB, dateObj) {
  if (typeof ensureVigor === 'function') { ensureVigor(pA); ensureVigor(pB); }
  if (pA.vigor <= 0 || pB.vigor <= 0) return false;

  const compat = checkCompatibility(pA, pB);
  if (compat.level === 0) return false;

  const cap = await getEggCapacity();
  const { count } = await sb.from('eggs').select('egg_id', { count: 'exact', head: true }).eq('player_id', pid);
  if (count >= cap) return false;
  const ivs = calculateInheritance(pA, pB, iA, iB);
  
  if (iA === 'Piedra Eterna' && iB === 'Piedra Eterna') {
      ivs._nature = Math.random() < 0.5 ? pA.nature : pB.nature;
  } else if (iA === 'Piedra Eterna') {
      ivs._nature = pA.nature;
  } else if (iB === 'Piedra Eterna') {
      ivs._nature = pB.nature;
  }
  
  let moves = (EGG_MOVES_DB[compat.eggSpecies] || []).filter(m => (pA.moves || []).concat(pB.moves || []).map(x => x.id || x).includes(m)).slice(0, 2);
  const ready = new Date(dateObj.getTime() + 30 * 60 * 1000); // 30 mins
  await sb.from('eggs').insert({ player_id: pid, species: compat.eggSpecies, parent_a: pA.uid, parent_b: pB.uid, inherited_ivs: ivs, egg_moves: moves, shiny_roll: (Math.random() < 1 / 512), created_at: dateObj.toISOString(), hatch_ready_time: ready.toISOString(), incubation_speed_bonus: 0 });

  pA.vigor--;
  pB.vigor--;
  if (typeof scheduleSave === 'function') scheduleSave();
  return true;
}

async function reduceHatchTimer(pid, activity) {
  const RED = { battle: 2 * 60000, capture: 3 * 60000, gym: 10 * 60000 };
  const ms = RED[activity]; if (!ms) return;
  const { data } = await sb.from('eggs').select('egg_id, hatch_ready_time').eq('player_id', pid);
  if (data && data.length) {
    for (let e of data) {
      const nt = new Date(new Date(e.hatch_ready_time).getTime() - ms);
      await sb.from('eggs').update({ hatch_ready_time: nt.toISOString() }).eq('egg_id', e.egg_id);
    }
    // If viewing daycare tab, silently refresh
    if (document.getElementById('tab-daycare').style.display === 'block') renderEggGrid();

    // Notify if newly ready
    const now = Date.now();
    const newlyReady = data.filter(e => new Date(e.hatch_ready_time).getTime() > now && (new Date(e.hatch_ready_time).getTime() - ms) <= now);
    if (newlyReady.length) { notify('¡Un huevo está listo para eclosionar!', '🐣'); document.getElementById('daycare-nav-badge').style.display = 'block'; }
  }
}

async function processOfflineBreeding(pid, inSlots) {
  const lockKey = `daycare_offline_lock_${pid}`;
  const nowMs = Date.now();
  if (nowMs - Number(localStorage.getItem(lockKey) || 0) < 5000) return;
  localStorage.setItem(lockKey, nowMs.toString());

  const s = inSlots || await loadDaycareSlots();
  if (!s || s.length < 2 || !s[0].pokemon || !s[1].pokemon) return;

  const pA = s[0].pokemon, pB = s[1].pokemon;
  const cp = checkCompatibility(pA, pB); if (cp.level === 0) return;
  const intMs = EGG_SPAWN_INTERVAL_MS[cp.level];

  const depA = new Date(s[0].deposited_at).getTime(), depB = new Date(s[1].deposited_at).getTime();
  const earliest = Math.max(depA, depB);
  const elapsed = Date.now() - earliest;
  const pot = Math.floor(elapsed / intMs);
  if (pot <= 0) return;

  const cap = await getEggCapacity();
  const { count } = await sb.from('eggs').select('egg_id', { count: 'exact', head: true }).eq('player_id', pid);

  let canGen = Math.min(pot, cap - count);
  let generated = 0;
  if (canGen > 0) {
    if (typeof ensureVigor === 'function') { ensureVigor(pA); ensureVigor(pB); }
    for (let i = 0; i < canGen; i++) {
        if (pA.vigor <= 0 || pB.vigor <= 0) break;
        const spawnTime = new Date(earliest + intMs * (i + 1));
        const res = await generateEggAt(pid, pA, pB, pA.heldItem, pB.heldItem, spawnTime);
        if (res !== false) generated++;
    }
    if (generated > 0) notify(`¡${generated} huevo(s) generado(s) mientras no estabas!`, '🥚');
  }

  // ALWAYS consume the pot time even if canGen was limited by capacity,
  // to avoid infinite eggs behavior when backlog is cleared.
  // We set deposited_at to the latest accounted timestamp.
  const consumeTo = new Date(earliest + pot * intMs);
  await sb.from('daycare_slots').update({ deposited_at: consumeTo.toISOString() }).eq('player_id', pid);
  document.getElementById('daycare-nav-badge').style.display = 'block';
}

async function renderEggGrid() {
  const cap = await getEggCapacity();
  document.getElementById('daycare-egg-capacity').textContent = cap;
  const { data: eggs } = await sb.from('eggs').select('*').eq('player_id', currentUser.id).order('created_at');
  const grid = document.getElementById('daycare-egg-grid');
  document.getElementById('daycare-egg-count').textContent = eggs?.length || 0;
  if (!eggs || !eggs.length) { grid.innerHTML = '<div style="color:var(--gray);font-size:11px;padding:16px 0;">Sin huevos en almacén.</div>'; return; }

  let badgeReady = false;
  grid.innerHTML = eggs.map(e => {
    const hAt = new Date(e.hatch_ready_time).getTime();
    const leftMs = Math.max(0, hAt - Date.now());
    const leftMin = Math.ceil(leftMs / 60000);
    const pct = Math.min(100, Math.round(100 - (leftMs / (30 * 60 * 1000)) * 100));
    const pd = POKEMON_DB[e.species];
    const isReady = leftMs === 0;
    if (isReady) badgeReady = true;

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
  try { extra.inherited_ivs = JSON.parse(unescape(ivsJson)); } catch (e) { }

  const added = addEgg(sp, 'breeding', extra);
  if (added) {
    await sb.from('eggs').delete().eq('egg_id', eggId);
    notify('¡Recogiste el huevo de la guardería! Ahora camina para eclosionarlo.', '🏠');
    renderDaycareUI();
    updateProfilePanel();
    scheduleSave();
  }
}

// ===== DAILY MISSIONS =====
function generateDailyMission() {
    const today = new Date().toISOString().split('T')[0];
    if (state.daycare_mission && state.daycare_mission.date === today && state.daycare_mission.targetId !== 'psyduck' && state.daycare_mission.minLevel > 25) return;
    
    const possibleTargets = ['arcanine', 'kadabra', 'machoke', 'graveler', 'rapidash', 'slowbro', 'magneton', 'dodrio', 'dewgong', 'muk', 'cloyster', 'haunter', 'onix', 'hypno', 'kingler', 'electrode', 'exeggutor', 'marowak', 'weezing', 'rhydon', 'tangela', 'seadra', 'seaking', 'starmie', 'gyarados', 'vaporeon', 'jolteon', 'flareon', 'aerodactyl', 'snorlax', 'dragonair'];
    const target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
    const minLvl = Math.floor(Math.random() * 21) + 30; // Niveles 30 a 50
    
    const possibleRewards = [
        { id: 'berry_bronze', name: 'Baya de Bronce', qty: 3, icon: '🥉' },
        { id: 'berry_silver', name: 'Baya de Plata', qty: 2, icon: '🥈' },
        { id: 'berry_gold', name: 'Baya de Oro', qty: 1, icon: '🥇' },
        { id: 'everstone', name: 'Piedra Eterna', qty: 1, icon: '🪨' },
        { id: 'power_weight', name: 'Pesa Recia', qty: 1, icon: '🏋️' },
        { id: 'power_bracer', name: 'Brazal Recio', qty: 1, icon: '🥊' },
        { id: 'power_belt', name: 'Cinto Recio', qty: 1, icon: '🛡️' },
        { id: 'power_lens', name: 'Lente Recia', qty: 1, icon: '🔍' },
        { id: 'power_band', name: 'Banda Recia', qty: 1, icon: '🎗️' },
        { id: 'power_anklet', name: 'Franja Recia', qty: 1, icon: '👢' }
    ];
    const reward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)];
    
    state.daycare_mission = { date: today, targetId: target, minLevel: minLvl, reward: reward, completed: (!state.daycare_mission || (state.daycare_mission.date === today && state.daycare_mission.targetId === 'psyduck') ? false : (state.daycare_mission.completed || false)) };
    if (typeof scheduleSave === 'function') scheduleSave();
}

function renderDaycareMission() {
    generateDailyMission();
    const m = state.daycare_mission;
    if (!m) return;
    
    const panel = document.getElementById('daycare-mission-panel');
    if (!panel) return;
    
    const targetName = POKEMON_DB[m.targetId]?.name || m.targetId;
    document.getElementById('daycare-mission-desc').innerHTML = `La Guardería necesita estudiar un <b style="color:var(--yellow);">${targetName}</b> de <b style="color:#fff;">Nivel ${m.minLevel}</b> o superior.`;
    
    const shopItem = window.SHOP_ITEMS ? window.SHOP_ITEMS.find(x => x.id === m.reward.id) : null;
    const rIcon = shopItem && shopItem.sprite ? `<img src="${shopItem.sprite}" style="width:20px;height:20px;vertical-align:bottom;filter:drop-shadow(0 0 2px rgba(255,255,255,0.4));margin-right:2px;">` : (m.reward.icon || '🎁');
    
    document.getElementById('daycare-mission-reward').innerHTML = `Recompensa: <span style="display:inline-flex;align-items:center;background:rgba(0,0,0,0.4);border-radius:6px;padding:2px 6px;margin-top:4px;">${rIcon} <span style="font-weight:700;color:var(--green);font-size:10px;">${m.reward.name} x${m.reward.qty}</span></span>`;
    
    const btn = document.getElementById('daycare-mission-btn');
    const status = document.getElementById('daycare-mission-status');
    if (m.completed) {
        status.textContent = 'COMPLETADA';
        status.style.color = '#fff';
        status.style.background = 'var(--green)';
        btn.style.display = 'none';
    } else {
        status.textContent = 'PENDIENTE';
        status.style.color = 'var(--yellow)';
        status.style.background = 'rgba(255,217,61,0.1)';
        btn.style.display = 'block';
    }
}

function openMissionPicker() {
    _depositingSlot = 'mission'; 
    const bModal = document.getElementById('bag-modal');
    document.getElementById('bag-overlay').style.display = 'flex';
    
    const m = state.daycare_mission;
    const targetName = POKEMON_DB[m.targetId]?.name || m.targetId;
    const validPoks = [...state.team, ...(state.box || [])].filter(p => !p.favorite && !_activeDaycareSlots.some(s => s.pokemon_id === p.uid));
    
    bModal.innerHTML = `
        <div style="font-family:'Press Start 2P';font-size:12px;margin-bottom:16px;color:var(--yellow);text-align:center;">Entregar a ${targetName} Nv.${m.minLevel}+</div>
        <div style="font-size:10px;text-align:center;color:var(--gray);margin-bottom:12px;">⚠️ El Pokémon será entregado permanentemente.</div>
        <div style="max-height:60vh;overflow-y:auto;display:grid;grid-template-columns:1fr;gap:10px;">
          ${validPoks.map(p => {
              const baseId = typeof _breedingBaseId === 'function' ? _breedingBaseId(p.id) : p.id;
              const isMatch = baseId === m.targetId && p.level >= m.minLevel;
              if (!isMatch) return '';
              
              const sUrl = typeof getSpriteUrl === 'function' ? getSpriteUrl(p.id, p.isShiny) : '';
              return `<div onclick="confirmMissionDelivery('${p.uid}')" style="border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:12px;display:flex;align-items:flex-start;gap:12px;cursor:pointer;background:rgba(255,255,255,0.05);">
                <img src="${sUrl}" style="width:48px;height:48px;image-rendering:pixelated;" onerror="this.style.display='none'">
                <div>
                  <div style="font-weight:700;font-size:12px;color:#fff;">${p.name} <span style="font-size:10px;color:var(--gray);">Nv.${p.level}</span></div>
                  <div style="font-size:10px;color:var(--yellow);margin-top:4px;">Tocar para entregar</div>
                </div>
              </div>`;
          }).join('') || '<div style="text-align:center;color:var(--gray);font-size:11px;padding:20px;">No tienes ningún Pokémon que cumpla los requisitos.</div>'}
        </div>
        <button onclick="document.getElementById('bag-overlay').style.display='none'" style="margin-top:16px;width:100%;padding:14px;border-radius:12px;background:rgba(255,255,255,0.1);color:#fff;font-family:'Press Start 2P';font-size:10px;border:none;">CERRAR</button>
    `;
}

function confirmMissionDelivery(uid) {
    if (!confirm('¿Seguro que quieres entregar a este Pokémon? Se irá de tu equipo/caja para siempre.')) return;
    
    let idx = state.team.findIndex(p => p.uid === uid);
    if (idx !== -1) {
        if (state.team.length <= 1) { notify('No puedes entregar tu único Pokémon.', '❌'); return; }
        state.team.splice(idx, 1);
    } else {
        idx = (state.box || []).findIndex(p => p.uid === uid);
        if (idx !== -1) state.box.splice(idx, 1);
        else return;
    }
    
    const m = state.daycare_mission;
    m.completed = true;
    state.inventory[m.reward.name] = (state.inventory[m.reward.name] || 0) + m.reward.qty;
    
    document.getElementById('bag-overlay').style.display = 'none';
    notify(`¡Misión completada! Recibiste ${m.reward.name} x${m.reward.qty}`, m.reward.icon);
    if (typeof saveGame === 'function') saveGame(true);
    renderDaycareMission();
    if (typeof updateHud === 'function') updateHud();
}

// ===== INIT =====
updateHud();
