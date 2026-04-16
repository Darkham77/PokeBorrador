import { COMPAT_TEXT, EGG_GROUP_TRANSLATIONS, EGG_SPAWN_INTERVAL_MS } from '@/data/breedingData';
import { POKEMON_DB } from '@/data/pokemonDB';
import { calculateBreedingCost, checkCompatibility } from '@/logic/breeding';

/**
 * Renders the breeding summary card HTML.
 */
export function renderDaycareBreedingSummary(pA, pB, compat, itemA = '', itemB = '', playerClass = '') {
  const cost = calculateBreedingCost(pA, pB);
  
  const ms = compat && compat.level > 0 ? EGG_SPAWN_INTERVAL_MS[compat.level] : null;
  const intervalTxt = ms ? `${Math.round(ms / 3600000)}h` : '—';
  
  const motherId = compat && compat.eggSpecies ? compat.eggSpecies : null;
  let motherName = motherId ? (POKEMON_DB[motherId]?.name || motherId) : '—';
  if (motherId === 'nidoran_f' || motherId === 'nidoran_m') motherName = 'Nidoran ♀/♂';
  
  const powerMap = {
      'Pesa Recia': { stat: 'hp', label: 'PS' },
      'Brazal Recio': { stat: 'atk', label: 'Ataque' },
      'Cinto Recio': { stat: 'def', label: 'Defensa' },
      'Lente Recia': { stat: 'spa', label: 'At. Especial' },
      'Banda Recia': { stat: 'spd', label: 'Def. Especial' },
      'Franja Recia': { stat: 'spe', label: 'Velocidad' }
  };

  let guaranteedNature = 'Aleatoria (1/25)';
  if (itemA === 'Piedra Eterna' && itemB === 'Piedra Eterna') {
      guaranteedNature = `${pA.nature} o ${pB.nature} (50/50)`;
  } else if (itemA === 'Piedra Eterna') {
      guaranteedNature = `<span style="color:var(--yellow);">${pA.nature}</span>`;
  } else if (itemB === 'Piedra Eterna') {
      guaranteedNature = `<span style="color:var(--yellow);">${pB.nature}</span>`;
  }

  let forcedA = powerMap[itemA];
  let forcedB = powerMap[itemB];

  let guaranteedIVs = [];
  if (forcedA) guaranteedIVs.push(`✓ 100% de ${forcedA.label} (${pA.name})`);
  if (forcedB && (!forcedA || forcedB.stat !== forcedA.stat)) guaranteedIVs.push(`✓ 100% de ${forcedB.label} (${pB.name})`);
  else if (forcedB && forcedA && forcedB.stat === forcedA.stat) {
      guaranteedIVs = [`✓ 50% ${forcedA.label} (${pA.name}) / 50% (${pB.name})`];
  }
  
  const baseCount = playerClass === 'criador' ? 4 : 3;
  const ivText = guaranteedIVs.length > 0 ? guaranteedIVs.join('<br>') : `<span style="color:var(--gray);">${baseCount} stats al azar (Madre/Padre)</span>`;

  return `
    <div style="background:linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95)); border:1px solid rgba(139,92,246,0.5); border-radius:16px; padding:16px; box-shadow:0 8px 32px rgba(0,0,0,0.6); text-align:left; position:relative; overflow:hidden;">
      <div style="position:absolute; top:-20px; right:-20px; font-size:100px; opacity:0.03; z-index:0;">🧬</div>
      <div style="text-align:center; font-family:'Press Start 2P', monospace; font-size:10px; color:var(--purple); margin-bottom:16px; text-shadow:0 0 10px rgba(139,92,246,0.5); position:relative; z-index:1;">PRONÓSTICO DE CRÍA</div>
      
      <div style="display:flex; flex-direction:column; gap:12px; position:relative; z-index:1;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.4); padding:10px 12px; border-radius:10px; border-left:4px solid var(--green);">
          <span style="font-size:10px; color:var(--gray); font-family:'Press Start 2P', monospace;">ESPECIE</span>
          <span style="font-size:12px; font-weight:800; color:#fff;">🥚 ${motherName}</span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.4); padding:10px 12px; border-radius:10px; border-left:4px solid var(--yellow);">
          <span style="font-size:10px; color:var(--gray); font-family:'Press Start 2P', monospace;">NATURALEZA</span>
          <span style="font-size:11px; font-weight:700; color:#fff; text-align:right;">${guaranteedNature}</span>
        </div>

        <div style="background:rgba(0,0,0,0.4); padding:12px; border-radius:10px; border-left:4px solid var(--blue);">
          <div style="font-size:10px; color:var(--gray); font-family:'Press Start 2P', monospace; margin-bottom:8px;">GENÉTICA (IVs)</div>
          <div style="font-size:11px; font-weight:700; color:var(--blue); line-height:1.6;">
            ${ivText}
          </div>
        </div>
      </div>
      
      <div style="margin-top:16px; padding-top:12px; border-top:1px dashed rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center; position:relative; z-index:1;">
        <div style="font-size:10px; color:var(--gray);">Costo al recoger: <span style="color:var(--yellow); font-weight:800;">$${cost.toLocaleString()}</span></div>
        <div style="font-size:10px; color:var(--gray);">Tiempo: <span style="color:var(--green); font-weight:800;">${intervalTxt}</span></div>
      </div>
    </div>
  `;
}

