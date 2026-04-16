import { POKEMON_DB } from '@/data/pokemonDB';
import { STONE_EVOLUTIONS } from '@/data/evolutionData';
import { evolvePokemonData } from '@/logic/evolutionLogic';

/**
 * Muestra la escena de evolución (animación flash).
 * @param {Object} pokemon - Instancia del pokemon.
 * @param {string} toId - ID del pokemon al que evoluciona.
 * @param {Function} onComplete - Callback al finalizar.
 */
export function showEvolutionScene(pokemon, toId, onComplete) {
  const toData = POKEMON_DB[toId];
  if (!toData) {
    evolvePokemonData(pokemon, toId);
    if (onComplete) onComplete();
    return;
  }

  // Helper para sprites (inyectado o global)
  const getSpriteId = (id) => (typeof window !== 'undefined' && window.getSpriteId) ? window.getSpriteId(id) : id;
  const fromSprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getSpriteId(pokemon.id)}.png`;
  const toSprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getSpriteId(toId)}.png`;

  const ov = document.createElement('div');
  ov.id = 'evo-overlay';
  ov.style.cssText = `position:fixed;inset:0;z-index:9999;background:#000;
display:flex;flex-direction:column;align-items:center;justify-content:center;
font-family:'Press Start 2P',monospace;`;

  ov.innerHTML = `
<div id="evo-from" style="text-align:center;transition:all 1.5s;">
  <img src="${fromSprite}" width="96" height="96" style="image-rendering:pixelated;filter:brightness(1);"
       onerror="this.style.display='none'">
</div>
<div style="font-size:9px;color:#fff;margin:24px 0 8px;">¡${pokemon.name} está evolucionando!</div>
<div id="evo-flash" style="position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;transition:opacity 0.15s;"></div>
<div id="evo-to" style="display:none;text-align:center;">
  <img src="${toSprite}" width="96" height="96" style="image-rendering:pixelated;"
       onerror="this.style.display='none'">
  <div style="font-size:10px;color:#FFD93D;margin-top:16px;">¡${pokemon.name} evolucionó<br>a ${toData.name}!</div>
</div>`;

  document.body.appendChild(ov);

  let flashes = 0;
  const flash = document.getElementById('evo-flash');
  const fromEl = document.getElementById('evo-from');
  const interval = setInterval(() => {
    flash.style.opacity = flashes % 2 === 0 ? '0.7' : '0';
    flashes++;
    if (flashes >= 6) {
      clearInterval(interval);
      fromEl.style.display = 'none';
      document.getElementById('evo-to').style.display = 'block';

      // Actualizar datos
      const oldName = pokemon.name;
      const result = evolvePokemonData(pokemon, toId);

      // Side-effects legacy
      if (typeof window !== 'undefined' && window.state) {
        const state = window.state;
        state.pokedex = state.pokedex || [];
        if (!state.pokedex.includes(toId)) state.pokedex.push(toId);
        state.seenPokedex = state.seenPokedex || [];
        if (!state.seenPokedex.includes(toId)) state.seenPokedex.push(toId);
        
        // Sync to team/box
        if (typeof window.renderTeam === 'function') window.renderTeam();
        if (typeof window.saveGame === 'function') window.saveGame(false);
        else if (typeof window.scheduleSave === 'function') window.scheduleSave();
        if (typeof window.notify === 'function') window.notify(`¡${oldName} evolucionó a ${toData.name}!`, '🌟');
      }

      setTimeout(() => {
        ov.remove();
        if (result && result.pendingMoves.length > 0) {
          if (typeof window !== 'undefined' && typeof window.processLearnMoveQueue === 'function') {
            window.processLearnMoveQueue(result.pendingMoves.map(m => ({ pokemon: pokemon, move: m })), onComplete);
          } else {
            console.error("processLearnMoveQueue not found");
            if (onComplete) onComplete();
          }
        } else {
          if (onComplete) onComplete();
        }
      }, 2200);
    }
  }, 250);
}

/**
 * Muestra el selector de piedras evolutivas.
 */
