import { applyMarketFilters } from '@/logic/market';

/**
 * Generates the HTML for the GTS filters.
 */
export function getOMFilterHTML(context, filters, expanded, options = {}) {
  const isExp = expanded[context];
  const isPk = filters.mode === 'pokemon';
  const getTypeEmoji = options.getTypeEmoji || (() => '❓');
  
  return `
    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:18px; padding:14px; margin-bottom:16px;">
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
      
      <div style="margin-bottom:12px;">
        <input type="text" placeholder="Buscar ${isPk?'Pokémon...':'objetos...'}" value="${filters.search}" 
          oninput="setOMFilter('${context}', 'search', this.value)"
          style="width:100%; padding:10px 14px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:12px; color:#fff; font-size:13px; outline:none;">
      </div>

      <div id="om-filter-body-${context}" style="display:${isExp ? 'block' : 'none'}; border-top:1px solid rgba(255,255,255,0.06); padding-top:14px;">
        <div style="margin-bottom:15px;">
           <div style="font-size:10px; color:var(--yellow); margin-bottom:8px; display:flex; justify-content:space-between;">
             <span>Precio 💰</span>
             <span>₽${filters.priceMin.toLocaleString()} - ₽${filters.priceMax === 1000000 ? 'Máx' : filters.priceMax.toLocaleString()}</span>
           </div>
           <input type="range" min="0" max="50000" step="500" value="${filters.priceMin}" oninput="setOMFilter('${context}','priceMin',+this.value)" style="width:100%; accent-color:var(--yellow); margin-bottom:6px;">
           <input type="range" min="0" max="1000000" step="1000" value="${filters.priceMax}" oninput="setOMFilter('${context}','priceMax',+this.value)" style="width:100%; accent-color:var(--yellow);">
        </div>

        ${isPk ? `
          <div style="margin-bottom:12px;">
            <div style="font-size:10px; color:var(--gray); margin-bottom:8px;">Tier</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${['all','S+','S','A','B','C','D','F'].map(t => `<button onclick="setOMFilter('${context}','tier','${t}')" style="padding:6px 10px; border-radius:12px; border:1px solid ${filters.tier===t?'var(--purple)':'rgba(255,255,255,0.1)'}; background:${filters.tier===t?'rgba(191,90,242,0.2)':'rgba(255,255,255,0.04)'}; color:${filters.tier===t?'#fff':'var(--gray)'}; font-size:8px; cursor:pointer;">${t==='all'?'X':t}</button>`).join('')}
            </div>
          </div>
          <div style="margin-bottom:12px;">
            <div style="display:flex; flex-wrap:wrap; gap:5px;">
              ${['all','fire','water','grass','electric','psychic','normal','rock','ground','poison','bug','flying','ghost','ice', 'dragon', 'fighting', 'dark', 'steel'].map(t => `<button onclick="setOMFilter('${context}','type','${t}')" style="width:32px; height:32px; border-radius:10px; border:1px solid ${filters.type===t?'var(--blue)':'rgba(255,255,255,0.06)'}; background:${filters.type===t?'rgba(0,122,255,0.2)':'rgba(0,0,0,0.2)'}; cursor:pointer;" title="${t}">${t==='all'?'📂':getTypeEmoji(t)}</button>`).join('')}
            </div>
          </div>
        ` : `
          <div style="margin-bottom:12px;">
            <div style="font-size:10px; color:var(--gray); margin-bottom:8px;">Categoría</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${['all','pokeballs','pociones','stones','held','booster','especial'].map(c => `<button onclick="setOMFilter('${context}','itemCat','${c}')" style="padding:6px 12px; border-radius:12px; border:1px solid ${filters.itemCat===c?'var(--purple)':'rgba(255,255,255,0.1)'}; background:${filters.itemCat===c?'rgba(191,90,242,0.2)':'rgba(255,255,255,0.04)'}; color:${filters.itemCat===c?'#fff':'var(--gray)'}; font-size:9px; cursor:pointer; text-transform:capitalize;">${c==='all'?'Todo':c}</button>`).join('')}
            </div>
          </div>
        `}
        <button onclick="resetOMFilters('${context}')" style="width:100%; margin-top:15px; padding:10px; border:none; color:var(--gray); background:rgba(255,255,255,0.03); border-radius:12px; font-size:11px; cursor:pointer;">Limpiar filtros</button>
      </div>
    </div>
  `;
}