/**
 * Renders the HTML for a Pokémon in the daycare picker.
 */
export function renderPickerHtml(p, compareTo, options = {}) {
  const getSpriteUrl = options.getSpriteUrl || ((id, shiny) => '');
  const getPokemonTier = options.getPokemonTier || (() => ({ bg: '#000', color: '#fff', tier: '?' }));
  const genderSymbol = options.genderSymbol || ((g) => g);
  
  const sUrl = getSpriteUrl(p.id, p.isShiny);
  const tier = getPokemonTier(p);
  const tierHtml = `<span style="display:inline-flex;align-items:center;justify-content:center;padding:2px 6px;border-radius:999px;background:${tier.bg};color:${tier.color};font-size:9px;font-weight:800;line-height:1;">${tier.tier}</span>`;
  const genderIcon = p.gender === 'M' ? '<span style="color:#3498db; font-size:16px; font-weight:900;">♂</span>' : (p.gender === 'F' ? '<span style="color:#e84393; font-size:16px; font-weight:900;">♀</span>' : '');

  let compatHtml = '';
  let borderStyle = 'border:1px solid rgba(255,255,255,0.06);';

  if (compareTo) {
    const cp = checkCompatibility(compareTo, p);
    const info = COMPAT_TEXT[cp.level] || COMPAT_TEXT[0];
    const ms = cp.level > 0 ? EGG_SPAWN_INTERVAL_MS[cp.level] : null;
    const every = ms ? `${Math.round(ms / 3600000)}h` : '—';
    
    let motherId = cp.eggSpecies || '—';
    let motherName = motherId ? (POKEMON_DB[motherId]?.name || motherId) : '—';
    if (motherId === 'nidoran_f' || motherId === 'nidoran_m') motherName = 'Nidoran ♀/♂';
    const translatedGroups = (cp.sharedGroups || []).map(g => EGG_GROUP_TRANSLATIONS[g] || g);
    const shared = translatedGroups.length ? translatedGroups.join(', ') : '—';
    const extra = cp.level > 0 ? `Cría: <b style="color:#ffffff; font-size:11px;">${motherName}</b>` : `<span style="color:rgba(255,255,255,0.5); font-size:11px;">${cp.reason || 'Incompatible'}</span>`;

    if (cp.level > 0) {
      borderStyle = `border:1px solid ${info.color}aa; background: linear-gradient(135deg, rgba(0,0,0,0.6) 0%, ${info.color}25 100%);`;
    } else {
      borderStyle = `border:1px solid rgba(255,255,255,0.1); opacity: 0.7;`;
    }

    compatHtml = `
      <div style="margin-top:10px; padding:10px; border-radius:10px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
          <span style="font-size:11px; color:${info.color}; font-weight:900; text-transform:uppercase;">${info.label}</span>
          ${cp.level > 0 ? `<span style="font-size:10px; background:${info.color}; color:#000; padding:2px 8px; border-radius:6px; font-weight:900;">⏱️ ${every}</span>` : ''}
        </div>
        <div style="font-size:11px; color:#ffffff; line-height:1.5;">
          ${extra}<br>
          <span style="font-size:10px; color:rgba(255,255,255,0.6);">🧬 Grupos: <span style="color:#ffffff;">${shared}</span></span>
        </div>
      </div>`;
  }

  const isExhausted = p.vigor <= 0;
  
  return `
    <div onclick="${options.onClickAction}" style="${borderStyle} padding:12px; border-radius:16px; cursor:pointer; position:relative; overflow:hidden; transition:all .2s ease;">
      <div style="display:flex; align-items:center; gap:16px;">
        <div style="width:50px; height:50px; background:rgba(0,0,0,0.4); border-radius:12px; display:flex; align-items:center; justify-content:center;">
          <img src="${sUrl}" style="width:40px; height:40px; image-rendering:pixelated;">
        </div>
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-family:'Press Start 2P'; font-size:10px; color:#fff;">${p.name}</span>
            ${tierHtml}
            ${genderIcon}
          </div>
          <div style="font-size:10px; color:var(--gray); margin-top:4px;">
            NV. ${p.level} • IVs: ${p.ivs.hp}/${p.ivs.atk}/${p.ivs.def}/${p.ivs.spa}/${p.ivs.spd}/${p.ivs.spe}
          </div>
        </div>
      </div>
      ${compatHtml}
      ${isExhausted ? '<div style="position:absolute; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; color:#ff5252; font-family:\'Press Start 2P\'; font-size:9px;">AGOTADO</div>' : ''}
    </div>
  `;
}