export function showStonePicker(teamIndex) {
  if (typeof window === 'undefined' || !window.state) return;
  const state = window.state;
  const p = state.team[teamIndex];
  if (!p) return;

  const eeveeOptions = p.id === 'eevee' ? [
    { stone: 'Piedra Agua',   to: 'vaporeon' },
    { stone: 'Piedra Trueno', to: 'jolteon' },
    { stone: 'Piedra Fuego',  to: 'flareon' },
  ] : null;

  const evoKey = STONE_EVOLUTIONS[p.id];
  const options = eeveeOptions || (evoKey ? [evoKey] : []);
  if (!options.length) { 
    if (window.notify) window.notify(`${p.name} no puede evolucionar con piedras.`, '💎'); 
    return; 
  }

  const ov = document.createElement('div');
  ov.id = 'stone-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:16px;';

  let html = `<div style="background:var(--card);border-radius:20px;padding:24px;width:100%;max-width:340px;">
<div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--yellow);margin-bottom:16px;">💎 EVOLUCIONAR CON PIEDRA</div>
<div style="font-size:12px;color:var(--gray);margin-bottom:16px;">¿Qué piedra usás en ${p.name}?</div>`;

  options.forEach(o => {
    const stoneName = o.stone;
    const qty = state.inventory?.[stoneName] || 0;
    const toData = POKEMON_DB[o.to];
    const disabled = qty <= 0;
    
    // Inyectar referencias globales para el botón onclick
    const shopItem = (typeof window.SHOP_ITEMS !== 'undefined') ? window.SHOP_ITEMS.find(i => i.name === stoneName) : null;
    const stoneDisplay = shopItem
      ? `<img src="${shopItem.sprite}" style="width:32px;height:32px;image-rendering:pixelated;" onerror="this.outerHTML='<span style=&quot;font-size:24px;&quot;>${shopItem.icon}</span>'">`
      : `<span style="font-size:24px;">💎</span>`;

    html += `<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;margin-bottom:8px;${disabled ? 'opacity:0.4' : ''}">
  <div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;">${stoneDisplay}</div>
  <div style="flex:1;">
    <div style="font-size:12px;font-weight:700;">${stoneName}</div>
    <div style="font-size:10px;color:var(--gray);">→ ${toData?.name || o.to} &nbsp;·&nbsp; x${qty}</div>
  </div>
  <button onclick="window.useStoneOnPokemon('${stoneName}',${teamIndex})"
    ${disabled ? 'disabled' : ''}
    style="font-family:'Press Start 2P',monospace;font-size:8px;padding:8px 12px;border:none;border-radius:8px;cursor:${disabled ? 'not-allowed' : 'pointer'};
           background:rgba(255,217,61,0.2);color:var(--yellow);border:1px solid rgba(255,217,61,0.3);">
    USAR
  </button>
</div>`;
  });

  html += `<button onclick="document.getElementById('stone-overlay').remove()"
style="width:100%;margin-top:8px;padding:10px;border:none;border-radius:10px;cursor:pointer;background:rgba(255,255,255,0.06);color:var(--gray);font-size:12px;">
Cancelar
</button></div>`;

  ov.innerHTML = html;
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

/**
 * Lógica para usar una piedra.
 */
export function useStoneOnPokemon(stoneName, teamIndex) {
  if (typeof window === 'undefined' || !window.state) return;
  document.getElementById('stone-overlay')?.remove();
  
  const state = window.state;
  const p = state.team[teamIndex];
  if (!p) return;
  
  if (!state.inventory?.[stoneName] || state.inventory[stoneName] <= 0) {
    if (window.notify) window.notify(`No tenés ${stoneName}.`, '❌'); 
    return;
  }

  let toId;
  if (p.id === 'eevee') {
    const eeveeMap = { 'Piedra Agua': 'vaporeon', 'Piedra Trueno': 'jolteon', 'Piedra Fuego': 'flareon' };
    toId = eeveeMap[stoneName] || null;
  } else {
    const evo = STONE_EVOLUTIONS[p.id];
    toId = (evo && evo.stone === stoneName) ? evo.to : null;
  }

  if (!toId || !POKEMON_DB[toId]) { 
    if (window.notify) window.notify(`${p.name} no puede evolucionar con ${stoneName}.`, '💎'); 
    return; 
  }

  state.inventory[stoneName]--;
  if (!state.inventory[stoneName]) delete state.inventory[stoneName];
  
  showEvolutionScene(p, toId, null);
}
