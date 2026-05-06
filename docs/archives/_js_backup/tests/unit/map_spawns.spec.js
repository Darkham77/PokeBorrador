/**
 * tests/unit/map_spawns.spec.js
 * Modernized unit test for map spawn HTML generation logic.
 */
import { describe, it, expect } from 'vitest';

// Lógica aislada extraída para el test (o importar si estuviera en un helper)
function getPokemonSpriteHtml(id, isRare = false) {
    const num = 1; // Simplified mock
    const name = id;
    return `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png"
          title="${name}" width="54" height="54" loading="lazy"
          onerror="this.style.display='none'" 
          class="${isRare ? 'rare-spawn' : ''}">`;
}

function processActiveRates(pool, rates, minRatesObj) {
    if (!pool || !rates) return;
    pool.forEach((id, index) => {
        const rate = rates[index] || 0;
        if (minRatesObj[id] === undefined || rate < minRatesObj[id]) {
            minRatesObj[id] = rate;
        }
    });
}

function generateLocationSpanwHTML(loc, cycle) {
    const currentCycleWild = loc.wild[cycle] || [];
    const baseWild = loc.wild.day || [];
    
    let genericSpawns = [];
    let specificSpawns = [];
    
    currentCycleWild.forEach(id => {
        if (baseWild.includes(id)) genericSpawns.push(id);
        else specificSpawns.push(id);
    });
    
    const fishingPool = loc.fishing ? loc.fishing.pool : [];
    fishingPool.forEach(id => {
        if (!genericSpawns.includes(id) && !specificSpawns.includes(id)) {
            genericSpawns.push(id);
        }
    });

    const minActiveRate = {};
    processActiveRates(currentCycleWild, loc.rates[cycle], minActiveRate);
    if (loc.fishing) processActiveRates(loc.fishing.pool, loc.fishing.rates || [], minActiveRate);

    const anyRare = [...genericSpawns, ...specificSpawns].some(id => minActiveRate[id] < 10);
    
    const renderSpritesHTML = (ids) => ids.map(id => {
        const isRare = anyRare && (minActiveRate[id] < 10);
        return getPokemonSpriteHtml(id, isRare);
    }).join('');

    let html = `<div class="location-spawns">
                  <div class="spawn-row">
                    ${renderSpritesHTML(genericSpawns)}
                  </div>
                  ${specificSpawns.length > 0 ? `
                    <div class="spawn-row cycle-specific-spawns">
                      <span class="cycle-emoji-label">🌙</span>
                      ${renderSpritesHTML(specificSpawns)}
                    </div>
                  ` : ''}
                </div>`;
                
    return {
        html,
        genericCount: genericSpawns.length,
        specificCount: specificSpawns.length,
        totalTarget: genericSpawns.length + specificSpawns.length
    }
}

describe('Map Spawns UI Logic', () => {
    const mockLoc = {
        id: 'route12',
        wild: {
            day: ['pidgey', 'venonat'],
            night: ['venonat', 'oddish']
        },
        fishing: {
            pool: ['magikarp']
        },
        rates: {
            day: [20, 20],
            night: [40, 30]
        }
    };

    it('should generate correct number of sprites', () => {
        const results = generateLocationSpanwHTML(mockLoc, 'day');
        const imgs = (results.html.match(/<img/g) || []).length;
        // pidgey, venonat, magikarp = 3
        expect(imgs).toBe(3);
        expect(results.html).toContain('width="54"');
    });

    it('should identify rare spawns (rate < 10)', () => {
        const rareLoc = {
            ...mockLoc,
            rates: { day: [5, 20] } // pidgey is rare
        };
        const results = generateLocationSpanwHTML(rareLoc, 'day');
        expect(results.html).toContain('class="rare-spawn"');
    });
});
